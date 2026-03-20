import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const id = params.id

  await supabase.from('child_lessons').delete().eq('child_id', id)
  await supabase.from('progress').delete().eq('child_id', id)
  await supabase.from('wrong_answers').delete().eq('child_id', id)

  const { error } = await supabase.from('children').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
