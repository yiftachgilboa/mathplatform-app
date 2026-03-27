import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  console.log('[SDK event] body:', JSON.stringify(body))
  const { event, childId, gameId, data, timestamp } = body

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
