import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { theme } = await request.json()
  if (!theme) return NextResponse.json({ error: 'Missing theme' }, { status: 400 })

  // וודא שהילד שייך להורה
  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', id)
    .eq('parent_id', user.id)
    .single()

  if (!child) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase
    .from('children')
    .update({ theme })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
