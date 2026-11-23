// מה הדמות אומרת בבועה: לפי השיעור, השלב, מה שכבר הושלם ואחוז השליטה. כל הטקסטים ב-ui.guide (JSON של הקורס).
import { availableStages, fill, STAGE_KEYS, type Course, type Lesson } from './content'
import { isAchieved, meterValue, PRACTICE_STAGE, type CourseState } from './progress'

export type GuideEvent =
  | { type: 'hello' }                    // כניסה לעמוד
  | { type: 'lesson' }                   // עברו לשיעור אחר
  | { type: 'stage'; done?: number }     // עברו שלב (done = השלב שהושלם ממש עכשיו)
  | { type: 'done'; stage: number }      // שלב הסתיים ונשארים בו
  | { type: 'testFail' }
  | { type: 'remind' }                   // תזכורת, נגיעה בדמות, או חזרה מהחנות

const hasContent = (l: Lesson) => !!l.stages.video?.src || availableStages(l).length > 1

/** כל השלבים שיש בהם תוכן הושלמו (סרטון שעוד לא עלה לא נספר) */
function finished(l: Lesson, state: CourseState) {
  const done = state.done[l.id] ?? []
  return availableStages(l).every(s => done.includes(s) || (s === 1 && !l.stages.video?.src))
}

export function guideText(course: Course, state: CourseState, lessonIdx: number, stage: number, name: string, ev: GuideEvent): string {
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
  const vars = {
    name, key: lesson.key, n: lessonIdx + 1, cur: cur + 1, curPct: cur >= 0 ? meterValue(state, course.lessons[cur].id) : 0, pct, goal,
    pass: Math.round(course.mastery.test.passScore * 100),
  }
  const say = (t: string, more: Record<string, string | number> = {}) => fill(t, { ...vars, ...more })
  const label = (s: number) => course.ui.stages[s - 1]
  const goTo = (s: number) => say(g.goTo, { stage: label(s) })
  const next = stages.find(s => s > stage)

  // מה עושים עכשיו בשלב הזה
  const todo = () => {
    if (empty) return cur < 0 ? g.emptyCurrent : say(g.empty)
    if (stage === 1 && !hasVideo) return next ? `${g.videoSoon} ${goTo(next)}` : g.videoSoon
    if (achieved && stage === PRACTICE_STAGE) return g.practiceAgain
    return say(g.todo[STAGE_KEYS[stage - 1]])
  }
  const praise = (s: number) => say(g.praise[STAGE_KEYS[s - 1]])
  const mastered = () => say(cur < 0 ? g.achieved : cur < lessonIdx ? g.achievedBack : g.achievedNext)
  // כל השלבים נעשו ועוד אין שליטה: לפי האחוזים — סרטון ותרגול, או עוד קצת תרגול
  const improve = () => {
    const back = stages.includes(PRACTICE_STAGE) ? PRACTICE_STAGE : 1
    if (!measured) return back === stage && back !== 1 ? say(g.again) : goTo(back)
    if (pct < 60) return say(hasVideo ? g.low : g.lowNoVideo, { stage: label(back) })
    return say(g.mid, { stage: label(back) })
  }

  switch (ev.type) {
    case 'hello':
    case 'lesson': {
      const hi = ev.type === 'hello' ? say(g.hello) + ' ' : ''
      if (empty) return hi + todo()
      if (achieved) return hi + mastered()
      const started = done.length > 0 || measured
      // שיעור חדש, ולפניו שיעור שעוד לא הושג: לא התחיל / לא סיים ← לסיים קודם. סיים בלי 90% ← ממשיכים, ואפשר לחזק
      if (lessonIdx > cur && !started) return `${hi}${say(curDone ? g.aheadDone : g.ahead)}${curDone ? ' ' + todo() : ''}`
      const line = say(ev.type === 'hello' ? (started ? g.helloResume : g.helloStart) : (started ? g.resume : g.start))
      return `${hi}${line} ${finished(lesson, state) ? improve() : todo()}`
    }
    case 'stage':
      return ev.done ? `${praise(ev.done)} ${todo()}` : todo()
    case 'done':
      return `${praise(ev.stage)} ${next ? goTo(next) : achieved ? mastered() : improve()}`
    case 'testFail':
      return say(g.testFail)
    case 'remind':
      return done.includes(stage) && next ? goTo(next) : todo()
  }
}
