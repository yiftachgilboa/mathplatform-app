import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  console.log('[DELETE child] env check', {
    url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    secretKey: !!process.env.SUPABASE_SECRET_KEY,
    anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })

  try {
    // Verify ownership — the requesting user must be the child's parent
    const cookieStore = await cookies()
    const anonClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await anonClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    // Verify the child belongs to this parent
    const { data: child, error: fetchError } = await adminClient
      .from('children')
      .select('id')
      .eq('id', id)
      .eq('parent_id', user.id)
      .single()

    if (fetchError || !child) {
      console.log('[DELETE child] ownership check failed', { id, userId: user.id, fetchError })
      return NextResponse.json({ error: 'Child not found' }, { status: 404 })
    }

    // Delete in FK-safe order
    const steps: Array<{ table: string; error: unknown }> = []

    const r1 = await adminClient.from('child_lessons').delete().eq('child_id', id)
    steps.push({ table: 'child_lessons', error: r1.error })
    if (r1.error) console.log('[DELETE child] child_lessons error', r1.error)

    const r2 = await adminClient.from('progress').delete().eq('child_id', id)
    steps.push({ table: 'progress', error: r2.error })
    if (r2.error) console.log('[DELETE child] progress error', r2.error)

    const r3 = await adminClient.from('wrong_answers').delete().eq('child_id', id)
    steps.push({ table: 'wrong_answers', error: r3.error })
    if (r3.error) console.log('[DELETE child] wrong_answers error', r3.error)

    const r4 = await adminClient.from('sessions').delete().eq('child_id', id)
    steps.push({ table: 'sessions', error: r4.error })
    if (r4.error) console.log('[DELETE child] sessions error', r4.error)

    const r5 = await adminClient.from('children').delete().eq('id', id)
    if (r5.error) {
      console.log('[DELETE child] children error', r5.error)
      return NextResponse.json({ error: r5.error.message, steps }, { status: 500 })
    }

    console.log('[DELETE child] success', { id })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.log('[DELETE child] unexpected error', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
