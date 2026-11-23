import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { authorizeChild, currentUser } from '@/lib/course/admin'
import { completeStage, recordAnswer, validLesson } from '@/lib/course/record'
import { reward, rewardSurprise } from '@/lib/shop/wallet'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  console.log('[SDK event] body:', JSON.stringify(body))
  const { event, childId, gameId, data, timestamp } = body

  // משחק מתוך אתר הקורס → רישום גם בטבלאות הקורס (תשובות, השלמת שלב, שליטה)
  let inCourse = false
  if (body.course && childId && (event === 'ANSWER' || event === 'GAME_OVER')) {
    try { inCourse = await recordCourseEvent(event, childId, body.course, data) }
    catch (e) { console.error('[SDK] course event error:', e) }
  }

  if (!event || !childId) {
    return NextResponse.json({ error: 'Missing event or childId' }, { status: 400 })
  }

  if (event === 'GAME_OVER') {
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
    if (!inCourse) await payCoins(childId, gameId, data)

    return NextResponse.json({ ok: true })
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
async function payCoins(childId: string, gameId: string, data: { stars?: number; correctAnswers?: number } | undefined) {
  const { data: child } = await supabase.from('children').select('coins, parent_id').eq('id', childId).maybeSingle()
  if (!child) return
  const user = await currentUser().catch(() => null)
  if (user && user.id !== child.parent_id) return

  const stars = Number(data?.stars ?? 0), collected = Number(data?.correctAnswers ?? 0)
  const isSurprise = gameId === 'surprise-coins-001'
  if (!isSurprise && stars < 1) return
  const paid = isSurprise ? await rewardSurprise(childId, collected) : await reward(childId, 'platformGame', `game:${gameId}`)
  if (paid !== null) return

  // הארנק עוד לא מותקן (המיגרציה לא רצה) — כמו קודם
  const coins = isSurprise ? collected : stars === 3 ? 10 : stars === 2 ? 7 : 3
  if (coins > 0) await supabase.from('children').update({ coins: (child.coins ?? 0) + coins }).eq('id', childId)
}

/** true = האירוע שייך לקורס ונרשם בו */
async function recordCourseEvent(
  event: string, childId: string,
  c: { courseId?: string; lessonId?: string; stage?: number },
  data: { correct?: boolean; stars?: number } | undefined,
): Promise<boolean> {
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
    if (stage === 4 || stars >= 1) await completeStage(ctx, stage, { stars })
  }
  return true
}
