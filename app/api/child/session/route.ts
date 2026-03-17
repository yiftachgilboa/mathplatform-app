import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// TODO: create sessions table in Supabase:
// create table sessions (
//   id uuid primary key default gen_random_uuid(),
//   child_id uuid references children(id),
//   started_at timestamptz not null
// );

export async function POST(req: NextRequest) {
  const { childId } = await req.json()
  if (!childId) return NextResponse.json({ error: 'missing childId' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase
    .from('sessions')
    .insert({ child_id: childId, started_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
