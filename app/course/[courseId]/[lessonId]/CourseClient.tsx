'use client'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { availableStages, fill, mediaUrl, type Course, type Lesson } from '@/lib/course/content'
import { currentLessonIndex, isAchieved, meterValue, PRACTICE_STAGE, type CourseState } from '@/lib/course/progress'
import CourseHeader from '@/components/course/CourseHeader'
import LessonMenu, { type LessonState } from '@/components/course/LessonMenu'
import StageStepper from '@/components/course/StageStepper'
import StageNav from '@/components/course/StageNav'
import VideoStage from '@/components/course/VideoStage'
import InteractiveVideoStage from '@/components/course/InteractiveVideoStage'
import GameStage from '@/components/course/GameStage'
import PracticeStage from '@/components/course/PracticeStage'
import TestStage from '@/components/course/TestStage'
import Shop from '@/components/course/Shop'
import Hero, { useIdleAct, type Act } from '@/components/course/Hero'
import { useGuide } from '@/components/course/useGuide'
import { GuideBubble, HeroCard, HeroStrip, flyCoins, useHeroPose } from '@/components/course/HeroCard'
import type { ShopState } from '@/lib/shop/config'
import { afterDecide, shareLook, shopAction, tone } from '@/lib/shop/client'
import { practiceUrl, prefetch, PRACTICE_ASSETS, warmSpeech } from '@/lib/course/practice'

type Props = {
  course: Course
  childId: string
  childName: string
  avatar: string
  initialLesson: number
  initialStage: number | null
  initialState: CourseState
  /** הארנק, הדמות והחנות. null = עוד לא מותקן (הקורס עובד בלעדיהם) */
  initialShop: ShopState | null
}

/** השלב שנכנסים אליו בשיעור: הראשון (מאלה שיש בהם תוכן) שעוד לא הושלם */
function defaultStage(state: CourseState, lesson: Lesson) {
  const done = state.done[lesson.id] ?? []
  return availableStages(lesson).find(s => !done.includes(s)) ?? 1
}

/** שלב שאין בו תוכן → השלב הראשון */
function fitStage(lesson: Lesson, s: number) {
  return availableStages(lesson).includes(s) ? s : 1
}

export default function CourseClient({ course, childId, childName, avatar, initialLesson, initialStage, initialState, initialShop }: Props) {
  const ui = course.ui
  const [state, setState] = useState(initialState)
  const [lessonIdx, setLessonIdx] = useState(initialLesson)
  const [stage, setStage] = useState(initialStage ? fitStage(course.lessons[initialLesson], initialStage) : defaultStage(initialState, course.lessons[initialLesson]))
  const [celebrate, setCelebrate] = useState<Lesson | null>(null)
  const knownMastered = useRef(new Set(initialState.mastered))

  // ---- הארנק, הדמות והחנות ----
  const [shop, setShop] = useState(initialShop)
  const [shopOpen, setShopOpen] = useState(false)
  const [happy, setHappy] = useState(0)          // גדל בכל פעם שהדמות חוגגת
  const moodAct = useHeroPose(happy)
  const coinsRef = useRef(initialShop?.coins ?? 0)
  const look = shop?.look
  // המשחקים (iframe) מקבלים את המראה מכאן — לפני שהם נטענים, ושוב כשהוא משתנה
  useLayoutEffect(() => { if (look) shareLook(childId, look) }, [childId, look])

  // מטבעות חדשים: עפים לארנק והדמות חוגגת. אם המשחק במסך מלא — מחכים שיוקטן
  const takeShop = useCallback((s: ShopState | null | undefined) => {
    if (!s) return
    const gain = s.coins - coinsRef.current
    coinsRef.current = s.coins
    if (gain <= 0) { setShop(s); return }
    const celebrateCoins = () => {
      if (document.querySelector('.c-practice[data-big]')) { setTimeout(celebrateCoins, 400); return }
      flyCoins(Math.min(12, Math.max(4, Math.round(gain / 2))))
      tone(988, .1, 'triangle', .06, .9); tone(1319, .25, 'triangle', .06, 1)
      setTimeout(() => {
        setShop(prev => ({ ...(prev ?? s), coins: coinsRef.current, gifts: s.gifts, started: true }))
        setHappy(n => n + 1)
      }, 900)
    }
    celebrateCoins()
  }, [])

  const onShop = useCallback(async (a: Record<string, unknown>) => {
    if (a.action === 'decide') setShop(s => s && afterDecide(s, a.take === true))   // הדמות משתנה מיד
    const r = await shopAction(childId, course.courseId, a)
    if (r?.shop) { coinsRef.current = r.shop.coins; setShop(r.shop) }
    else if (r?.look) setShop(s => s && { ...s, look: r.look!, pending: null })
    return r
  }, [childId, course.courseId])

  // כניסה ראשונה: מגיעים ישר לחנות, עם מטבעות הפתיחה
  const firstTime = !!initialShop && !initialShop.started
  useEffect(() => {
    if (!firstTime) return
    setShopOpen(true)
    onShop({ action: 'start' })
  }, [firstTime, onShop])

  const openShop = useCallback(() => setShopOpen(true), [])
  const closeShop = useCallback(() => { setShopOpen(false); setHappy(n => n + 1) }, [])

  const lesson = course.lessons[lessonIdx]
  // רק שלבים שיש בהם תוכן מוצגים (הסרטון תמיד). החצים והמעברים האוטומטיים מדלגים על השאר.
  const stages = useMemo(() => availableStages(lesson), [lesson])
  const nextOf = (s: number) => stages.find(x => x > s)
  const prevOf = (s: number) => [...stages].reverse().find(x => x < s)
  const currentIdx = currentLessonIndex(course, state)
  const ctx = useMemo(() => ({ childId, courseId: course.courseId, lessonId: lesson.id }), [childId, course.courseId, lesson.id])

  const achieved = course.lessons.map(l => isAchieved(course, state, l.id))
  const lessonStates: LessonState[] = course.lessons.map((_, i) =>
    achieved[i] ? 'done' : i === currentIdx ? 'cur' : 'future')

  const refreshRef = useRef<() => void>(() => {})
  // בחזרה ממשחק (router.back) Next משחזר את העמוד מה-cache עם props ישנים:
  // לוקחים את השלב מהכתובת ומרעננים מהשרת.
  useEffect(() => {
    const s = Number(new URLSearchParams(window.location.search).get('stage'))
    if (s >= 1 && s <= 5) setStage(fitStage(course.lessons[initialLesson], s))
    setTimeout(() => refreshRef.current(), 0) // אחרי שה-ref מתעדכן (effect מאוחר יותר)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- רק בטעינה
  }, [])

  // הכתובת משקפת שיעור + שלב (כדי שחזרה ממשחק תנחת באותו מקום)
  useEffect(() => {
    const url = `/course/${course.courseId}/${lesson.id}?child=${childId}&stage=${stage}`
    if (window.location.pathname + window.location.search !== url) window.history.replaceState(window.history.state, '', url)
  }, [course.courseId, lesson.id, childId, stage])

  const go = useCallback((li: number, st?: number) => {
    const l = course.lessons[li]
    setLessonIdx(li)
    setStage(st ? fitStage(l, st) : defaultStage(state, l))
  }, [course.lessons, state])

  // שליטה חדשה → מסך חגיגה
  const onMastered = useCallback((lessonId: string) => {
    knownMastered.current.add(lessonId)
    const l = course.lessons.find(x => x.id === lessonId)
    if (l) setCelebrate(l)
  }, [course.lessons])

  // רענון מהשרת (בכניסה, ובחזרה ממשחק — שם נרשמות התשובות דרך ה-SDK)
  const pending = useRef<Promise<void> | null>(null)   // רענון שבדרך: הדמות מחכה לו לפני שהיא מדברת
  const load = useCallback(async () => {
    const res = await fetch(`/api/course/progress?childId=${childId}&courseId=${course.courseId}`, { cache: 'no-store' })
    if (!res.ok) return
    const { shop: freshShop, ...fresh }: CourseState & { shop?: ShopState | null } = await res.json()
    setState(fresh)
    takeShop(freshShop)
    const gained = fresh.mastered.find(id => !knownMastered.current.has(id))
    if (gained) onMastered(gained)
  }, [childId, course.courseId, onMastered, takeShop])
  const refresh = useCallback(() => {
    const p: Promise<void> = load().catch(() => {}).finally(() => { if (pending.current === p) pending.current = null })
    pending.current = p
  }, [load])

  useEffect(() => { refreshRef.current = refresh }, [refresh])

  useEffect(() => {
    const onShow = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onShow)
    window.addEventListener('pageshow', onShow)
    return () => { document.removeEventListener('visibilitychange', onShow); window.removeEventListener('pageshow', onShow) }
  }, [refresh])

  // ---- הדמות מסבירה מה עושים (בועה) ----
  const covered = shopOpen || !!celebrate   // מסך מעל הקורס: המשחק / הסרטון נעצר
  const here = `${lesson.id}-${stage}`
  const [runningAt, setRunningAt] = useState<string | null>(null)   // השלב שמשחק או סרטון רץ בו עכשיו
  const busy = runningAt === here
  const guide = useGuide({ enabled: !!shop, course, state, lessonIdx, stage, name: childName, covered, busy, pending })
  const onRunning = (on: boolean) => { setRunningAt(on ? here : null); if (on) guide.close() }

  // נגיעה בדמות: קופצת ומסבירה שוב
  const [poke, setPoke] = useState<Act | null>(null)
  useEffect(() => {
    if (!poke) return
    const t = setTimeout(() => setPoke(null), poke.ms)
    return () => clearTimeout(t)
  }, [poke])
  const onHero = () => { setPoke({ pose: 'jump', expression: 'joy', ms: 1000 }); guide.show({ type: 'remind' }) }
  const idleAct = useIdleAct(!!shop && !covered && !busy && !guide.talking)
  const heroProps = shop && {
    shop, act: moodAct ?? poke ?? idleAct, talking: guide.talking, calm: (busy && !moodAct) || covered, onShop: openShop, onHero,
    bubble: guide.text && <GuideBubble key={guide.id} text={guide.text} talking={guide.talking} sayLabel={ui.guide.say} closeLabel={ui.guide.close} onSay={guide.toggleSay} onClose={guide.close} />,
  }

  function markDone(s: number) {
    guide.noteDone(s)
    setState(prev => {
      const done = prev.done[lesson.id] ?? []
      return done.includes(s) ? prev : { ...prev, done: { ...prev.done, [lesson.id]: [...done, s] } }
    })
  }

  async function completeStage(s: number, autoAdvance: boolean) {
    markDone(s)
    fetch('/api/course/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ctx, stage: s }) })
      .then(r => (r.ok ? r.json() : null)).then(r => takeShop(r?.shop)).catch(() => {})
    const n = nextOf(s)
    if (autoAdvance && n) setTimeout(() => setStage(cur => (cur === s ? n : cur)), 900)
  }

  function sendAnswer(s: number, correct: boolean) {
    fetch('/api/course/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ctx, stage: s, correct }) })
  }

  // משחק תרגול (שלב 3) / העשרה (שלב 4): מוצג בתוך השלב בקטן, כמו ההתנסות (PracticeStage), עם כפתור הגדלה.
  // משחק SDK מדווח לשרת בעצמו (/api/sdk/event) ושולח לכאן complete / next / exit (mathplatform-sdk-v1.js).
  function gameSrc(kind: 'practice' | 'enrichment') {
    const g = lesson.stages[kind]
    if (!g) return null
    const base = g.href ?? `/games/${g.gameId}`
    return practiceUrl(base, childId, course.courseId, lesson.id) + `&courseStage=${kind === 'practice' ? PRACTICE_STAGE : 4}`
  }
  const practiceGameSrc = gameSrc('practice')
  const enrichmentGameSrc = gameSrc('enrichment')
  const gameDone = (s: number) => { markDone(s); refresh() }   // השליטה מחושבת בשרת לפי התשובות → רענון

  // התנסות כעמוד HTML סטטי (public/practices), מוצגת בתוך שלב 2 (PracticeStage).
  // היא שומרת את שלב 2 בעצמה ומודיעה לכאן (complete / next).
  const practicePage = lesson.stages.interactive?.page
  const practiceSrc = practicePage ? practiceUrl(practicePage, childId, course.courseId, lesson.id) : null

  // טעינה מוקדמת: כבר כשהשיעור פתוח מורידים ברקע את ההתנסות והספריות שלה
  useEffect(() => {
    if (practiceSrc) prefetch([practiceSrc, ...PRACTICE_ASSETS])
    // משחק שהוא עמוד HTML (public/practices) נטען מראש גם הוא
    const pages = [practiceGameSrc, enrichmentGameSrc].filter((s): s is string => !!s && s.startsWith('/practices/'))
    if (pages.length) prefetch([...pages, ...PRACTICE_ASSETS])
  }, [practiceSrc, practiceGameSrc, enrichmentGameSrc])

  // מעבר לשלב בלחיצה. בדרך להתנסות מחממים את הקול (רק בלחיצה הדפדפן מרשה)
  const toStage = (s: number) => {
    if ((s === 2 && practiceSrc) || (s === 3 && practiceGameSrc) || (s === 4 && enrichmentGameSrc)) warmSpeech()
    setStage(s)
  }

  /** זמני, לבדיקות: דאבל-קליק על שיעור בתפריט מאפס את ההתקדמות שלו */
  async function resetLesson(i: number) {
    const id = course.lessons[i].id
    const res = await fetch('/api/course/progress', { method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId, courseId: course.courseId, lessonId: id }) })
    if (!res.ok) return
    knownMastered.current.delete(id)
    setState(s => {
      const rest = <T,>(r: Record<string, T>) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== id)) as Record<string, T>
      return { done: rest(s.done), mastered: s.mastered.filter(m => m !== id), accuracy: rest(s.accuracy), testScore: rest(s.testScore) }
    })
  }

  async function finishTest(correct: number, total: number) {
    const res = await fetch('/api/course/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ctx, correct, total }) })
    const out = res.ok ? await res.json() : { passed: false, score: 0 }
    if (!out.passed) guide.show({ type: 'testFail' })
    setState(prev => ({ ...prev, testScore: { ...prev.testScore, [lesson.id]: out.score } }))
    if (out.passed) {
      setTimeout(refresh, 600)   // המטבעות של המבחן
      markDone(5)
      setState(prev => prev.mastered.includes(lesson.id) ? prev : { ...prev, mastered: [...prev.mastered, lesson.id] })
      setTimeout(() => onMastered(lesson.id), 900)
    }
    return { passed: !!out.passed, coins: out.coins as number | undefined }
  }

  function closeCelebration() {
    setCelebrate(null)
    // מעבר לשיעור הנוכחי החדש (הראשון בלי שליטה)
    go(currentLessonIndex(course, state))
  }

  useEffect(() => {
    if (!celebrate) return
    const t = setTimeout(closeCelebration, 3500)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrate])

  // החצים זזים רק בתוך השיעור; בקצוות הם מושבתים (ועדיין מוצגים)
  const next = () => { const n = nextOf(stage); if (n) toStage(n) }
  const prev = () => { const p = prevOf(stage); if (p) toStage(p) }
  // ״המשך״ בסוף משחק: לשלב הבא שיש בו תוכן (אם אין — נשארים)
  const toNext = (s: number) => { const n = nextOf(s); refresh(); if (n) setStage(n); else guide.show({ type: 'done', stage: s }) }

  const goal = Math.round(course.mastery.practice.accuracy * 100)
  const meters = course.lessons.map(l => meterValue(state, l.id))
  const st = lesson.stages
  const tint = lesson.tint

  return (
    <>
      <CourseHeader hello={fill(ui.welcome, { name: childName })} avatar={avatar} avatarLabel={ui.yourAvatar} logoutLabel={ui.logout} platformHref={`/child/${childId}`} platformLabel={ui.toPlatform}
        strip={heroProps && <HeroStrip {...heroProps} />} />
      <div className="c-wrap">
        <div className="c-side">
        {heroProps && <HeroCard {...heroProps} />}
        <LessonMenu lessons={course.lessons} states={lessonStates} selected={lessonIdx} label={ui.lessonsNav} title={ui.menuTitle}
          meters={meters} achieved={achieved}
          goal={goal} meterLabel={ui.meter} doneLabel={ui.lessonDone}
          titleOf={l => fill(ui.lessonTitle, { key: l.key })} numberOf={n => fill(ui.lessonNumber, { n: String(n) })}
          onPick={i => go(i)} onReset={resetLesson} />
        </div>
        <main className="c-main">
          <section className="c-stage" key={here} onPointerDownCapture={guide.close}>
            {stage === 1 && (
              <VideoStage lessonId={lesson.id} src={mediaUrl(st.video?.src)} poster={mediaUrl(st.video?.poster)} tint={tint}
                playLabel={ui.playVideo} startLabel={ui.letsStart} soonLabel={ui.comingSoon} paused={covered} onRunning={onRunning}
                onComplete={() => completeStage(1, false)} onEnded={() => { onRunning(false); guide.show({ type: 'done', stage: 1 }) }} />
            )}
            {stage === 2 && (practiceSrc ? (
              <PracticeStage src={practiceSrc} enlargeLabel={ui.enlarge} shrinkLabel={ui.shrink} startLabel={ui.letsStart} tint={tint} paused={covered} onRunning={onRunning}
                onComplete={() => markDone(2)} onNext={() => toNext(2)} />
            ) : st.interactive?.cues?.length ? (
              <InteractiveVideoStage src={mediaUrl(st.interactive.src)} cues={st.interactive.cues} playLabel={ui.playVideo} retryLabel={ui.retry}
                onAnswer={c => sendAnswer(2, c)} onComplete={() => completeStage(2, true)} />
            ) : (
              <GameStage kind="practice" tint={tint} label="" soonLabel={ui.comingSoon} available={false} onPlay={() => {}} />
            ))}
            {stage === 3 && (practiceGameSrc ? (
              <PracticeStage key={'g3' + lesson.id} src={practiceGameSrc} enlargeLabel={ui.enlarge} shrinkLabel={ui.shrink} startLabel={ui.letsStart} tint={tint} paused={covered} onRunning={onRunning}
                onComplete={() => gameDone(3)} onNext={() => toNext(3)} />
            ) : (
              <GameStage kind="practice" tint={tint} label="" soonLabel={ui.comingSoon} available={false} onPlay={() => {}} />
            ))}
            {stage === 4 && (enrichmentGameSrc ? (
              <PracticeStage key={'g4' + lesson.id} src={enrichmentGameSrc} enlargeLabel={ui.enlarge} shrinkLabel={ui.shrink} startLabel={ui.letsStart} tint={tint} paused={covered} onRunning={onRunning}
                onComplete={() => gameDone(4)} onNext={() => toNext(4)} />
            ) : (
              <GameStage kind="enrichment" tint={tint} label="" soonLabel={ui.comingSoon} available={false} onPlay={() => {}} />
            ))}
            {stage === 5 && (st.test?.questions.length ? (
              <TestStage questions={st.test.questions} count={course.mastery.test.questions} mascot={avatar} ui={ui} hero={shop && <Hero look={shop.look} pose="stand" className="c-hero" />}
                onAnswer={c => sendAnswer(5, c)} onFinish={finishTest} onBackToPractice={() => setStage(stages.includes(PRACTICE_STAGE) ? PRACTICE_STAGE : prevOf(5) ?? 1)} />
            ) : (
              <GameStage kind="enrichment" tint={tint} label="" soonLabel={ui.comingSoon} available={false} onPlay={() => {}} />
            ))}
          </section>

          <StageNav prevLabel={ui.prev} nextLabel={ui.next} onPrev={prev} onNext={next}
            hidePrev={!prevOf(stage)} hideNext={!nextOf(stage)}>
            <StageStepper labels={ui.stages} stages={stages} stage={stage} done={state.done[lesson.id] ?? []} label={ui.stagesNav} onPick={toStage} />
          </StageNav>
        </main>
      </div>

      {shopOpen && shop && <Shop shop={shop} onAction={onShop} onClose={closeShop} />}

      {celebrate && (
        <div role="dialog" aria-modal="true" aria-label={fill(ui.mastered, { key: celebrate.key })} onClick={closeCelebration}
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(22,62,107,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="pop" onClick={e => e.stopPropagation()}
            style={{ background: celebrate.tint, borderRadius: 32, padding: '32px 24px', maxWidth: 460, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
            {shop ? <div className="c-hero-mid"><Hero look={shop.look} pose="cheer" className="c-hero" /></div> : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="bob" style={{ width: 150, height: 150, objectFit: 'contain' }} />
            )}
            <p style={{ margin: 0, fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 500, lineHeight: 1.15 }}>
              {fill(ui.mastered, { key: celebrate.key })}
            </p>
            <button type="button" className="press c-primary" onClick={closeCelebration} autoFocus
              style={{ minHeight: 56, padding: '0 32px', borderRadius: 999, fontSize: 20, fontWeight: 500 }}>{ui.continue}</button>
          </div>
        </div>
      )}
    </>
  )
}
