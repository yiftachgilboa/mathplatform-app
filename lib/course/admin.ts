// שרת בלבד — אל תייבא מקומפוננטות לקוח.
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getCourse, courseIdFromAccessKey, type Course } from "./content"
import { PRACTICE_STAGE, TEST_STAGE, windowAccuracy, type CourseState } from "./progress"

/** Supabase עם service role — לכתיבה לטבלאות הקורס (עוקף RLS). שרת בלבד. */
export function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  )
}

/** המשתמש המחובר (הורה) או null */
export async function currentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** אילו קורסים נקנו (parent_access: 'course:<id>') */
export async function purchasedCourses(parentId: string): Promise<string[]> {
  const { data } = await adminClient()
    .from('parent_access')
    .select('access_key, expires_at')
    .eq('parent_id', parentId)
    .like('access_key', 'course:%')
  const now = Date.now()
  return (data ?? [])
    .filter(r => !r.expires_at || new Date(r.expires_at).getTime() > now)
    .map(r => courseIdFromAccessKey(r.access_key))
    .filter((id): id is string => !!id)
}

export type Enrollment = {
  child_id: string
  course_id: string
  avatar: string | null
  children: { name: string } | null
}

export async function enrollments(parentId: string): Promise<Enrollment[]> {
  const { data } = await adminClient()
    .from('course_enrollments')
    .select('child_id, course_id, avatar, children(name)')
    .eq('parent_id', parentId)
    .order('created_at')
  return (data ?? []) as unknown as Enrollment[]
}

/**
 * בדיקה לכל API של הקורס: מחובר, הקורס נקנה, והילד רשום אליו אצל ההורה הזה.
 * מחזיר את הקורס או null.
 */
export async function authorizeChild(childId: string, courseId: string) {
  const user = await currentUser()
  const course = getCourse(courseId)
  if (!user || !course || !childId) return null
  const { data } = await adminClient()
    .from('course_enrollments')
    .select('child_id')
    .eq('parent_id', user.id)
    .eq('child_id', childId)
    .eq('course_id', courseId)
    .maybeSingle()
  return data ? { user, course } : null
}

/** תשובות משחק התרגול לשיעור, החדשה ראשונה */
export async function practiceAnswers(childId: string, courseId: string, lessonId: string, limit: number) {
  const { data } = await adminClient()
    .from('course_answers')
    .select('correct')
    .eq('child_id', childId).eq('course_id', courseId).eq('lesson_id', lessonId)
    .eq('stage', PRACTICE_STAGE)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []).map(r => r.correct as boolean)
}

export async function loadCourseState(childId: string, courseId: string, course: Course): Promise<CourseState> {
  const db = adminClient()
  const win = course.mastery.practice.window
  const [{ data: prog }, { data: mast }, { data: ans }] = await Promise.all([
    db.from('course_progress').select('lesson_id, stage, completed_at, score')
      .eq('child_id', childId).eq('course_id', courseId),
    db.from('course_mastery').select('lesson_id')
      .eq('child_id', childId).eq('course_id', courseId),
    db.from('course_answers').select('lesson_id, correct')
      .eq('child_id', childId).eq('course_id', courseId).eq('stage', PRACTICE_STAGE)
      .order('created_at', { ascending: false }).limit(win * course.lessons.length),
  ])

  const state: CourseState = { done: {}, mastered: (mast ?? []).map(m => m.lesson_id), accuracy: {}, testScore: {} }
  for (const p of prog ?? []) {
    if (p.completed_at) (state.done[p.lesson_id] ??= []).push(p.stage)
    if (p.stage === TEST_STAGE && p.score != null) state.testScore[p.lesson_id] = p.score
  }
  const byLesson: Record<string, boolean[]> = {}
  for (const a of ans ?? []) (byLesson[a.lesson_id] ??= []).push(a.correct)
  for (const [id, list] of Object.entries(byLesson)) state.accuracy[id] = windowAccuracy(list, win)
  return state
}
