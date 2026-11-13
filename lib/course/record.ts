// שרת בלבד — רישום תשובות, השלמת שלבים ושליטה. משמש את api/course/* ואת api/sdk/event.
import type { Course } from './content'
import { adminClient, practiceAnswers } from './admin'
import { PRACTICE_STAGE, practiceMastered, testPassed, windowAccuracy } from './progress'

type Ctx = { childId: string; course: Course; lessonId: string }

export function validLesson(course: Course, lessonId: string) {
  return course.lessons.some(l => l.id === lessonId)
}

/** כותב שליטה (פעם אחת). מחזיר true אם זו שליטה חדשה. */
async function markMastered({ childId, course, lessonId }: Ctx, via: 'practice' | 'test') {
  const { data, error } = await adminClient().from('course_mastery')
    .upsert({ child_id: childId, course_id: course.courseId, lesson_id: lessonId, via },
      { onConflict: 'child_id,course_id,lesson_id', ignoreDuplicates: true })
    .select('lesson_id')
  if (error) console.error('[course] mastery', error.message)
  return (data?.length ?? 0) > 0
}

async function isMastered({ childId, course, lessonId }: Ctx) {
  const { data } = await adminClient().from('course_mastery').select('lesson_id')
    .eq('child_id', childId).eq('course_id', course.courseId).eq('lesson_id', lessonId).maybeSingle()
  return !!data
}

/** סימון שלב כהושלם (+ כוכבים / ציון). completed=false שומר ציון בלי ✓. */
export async function completeStage(ctx: Ctx, stage: number, extra: { stars?: number; score?: number; completed?: boolean } = {}) {
  const row: Record<string, unknown> = {
    child_id: ctx.childId, course_id: ctx.course.courseId, lesson_id: ctx.lessonId, stage,
    updated_at: new Date().toISOString(),
  }
  if (extra.completed !== false) row.completed_at = new Date().toISOString()
  if (extra.stars != null) row.stars = Math.max(0, Math.min(3, Math.round(extra.stars)))
  if (extra.score != null) row.score = Math.max(0, Math.min(100, Math.round(extra.score)))
  const { error } = await adminClient().from('course_progress')
    .upsert(row, { onConflict: 'child_id,course_id,lesson_id,stage' })
  if (error) console.error('[course] progress', error.message)
}

/** תשובה אחת. בשלב התרגול — בודק שליטה לפי החלון האחרון. */
export async function recordAnswer(ctx: Ctx, stage: number, correct: boolean) {
  const { error } = await adminClient().from('course_answers').insert({
    child_id: ctx.childId, course_id: ctx.course.courseId, lesson_id: ctx.lessonId, stage, correct,
  })
  if (error) console.error('[course] answer', error.message)

  if (stage !== PRACTICE_STAGE) return { accuracy: null, mastered: false, newlyMastered: false }

  const m = ctx.course.mastery.practice
  const answers = await practiceAnswers(ctx.childId, ctx.course.courseId, ctx.lessonId, Math.max(m.window, m.minAnswers))
  const accuracy = windowAccuracy(answers, m.window)
  let newlyMastered = false
  if (practiceMastered(answers, m)) newlyMastered = await markMastered(ctx, 'practice')
  return { accuracy, mastered: newlyMastered || (await isMastered(ctx)), newlyMastered }
}

/** סיום מבחן: שומר ציון (stage 5), ✓ רק אם עבר, ושליטה. */
export async function recordTest(ctx: Ctx, correct: number, total: number) {
  const score = total > 0 ? Math.round((correct / total) * 100) : 0
  const passed = testPassed(score, ctx.course.mastery.test)
  await completeStage(ctx, 5, { score, completed: passed })
  const newlyMastered = passed ? await markMastered(ctx, 'test') : false
  return { score, passed, newlyMastered }
}
