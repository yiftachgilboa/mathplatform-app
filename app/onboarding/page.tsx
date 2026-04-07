'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const GRADES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳']
const AVATARS = ['🦁', '🐯', '🦊', '🐻', '🐼', '🦄', '🐸', '🐧']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0) // 0, 1, 2
  const [childName, setChildName] = useState('')
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Slide animation direction
  const [animClass, setAnimClass] = useState('ob-enter')
  const prevStep = useRef(0)

  function goTo(next: number) {
    prevStep.current = step
    setAnimClass(next > step ? 'ob-enter' : 'ob-enter-back')
    setStep(next)
  }

  function handleBack() {
    if (step === 0) {
      router.push('/parent/dashboard')
    } else {
      goTo(step - 1)
    }
  }

  // Reset animation class after mount so it can retrigger
  useEffect(() => {
    setAnimClass('ob-enter ob-active')
    const t = setTimeout(() => setAnimClass(''), 350)
    return () => clearTimeout(t)
  }, [step])

  async function handleFinish() {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: childName, grade: Number(selectedGrade), avatar: selectedAvatar }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'שגיאה ביצירת הילד')
        setLoading(false)
        return
      }
    } catch {
      setError('שגיאה ביצירת הילד')
      setLoading(false)
      return
    }

    router.push('/select-child')
  }

  return (
    <>
      <style>{`
        @keyframes ob-slide-in {
          from { opacity: 0; transform: translateX(-48px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes ob-slide-in-back {
          from { opacity: 0; transform: translateX(48px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .ob-enter.ob-active  { animation: ob-slide-in      0.32s ease both; }
        .ob-enter-back.ob-active { animation: ob-slide-in-back 0.32s ease both; }

        .ob-grade-btn, .ob-avatar-btn {
          transition: transform 0.15s, box-shadow 0.15s, background 0.15s, border-color 0.15s;
        }
        .ob-grade-btn:hover:not(:disabled),
        .ob-avatar-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }
        .ob-next-btn {
          transition: opacity 0.18s, transform 0.15s;
        }
        .ob-next-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          opacity: 0.9;
        }
        .ob-next-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ob-back-btn {
          transition: background 0.15s, transform 0.15s;
        }
        .ob-back-btn:hover { transform: scale(1.08); }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ob-spinner {
          width: 22px; height: 22px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
      `}</style>

      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, var(--color-bg-gradient-from) 0%, var(--color-bg-gradient-mid) 50%, var(--color-bg-gradient-to) 100%)',
          fontFamily: 'var(--font-primary)',
          padding: '24px 16px',
        }}
      >
        {/* Card */}
        <div
          style={{
            width: 'min(440px, 100%)',
            background: 'var(--color-card-bg)',
            border: '1.5px solid var(--color-card-border)',
            borderRadius: 'var(--radius-card)',
            backdropFilter: 'blur(10px)',
            padding: '36px 32px 32px',
            position: 'relative',
          }}
        >
          {/* Back button */}
          <button
            onClick={handleBack}
            className="ob-back-btn"
            aria-label="חזרה"
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1.5px solid var(--color-card-border)',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            →
          </button>

          {/* Progress dots */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '32px',
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: i === step ? '24px' : '8px',
                  height: '8px',
                  borderRadius: 'var(--radius-pill)',
                  background: i === step ? 'var(--color-accent)' : 'var(--color-card-border)',
                  transition: 'width 0.3s, background 0.3s',
                }}
              />
            ))}
          </div>

          {/* Step content */}
          <div className={animClass} key={step}>
            {step === 0 && (
              <StepName
                value={childName}
                onChange={setChildName}
                onNext={() => goTo(1)}
              />
            )}
            {step === 1 && (
              <StepGrade
                name={childName}
                selected={selectedGrade}
                onSelect={setSelectedGrade}
                onNext={() => goTo(2)}
              />
            )}
            {step === 2 && (
              <StepAvatar
                name={childName}
                selected={selectedAvatar}
                onSelect={setSelectedAvatar}
                onFinish={handleFinish}
                loading={loading}
                error={error}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Step 1: Name ── */
function StepName({
  value,
  onChange,
  onNext,
}: {
  value: string
  onChange: (v: string) => void
  onNext: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            margin: '0 0 8px',
            textAlign: 'center',
          }}
        >
          מה השם של הילד/ה שלך?
        </h1>
      </div>

      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 16))}
          maxLength={16}
          placeholder="לדוגמה: יוסי"
          dir="rtl"
          autoFocus
          style={{
            width: '100%',
            fontSize: '22px',
            fontWeight: 700,
            textAlign: 'center',
            padding: '14px 16px',
            borderRadius: 'var(--radius-input)',
            border: '1.5px solid var(--color-card-border)',
            background: 'transparent',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-primary)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-accent)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-card-border)'
          }}
        />
        <span
          style={{
            position: 'absolute',
            bottom: '-22px',
            left: '0',
            fontSize: '12px',
            color: 'var(--color-text-faint)',
          }}
        >
          {value.length} / 16
        </span>
      </div>

      <div style={{ marginTop: '16px' }}>
        <NextButton disabled={value.trim().length < 2} onClick={onNext}>
          המשך
        </NextButton>
      </div>
    </div>
  )
}

/* ── Step 2: Grade ── */
function StepGrade({
  name,
  selected,
  onSelect,
  onNext,
}: {
  name: string
  selected: number | null
  onSelect: (g: number) => void
  onNext: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 800,
          color: 'var(--color-text-primary)',
          margin: 0,
          textAlign: 'center',
        }}
      >
        באיזו כיתה {name}?
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
        }}
      >
        {GRADES.map((label, i) => {
          const grade = i + 1
          const active = selected === grade
          return (
            <button
              key={grade}
              className="ob-grade-btn"
              onClick={() => onSelect(grade)}
              style={{
                padding: '18px 0',
                borderRadius: 'var(--radius-button)',
                border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-card-border)'}`,
                background: active ? 'var(--color-accent)' : 'transparent',
                color: active ? '#fff' : 'var(--color-text-primary)',
                fontSize: '20px',
                fontWeight: 700,
                fontFamily: 'var(--font-primary)',
                cursor: 'pointer',
                boxShadow: active ? '0 0 12px var(--color-accent-glow)' : 'none',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      <NextButton disabled={selected === null} onClick={onNext}>
        המשך
      </NextButton>
    </div>
  )
}

/* ── Step 3: Avatar ── */
function StepAvatar({
  name,
  selected,
  onSelect,
  onFinish,
  loading,
  error,
}: {
  name: string
  selected: string | null
  onSelect: (a: string) => void
  onFinish: () => void
  loading: boolean
  error: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 800,
          color: 'var(--color-text-primary)',
          margin: 0,
          textAlign: 'center',
        }}
      >
        בחר/י אווטאר ל{name}
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
        }}
      >
        {AVATARS.map((emoji) => {
          const active = selected === emoji
          return (
            <button
              key={emoji}
              className="ob-avatar-btn"
              onClick={() => onSelect(emoji)}
              style={{
                padding: '16px 0',
                borderRadius: 'var(--radius-button)',
                border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-card-border)'}`,
                background: active ? 'var(--color-accent-dim)' : 'transparent',
                fontSize: '32px',
                lineHeight: 1,
                cursor: 'pointer',
                boxShadow: active ? '0 0 10px var(--color-accent-glow)' : 'none',
              }}
            >
              {emoji}
            </button>
          )
        })}
      </div>

      {error && (
        <p
          style={{
            textAlign: 'center',
            fontSize: '13px',
            color: '#f87171',
            margin: '0',
          }}
        >
          {error}
        </p>
      )}

      <NextButton disabled={selected === null || loading} onClick={onFinish}>
        {loading ? <span className="ob-spinner" /> : 'בואו נתחיל! 🚀'}
      </NextButton>
    </div>
  )
}

/* ── Shared next button ── */
function NextButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      className="ob-next-btn"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '100%',
        padding: '14px',
        borderRadius: 'var(--radius-button)',
        border: 'none',
        background: 'var(--color-accent)',
        color: '#fff',
        fontSize: '16px',
        fontWeight: 700,
        fontFamily: 'var(--font-primary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      {children}
    </button>
  )
}
