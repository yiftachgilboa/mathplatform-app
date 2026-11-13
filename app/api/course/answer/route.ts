import { NextResponse } from 'next/server'
import { authorizeChild } from '@/lib/course/admin'
import { recordAnswer, validLesson } from '@/lib/course/record'

/** POST { childId, courseId, lessonId, stage, correct } → { accuracy, mastered, newlyMastered } */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const auth = await authorizeChild(String(b.childId ?? ''), String(b.courseId ?? ''))
  const stage = Number(b.stage)
  if (!auth || !validLesson(auth.course, b.lessonId) || !(stage >= 1 && stage <= 5)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const out = await recordAnswer({ childId: b.childId, course: auth.course, lessonId: b.lessonId }, stage, !!b.correct)
  return NextResponse.json(out)
}
