'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Avatar, CourseUi } from '@/lib/course/content'

type Props = {
  courseId: string
  ui: CourseUi
  avatars: Avatar[]
  existing: { id: string; name: string }[]
}

type Step = 'who' | 'name' | 'avatar'

const card: React.CSSProperties = {
  width: '100%', maxWidth: 560, background: 'var(--surface)', border: '1px solid var(--line)',
  borderRadius: 32, padding: '30px 22px', display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center',
}
const h1: React.CSSProperties = { margin: 0, fontSize: 'clamp(30px, 7vw, 44px)', fontWeight: 900, letterSpacing: '-0.035em', textAlign: 'center', lineHeight: 1.1 }
const bigBtn: React.CSSProperties = {
  minHeight: 64, padding: '0 40px', borderRadius: 999, fontSize: 24, fontWeight: 900, width: '100%', maxWidth: 360,
}

export default function WelcomeClient({ courseId, ui, avatars, existing }: Props) {
  const o = ui.onboarding
  const router = useRouter()
  const [step, setStep] = useState<Step>(existing.length ? 'who' : 'name')
  const [childId, setChildId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(avatars[0].id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function start() {
    setBusy(true); setError('')
    const res = await fetch('/api/course/enroll', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, avatar, childId, name: childId ? undefined : name }),
    })
    const out = await res.json().catch(() => ({}))
    if (res.ok && out.href) { router.replace(out.href); return }
    setBusy(false)
    if (out.code === 'nameTaken') { setError(o.nameTaken); setStep('name') } else setError(o.error)
  }

  const back = (to: Step) => (
    <button type="button" onClick={() => { setError(''); setStep(to) }} className="press c-light" aria-label={o.back}
      style={{ width: 52, height: 52, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}>
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#164D78" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    </button>
  )

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, padding: '28px 16px 48px' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/course/kidodo-wordmark.png" alt="kidodo" style={{ width: 130, height: 48, objectFit: 'contain' }} />

      {step === 'who' && (
        <section key="who" className="panel-in" style={card}>
          <h1 style={h1}>{o.pickChild}</h1>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, width: '100%' }}>
            {existing.map(k => (
              <button key={k.id} type="button" className="press" onClick={() => { setChildId(k.id); setStep('avatar') }}
                style={{ minHeight: 80, borderRadius: 26, fontSize: 24, fontWeight: 800, background: '#DFF3FF', border: '2px solid transparent', padding: '0 16px' }}>
                {k.name}
              </button>
            ))}
            <button type="button" className="press" onClick={() => { setChildId(null); setStep('name') }}
              style={{ minHeight: 80, borderRadius: 26, fontSize: 22, fontWeight: 800, background: 'var(--future)', color: 'var(--ink)', border: '2px dashed var(--line-2)', padding: '0 16px' }}>
              + {o.newChild}
            </button>
          </div>
        </section>
      )}

      {step === 'name' && (
        <section key="name" className="panel-in" style={card}>
          {existing.length > 0 && back('who')}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatars[0].img} alt="" className="pop bob" style={{ width: 120, height: 120, objectFit: 'contain' }} />
          <h1 style={h1}>{o.askName}</h1>
          <form style={{ display: 'contents' }} onSubmit={e => { e.preventDefault(); if (name.trim()) { setError(''); setStep('avatar') } }}>
            <input value={name} onChange={e => setName(e.target.value)} autoFocus maxLength={40} placeholder={o.namePlaceholder} aria-label={o.askName}
              style={{ width: '100%', maxWidth: 360, minHeight: 64, borderRadius: 22, border: '2px solid var(--line-2)', padding: '0 20px', fontSize: 26, fontWeight: 800, textAlign: 'center', background: '#fff', outlineColor: 'var(--primary)' }} />
            {error && <p role="alert" style={{ margin: 0, color: '#9B6A00', fontWeight: 700 }}>{error}</p>}
            <button type="submit" disabled={!name.trim()} className="press c-primary" aria-label={ui.next}
              style={{ width: 64, height: 64, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
            </button>
          </form>
        </section>
      )}

      {step === 'avatar' && (
        <section key="avatar" className="panel-in" style={card}>
          {back(childId ? 'who' : 'name')}
          <h1 style={h1}>{o.askAvatar}</h1>
          <div role="radiogroup" aria-label={o.askAvatar}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 12, width: '100%' }}>
            {avatars.map(a => {
              const on = a.id === avatar
              return (
                <button key={a.id} type="button" role="radio" aria-checked={on} aria-label={a.name} onClick={() => setAvatar(a.id)} className="press"
                  style={{ aspectRatio: '1', borderRadius: 26, padding: 10, background: on ? '#DFF3FF' : 'var(--future)', border: `3px solid ${on ? 'var(--primary)' : 'transparent'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </button>
              )
            })}
          </div>
          {error && <p role="alert" style={{ margin: 0, color: '#9B6A00', fontWeight: 700 }}>{error}</p>}
          <button type="button" onClick={start} disabled={busy} className="press c-primary" style={bigBtn}>{o.start}</button>
        </section>
      )}
    </main>
  )
}
