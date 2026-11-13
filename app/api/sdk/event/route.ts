import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { authorizeChild } from '@/lib/course/admin'
import { completeStage, recordAnswer, validLesson } from '@/lib/course/record'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  console.log('[SDK event] body:', JSON.stringify(body))
  const { event, childId, gameId, data, timestamp } = body

  // משחק מתוך אתר הקורס → רישום גם בטבלאות הקורס (תשובות, השלמת שלב, שליטה)
  if (body.course && childId && (event === 'ANSWER' || event === 'GAME_OVER')) {
    try { await recordCourseEvent(event, childId, body.course, data) }
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

    // Increment coins — surprise game pays actual coins collected, others pay by stars
    const coinsToAdd = gameId === 'surprise-coins-001'
      ? (data.correctAnswers ?? 0)
      : data.stars === 3 ? 10 : data.stars === 2 ? 7 : data.stars === 1 ? 3 : 0
    console.log('[SDK] correctAnswers:', data.correctAnswers, '| coinsToAdd:', coinsToAdd)
    if (coinsToAdd > 0) {
      const { data: child } = await supabase
        .from('children')
        .select('coins')
        .eq('id', childId)
        .single()

      console.log('[SDK] coins before:', child?.coins)
      const { error: coinErr } = await supabase
        .from('children')
        .update({ coins: (child?.coins ?? 0) + coinsToAdd })
        .eq('id', childId)
      console.log('[SDK] coins update error:', coinErr, '| coins after:', (child?.coins ?? 0) + coinsToAdd)
    } else {
      console.log('[SDK] coinsToAdd=0, skipping update')
    }

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

async function recordCourseEvent(
  event: string, childId: string,
  c: { courseId?: string; lessonId?: string; stage?: number },
  data: { correct?: boolean; stars?: number } | undefined,
) {
  const stage = Number(c.stage)
  if (stage !== 3 && stage !== 4) return
  const auth = await authorizeChild(childId, String(c.courseId ?? ''))
  if (!auth || !validLesson(auth.course, String(c.lessonId))) return
  const ctx = { childId, course: auth.course, lessonId: String(c.lessonId) }
  if (event === 'ANSWER' && typeof data?.correct === 'boolean') {
    await recordAnswer(ctx, stage, data.correct)
  }
  if (event === 'GAME_OVER') {
    const stars = Number(data?.stars ?? 0)
    // תרגול: ✓ עם כוכב אחד לפחות · העשרה: ✓ בכל ציון
    if (stage === 4 || stars >= 1) await completeStage(ctx, stage, { stars })
  }
}
