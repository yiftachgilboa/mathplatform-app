import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const childId = searchParams.get('childId')
  const gameId = searchParams.get('gameId')

  if (!childId || !gameId) {
    return NextResponse.json({ error: 'Missing childId or gameId' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('question_memory')
    .select('*')
    .eq('child_id', childId)
    .eq('game_id', gameId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { childId, gameId, questionKey, correct } = body

  if (!childId || !gameId || !questionKey || correct === undefined) {
    return NextResponse.json({ error: 'Missing childId, gameId, questionKey or correct' }, { status: 400 })
  }

  // Fetch existing record to compute new counters
  const { data: existing } = await supabase
    .from('question_memory')
    .select('correct_count, incorrect_count, in_error_pool')
    .eq('child_id', childId)
    .eq('game_id', gameId)
    .eq('question_key', questionKey)
    .single()

  const prevCorrect = existing?.correct_count ?? 0
  const prevIncorrect = existing?.incorrect_count ?? 0
  const wasInErrorPool = existing?.in_error_pool ?? false

  let newCorrect = prevCorrect
  let newIncorrect = prevIncorrect
  let inErrorPool = wasInErrorPool

  if (correct) {
    newCorrect = prevCorrect + 1
    // Clear error pool once the child answers correctly twice
    if (wasInErrorPool && newCorrect >= 2) {
      inErrorPool = false
    }
  } else {
    newIncorrect = prevIncorrect + 1
    inErrorPool = true
  }

  const { error } = await supabase
    .from('question_memory')
    .upsert(
      {
        child_id: childId,
        game_id: gameId,
        question_key: questionKey,
        correct_count: newCorrect,
        incorrect_count: newIncorrect,
        in_error_pool: inErrorPool,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'child_id,game_id,question_key' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, correct_count: newCorrect, incorrect_count: newIncorrect, in_error_pool: inErrorPool })
}
