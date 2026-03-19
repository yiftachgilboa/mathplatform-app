import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log('PATCH /api/children/[id]/lessons called', req.url)
  try {
    const { id: childId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { data: child } = await supabase
      .from('children')
      .select('id')
      .eq('id', childId)
      .eq('parent_id', user.id)
      .single()
    if (!child) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const body = await req.json()
    console.log('gameIds received:', body.gameIds)
    const gameIds: string[] = body.gameIds

    const { error: delError } = await supabase
      .from('child_lessons')
      .delete()
      .eq('child_id', childId)
    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

    if (gameIds.length > 0) {
      const rows = gameIds.map((gameId, position) => ({ child_id: childId, game_id: gameId, position }))
      const { error: insError } = await supabase.from('child_lessons').insert(rows)
      if (insError) return NextResponse.json({ error: insError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('PATCH error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
