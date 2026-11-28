import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { authorizeChild, currentUser } from '@/lib/course/admin'
import { completeStage, recordAnswer, STAGE_REWARD, stageRewardRef, validLesson } from '@/lib/course/record'
import { reward, rewardCollected, rewardSurprise } from '@/lib/shop/wallet'
import { coursePlatformGame, gameRow } from '@/lib/course/platformGames'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  console.log('[SDK event] body:', JSON.stringify(body))
  const { event, childId, gameId, data, timestamp } = body

  // משחק מתוך אתר הקורס → רישום גם בטבלאות הקורס (תשובות, השלמת שלב, שליטה)
  let inCourse: number | false = false
  if (body.course && childId && (event === 'ANSWER' || event === 'GAME_OVER')) {
    try { inCourse = await recordCourseEvent(event, childId, body.course, data) }
    catch (e) { console.error('[SDK] course event error:', e) }
  }

  if (!event || !childId) {
    return NextResponse.json({ error: 'Missing event or childId' }, { status: 400 })
  }

  if (event === 'GAME_OVER') {
    // משחק של הקורס שנפתח במתיקה — מוודאים שיש לו שורה ב-games (progress מצביע עליה)
    const fromCourse = typeof gameId === 'string' ? coursePlatformGame(gameId) : null
    if (fromCourse) {
      const { error: e } = await supabase.from('games').upsert(gameRow(fromCourse), { onConflict: 'id' })
      if (e) console.error('[SDK] course game row error:', e)
    }

    const { error } = await supabase
      .from('progress')
      .upsert(
        {
          child_id: childId,
          game_id: gameId,
          stars: data.stars,
          score: data.score,
          correct_answers: data.correctAnswers,
          total_questions: data.totalQuestions,
          played_at: timestamp,
        },
        { onConflict: 'child_id,game_id' }
      )

    if (error) {
      console.error('[SDK] GAME_OVER upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // מטבעות: סכום קבוע לפי content/shop/shop.json (הכוכבים הם רק ציון). משחק מתוך הקורס כבר שולם בסימון השלב.
    const paid = inCourse === false ? await payCoins(childId, gameId, data) : inCourse

    return NextResponse.json({ ok: true, coins: typeof paid === 'number' ? paid : undefined })
  }

  if (event === 'ANSWER' && data?.correct === false) {
    const { error } = await supabase.from('wrong_answers').insert({
      child_id: childId,
      game_id: gameId,
      question_id: data.questionId,
      question_type: data.questionType,
      correct_answer: data.correctAnswer,
      child_answer: data.childAnswer,
      attempt_number: data.attemptNumber,
    })

    if (error) {
      console.error('[SDK] ANSWER insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}

/** מטבעות על משחק באפליקציה. הורה מחובר — רק לילד שלו; ילד בלי חשבון (כניסה בקוד משפחה) — מותר, עם תקרה יומית. */
async function payCoins(childId: string, gameId: string, data: { stars?: number; correctAnswers?: number; coins?: number } | undefined): Promise<number | undefined> {
  const { data: child } = await supabase.from('children').select('coins, parent_id').eq('id', childId).maybeSingle()
  if (!child) return
  const user = await currentUser().catch(() => null)
  if (user && user.id !== child.parent_id) return

  const stars = Number(data?.stars ?? 0), collected = Number(data?.correctAnswers ?? 0)
  const isSurprise = gameId === 'surprise-coins-001'
  if (!isSurprise && stars < 1) return 0
  // משחק של הקורס: אותו תגמול ואותו מזהה כמו בשלב בקורס — מה שהרווחנו באחד כבר נספר בשני
  const fromCourse = coursePlatformGame(gameId)
  const gathered = data?.coins != null && Number.isFinite(Number(data.coins)) ? Number(data.coins) : null   // a game where coins are collected
  const paid = isSurprise ? await rewardSurprise(childId, collected)
    : fromCourse && gathered != null ? await rewardCollected(childId, STAGE_REWARD[fromCourse.stage], stageRewardRef(fromCourse.courseId, fromCourse.lessonId, fromCourse.stage), gathered)
    : fromCourse ? await reward(childId, STAGE_REWARD[fromCourse.stage], stageRewardRef(fromCourse.courseId, fromCourse.lessonId, fromCourse.stage))
    : await reward(childId, 'platformGame', `game:${gameId}`)
  if (paid !== null) return paid

  // הארנק עוד לא מותקן (המיגרציה לא רצה) — כמו קודם
  const coins = isSurprise ? collected : gathered != null ? Math.min(100, Math.max(0, Math.round(gathered))) : stars === 3 ? 10 : stars === 2 ? 7 : 3
  if (coins > 0) await supabase.from('children').update({ coins: (child.coins ?? 0) + coins }).eq('id', childId)
  return coins
}

/** false = האירוע לא שייך לקורס. אחרת: נרשם בו, והמספר = כמה מטבעות נוספו */
async function recordCourseEvent(
  event: string, childId: string,
  c: { courseId?: string; lessonId?: string; stage?: number },
  data: { correct?: boolean; stars?: number } | undefined,
): Promise<number | false> {
  const stage = Number(c.stage)
  if (stage !== 3 && stage !== 4) return false
  const auth = await authorizeChild(childId, String(c.courseId ?? ''))
  if (!auth || !validLesson(auth.course, String(c.lessonId))) return false
  const ctx = { childId, course: auth.course, lessonId: String(c.lessonId) }
  if (event === 'ANSWER' && typeof data?.correct === 'boolean') {
    await recordAnswer(ctx, stage, data.correct)
  }
  if (event === 'GAME_OVER') {
    const stars = Number(data?.stars ?? 0)
    // תרגול: ✓ עם כוכב אחד לפחות · העשרה: ✓ בכל ציון
    if (stage === 4 || stars >= 1) return completeStage(ctx, stage, { stars })
  }
  return 0
}
