'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Star = { id: number; top: string; left: string; size: string; delay: string; duration: string }

function generateStars(): Star[] {
  return Array.from({ length: 60 }, (_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: `${2 + Math.random() * 3}px`,
    delay: `${Math.random() * 4}s`,
    duration: `${2 + Math.random() * 3}s`,
  }))
}

export default function LoginPage() {
  const [stars, setStars] = useState<Star[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Parent state
  const [pwEmail, setPwEmail] = useState('')
  const [pwPassword, setPwPassword] = useState('')
  const [pwError, setPwError] = useState('')

  // Child state
  const [childName, setChildName] = useState('')
  const [digits, setDigits] = useState(['', '', ''])
  const [childError, setChildError] = useState('')
  const [shaking, setShaking] = useState(false)
  const digitRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  useEffect(() => {
    setStars(generateStars())
  }, [])

  // Parent handlers
  async function handleGoogle() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
  }

  async function handleEmail() {
    const email = window.prompt('הכנס אימייל')
    if (!email) return
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    alert('שלחנו לך אימייל — בדוק את תיבת הדואר')
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: pwEmail, password: pwPassword })
    setLoading(false)
    if (error) {
      setPwError(error.message)
    } else {
      router.push('/select-child')
    }
  }

  // Child handlers
  function handleDigitChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (value && index < 2) {
      digitRefs[index + 1].current?.focus()
    }
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      digitRefs[index - 1].current?.focus()
    }
  }

  function triggerShake() {
    setShaking(true)
    setTimeout(() => setShaking(false), 500)
  }

  async function handleChildSubmit(e: React.FormEvent) {
    e.preventDefault()
    setChildError('')
    const code = digits.join('')
    if (!childName.trim()) {
      setChildError('נא להזין שם')
      triggerShake()
      return
    }
    if (code.length < 3) {
      setChildError('נא להזין קוד 3 ספרות')
      triggerShake()
      return
    }
    setLoading(true)
    const res = await fetch('/api/child-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childName: childName.trim(), code }),
    })
    const result = await res.json()
    setLoading(false)
    if (!res.ok) {
      setChildError(result.error)
      triggerShake()
      return
    }

    // הקמת session אמיתי של ההורה
    const supabase = createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: result.hashed_token,
      type: 'email',
    })
    if (verifyError) {
      setChildError('שגיאה בכניסה, נסה שנית')
      triggerShake()
      return
    }

    router.push('/select-child')
  }

  return (
    <>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 1;    transform: scale(1.5); }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%      { transform: translateX(-8px); }
          30%      { transform: translateX(8px); }
          45%      { transform: translateX(-6px); }
          60%      { transform: translateX(6px); }
          75%      { transform: translateX(-4px); }
          90%      { transform: translateX(4px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        .lp-star {
          position: absolute;
          border-radius: 50%;
          background: #fff;
          animation: twinkle var(--dur, 3s) var(--delay, 0s) ease-in-out infinite;
        }
        .lp-card-shimmer {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1.5px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent);
          animation: shimmer 3s 1s ease-in-out infinite;
          border-radius: var(--radius-card) var(--radius-card) 0 0;
        }
        .lp-spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(255,255,255,0.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.75s linear infinite;
        }
        .lp-btn { transition: opacity 0.18s, transform 0.18s; cursor: pointer; }
        .lp-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .lp-btn:active:not(:disabled) { transform: translateY(0); }
        .lp-btn:disabled { cursor: not-allowed; opacity: 0.55; }
        .lp-divider-v {
          width: 1.5px;
          background: var(--color-card-border);
          align-self: stretch;
          flex-shrink: 0;
        }
        .lp-input {
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .lp-input:focus {
          border-color: var(--color-accent) !important;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.22);
        }
        .lp-digit {
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .lp-digit:focus {
          border-color: var(--color-accent) !important;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.22);
        }
        .lp-child-shake {
          animation: shake 0.5s ease-in-out;
        }
        .lp-mascot {
          animation: float 3s ease-in-out infinite;
        }
        @media (max-width: 700px) {
          .lp-split { flex-direction: column !important; }
          .lp-divider-v { display: none !important; }
          .lp-divider-h {
            display: block !important;
            height: 1.5px;
            background: var(--color-card-border);
            width: 100%;
            margin: 4px 0;
          }
        }
        .lp-divider-h { display: none; }
      `}</style>

      {/* Fullscreen background */}
      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'var(--font-primary)',
          background:
            'linear-gradient(135deg, var(--color-bg-gradient-from) 0%, var(--color-bg-gradient-mid) 50%, var(--color-bg-gradient-to) 100%)',
          padding: '24px 16px',
        }}
      >
        {/* Stars */}
        {stars.map((s) => (
          <span
            key={s.id}
            className="lp-star"
            style={
              {
                top: s.top,
                left: s.left,
                width: s.size,
                height: s.size,
                '--delay': s.delay,
                '--dur': s.duration,
              } as React.CSSProperties
            }
          />
        ))}

        {/* Radial glow */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 70% 55% at 50% 50%, var(--color-accent-glow), transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* MATHPLATFORM badge */}
        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 2,
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--color-accent)',
              boxShadow: '0 0 8px var(--color-accent)',
              animation: 'twinkle 2s ease-in-out infinite',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--color-text-muted)',
            }}
          >
            MATHPLATFORM
          </span>
        </div>

        {/* Split card */}
        <div
          className="lp-split"
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'row',
            background: 'var(--color-card-bg)',
            border: '1.5px solid var(--color-card-border)',
            borderRadius: 'var(--radius-card)',
            backdropFilter: 'blur(12px)',
            overflow: 'hidden',
            width: 'min(860px, 95vw)',
          }}
        >
          <div className="lp-card-shimmer" />

          {/* ─── LEFT: Child login ─── */}
          <div
            className={shaking ? 'lp-child-shake' : ''}
            style={{
              flex: 1,
              padding: '40px 36px 36px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Mascot */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <img
                src="/mascot-croc.png"
                alt="קרוקודיל"
                className="lp-mascot"
                style={{ width: '64px', height: '64px', objectFit: 'contain' }}
              />
            </div>

            <h2
              style={{
                textAlign: 'center',
                fontSize: '24px',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                margin: '0 0 6px',
              }}
            >
              כניסת ילד
            </h2>
            <p
              style={{
                textAlign: 'center',
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                margin: '0 0 28px',
              }}
            >
              הכנס את שמך וקוד המשפחה
            </p>

            <form
              onSubmit={handleChildSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}
            >
              {/* Name */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    marginBottom: '8px',
                  }}
                >
                  השם שלי
                </label>
                <input
                  type="text"
                  className="lp-input"
                  placeholder="למשל: יוסי"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  disabled={loading}
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid var(--color-card-border)',
                    borderRadius: 'var(--radius-input)',
                    color: 'var(--color-text-primary)',
                    fontSize: '15px',
                    fontFamily: 'var(--font-primary)',
                    direction: 'rtl',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 3-digit code */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    marginBottom: '8px',
                  }}
                >
                  קוד המשפחה
                </label>
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'center',
                    direction: 'ltr',
                  }}
                >
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={digitRefs[i]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="lp-digit"
                      value={d}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(i, e)}
                      disabled={loading}
                      style={{
                        width: '60px',
                        height: '60px',
                        textAlign: 'center',
                        fontSize: '26px',
                        fontWeight: 700,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1.5px solid var(--color-card-border)',
                        borderRadius: '12px',
                        color: 'var(--color-text-primary)',
                        fontFamily: 'var(--font-primary)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {childError && (
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#f87171',
                    textAlign: 'center',
                    background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.25)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                  }}
                >
                  {childError}
                </p>
              )}

              <button
                type="submit"
                className="lp-btn"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: 'var(--radius-button)',
                  background: 'var(--color-accent)',
                  border: 'none',
                  color: '#000',
                  fontSize: '16px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-primary)',
                  marginTop: '4px',
                }}
              >
                {loading ? '...' : 'בואו נשחק 🎮'}
              </button>
            </form>
          </div>

          {/* Vertical divider */}
          <div className="lp-divider-v" />
          <div className="lp-divider-h" />

          {/* ─── RIGHT: Parent login ─── */}
          <div
            style={{
              flex: 1,
              padding: '40px 36px 36px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h2
              style={{
                textAlign: 'center',
                fontSize: '24px',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                margin: '0 0 6px',
              }}
            >
              כניסת הורה
            </h2>
            <p
              style={{
                textAlign: 'center',
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                margin: '0 0 28px',
              }}
            >
              נהל את ילדיך והתקדמותם
            </p>

            {/* Google button */}
            <button
              className="lp-btn"
              onClick={handleGoogle}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '13px 20px',
                borderRadius: 'var(--radius-button)',
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                color: '#1a1a2e',
                fontSize: '15px',
                fontWeight: 600,
                fontFamily: 'var(--font-primary)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              המשך עם Google
            </button>

            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: '18px 0',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'var(--color-card-border)' }} />
              <span style={{ fontSize: '13px', color: 'var(--color-text-faint)' }}>או</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-card-border)' }} />
            </div>

            {/* Email button */}
            <button
              className="lp-btn"
              onClick={handleEmail}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '13px 20px',
                borderRadius: 'var(--radius-button)',
                background: 'var(--color-accent-dim)',
                border: '1.5px solid var(--color-card-border)',
                color: 'var(--color-text-primary)',
                fontSize: '15px',
                fontWeight: 600,
                fontFamily: 'var(--font-primary)',
              }}
            >
              ✉ כניסה עם אימייל
            </button>

            {/* Password form */}
            <form
              onSubmit={handlePasswordLogin}
              style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}
            >
              <input
                type="email"
                className="lp-input"
                placeholder="האימייל שלך"
                value={pwEmail}
                onChange={(e) => setPwEmail(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1.5px solid var(--color-card-border)',
                  borderRadius: 'var(--radius-input)',
                  color: 'var(--color-text-primary)',
                  fontSize: '15px',
                  fontFamily: 'var(--font-primary)',
                  direction: 'rtl',
                  boxSizing: 'border-box',
                }}
              />
              <input
                type="password"
                className="lp-input"
                placeholder="סיסמה"
                value={pwPassword}
                onChange={(e) => setPwPassword(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1.5px solid var(--color-card-border)',
                  borderRadius: 'var(--radius-input)',
                  color: 'var(--color-text-primary)',
                  fontSize: '15px',
                  fontFamily: 'var(--font-primary)',
                  direction: 'rtl',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                className="lp-btn"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: 'var(--radius-button)',
                  background: 'var(--color-accent)',
                  border: 'none',
                  color: '#000',
                  fontSize: '15px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-primary)',
                }}
              >
                כניסה →
              </button>
              {pwError && (
                <p style={{ margin: 0, fontSize: '13px', color: '#f87171', textAlign: 'right' }}>
                  {pwError}
                </p>
              )}
            </form>

            {/* Footer */}
            <p
              style={{
                textAlign: 'center',
                fontSize: '11px',
                color: 'var(--color-text-faint)',
                margin: '20px 0 0',
                lineHeight: 1.65,
              }}
            >
              בכניסה אתה מסכים לתנאי השימוש ולמדיניות הפרטיות שלנו
            </p>
          </div>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}
          >
            <div className="lp-spinner" />
          </div>
        )}
      </div>
    </>
  )
}
