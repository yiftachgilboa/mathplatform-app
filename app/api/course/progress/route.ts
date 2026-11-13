import { NextResponse } from 'next/server'
import { authorizeChild, loadCourseState } from '@/lib/course/admin'
import { completeStage, validLesson } from '@/lib/course/record'

/** GET ?childId&courseId → מצב הילד בקורס (רענון אחרי חזרה ממשחק) */
export async function GET(req: Request) {
  const u = new URL(req.url)
  const childId = u.searchParams.get('childId') ?? ''
  const courseId = u.searchParams.get('courseId') ?? ''
  const auth = await authorizeChild(childId, courseId)
  if (!auth) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  return NextResponse.json(await loadCourseState(childId, courseId, auth.course))
}

/** POST { childId, courseId, lessonId, stage } → סימון שלב כהושלם (סרטון / התנסות) */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const auth = await authorizeChild(String(b.childId ?? ''), String(b.courseId ?? ''))
  const stage = Number(b.stage)
  if (!auth || !validLesson(auth.course, b.lessonId) || !(stage >= 1 && stage <= 4)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  await completeStage({ childId: b.childId, course: auth.course, lessonId: b.lessonId }, stage)
  return NextResponse.json({ ok: true })
}
