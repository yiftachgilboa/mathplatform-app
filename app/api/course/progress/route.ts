import { NextResponse } from 'next/server'
import { adminClient, authorizeChild, loadCourseState } from '@/lib/course/admin'
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

/**
 * זמני, לבדיקות: DELETE { childId, courseId, lessonId } → מאפס את ההתקדמות של הילד בשיעור
 * (שלבים, ציון מבחן, תשובות, שליטה). מופעל בדאבל-קליק על שיעור בתפריט.
 */
export async function DELETE(req: Request) {
  const b = await req.json().catch(() => ({}))
  const auth = await authorizeChild(String(b.childId ?? ''), String(b.courseId ?? ''))
  if (!auth || !validLesson(auth.course, b.lessonId)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const db = adminClient()
  const where = { child_id: b.childId, course_id: auth.course.courseId, lesson_id: b.lessonId }
  const results = await Promise.all(['course_progress', 'course_answers', 'course_mastery'].map(t => db.from(t).delete().match(where)))
  const err = results.find(r => r.error)?.error
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
