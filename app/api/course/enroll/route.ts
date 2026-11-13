import { NextResponse } from 'next/server'
import { getCourse } from '@/lib/course/content'
import { adminClient, currentUser, purchasedCourses } from '@/lib/course/admin'

/**
 * POST { courseId, avatar, childId? , name? }
 * משייך ילד קיים (childId) או יוצר ילד חדש (name) לקורס. מחזיר { href } לשיעור הראשון.
 */
export async function POST(req: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const courseId = String(body.courseId ?? '')
  const course = getCourse(courseId)
  if (!course) return NextResponse.json({ error: 'unknown course' }, { status: 400 })

  const avatar = course.avatars.some(a => a.id === body.avatar) ? body.avatar : course.avatars[0].id
  const db = adminClient()

  // אפשר לשייך רק כמה ילדים כמספר הרכישות של הקורס
  const purchased = (await purchasedCourses(user.id)).filter(id => id === courseId).length
  const { count } = await db.from('course_enrollments').select('id', { count: 'exact', head: true })
    .eq('parent_id', user.id).eq('course_id', courseId)
  if (purchased === 0 || (count ?? 0) >= purchased) {
    return NextResponse.json({ error: 'no seat' }, { status: 403 })
  }

  let childId: string
  if (body.childId) {
    const { data: child } = await db.from('children').select('id').eq('id', body.childId).eq('parent_id', user.id).maybeSingle()
    if (!child) return NextResponse.json({ error: 'child not found' }, { status: 404 })
    childId = child.id
  } else {
    const name = String(body.name ?? '').trim().slice(0, 40)
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    const { data: dup } = await db.from('children').select('id').eq('parent_id', user.id).eq('name', name).maybeSingle()
    if (dup) return NextResponse.json({ error: 'name taken', code: 'nameTaken' }, { status: 409 })
    const { data: created, error } = await db.from('children')
      .insert({ name, grade: course.grade, parent_id: user.id }).select('id').single()
    if (error || !created) return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 })
    childId = created.id
  }

  const { error } = await db.from('course_enrollments')
    .insert({ parent_id: user.id, child_id: childId, course_id: courseId, avatar })
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === '23505' ? 409 : 500 })

  return NextResponse.json({ href: `/course/${courseId}/${course.lessons[0].id}?child=${childId}` })
}
