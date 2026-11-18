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
