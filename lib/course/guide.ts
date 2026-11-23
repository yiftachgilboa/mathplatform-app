// מה הדמות אומרת בבועה: לפי השיעור, השלב, מה שכבר הושלם ואחוז השליטה. כל הטקסטים ב-ui.guide (JSON של הקורס).
import { availableStages, fill, STAGE_KEYS, type Course } from './content'
import { currentLessonIndex, meterValue, PRACTICE_STAGE, type CourseState } from './progress'

export type GuideEvent =
  | { type: 'hello' }                    // כניסה לעמוד
  | { type: 'lesson' }                   // עברו לשיעור אחר
  | { type: 'stage'; done?: number }     // עברו שלב (done = השלב שהושלם ממש עכשיו)
  | { type: 'done'; stage: number }      // שלב הסתיים ונשארים בו
  | { type: 'testFail' }
  | { type: 'remind' }                   // תזכורת, נגיעה בדמות, או חזרה מהחנות

export function guideText(course: Course, state: CourseState, lessonIdx: number, stage: number, name: string, ev: GuideEvent): string {
  const g = course.ui.guide
  const lesson = course.lessons[lessonIdx]
  const stages = availableStages(lesson)
  const done = state.done[lesson.id] ?? []
  const goal = Math.round(course.mastery.practice.accuracy * 100)
  const cur = currentLessonIndex(course, state.mastered)
  const measured = state.accuracy[lesson.id] != null || state.testScore[lesson.id] != null
  const pct = meterValue(state, lesson.id)
  const achieved = state.mastered.includes(lesson.id) || pct >= goal
  const hasVideo = !!lesson.stages.video?.src
  const empty = !hasVideo && stages.length === 1
  const vars = {
    name, key: lesson.key, n: lessonIdx + 1, cur: cur + 1, pct, goal,
    pass: Math.round(course.mastery.test.passScore * 100),
  }
  const say = (t: string, more: Record<string, string | number> = {}) => fill(t, { ...vars, ...more })
  const label = (s: number) => course.ui.stages[s - 1]
  const goTo = (s: number) => say(g.goTo, { stage: label(s) })
  const next = stages.find(s => s > stage)

  // מה עושים עכשיו בשלב הזה
  const todo = () => {
    if (empty) return cur === lessonIdx ? g.emptyCurrent : say(g.empty)
    if (stage === 1 && !hasVideo) return next ? `${g.videoSoon} ${goTo(next)}` : g.videoSoon
    return say(g.todo[STAGE_KEYS[stage - 1]])
  }
  const praise = (s: number) => say(g.praise[STAGE_KEYS[s - 1]])
  const mastered = () => say(cur === lessonIdx ? g.achieved : g.achievedNext)
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
      if (lessonIdx > cur && !done.length) return hi + say(g.ahead)
      const started = done.length > 0 || measured
      const line = say(ev.type === 'hello' ? (started ? g.helloResume : g.helloStart) : (started ? g.resume : g.start))
      const complete = stages.every(s => done.includes(s) || (s === 1 && !hasVideo))
      return `${hi}${line} ${complete ? improve() : todo()}`
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
