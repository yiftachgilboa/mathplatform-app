// איורים שטוחים ואייקונים משותפים לשלבים (מהמוקאפ). דקורטיביים בלבד.

export function PlayIcon({ color }: { color: string }) {
  return (
    <svg width={38} height={38} viewBox="0 0 24 24" aria-hidden>
      <path d="M7 5v14l12-7z" fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  )
}

const full: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' }

export function Stairs({ mono }: { mono?: boolean }) {
  return (
    <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice" aria-hidden style={{ ...full, opacity: mono ? 0.14 : 1 }}>
      <rect x="380" y="300" width="380" height="100" rx="14" fill="#FFFFFF" />
      <rect x="460" y="220" width="300" height="90" rx="14" fill="#FFFFFF" opacity={mono ? 1 : 0.8} />
      <rect x="540" y="140" width="220" height="90" rx="14" fill="#FFFFFF" opacity={mono ? 1 : 0.6} />
      <rect x="620" y="60" width="140" height="90" rx="14" fill={mono ? '#FFFFFF' : '#FFA45D'} />
    </svg>
  )
}

export function Bars() {
  return (
    <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet" aria-hidden style={full}>
      <rect x="170" y="250" width="80" height="80" rx="16" fill="#FFFFFF" />
      <rect x="270" y="190" width="80" height="140" rx="16" fill="#FFFFFF" />
      <rect x="450" y="130" width="80" height="200" rx="16" fill="#176FBE" />
      <rect x="550" y="70" width="80" height="260" rx="16" fill="none" stroke="#176FBE" strokeWidth="4" strokeDasharray="10 9" />
    </svg>
  )
}

export function Bubbles() {
  return (
    <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet" aria-hidden style={full}>
      <circle cx="180" cy="270" r="70" fill="#FFFFFF" />
      <circle cx="590" cy="250" r="52" fill="#58C9AD" />
      <circle cx="660" cy="130" r="30" fill="#FFFFFF" />
      <circle cx="250" cy="110" r="18" fill="#FFA45D" />
    </svg>
  )
}

/*
 * איורי מסך הפתיחה של הסרטון — אחד לכל שיעור, באותו סגנון שטוח (לבן בשקיפויות + נגיעה כתומה).
 * מצוירים ב-800×600 ומשאירים את המרכז פנוי לכותרת ולכפתור.
 */
const W = '#FFFFFF', O = '#FFA45D'
const dash = { fill: 'none', stroke: W, strokeWidth: 4, strokeDasharray: '10 9', strokeLinecap: 'round' } as const

const LESSON_ART: Record<string, React.ReactNode> = {
  // מדרגות — עולים צעד אחר צעד
  'lesson-03': <>
    <rect x="420" y="480" width="340" height="90" rx="16" fill={W} />
    <rect x="500" y="390" width="260" height="100" rx="16" fill={W} opacity={0.8} />
    <rect x="580" y="300" width="180" height="100" rx="16" fill={W} opacity={0.6} />
    <rect x="660" y="210" width="100" height="100" rx="16" fill={O} />
    <circle cx="120" cy="120" r="34" fill={W} opacity={0.5} />
  </>,
  // מעלית — קופצים בבת אחת
  'lesson-04': <>
    <rect x="590" y="50" width="160" height="520" rx="24" fill={W} opacity={0.4} />
    {[150, 250, 350, 450].map(y => <line key={y} x1="606" x2="734" y1={y} y2={y} stroke={W} strokeWidth="3" opacity={0.8} />)}
    <rect x="610" y="470" width="120" height="84" rx="16" {...dash} />
    <line x1="670" x2="670" y1="460" y2="160" {...dash} />
    <rect x="610" y="66" width="120" height="84" rx="16" fill={O} />
    <path d="M540 330 l-22 30 h44z" fill={W} />
    <circle cx="130" cy="500" r="40" fill={W} opacity={0.5} />
  </>,
  // פירוק — עשרה ריבועים שמתפרקים לשני חלקים
  'lesson-01': <>
    {[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x={70 + i * 62} y="480" width="52" height="52" rx="12" fill={W} />)}
    {[0, 1, 2, 3].map(i => <rect key={i} x={502 + i * 62} y="480" width="52" height="52" rx="12" fill={O} />)}
    <line x1="469" x2="469" y1="440" y2="572" {...dash} />
    <rect x="520" y="70" width="230" height="44" rx="14" fill={W} opacity={0.5} />
  </>,
  // השלמה — כמה חסר עד 10
  'lesson-02': <>
    <rect x="384" y="414" width="378" height="160" rx="22" fill={W} opacity={0.35} />
    {Array.from({ length: 10 }, (_, i) => {
      const x = 400 + (i % 5) * 72, y = i < 5 ? 430 : 502
      return i < 7
        ? <rect key={i} x={x} y={y} width="60" height="60" rx="14" fill={W} />
        : <rect key={i} x={x + 2} y={y + 2} width="56" height="56" rx="13" {...dash} />
    })}
    <circle cx="718" cy="372" r="22" fill={O} />
    <circle cx="120" cy="130" r="30" fill={W} opacity={0.5} />
  </>,
  // הקטנה — מחשבים בקטן ומגדילים
  'lesson-05': <>
    <rect x="90" y="470" width="64" height="64" rx="16" fill={O} />
    <path d="M176 500 Q 330 455 486 468" {...dash} />
    <path d="M478 452 l22 18 -26 10z" fill={W} />
    <rect x="510" y="350" width="230" height="210" rx="32" fill={W} />
    <circle cx="680" cy="90" r="26" fill={W} opacity={0.5} />
  </>,
  // טיפוס — עולים מהקטן לגדול
  'lesson-06': <>
    <path d="M300 570 L470 370 L640 570z" fill={W} opacity={0.55} />
    <path d="M460 570 L650 230 L840 570z" fill={W} />
    <line x1="650" x2="650" y1="232" y2="160" stroke={W} strokeWidth="5" strokeLinecap="round" />
    <path d="M652 162 l48 16 -48 16z" fill={O} />
    {[[520, 520], [560, 450], [600, 380]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="8" fill={O} opacity={0.8} />)}
    <circle cx="130" cy="120" r="32" fill={W} opacity={0.5} />
  </>,
  // גלישה — גולשים למטה עד 10
  'lesson-07': <>
    <path d="M790 150 C 650 160 570 470 270 535 L 270 575 L 790 575 Z" fill={W} />
    <path d="M790 120 C 660 130 600 300 520 380" {...dash} opacity={0.7} />
    <circle cx="742" cy="112" r="28" fill={O} />
    <circle cx="120" cy="140" r="30" fill={W} opacity={0.5} />
  </>,
  // הדבקה — 10 ו־4 זה 14
  'lesson-08': <>
    <rect x="80" y="480" width="430" height="64" rx="18" fill={W} />
    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <line key={i} x1={80 + i * 43} x2={80 + i * 43} y1="492" y2="532" stroke="#163E6B" strokeOpacity={0.08} strokeWidth="3" />)}
    <rect x="520" y="480" width="172" height="64" rx="18" fill={O} />
    {[1, 2, 3].map(i => <line key={i} x1={520 + i * 43} x2={520 + i * 43} y1="492" y2="532" stroke={W} strokeOpacity={0.5} strokeWidth="3" />)}
    <rect x="500" y="466" width="30" height="92" rx="12" fill={W} opacity={0.6} />
    <circle cx="680" cy="110" r="30" fill={W} opacity={0.5} />
  </>,
  // גנב — לוקחים מהשכן כדי להשלים לעשר
  'lesson-09': <>
    {Array.from({ length: 10 }, (_, i) => {
      const cx = 480 + (i % 5) * 60, cy = i < 5 ? 450 : 515
      return i === 4
        ? <circle key={i} cx={cx} cy={cy} r="21" {...dash} />
        : <circle key={i} cx={cx} cy={cy} r="23" fill={W} />
    })}
    {[120, 180, 240].map(x => <circle key={x} cx={x} cy="515" r="23" fill={W} opacity={0.8} />)}
    <path d="M300 492 Q 500 430 700 420" {...dash} />
    <circle cx="300" cy="500" r="23" fill={O} />
    <circle cx="130" cy="120" r="30" fill={W} opacity={0.5} />
  </>,
  // שודד — פורצים עשרת כדי לחסר
  'lesson-10': <>
    <rect x="80" y="480" width="250" height="64" rx="18" fill={W} />
    <rect x="358" y="466" width="170" height="64" rx="18" fill={W} opacity={0.85} transform="rotate(-8 443 498)" />
    <polyline points="340,470 330,490 346,506 332,526 344,548" fill="none" stroke={O} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="580" y="420" width="32" height="32" rx="8" fill={O} transform="rotate(15 596 436)" />
    <rect x="640" y="484" width="28" height="28" rx="7" fill={O} transform="rotate(-12 654 498)" />
    <rect x="600" y="530" width="24" height="24" rx="6" fill={O} opacity={0.8} transform="rotate(22 612 542)" />
    <circle cx="680" cy="110" r="30" fill={W} opacity={0.5} />
  </>,
}

/** איור מסך הפתיחה לפי השיעור (ברירת מחדל: מדרגות) */
export function LessonArt({ lessonId }: { lessonId: string }) {
  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden style={full}>
      {LESSON_ART[lessonId] ?? LESSON_ART['lesson-03']}
    </svg>
  )
}
