// לוגיקת התקדמות: שיעור נוכחי, דיוק, שליטה. פונקציות טהורות + טעינה מהשרת.
import type { Course, Mastery } from './content'

export const PRACTICE_STAGE = 3
export const TEST_STAGE = 5

/** מצב הילד בקורס — מה שהלקוח מקבל מהשרת */
export type CourseState = {
  /** lessonId → מספרי שלבים (1–5) שהושלמו */
  done: Record<string, number[]>
  /** lessonIds שיש בהם שליטה */
  mastered: string[]
  /** lessonId → דיוק (0–1) בחלון האחרון של משחק התרגול, או null */
  accuracy: Record<string, number | null>
  /** lessonId → ציון מבחן אחרון באחוזים */
  testScore: Record<string, number | null>
}

/** "השיעור הנוכחי" = הראשון ברשימה שעוד אין בו שליטה. הכל נשלט → האחרון. */
export function currentLessonIndex(course: Course, mastered: string[]): number {
  const i = course.lessons.findIndex(l => !mastered.includes(l.id))
  return i === -1 ? course.lessons.length - 1 : i
}

/** דיוק על חלון התשובות האחרונות (answers: החדשה ראשונה). */
export function windowAccuracy(answers: boolean[], window: number): number | null {
  const w = answers.slice(0, window)
  if (w.length === 0) return null
  return w.filter(Boolean).length / w.length
}

export function practiceMastered(answers: boolean[], m: Mastery['practice']): boolean {
  if (answers.length < m.minAnswers) return false
  const acc = windowAccuracy(answers, m.window)
  return acc !== null && acc >= m.accuracy
}

export function testPassed(scorePct: number, m: Mastery['test']): boolean {
  return scorePct >= Math.round(m.passScore * 100)
}

/** הערך שמוצג בבר: דיוק בתרגול, ואם אין — ציון המבחן האחרון. */
export function meterValue(state: CourseState, lessonId: string): number {
  const acc = state.accuracy[lessonId]
  if (acc != null) return Math.round(acc * 100)
  return state.testScore[lessonId] ?? 0
}
