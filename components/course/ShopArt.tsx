// ציורי החנות בקוד (SVG שטוח): מטבע, קופסת הפתעה ואייקון לכל פריט. זמני — עד שנבחר עיצוב לחנות.

export function CoinIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flex: 'none', display: 'block' }}>
      <circle cx="12" cy="12" r="11" fill="#c98f17" /><circle cx="12" cy="12" r="9.2" fill="#f1c43e" />
      <path d="M12 2.8a9.2 9.2 0 0 1 9.2 9.2L12 12z" fill="#ffe07a" /><path d="M12 21.2A9.2 9.2 0 0 1 2.8 12L12 12z" fill="#dba528" />
      <path d="M12 6.4l1.7 3.5 3.8.5-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.5z" fill="#fff3c0" />
    </svg>
  )
}

/** קופסת הפתעה בצבע color. open = המכסה עף. gift = קופסת מתנה (כל הצבעים) */
export function BoxArt({ color, open, gift }: { color: string; open?: boolean; gift?: boolean }) {
  const ribbon = gift ? '#ef5c55' : '#ffffff'
  return (
    <svg className="s-box-art" viewBox="0 0 120 120" data-open={open || undefined} aria-hidden>
      <ellipse cx="60" cy="112" rx="46" ry="6" fill="#163e6b" opacity=".14" />
      <path d="M16 50h88v56a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6z" fill={color} />
      <path d="M16 50h44v62H22a6 6 0 0 1-6-6z" fill="#000" opacity=".1" /><path d="M16 50h88v9H16z" fill="#000" opacity=".14" />
      <rect x="50" y="50" width="20" height="62" fill={ribbon} opacity=".9" />
      <text x="60" y="98" textAnchor="middle" fontSize="38" fontWeight="700" fill={gift ? '#fff' : color} style={{ fontFamily: 'inherit' }}>?</text>
      <g className="s-lid">
        <path d="M52 22c-14-14-30-6-24 4 4 6 16 6 24 6zM68 22c14-14 30-6 24 4-4 6-16 6-24 6z" fill={ribbon} stroke="#000" strokeOpacity=".12" strokeWidth="2" />
        <rect x="10" y="30" width="100" height="23" rx="6" fill={color} /><rect x="10" y="30" width="50" height="23" rx="6" fill="#000" opacity=".07" />
        <rect x="50" y="30" width="20" height="23" fill={ribbon} opacity=".95" />
      </g>
    </svg>
  )
}

/** אייקון שטוח לפריט, בצבע שלו */
export function ItemArt({ slot, kind, color }: { slot: string; kind?: string; color: string }) {
  const shade = <g fill="#000" opacity=".13">{
    slot === 'shirt' ? <path d="M60 24v78H34V56l-14 8-10-22 30-18z" />
      : slot === 'pants' ? <path d="M60 20v22l-8 62H28l4-84z" />
      : slot === 'hat' && kind === 'party' ? <path d="M60 14v86c-16 0-30-3-36-8z" />
      : slot === 'hat' && kind === 'crown' ? <path d="M60 30v66H24l-8-56 22 22z" />
      : slot === 'hat' ? <path d="M60 30v54H20C20 52 38 30 60 30z" />
      : null}</g>
  let body: React.ReactNode
  if (slot === 'shirt') body = <path d="M40 24c6 12 34 12 40 0l30 18-10 22-14-8v46H34V56l-14 8-10-22z" fill={color} strokeLinejoin="round" />
  else if (slot === 'pants') body = <path d="M32 20h56l4 84H68l-8-56-8 56H28z" fill={color} />
  else if (slot === 'shoes') body = (<>
    <path d="M12 44h26c2 16 14 20 22 24v16H12z" fill={color} /><path d="M12 80h48v8H12z" fill="#fff" stroke="#33373b" strokeOpacity=".2" />
    <path d="M62 60h26c2 16 14 20 22 24v16H62z" fill={color} /><path d="M62 96h48v8H62z" fill="#fff" stroke="#33373b" strokeOpacity=".2" />
  </>)
  else if (slot === 'hair') body = (<>
    <path d="M14 86C8 44 34 24 46 34L40 8l20 20L74 4l4 28c24 0 34 26 28 54L92 66l-12 12-10-14-12 14-12-14-12 14-8-12z" fill={color} strokeLinejoin="round" />
    <path d="M14 86C8 44 34 24 46 34l14-6v36l-2 14-12-14-12 14-8-12z" fill="#000" opacity=".1" />
  </>)
  else if (slot === 'glasses') body = (
    <g fill={color} fillOpacity=".22" stroke={color} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
      {kind === 'square' ? (<><rect x="12" y="42" width="40" height="36" rx="5" /><rect x="68" y="42" width="40" height="36" rx="5" /></>)
        : (<><circle cx="33" cy="60" r="21" /><circle cx="87" cy="60" r="21" /></>)}
      <path d="M54 58q6-6 12 0" fill="none" />
    </g>)
  else if (kind === 'party') body = (<><path d="M60 14l36 78c-18 11-54 11-72 0z" fill={color} strokeLinejoin="round" /><circle cx="60" cy="14" r="10" fill="#f2f4f6" stroke="#33373b" strokeOpacity=".15" /></>)
  else if (kind === 'crown') body = <path d="M16 40l22 22 22-32 22 32 22-22-8 56H24z" fill={color} strokeLinejoin="round" />
  else body = (<><path d="M20 84c0-32 18-54 40-54s40 22 40 54z" fill={color} /><circle cx="60" cy="28" r="6" fill={color} /><path d="M14 82h76c14 0 22 6 24 14H14z" fill={color} /><path d="M14 82h76c14 0 22 6 24 14H14z" fill="#000" opacity=".18" /></>)
  return <svg viewBox="0 0 120 120" aria-hidden style={{ width: '100%', height: '100%', display: 'block' }}>{body}{shade}</svg>
}

/** חנות: גגון מפוספס, חלון ודלת */
export function StoreIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 12v8h15v-8" fill="#fff" />
      <path d="M4 3.5h16l1.5 5.5H2.5z" fill="currentColor" fillOpacity=".25" />
      <path d="M2.5 9a2.4 2.4 0 0 0 4.75 0 2.4 2.4 0 0 0 4.75 0 2.4 2.4 0 0 0 4.75 0 2.4 2.4 0 0 0 4.75 0z" fill="currentColor" fillOpacity=".55" />
      <path d="M13.5 20v-5h3.5v5M7 15h3.5v2.5H7z" />
    </svg>
  )
}
