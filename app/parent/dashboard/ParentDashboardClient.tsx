'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Child { id: string; name: string; grade: string; avatar: string; coins: number; theme?: string | null }
interface Lesson { id: string; name: string; grade: string }
interface Props { children: Child[]; lessons: Lesson[]; childLessonsMap: Record<string, string[]>; initialChildId?: string }

const THEME_LABELS: Record<string, string> = {
  'default': 'ברירת מחדל',
  'magical-forest': 'יער קסמים',
  'monsters': 'מפלצות',
}

export default function ParentDashboardClient({ children, lessons, childLessonsMap, initialChildId }: Props) {
  const router = useRouter()
  const initialIdx = initialChildId ? children.findIndex(c => c.id === initialChildId) : 0
  const [activeChildIdx, setActiveChildIdx] = useState(initialIdx > -1 ? initialIdx : 0)
  const [currentGrade, setCurrentGrade] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [trackOrder, setTrackOrder] = useState<string[]>([])
  const [initialSelected, setInitialSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<'success' | 'error' | null>(null)
  const [themeModalOpen, setThemeModalOpen] = useState(false)
  const [childThemeMap, setChildThemeMap] = useState<Record<string, string | null>>({})

  const THEMES = [
    { key: 'default',        label: 'ברירת מחדל', gradient: 'linear-gradient(135deg,#1F4A38,#1A3C2F)' },
    { key: 'magical-forest', label: 'יער קסמים',  gradient: 'linear-gradient(135deg,#2d5a20,#1a3d12)' },
    { key: 'monsters',       label: 'מפלצות',     gradient: 'linear-gradient(135deg,#2a1a4a,#150d28)' },
  ]

  const activeChild = children[activeChildIdx] ?? null

  const trackWrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const R = 44, SPACING = R * 4, PAD = R + 20

  useEffect(() => {
    if (!activeChild) return
    setCurrentGrade(activeChild.grade)
    const ids = childLessonsMap[activeChild.id] ?? []
    setSelected(new Set(ids))
    setInitialSelected(new Set(ids))
    setTrackOrder([...ids])
  }, [activeChildIdx])

  function toggleLesson(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setTrackOrder(o => o.filter(x => x !== id))
      } else {
        next.add(id)
        setTrackOrder(o => o.includes(id) ? o : [...o, id])
      }
      return next
    })
  }

  async function handleSave() {
    if (!activeChild || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/children/${activeChild.id}/lessons`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameIds: trackOrder.filter(id => selected.has(id)) }),
      })
      if (!res.ok) throw new Error()
      setInitialSelected(new Set(selected))
      setToast('success')
      router.refresh()
    } catch {
      setToast('error')
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 2500)
    }
  }

  const activeTheme = childThemeMap[activeChild?.id ?? ''] ?? activeChild?.theme ?? 'default'

  async function handleThemeChange(theme: string) {
    if (!activeChild) return
    const prevTheme = activeTheme
    setChildThemeMap(prev => ({ ...prev, [activeChild.id]: theme }))
    setThemeModalOpen(false)
    try {
      const res = await fetch(`/api/children/${activeChild.id}/theme`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      setChildThemeMap(prev => ({ ...prev, [activeChild.id]: prevTheme }))
      alert('שגיאה בשמירה, נסה שוב')
    }
  }

  const isDirty = selected.size !== initialSelected.size || [...selected].some(id => !initialSelected.has(id))
  const gradesLessons = lessons.filter(l => l.grade === currentGrade)
  const GRADES = ['1','2','3','4','5','6']
  const GRADE_LABELS: Record<string, string> = { '1':'א','2':'ב','3':'ג','4':'ד','5':'ה','6':'ו' }

  function renderTrack() {
    const wrap = trackWrapRef.current
    const svg = svgRef.current
    if (!svg || !wrap) return
    svg.innerHTML = ''

    const map: Record<string, Lesson> = {}
    lessons.forEach(l => { map[l.id] = l })

    const items = trackOrder.filter(id => selected.has(id)).map(id => map[id]).filter(Boolean)
    const n = items.length
    if (!n) return

    const W = wrap.clientWidth || 200
    const totalH = PAD * 2 + (n - 1) * SPACING
    svg.setAttribute('width', String(W))
    svg.setAttribute('height', String(totalH))
    const cx = W / 2

    const ns = (tag: string, attrs: Record<string, string> = {}) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag)
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
      return el
    }

    for (let i = 0; i < n - 1; i++) {
      const y1 = PAD + i * SPACING + R, y2 = PAD + (i + 1) * SPACING - R
      if (y2 <= y1) continue
      svg.appendChild(ns('line', { x1: String(cx), y1: String(y1), x2: String(cx), y2: String(y2), stroke: 'rgba(255,150,200,.18)', 'stroke-width': '2', 'stroke-dasharray': '4 5' }))
      const len = y2 - y1
      for (let d = 1; d < Math.max(2, Math.floor(len / 14)); d++) {
        const dot = ns('circle', { cx: String(cx), cy: String(y1 + (d / Math.max(2, Math.floor(len / 14))) * len), r: '2', fill: 'rgba(255,180,210,.7)' })
        dot.style.animation = `sTw ${(4 + Math.random() * 6).toFixed(2)}s ${(Math.random() * 10).toFixed(2)}s ease-in-out infinite`
        svg.appendChild(dot)
      }
    }

    items.forEach((l, i) => {
      const cy = PAD + i * SPACING
      const isFirst = i === 0
      const bx = cx - R, by = cy - R, bR = 11
      const g = ns('g', {})
      g.style.cursor = 'pointer'

      g.appendChild(ns('circle', { cx: String(cx), cy: String(cy), r: String(R + 9), fill: 'rgba(255,150,200,.06)', stroke: 'rgba(255,150,200,.18)', 'stroke-width': '1.5' }))
      g.appendChild(ns('circle', { cx: String(cx), cy: String(cy), r: String(R), fill: isFirst ? 'rgba(72,28,55,.95)' : 'rgba(52,22,40,.95)', stroke: isFirst ? '#FF9FD0' : 'rgba(255,160,210,.5)', 'stroke-width': isFirst ? '3' : '2.5' }))

      const words = l.name.split(' ')
      const brk = words.length > 3 ? Math.ceil(words.length / 2) : words.length
      const l1 = words.slice(0, brk).join(' '), l2 = words.slice(brk).join(' ')
      if (l2) {
        [[cy - 9, l1], [cy + 10, l2]].forEach(([y, txt]) => {
          const t = ns('text', { x: String(cx), y: String(y), 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: 'rgba(255,255,255,.82)', 'font-family': "'Varela Round',sans-serif", 'font-size': '11' })
          t.textContent = String(txt)
          g.appendChild(t)
        })
      } else {
        const t = ns('text', { x: String(cx), y: String(cy), 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: 'rgba(255,255,255,.82)', 'font-family': "'Varela Round',sans-serif", 'font-size': '12' })
        t.textContent = l.name
        g.appendChild(t)
      }

      g.appendChild(ns('rect', { x: String(bx), y: String(by), width: String(R * 2), height: String(R * 2), fill: 'transparent' }))

      const delBg = ns('circle', { cx: String(bx), cy: String(by), r: String(bR), fill: '#C0392B' })
      const delX = ns('text', { x: String(bx), y: String(by + 1), 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: 'white', 'font-size': '11' })
      delX.textContent = '✕'
      delBg.style.opacity = '0'; delBg.style.transition = 'opacity .15s'
      delX.style.opacity = '0'; delX.style.transition = 'opacity .15s'; delX.style.pointerEvents = 'none'
      g.appendChild(delBg); g.appendChild(delX)

      g.addEventListener('mouseenter', () => { delBg.style.opacity = '1'; delX.style.opacity = '1' })
      g.addEventListener('mouseleave', () => { delBg.style.opacity = '0'; delX.style.opacity = '0' })
      g.addEventListener('click', (e: MouseEvent) => {
        const svgEl = svgRef.current!
        const pt = svgEl.createSVGPoint()
        pt.x = e.clientX; pt.y = e.clientY
        const p = pt.matrixTransform(svgEl.getScreenCTM()!.inverse())
        if (Math.sqrt((p.x - bx) ** 2 + (p.y - by) ** 2) <= bR) {
          setSelected(prev => { const n = new Set(prev); n.delete(l.id); return n })
          setTrackOrder(o => o.filter(x => x !== l.id))
        }
      })

      svg.appendChild(g)
    })
  }

  useEffect(() => { renderTrack() }, [trackOrder, selected, lessons])
  useEffect(() => { window.addEventListener('resize', renderTrack); return () => window.removeEventListener('resize', renderTrack) }, [])

  return (
    <div style={{ width:'100vw', height:'100vh', display:'flex', flexDirection:'row', fontFamily:"'Varela Round',sans-serif", direction:'rtl', overflow:'hidden' }}>

      {/* RIGHT PANEL */}
      <div style={{ flex:'0 0 60%', display:'flex', flexDirection:'column', background:'#fff', borderLeft:'1px solid #E8EDE9', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'20px 22px 15px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #EEF2EF', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={() => window.history.back()} style={{ width:34, height:34, borderRadius:'50%', background:'#F2F5F2', border:'none', cursor:'pointer', fontSize:28, color:'#556655' }}>→</button>
            <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#9E5C8E,#703A67)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>{activeChild?.avatar || '🦊'}</div>
            <div style={{ fontSize:30, color:'#3a3a3a' }}>בחרו נושאי לימוד ל{activeChild?.name}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setThemeModalOpen(true)} style={{ height:32, padding:'0 14px', borderRadius:20, border:'1px solid #E0E0E0', cursor:'pointer', background:'#F5F5F5', color:'#555', fontSize:24, fontFamily:"'Varela Round',sans-serif" }}>
              🎒 הרפתקאה: {THEME_LABELS[activeTheme] ?? 'ברירת מחדל'}
            </button>
            <button onClick={handleSave} style={{ height:32, padding:'0 16px', borderRadius:20, border:'none', cursor:'pointer', background:'#00D45A', color:'#fff', fontSize:24, fontFamily:"'Varela Round',sans-serif", boxShadow:'0 0 10px rgba(0,212,90,.35)', opacity: isDirty ? 1 : 0, pointerEvents: isDirty ? 'all' : 'none', transition:'opacity .15s' }}>
              {saving ? '...' : 'שמור ✓'}
            </button>
          </div>
        </div>

        {/* Child Switcher */}
        {children.length > 1 && !initialChildId && (
          <div style={{ display:'flex', gap:6, padding:'10px 22px 0', flexShrink:0 }}>
            {children.map((c, i) => (
              <button key={c.id} onClick={() => setActiveChildIdx(i)} style={{ height:26, padding:'0 12px', borderRadius:20, border: i===activeChildIdx ? '1px solid rgba(0,180,80,.25)' : '1px solid transparent', cursor:'pointer', fontSize:24, fontFamily:"'Varela Round',sans-serif", background: i===activeChildIdx ? '#E8FBF0' : '#F2F5F2', color: i===activeChildIdx ? '#00A045' : '#778877' }}>
                {c.avatar} {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Grade Tabs */}
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', padding:'12px 22px 10px', borderBottom:'1px solid #EEF2EF', flexShrink:0 }}>
          {GRADES.map(g => (
            <button key={g} onClick={() => setCurrentGrade(g)} style={{ height:27, padding:'0 12px', borderRadius:20, border: currentGrade===g ? '1px solid rgba(0,180,80,.25)' : '1px solid transparent', cursor:'pointer', fontSize:24, fontFamily:"'Varela Round',sans-serif", background: currentGrade===g ? '#E8FBF0' : '#F2F5F2', color: currentGrade===g ? '#00A045' : '#778877' }}>
              כיתה {GRADE_LABELS[g]}
            </button>
          ))}
        </div>

        {/* Lessons Grid */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 20px 20px' }}>
          {gradesLessons.map(l => (
            <div key={l.id} onClick={() => toggleLesson(l.id)} style={{ background: selected.has(l.id) ? '#F5FDF8' : '#fff', borderRadius:10, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', marginBottom:6, border: selected.has(l.id) ? '1.5px solid rgba(0,200,80,.38)' : '1.5px solid #EAF0EA', boxShadow:'0 1px 3px rgba(0,0,0,.04)', userSelect:'none' }}>
              <div style={{ fontSize:30, color:'#3a3a3a' }}>{l.name}</div>
              <div style={{ width:32, height:32, borderRadius:'50%', border: selected.has(l.id) ? '1.5px solid #00D45A' : '1.5px solid #C8D8C8', background: selected.has(l.id) ? '#00D45A' : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .18s' }}>
                {selected.has(l.id) && <span style={{ color:'#fff', fontSize:24 }}>✓</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LEFT PANEL — Track SVG */}
      <div style={{ flex:1, background:'linear-gradient(160deg,#3d1a2e 0%,#2a0f1e 45%,#1a0912 100%)', position:'relative', overflow:'hidden', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ position:'absolute', width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,150,200,.09) 0%,transparent 65%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none', animation:'orbP 7s ease-in-out infinite' }} />
        <div style={{ position:'relative', zIndex:2, flexShrink:0, marginTop:20, fontSize:22, color:'rgba(255,180,210,.45)', letterSpacing:'1.8px' }}>מסלול הלימוד של {activeChild?.name}</div>
        <div ref={trackWrapRef} style={{ position:'relative', zIndex:2, flex:1, width:'100%', overflowY:'auto', overflowX:'hidden', padding:'12px 0 20px' }}>
          {trackOrder.filter(id => selected.has(id)).length === 0
            ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'rgba(255,180,210,.3)', fontSize:26 }}>בחר שיעורים כדי לבנות את המסלול</div>
            : <svg ref={svgRef} style={{ display:'block', margin:'0 auto', overflow:'visible' }} />
          }
        </div>
        <style>{`@keyframes orbP{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.18)}} @keyframes sTw{0%,100%{opacity:0}50%{opacity:1}} @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      </div>

      {themeModalOpen && (
        <div onClick={() => setThemeModalOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:16, padding:'24px 20px', width:280, boxShadow:'0 8px 32px rgba(0,0,0,0.18)', fontFamily:"'Varela Round',sans-serif", direction:'rtl' }}>
            <div style={{ fontSize:30, color:'#3a3a3a', marginBottom:16, fontWeight:600 }}>בחר הרפתקאה ל{activeChild?.name}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {THEMES.map(t => {
                const isActive = activeTheme === t.key
                return (
                  <div key={t.key} onClick={() => handleThemeChange(t.key)} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, border: isActive ? '1.5px solid #00D45A' : '1.5px solid #E8EDE9', background: isActive ? '#F5FDF8' : '#FAFAFA', cursor:'pointer' }}>
                    <div style={{ width:40, height:40, borderRadius:8, background:t.gradient, flexShrink:0 }} />
                    <div style={{ flex:1, fontSize:28, color:'#3a3a3a' }}>{t.label}</div>
                    {isActive && <span style={{ fontSize:28, color:'#00D45A' }}>✓</span>}
                  </div>
                )
              })}
            </div>
            <button onClick={() => setThemeModalOpen(false)} style={{ marginTop:16, width:'100%', height:34, borderRadius:20, border:'1px solid #E0E0E0', background:'#F5F5F5', cursor:'pointer', fontSize:26, color:'#777', fontFamily:"'Varela Round',sans-serif" }}>
              סגור
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', padding:'10px 20px', borderRadius:20, fontSize:26, fontFamily:"'Varela Round',sans-serif", color:'#fff', background: toast==='success' ? '#00A045' : '#C0392B', zIndex:100, animation:'toastIn .2s ease' }}>
          {toast === 'success' ? '✓ השינויים נשמרו' : '✗ שגיאה בשמירה'}
        </div>
      )}

    </div>
  )
}
