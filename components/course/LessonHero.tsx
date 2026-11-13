import type { Lesson } from '@/lib/course/content'

/** כותרת השיעור: קופסת אייקון · "מפתח ה..." + משפט · בר שליטה עם קו יעד (בלי מספרים) */
export default function LessonHero({ lesson, title, meter, goal, meterLabel }: {
  lesson: Lesson; title: string; meter: number; goal: number; meterLabel: string
}) {
  return (
    <section className="c-hero" style={{ '--tint': lesson.tint } as React.CSSProperties}>
      <div className="row">
        <div className="ibox pop" key={lesson.id}>
          <svg viewBox="0 0 24 24" fill="none" stroke={lesson.deep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d={lesson.icon} />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <h1>{title}<span className="dot" aria-hidden /></h1>
          <p>{lesson.tagline}</p>
        </div>
      </div>
      <div className="c-meter" role="meter" aria-label={meterLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={meter}>
        <div className="fill" style={{ width: `${meter}%` }} />
        <div className="goal" aria-hidden style={{ left: `${100 - goal}%` }} />
      </div>
    </section>
  )
}
