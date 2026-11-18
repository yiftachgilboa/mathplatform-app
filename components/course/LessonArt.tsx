'use client'
import { useEffect, useState } from 'react'

/*
 * איורי מסך הפתיחה של הסרטון — אחד לכל שיעור, באותו סגנון שטוח (לבן בשקיפויות + נגיעה כתומה).
 * מצוירים ב-800×600, כולם נראים במלואם (meet), והמרכז נשאר פנוי לכותרת ולכפתור.
 * כל שיעור הוא רשימת "אובייקטים"; בכל כניסה כולם עפים פנימה, בסדר אקראי ומכיוונים אקראיים.
 * מעבר עכבר על אובייקט — קפיצה קטנה (`.art-hop` ב-course.css).
 */
const W = '#FFFFFF', O = '#FFA45D'
const dash = { fill: 'none', stroke: W, strokeWidth: 4, strokeDasharray: '10 9', strokeLinecap: 'round' } as const
const ten = (fn: (i: number) => React.ReactNode) => Array.from({ length: 10 }, (_, i) => fn(i))

const LESSON_ART: Record<string, React.ReactNode[]> = {
  // מדרגות — עולים צעד אחר צעד
  'lesson-03': [
    <rect key="a" x="420" y="480" width="340" height="90" rx="16" fill={W} />,
    <rect key="b" x="500" y="390" width="260" height="100" rx="16" fill={W} opacity={0.8} />,
    <rect key="c" x="580" y="300" width="180" height="100" rx="16" fill={W} opacity={0.6} />,
    <rect key="d" x="660" y="210" width="100" height="100" rx="16" fill={O} />,
    <circle key="e" cx="120" cy="120" r="34" fill={W} opacity={0.5} />,
  ],
  // מעלית — קופצים בבת אחת
  'lesson-04': [
    <g key="a">
      <rect x="590" y="50" width="160" height="520" rx="24" fill={W} opacity={0.4} />
      {[150, 250, 350, 450].map(y => <line key={y} x1="606" x2="734" y1={y} y2={y} stroke={W} strokeWidth="3" opacity={0.8} />)}
      <rect x="610" y="470" width="120" height="84" rx="16" {...dash} />
      <line x1="670" x2="670" y1="460" y2="160" {...dash} />
    </g>,
    <rect key="b" x="610" y="66" width="120" height="84" rx="16" fill={O} />,
    <path key="c" d="M540 330 l-22 30 h44z" fill={W} />,
    <circle key="d" cx="130" cy="500" r="40" fill={W} opacity={0.5} />,
  ],
  // פירוק — עשרה ריבועים שמתפרקים לשני חלקים
  'lesson-01': [
    <g key="a">{[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x={70 + i * 62} y="480" width="52" height="52" rx="12" fill={W} />)}</g>,
    <g key="b">{[0, 1, 2, 3].map(i => <rect key={i} x={502 + i * 62} y="480" width="52" height="52" rx="12" fill={O} />)}</g>,
    <line key="c" x1="469" x2="469" y1="440" y2="572" {...dash} />,
    <rect key="d" x="520" y="70" width="230" height="44" rx="14" fill={W} opacity={0.5} />,
  ],
  // השלמה — כמה חסר עד 10
  'lesson-02': [
    <g key="a">
      <rect x="384" y="414" width="378" height="160" rx="22" fill={W} opacity={0.35} />
      {ten(i => {
        const x = 400 + (i % 5) * 72, y = i < 5 ? 430 : 502
        return i < 7
          ? <rect key={i} x={x} y={y} width="60" height="60" rx="14" fill={W} />
          : <rect key={i} x={x + 2} y={y + 2} width="56" height="56" rx="13" {...dash} />
      })}
    </g>,
    <circle key="b" cx="718" cy="372" r="22" fill={O} />,
    <circle key="c" cx="120" cy="130" r="30" fill={W} opacity={0.5} />,
  ],
  // הקטנה — מחשבים בקטן ומגדילים
  'lesson-05': [
    <rect key="a" x="90" y="470" width="64" height="64" rx="16" fill={O} />,
    <g key="b"><path d="M176 500 Q 330 455 486 468" {...dash} /><path d="M478 452 l22 18 -26 10z" fill={W} /></g>,
    <rect key="c" x="510" y="350" width="230" height="210" rx="32" fill={W} />,
    <circle key="d" cx="680" cy="90" r="26" fill={W} opacity={0.5} />,
  ],
  // טיפוס — עולים מהקטן לגדול
  'lesson-06': [
    <path key="a" d="M300 570 L470 370 L640 570z" fill={W} opacity={0.55} />,
    <path key="b" d="M460 570 L650 230 L790 480 L790 570z" fill={W} />,
    <g key="c"><line x1="650" x2="650" y1="232" y2="160" stroke={W} strokeWidth="5" strokeLinecap="round" /><path d="M652 162 l48 16 -48 16z" fill={O} /></g>,
    <g key="d">{[[520, 520], [560, 450], [600, 380]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="8" fill={O} opacity={0.8} />)}</g>,
    <circle key="e" cx="130" cy="120" r="32" fill={W} opacity={0.5} />,
  ],
  // גלישה — גולשים למטה עד 10
  'lesson-07': [
    <path key="a" d="M780 150 C 650 160 570 470 270 535 L 270 575 L 780 575 Z" fill={W} />,
    <path key="b" d="M780 120 C 660 130 600 300 520 380" {...dash} opacity={0.7} />,
    <circle key="c" cx="742" cy="112" r="28" fill={O} />,
    <circle key="d" cx="120" cy="140" r="30" fill={W} opacity={0.5} />,
  ],
  // הדבקה — 10 ו־4 זה 14
  'lesson-08': [
    <g key="a">
      <rect x="80" y="480" width="430" height="64" rx="18" fill={W} />
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <line key={i} x1={80 + i * 43} x2={80 + i * 43} y1="492" y2="532" stroke="#33373B" strokeOpacity={0.08} strokeWidth="3" />)}
    </g>,
    <g key="b">
      <rect x="520" y="480" width="172" height="64" rx="18" fill={O} />
      {[1, 2, 3].map(i => <line key={i} x1={520 + i * 43} x2={520 + i * 43} y1="492" y2="532" stroke={W} strokeOpacity={0.5} strokeWidth="3" />)}
    </g>,
    <rect key="c" x="500" y="466" width="30" height="92" rx="12" fill={W} opacity={0.6} />,
    <circle key="d" cx="680" cy="110" r="30" fill={W} opacity={0.5} />,
  ],
  // גנב — לוקחים מהשכן כדי להשלים לעשר
  'lesson-09': [
    <g key="a">{ten(i => {
      const cx = 480 + (i % 5) * 60, cy = i < 5 ? 450 : 515
      return i === 4 ? <circle key={i} cx={cx} cy={cy} r="21" {...dash} /> : <circle key={i} cx={cx} cy={cy} r="23" fill={W} />
    })}</g>,
    <g key="b">{[120, 180, 240].map(x => <circle key={x} cx={x} cy="515" r="23" fill={W} opacity={0.8} />)}</g>,
    <path key="c" d="M300 492 Q 500 430 700 420" {...dash} />,
    <circle key="d" cx="300" cy="500" r="23" fill={O} />,
    <circle key="e" cx="130" cy="120" r="30" fill={W} opacity={0.5} />,
  ],
  // שודד — פורצים עשרת כדי לחסר
  'lesson-10': [
    <rect key="a" x="80" y="480" width="250" height="64" rx="18" fill={W} />,
    <rect key="b" x="358" y="466" width="170" height="64" rx="18" fill={W} opacity={0.85} transform="rotate(-8 443 498)" />,
    <polyline key="c" points="340,470 330,490 346,506 332,526 344,548" fill="none" stroke={O} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />,
    <g key="d">
      <rect x="580" y="420" width="32" height="32" rx="8" fill={O} transform="rotate(15 596 436)" />
      <rect x="640" y="484" width="28" height="28" rx="7" fill={O} transform="rotate(-12 654 498)" />
      <rect x="600" y="530" width="24" height="24" rx="6" fill={O} opacity={0.8} transform="rotate(22 612 542)" />
    </g>,
    <circle key="e" cx="680" cy="110" r="30" fill={W} opacity={0.5} />,
  ],
}

/** מעבר עכבר: מפעיל קפיצה; לא מתחיל קפיצה חדשה באמצע קפיצה */
function hop(e: React.MouseEvent<SVGGElement>) {
  e.currentTarget.classList.add('hop')
}
function hopEnd(e: React.AnimationEvent<SVGGElement>) {
  if (e.animationName === 'hop') e.currentTarget.classList.remove('hop')
}

type Fly = { dx: number; dy: number; delay: number }

/** כל האובייקטים נכנסים, בסדר אקראי, כל אחד מכיוון אקראי */
function pickFlights(count: number): Record<number, Fly> {
  const idx = Array.from({ length: count }, (_, i) => i).sort(() => Math.random() - 0.5)
  return Object.fromEntries(idx.map((i, n) => {
    const a = Math.random() * Math.PI * 2, d = 650 + Math.random() * 250
    return [i, { dx: Math.round(Math.cos(a) * d), dy: Math.round(Math.sin(a) * d), delay: 0.12 + n * 0.2 }]
  }))
}

/** איור מסך הפתיחה לפי השיעור (ברירת מחדל: מדרגות). מוצג אחרי הטעינה, כדי שהאקראיות תהיה בצד הדפדפן. */
export default function LessonArt({ lessonId }: { lessonId: string }) {
  const objects = LESSON_ART[lessonId] ?? LESSON_ART['lesson-03']
  const [flights, setFlights] = useState<Record<number, Fly> | null>(null)
  useEffect(() => { setFlights(pickFlights(objects.length)) }, [objects])
  if (!flights) return null

  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet" aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
      {objects.map((o, i) => {
        const f = flights[i]
        const inner = <g className="art-hop" onMouseEnter={hop} onAnimationEnd={hopEnd}>{o}</g>
        return f
          ? <g key={i} className="fly-in" style={{ '--dx': `${f.dx}px`, '--dy': `${f.dy}px`, animationDelay: `${f.delay}s` } as React.CSSProperties}>{inner}</g>
          : <g key={i}>{inner}</g>
      })}
    </svg>
  )
}
