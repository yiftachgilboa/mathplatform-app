// כל התנסות / משחק של הקורס (עמוד ב-/practices/) מופיע גם במתיקה, בכיתה של הקורס.
// אין רשימה ידנית: הרשימה נגזרת מקובצי הקורס. משחק חדש בקורס = משחק חדש במתיקה.
// שם: ״התנסות <מפתח>״ לשלב 2, ״משחק <מפתח>״ לשלב 3/4. מזהה: kidodo-<שם הקובץ>.
import { allCourseIds, getCourse } from './content'

export type PlatformGame = {
  id: string
  title: string
  grade: number
  /** /practices/<name>.html */
  page: string
  thumbnail: string
  topic: string
  /** איפה הוא בקורס — המטבעות במתיקה הם אותם מטבעות של השלב בקורס */
  courseId: string
  lessonId: string
  stage: number
}

const PREFIX = 'kidodo-'

function pageOf(href?: string) {
  return href && href.startsWith('/practices/') ? href.split('?')[0] : null
}

export function coursePlatformGames(): PlatformGame[] {
  const out: PlatformGame[] = []
  const seen = new Set<string>()
  for (const cid of allCourseIds()) {
    const course = getCourse(cid)
    if (!course) continue
    for (const lesson of course.lessons) {
      const st = lesson.stages
      const items: [string | null, string, string, number][] = [
        [pageOf(st.interactive?.page), 'התנסות', '🔍', 2],
        [pageOf(st.practice?.href), 'משחק', '🎮', 3],
        [pageOf(st.enrichment?.href), 'משחק', '🎮', 4],
      ]
      for (const [page, kind, thumbnail, stage] of items) {
        if (!page) continue
        const id = PREFIX + page.slice('/practices/'.length).replace(/\.html$/, '')
        if (seen.has(id)) continue
        seen.add(id)
        out.push({ id, title: `${kind} ${lesson.key}`, grade: course.grade, page, thumbnail, topic: lesson.key, courseId: cid, lessonId: lesson.id, stage })
      }
    }
  }
  return out
}

export function coursePlatformGame(id: string): PlatformGame | null {
  if (!id.startsWith(PREFIX)) return null
  return coursePlatformGames().find(g => g.id === id) ?? null
}

/** שורה בטבלת games (נדרשת ל-progress ולמסלול של ההורה). is_visible לא נשלח — שורה חדשה גלויה, קיימת שומרת על הערך שלה. */
export function gameRow(g: PlatformGame) {
  return {
    id: g.id,
    title: g.title,
    subject: 'math',
    topic: g.topic,
    grade: g.grade,
    difficulty: 1,
    type: 'game',
    duration_minutes: 5,
    platforms: { mobile: true, tablet: true, desktop: true },
    orientation: 'both',
    language: 'he',
    tier: 'free',
    thumbnail: g.thumbnail,
    sdk_version: 'kidodo',
    url: `/games/${g.id}`,
  }
}
