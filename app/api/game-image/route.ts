import { createClient } from '@supabase/supabase-js'
import { GAME_IMAGES } from '@/app/games/math-word-problems-001/images'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

export async function GET(req: NextRequest) {
  const childId = req.nextUrl.searchParams.get('childId')
  const gameId = req.nextUrl.searchParams.get('gameId')

  const supabase = getSupabase()

  const { data: used } = await supabase
    .from('game_image_usage')
    .select('image_url')
    .eq('child_id', childId)
    .eq('game_id', gameId)
    .order('used_at', { ascending: false })

  const usedUrls = (used || []).map((r: { image_url: string }) => r.image_url)
  const unused = GAME_IMAGES.filter(u => !usedUrls.includes(u))
  const url = unused.length > 0 ? unused[0] : GAME_IMAGES[0]

  return NextResponse.json({ url })
}

export async function POST(req: NextRequest) {
  const { childId, gameId, imageUrl } = await req.json()

  const supabase = getSupabase()

  await supabase
    .from('game_image_usage')
    .insert({ child_id: childId, game_id: gameId, image_url: imageUrl })

  return NextResponse.json({ ok: true })
}
