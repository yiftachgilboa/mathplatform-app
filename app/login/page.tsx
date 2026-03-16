'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const STARS = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  size: `${2 + Math.random() * 3}px`,
  delay: `${Math.random() * 4}s`,
  duration: `${2 + Math.random() * 3}s`,
}))

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

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
        .lp-btn { transition: opacity 0.18s, transform 0.18s; }
        .lp-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .lp-btn:disabled { cursor: not-allowed; opacity: 0.55; }
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
        }}
      >
        {/* Stars */}
        {STARS.map((s) => (
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

        {/* Central radial glow */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, var(--color-accent-glow), transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Card */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: 'min(400px, 88vw)',
            background: 'var(--color-card-bg)',
            border: '1.5px solid var(--color-card-border)',
            borderRadius: 'var(--radius-card)',
            backdropFilter: 'blur(10px)',
            padding: '40px 32px 32px',
            overflow: 'hidden',
          }}
        >
          <div className="lp-card-shimmer" />

          {/* Logo badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '24px',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'var(--color-accent)',
                boxShadow: '0 0 8px var(--color-accent)',
                flexShrink: 0,
                animation: 'twinkle 2s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.13em',
                color: 'var(--color-text-muted)',
              }}
            >
              MATHPLATFORM
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              textAlign: 'center',
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              margin: '0 0 8px',
            }}
          >
            כניסת הורה
          </h1>

          {/* Subtitle */}
          <p
            style={{
              textAlign: 'center',
              fontSize: '15px',
              color: 'var(--color-text-muted)',
              margin: '0 0 32px',
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
              cursor: 'pointer',
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
              margin: '20px 0',
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
              cursor: 'pointer',
            }}
          >
            ✉ כניסה עם אימייל
          </button>

          {/* Footer */}
          <p
            style={{
              textAlign: 'center',
              fontSize: '12px',
              color: 'var(--color-text-faint)',
              margin: '24px 0 0',
              lineHeight: 1.65,
            }}
          >
            בכניסה אתה מסכים לתנאי השימוש ולמדיניות הפרטיות שלנו
          </p>
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
