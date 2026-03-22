import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function POST(req: NextRequest) {
  const { childId } = await req.json()
  if (!childId) return NextResponse.json({ error: 'missing childId' }, { status: 400 })

  try {
    const { error } = await supabase
      .from('sessions')
      .insert({ child_id: childId, started_at: new Date().toISOString() })

    if (error) {
      console.error('[child/session] supabase error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[child/session] unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
