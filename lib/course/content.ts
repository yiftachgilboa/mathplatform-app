// טעינת קבצי תוכן הקורס (content/courses/<courseId>.json) + החלפת {placeholders}.
// קורס חדש = קובץ JSON חדש + שורה אחת ב-COURSES.
import kidodoG1 from '@/content/courses/kidodo-g1.json'

export type Cue = { t: number; q: string; answers: string[]; correct: number; hint?: string }
export type Question = { q: string; answers: string[]; correct: number }
export type GameRef = { gameId: string; href?: string }

export type LessonStages = {
  video?: { src: string; poster?: string }
  interactive?: { src?: string; cues: Cue[] }
  practice?: GameRef
  enrichment?: GameRef
  test?: { questions: Question[] }
}

export type Lesson = {
  id: string
  key: string
  tagline: string
  range?: string
  tint: string
  deep: string
  icon: string
  stages: LessonStages
}

export type Avatar = { id: string; img: string; name: string }

export type Mastery = {
  practice: { accuracy: number; minAnswers: number; window: number }
  test: { passScore: number; questions: number }
}

export type CourseUi = typeof kidodoG1.ui

export type Course = {
  ui: CourseUi
  courseId: string
  courseTitle: string
  grade: number
  mastery: Mastery
  avatars: Avatar[]
  lessons: Lesson[]
}

const COURSES: Record<string, Course> = {
  'kidodo-g1': kidodoG1 as Course,
}

export function getCourse(courseId: string): Course | null {
  return COURSES[courseId] ?? null
}

export function allCourseIds(): string[] {
  return Object.keys(COURSES)
}

/** 'course:kidodo-g1' → 'kidodo-g1' (רק קורסים שיש להם קובץ תוכן) */
export function courseIdFromAccessKey(key: string): string | null {
  if (!key.startsWith('course:')) return null
  const id = key.slice('course:'.length)
  return COURSES[id] ? id : null
}

/** "שלום, {name}!" + { name: 'נועה' } → "שלום, נועה!" */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

export function avatarImg(course: Course, avatarId: string | null | undefined): string {
  return (course.avatars.find(a => a.id === avatarId) ?? course.avatars[0]).img
}

/** נתיב יחסי ב-bucket kidodo-media → URL ציבורי. URL מלא / נתיב שמתחיל ב-/ — כמו שהוא. */
export function mediaUrl(path: string | undefined): string | undefined {
  if (!path) return undefined
  if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/kidodo-media/${path}`
}

export const STAGE_KEYS = ['video', 'interactive', 'practice', 'enrichment', 'test'] as const
export type StageKey = (typeof STAGE_KEYS)[number]
