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

/** שיעור שהושג: שליטה שנרשמה בשרת, או 90% בתרגול / במבחן. ההגדרה היחידה: הווי הירוק, השיעור הנוכחי ומה שהדמות אומרת. */
export function isAchieved(course: Course, state: CourseState, lessonId: string): boolean {
  return state.mastered.includes(lessonId) || meterValue(state, lessonId) >= Math.round(course.mastery.practice.accuracy * 100)
}

/** "השיעור הנוכחי" = הראשון ברשימה שעוד לא הושג. הכל הושג → האחרון. */
export function currentLessonIndex(course: Course, state: CourseState): number {
  const i = course.lessons.findIndex(l => !isAchieved(course, state, l.id))
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
