import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_SETTINGS = { topics: ['add20'], multiplyTables: [], breakingTen: false }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function GET(req: NextRequest) {
  const childId = new URL(req.url).searchParams.get('childId')

  if (!childId) {
    return NextResponse.json({ error: 'Missing childId' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('targulon_settings')
    .select('settings')
    .eq('child_id', childId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data?.settings ?? DEFAULT_SETTINGS)
}

export async function POST(req: NextRequest) {
  const { childId, settings } = await req.json()

  if (!childId || settings === undefined) {
    return NextResponse.json({ error: 'Missing childId or settings' }, { status: 400 })
  }

  const { error } = await supabase
    .from('targulon_settings')
    .upsert({ child_id: childId, settings }, { onConflict: 'child_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
