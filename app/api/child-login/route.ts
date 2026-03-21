import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { childName, code } = await req.json()

  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  // שלב 1: מצא parent לפי access_code
  const { data: profile } = await s
    .from('profiles')
    .select('id')
    .eq('access_code', code)
    .single()

  if (!profile) return NextResponse.json({ error: 'קוד שגוי' }, { status: 401 })

  // שלב 2: מצא ילד לפי שם + parent_id
  const { data: child } = await s
    .from('children')
    .select('id, name, grade, avatar, parent_id')
    .eq('name', childName)
    .eq('parent_id', profile.id)
    .single()

  if (!child) return NextResponse.json({ error: 'ילד לא נמצא' }, { status: 404 })

  // קבל את האימייל של ההורה
  const { data: parentData, error: parentError } = await s.auth.admin.getUserById(child.parent_id)
  if (parentError || !parentData?.user?.email) {
    return NextResponse.json({ error: 'שגיאה בטעינת ההורה' }, { status: 500 })
  }

  // צור magic link — נשתמש ב-hashed_token בצד הלקוח
  const { data: linkData, error: linkError } = await s.auth.admin.generateLink({
    type: 'magiclink',
    email: parentData.user.email,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: 'שגיאה ביצירת session' }, { status: 500 })
  }

  return NextResponse.json({
    child,
    hashed_token: linkData.properties.hashed_token,
  })
}
