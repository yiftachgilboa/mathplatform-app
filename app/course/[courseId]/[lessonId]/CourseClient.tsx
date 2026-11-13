'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fill, mediaUrl, type Course, type Lesson } from '@/lib/course/content'
import { currentLessonIndex, meterValue, PRACTICE_STAGE, type CourseState } from '@/lib/course/progress'
import CourseHeader from '@/components/course/CourseHeader'
import LessonMenu, { type LessonState } from '@/components/course/LessonMenu'
import LessonHero from '@/components/course/LessonHero'
import StageStepper from '@/components/course/StageStepper'
import StageNav from '@/components/course/StageNav'
import VideoStage from '@/components/course/VideoStage'
import InteractiveVideoStage from '@/components/course/InteractiveVideoStage'
import GameStage from '@/components/course/GameStage'
import TestStage from '@/components/course/TestStage'

type Props = {
  course: Course
  childId: string
  childName: string
  avatar: string
  initialLesson: number
  initialStage: number | null
  initialState: CourseState
}

/** השלב שנכנסים אליו בשיעור: הראשון שעוד לא הושלם */
function defaultStage(state: CourseState, lesson: Lesson) {
  const done = state.done[lesson.id] ?? []
  for (let s = 1; s <= 5; s++) if (!done.includes(s)) return s
  return 1
}

export default function CourseClient({ course, childId, childName, avatar, initialLesson, initialStage, initialState }: Props) {
  const ui = course.ui
  const router = useRouter()
  const [state, setState] = useState(initialState)
  const [lessonIdx, setLessonIdx] = useState(initialLesson)
  const [stage, setStage] = useState(initialStage ?? defaultStage(initialState, course.lessons[initialLesson]))
  const [celebrate, setCelebrate] = useState<Lesson | null>(null)
  const knownMastered = useRef(new Set(initialState.mastered))

  const lesson = course.lessons[lessonIdx]
  const currentIdx = currentLessonIndex(course, state.mastered)
  const ctx = useMemo(() => ({ childId, courseId: course.courseId, lessonId: lesson.id }), [childId, course.courseId, lesson.id])

  const lessonStates: LessonState[] = course.lessons.map((l, i) =>
    state.mastered.includes(l.id) ? 'done' : i === currentIdx ? 'cur' : 'future')

  const refreshRef = useRef<() => void>(() => {})
  // בחזרה ממשחק (router.back) Next משחזר את העמוד מה-cache עם props ישנים:
  // לוקחים את השלב מהכתובת ומרעננים מהשרת.
  useEffect(() => {
    const s = Number(new URLSearchParams(window.location.search).get('stage'))
    if (s >= 1 && s <= 5) setStage(s)
    setTimeout(() => refreshRef.current(), 0) // אחרי שה-ref מתעדכן (effect מאוחר יותר)
  }, [])

  // הכתובת משקפת שיעור + שלב (כדי שחזרה ממשחק תנחת באותו מקום)
  useEffect(() => {
    const url = `/course/${course.courseId}/${lesson.id}?child=${childId}&stage=${stage}`
    if (window.location.pathname + window.location.search !== url) window.history.replaceState(window.history.state, '', url)
  }, [course.courseId, lesson.id, childId, stage])

  const go = useCallback((li: number, st?: number) => {
    const l = course.lessons[li]
    setLessonIdx(li)
    setStage(st ?? defaultStage(state, l))
  }, [course.lessons, state])

  // שליטה חדשה → מסך חגיגה
  const onMastered = useCallback((lessonId: string) => {
    knownMastered.current.add(lessonId)
    const l = course.lessons.find(x => x.id === lessonId)
    if (l) setCelebrate(l)
  }, [course.lessons])

  // רענון מהשרת (בכניסה, ובחזרה ממשחק — שם נרשמות התשובות דרך ה-SDK)
  const refresh = useCallback(async () => {
    const res = await fetch(`/api/course/progress?childId=${childId}&courseId=${course.courseId}`, { cache: 'no-store' })
    if (!res.ok) return
    const fresh: CourseState = await res.json()
    setState(fresh)
    const gained = fresh.mastered.find(id => !knownMastered.current.has(id))
    if (gained) onMastered(gained)
  }, [childId, course.courseId, onMastered])

  useEffect(() => { refreshRef.current = refresh }, [refresh])

  useEffect(() => {
    const onShow = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onShow)
    window.addEventListener('pageshow', onShow)
    return () => { document.removeEventListener('visibilitychange', onShow); window.removeEventListener('pageshow', onShow) }
  }, [refresh])

  function markDone(s: number) {
    setState(prev => {
      const done = prev.done[lesson.id] ?? []
      return done.includes(s) ? prev : { ...prev, done: { ...prev.done, [lesson.id]: [...done, s] } }
    })
  }

  async function completeStage(s: number, autoAdvance: boolean) {
    markDone(s)
    fetch('/api/course/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ctx, stage: s }) })
    if (autoAdvance && s < 5) setTimeout(() => setStage(cur => (cur === s ? s + 1 : cur)), 900)
  }

  function sendAnswer(s: number, correct: boolean) {
    fetch('/api/course/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ctx, stage: s, correct }) })
  }

  function playGame(kind: 'practice' | 'enrichment') {
    const g = lesson.stages[kind]
    if (!g) return
    const url = new URL(g.href ?? `/games/${g.gameId}`, window.location.origin)
    url.searchParams.set('childId', childId)
    url.searchParams.set('courseId', course.courseId)
    url.searchParams.set('lessonId', lesson.id)
    url.searchParams.set('courseStage', String(kind === 'practice' ? PRACTICE_STAGE : 4))
    router.push(url.pathname + url.search)
  }

  async function finishTest(correct: number, total: number) {
    const res = await fetch('/api/course/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ctx, correct, total }) })
    const out = res.ok ? await res.json() : { passed: false, score: 0 }
    setState(prev => ({ ...prev, testScore: { ...prev.testScore, [lesson.id]: out.score } }))
    if (out.passed) {
      markDone(5)
      setState(prev => prev.mastered.includes(lesson.id) ? prev : { ...prev, mastered: [...prev.mastered, lesson.id] })
      setTimeout(() => onMastered(lesson.id), 900)
    }
    return { passed: !!out.passed }
  }

  function closeCelebration() {
    setCelebrate(null)
    // מעבר לשיעור הנוכחי החדש (הראשון בלי שליטה)
    go(currentLessonIndex(course, state.mastered))
  }

  useEffect(() => {
    if (!celebrate) return
    const t = setTimeout(closeCelebration, 3500)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrate])

  const next = () => { if (stage < 5) setStage(stage + 1); else if (lessonIdx < course.lessons.length - 1) go(lessonIdx + 1, 1) }
  const prev = () => { if (stage > 1) setStage(stage - 1); else if (lessonIdx > 0) go(lessonIdx - 1, 5) }

  const st = lesson.stages
  const tint = lesson.tint

  return (
    <>
      <CourseHeader hello={fill(ui.welcome, { name: childName })} avatar={avatar} avatarLabel={ui.yourAvatar} logoutLabel={ui.logout} />
      <div className="c-wrap">
        <LessonMenu lessons={course.lessons} states={lessonStates} selected={lessonIdx} label={ui.lessonsNav} onPick={i => go(i)} />
        <main className="c-main">
          <LessonHero lesson={lesson} title={fill(ui.lessonTitle, { key: lesson.key })}
            meter={meterValue(state, lesson.id)} goal={Math.round(course.mastery.practice.accuracy * 100)} meterLabel={ui.meter} />
          <StageStepper labels={ui.stages} stage={stage} done={state.done[lesson.id] ?? []} label={ui.stagesNav} onPick={setStage} />

          <section className="c-stage" key={`${lesson.id}-${stage}`}>
            {stage === 1 && (
              <VideoStage src={mediaUrl(st.video?.src)} poster={mediaUrl(st.video?.poster)} tint={tint}
                playLabel={ui.playVideo} soonLabel={ui.comingSoon} onComplete={() => completeStage(1, false)} />
            )}
            {stage === 2 && (st.interactive?.cues.length ? (
              <InteractiveVideoStage src={mediaUrl(st.interactive.src)} cues={st.interactive.cues} playLabel={ui.playVideo} retryLabel={ui.retry}
                onAnswer={c => sendAnswer(2, c)} onComplete={() => completeStage(2, true)} />
            ) : (
              <GameStage kind="practice" tint={tint} label="" soonLabel={ui.comingSoon} available={false} onPlay={() => {}} />
            ))}
            {stage === 3 && (
              <GameStage kind="practice" tint={tint} label={ui.playPractice} soonLabel={ui.comingSoon} available={!!st.practice} onPlay={() => playGame('practice')} />
            )}
            {stage === 4 && (
              <GameStage kind="enrichment" tint={tint} label={ui.playEnrichment} soonLabel={ui.comingSoon} available={!!st.enrichment} onPlay={() => playGame('enrichment')} />
            )}
            {stage === 5 && (st.test?.questions.length ? (
              <TestStage questions={st.test.questions} count={course.mastery.test.questions} mascot={avatar} ui={ui}
                onAnswer={c => sendAnswer(5, c)} onFinish={finishTest} onBackToPractice={() => setStage(PRACTICE_STAGE)} />
            ) : (
              <GameStage kind="enrichment" tint={tint} label="" soonLabel={ui.comingSoon} available={false} onPlay={() => {}} />
            ))}
          </section>

          <StageNav prevLabel={ui.prev} nextLabel={ui.next} onPrev={prev} onNext={next}
            hidePrev={lessonIdx === 0 && stage === 1} hideNext={lessonIdx === course.lessons.length - 1 && stage === 5} />
        </main>
      </div>

      {celebrate && (
        <div role="dialog" aria-modal="true" aria-label={fill(ui.mastered, { key: celebrate.key })} onClick={closeCelebration}
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(22,62,107,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="pop" onClick={e => e.stopPropagation()}
            style={{ background: celebrate.tint, borderRadius: 32, padding: '32px 24px', maxWidth: 460, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar} alt="" className="bob" style={{ width: 150, height: 150, objectFit: 'contain' }} />
            <p style={{ margin: 0, fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.15 }}>
              {fill(ui.mastered, { key: celebrate.key })}
            </p>
            <button type="button" className="press c-primary" onClick={closeCelebration} autoFocus
              style={{ minHeight: 56, padding: '0 32px', borderRadius: 999, fontSize: 20, fontWeight: 800 }}>{ui.continue}</button>
          </div>
        </div>
      )}
    </>
  )
}
