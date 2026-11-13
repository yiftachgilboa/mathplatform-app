import { NextResponse } from 'next/server'
import { authorizeChild } from '@/lib/course/admin'
import { recordTest, validLesson } from '@/lib/course/record'

/** POST { childId, courseId, lessonId, correct, total } → { score, passed, newlyMastered } */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const auth = await authorizeChild(String(b.childId ?? ''), String(b.courseId ?? ''))
  const correct = Number(b.correct), total = Number(b.total)
  if (!auth || !validLesson(auth.course, b.lessonId) || !(total > 0 && correct >= 0 && correct <= total)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const out = await recordTest({ childId: b.childId, course: auth.course, lessonId: b.lessonId }, correct, total)
  return NextResponse.json(out)
}
