// מה הדמות אומרת בבועה: לפי השיעור, השלב, מה שכבר הושלם ואחוז השליטה. כל הטקסטים ב-ui.guide (JSON של הקורס).
// לכל משפט כמה גרסאות (מערך) — נבחרת אחת באקראי, לא אותה פעמיים ברצף.
// שני סוגים: מה שחוזר בכל פעם (באיזה שיעור, כמה אחוז, מה עושים עכשיו) — קצר וישיר;
// והסברים (tips: המשולש הכחול, 90 אחוז = מפתח, מה זו התנסות…) — נאמרים פעם אחת לכל ילד, ואז לא חוזרים.
import { availableStages, fill, STAGE_KEYS, type Course, type Lesson } from './content'
import { isAchieved, meterValue, PRACTICE_STAGE, type CourseState } from './progress'

export type GuideEvent =
  | { type: 'hello' }                    // כניסה לעמוד
  | { type: 'lesson' }                   // עברו לשיעור אחר (הילד בחר אותו — לא אומרים לו באיזה שיעור הוא)
  | { type: 'stage'; done?: number }     // עברו שלב (done = השלב שהושלם ממש עכשיו)
  | { type: 'done'; stage: number }      // שלב הסתיים ונשארים בו
  | { type: 'testFail' }
  | { type: 'remind' }                   // תזכורת, נגיעה בדמות, או חזרה מהחנות

/** על מה היד מצביעה: שלב בשורת השלבים, או שיעור בתפריט */
export type GuidePoint = { stage: number } | { lesson: number }

export type TipKey = 'play' | 'interactive' | 'practice' | 'goal' | 'test' | 'enrichment' | 'shop'

const hasContent = (l: Lesson) => !!l.stages.video?.src || availableStages(l).some(s => s > 1)

/** כל השלבים שיש בהם תוכן הושלמו (סרטון שעוד לא עלה לא נספר) */
function finished(l: Lesson, state: CourseState) {
  const done = state.done[l.id] ?? []
  return availableStages(l).every(s => done.includes(s) || (s === 1 && !l.stages.video?.src))
}

const lastPick = new Map<string[], number>()
/** גרסה אקראית, לא אותה פעמיים ברצף */
function pick(list: string[] | string): string {
  if (typeof list === 'string') return list
  if (list.length < 2) return list[0] ?? ''
  let i = Math.floor(Math.random() * list.length)
  if (i === lastPick.get(list)) i = (i + 1) % list.length
  lastPick.set(list, i)
  return list[i]
}

/**
 * הטקסט לבועה, וההסברים שנאמרו בו (useGuide זוכר אותם, כדי שלא יחזרו).
 * seen = הסברים שהילד כבר שמע.
 */
export function guideText(course: Course, state: CourseState, lessonIdx: number, stage: number, name: string, ev: GuideEvent, seen: ReadonlySet<string> = new Set()): { text: string; tips: TipKey[]; point: GuidePoint | null } {
  const g = course.ui.guide
  const lesson = course.lessons[lessonIdx]
  const stages = availableStages(lesson)
  const done = state.done[lesson.id] ?? []
  const goal = Math.round(course.mastery.practice.accuracy * 100)
  // השיעור שהילד נמצא בו: הראשון שעוד לא הושג ויש בו תוכן. -1 = הכול הושג
  const cur = course.lessons.findIndex(l => hasContent(l) && !isAchieved(course, state, l.id))
  const measured = state.accuracy[lesson.id] != null || state.testScore[lesson.id] != null
  const pct = meterValue(state, lesson.id)
  const achieved = isAchieved(course, state, lesson.id)
  const hasVideo = !!lesson.stages.video?.src
  const empty = !hasContent(lesson)
  const curDone = cur >= 0 ? finished(course.lessons[cur], state) : false
  const started = done.length > 0 || measured
  const vars = {
    name, key: lesson.key, n: lessonIdx + 1, cur: cur + 1, curPct: cur >= 0 ? meterValue(state, course.lessons[cur].id) : 0, pct, goal,
    pass: Math.round(course.mastery.test.passScore * 100),
  }
  const say = (t: string[] | string, more: Record<string, string | number> = {}) => fill(pick(t), { ...vars, ...more })
  const label = (s: number) => course.ui.stages[s - 1]
  // ממליצים ללחוץ על משהו ← היד מצביעה עליו
  let point: GuidePoint | null = null
  const toStage = (s: number) => { if (s !== stage) point = { stage: s } }
  const toLesson = (i: number) => { if (i >= 0 && i !== lessonIdx) point = { lesson: i } }
  const goTo = (s: number) => { toStage(s); return say(g.goTo, { stage: label(s) }) }
  const next = stages.find(s => s > stage)
  const key = (s: number) => STAGE_KEYS[s - 1]

  // הסברים: כל אחד פעם אחת לילד, ולכל היותר אחד בבועה (שלא תהיה ארוכה)
  const tips: TipKey[] = []
  const tip = (k: TipKey) => {
    if (seen.has(k) || tips.length) return ''
    tips.push(k)
    return say(g.tips[k])
  }
  /** ההסבר שמתאים לשלב הזה: קודם המשולש הכחול, אחר כך מה זה השלב */
  const stageTip = (s: number) => {
    if (s === 5) return tip('test')
    if (!seen.has('play')) return tip('play')
    if (s === 2) return tip('interactive')
    if (s === 3) return tip('practice') || tip('goal')
    if (s === 4) return tip('enrichment')
    return ''
  }

  // מה עושים עכשיו בשלב הזה (חוזר בכל פעם — קצר)
  const todo = () => {
    if (empty) { if (cur >= 0) toLesson(cur); return cur < 0 ? say(g.emptyCurrent) : say(g.empty) }
    if (stage === 1 && !hasVideo) return next ? `${say(g.videoSoon)} ${goTo(next)}` : say(g.videoSoon)
    if (achieved && stage === PRACTICE_STAGE) return say(g.practiceAgain)
    return join(say(g.todo[key(stage)]), stageTip(stage))
  }
  /** כמה מהשיעור עברנו (חוזר בכל פעם — חשוב). בלי אחוזים: היעד הוא לסיים את השיעור, והבר מלא ביעד */
  const progress = Math.min(1, pct / goal)
  const status = () => (!measured || achieved ? '' : say(progress < .5 ? g.statusStart : progress < .8 ? g.statusHalf : g.statusNear))
  const praise = (s: number) => say(g.praise[key(s)])
  const mastered = () => { if (cur >= 0) toLesson(cur); return say(cur < 0 ? g.achieved : cur < lessonIdx ? g.achievedBack : g.achievedNext) }
  // כל השלבים נעשו ועוד אין שליטה: לאן חוזרים
  const improve = () => {
    const back = stages.includes(PRACTICE_STAGE) ? PRACTICE_STAGE : hasVideo ? 1 : stages.find(s => s > 1) ?? 1
    if (!measured) return back === stage && back !== 1 ? say(g.again) : goTo(back)
    const where = { stage: label(back) }
    if (progress < .65) { toStage(hasVideo ? 1 : back); return join(status(), hasVideo ? say(g.videoAgain, where) : say(g.slowly, where)) }
    return join(status(), back === stage ? say(g.again) : goTo(back))
  }
  /** אחרי שלב שהושלם — לאן ממשיכים (אחרי התנסות: ״עכשיו שהבנתם, בואו נתרגל״) */
  const afterDone = (s: number) => {
    if (s === 2 && stage === PRACTICE_STAGE && !achieved) return join(say(g.afterInteractive), stageTip(stage))
    return todo()
  }

  switch (ev.type) {
    case 'hello':
    case 'lesson': {
      const hi = ev.type === 'hello' ? say(g.hello) : ''
      if (empty) return out(hi, todo())
      if (achieved) return out(hi, mastered())
      // שיעור חדש, ולפניו שיעור שעוד לא הושג: לא התחיל / לא סיים ← לסיים קודם. סיים בלי 90% ← מתחילים, ואפשר לחזק
      if (lessonIdx > cur && !started) { if (!curDone) toLesson(cur); return out(hi, say(curDone ? g.aheadDone : g.ahead), curDone ? todo() : '') }
      // בכניסה: באיזה שיעור (מתחילים / ממשיכים). בבחירת שיעור: רק אם מתחילים — הילד יודע איפה הוא
      const where = ev.type === 'hello' ? say(started ? g.helloResume : g.helloStart) : started ? '' : say(g.start)
      return out(hi, where, finished(lesson, state) ? improve() : join(status(), todo()))
    }
    case 'stage':
      return ev.done ? out(praise(ev.done), afterDone(ev.done), tip('shop')) : out(todo())
    case 'done':
      return out(praise(ev.stage), next ? goTo(next) : achieved ? mastered() : improve(), tip('shop'))
    case 'testFail':
      return out(say(g.testFail))
    case 'remind':
      return out(done.includes(stage) && next ? goTo(next) : todo())
  }

  function out(...parts: string[]) { return { text: join(...parts), tips, point } }
}

function join(...parts: string[]) { return parts.filter(Boolean).join(' ') }
