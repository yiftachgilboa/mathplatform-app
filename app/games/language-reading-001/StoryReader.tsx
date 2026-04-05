'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { fetchStoryWithPages } from '@/lib/storybook/storyLoader'
import { StoryWithPages } from '@/lib/storybook/types'
import GameBackButton from '@/components/GameBackButton'

interface Props {
  bookId: string
  onFinish: (stars: number) => void
}

const BURST_COLORS = ['#FF4B6E','#FFD700','#4CAF50','#2196F3','#FF9800','#E91E63']

interface Particle {
  id: number
  x: number
  y: number
  color: string
  angle: number
  dist: number
}

export default function StoryReader({ bookId, onFinish }: Props) {
  const [story, setStory] = useState<StoryWithPages | null>(null)
  const [loading, setLoading] = useState(true)
  const [pageIdx, setPageIdx] = useState(0)
  const [recognized, setRecognized] = useState<Set<number>>(new Set())
  const [particles, setParticles] = useState<Particle[]>([])
  const [listening, setListening] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [pageAnim, setPageAnim] = useState<'enter' | 'exit'>('enter')
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown')

  // preload קולות של כל המילים בעמוד
  useEffect(() => {
    if (!window.speechSynthesis || !page) return
    page.words.forEach((word, i) => {
      setTimeout(() => {
        const utt = new SpeechSynthesisUtterance(word)
        utt.lang = 'he-IL'
        utt.volume = 0
        utt.rate = 0.9
        speechSynthesis.speak(utt)
      }, i * 100)
    })
  }, [pageIdx])

  // אתחול Web Speech API מראש — מבטל השהייה בהקראה הראשונה
  useEffect(() => {
    if (!window.speechSynthesis) return
    const utt = new SpeechSynthesisUtterance(' ')
    utt.lang = 'he-IL'
    utt.volume = 0
    speechSynthesis.speak(utt)
  }, [])

  const recognitionRef = useRef<any>(null)
  const pageContainerRef = useRef<HTMLDivElement>(null)
  const celebratingRef = useRef(false)
  const storyRef = useRef<StoryWithPages | null>(null)
  const pageIdxRef = useRef(0)

  useEffect(() => { storyRef.current = story }, [story])
  useEffect(() => { pageIdxRef.current = pageIdx }, [pageIdx])

  useEffect(() => {
    fetchStoryWithPages(bookId)
      .then(s => { setStory(s); storyRef.current = s })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [bookId])

  // Preload כל תמונות הסיפור
  useEffect(() => {
    if (!story) return
    story.pages.forEach(p => {
      if (p.image_url) {
        const img = new Image()
        img.src = p.image_url
      }
    })
  }, [story])

  // בקשת הרשאת מיקרופון בטעינה
  useEffect(() => {
    if (!story) return
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(stream => {
        // עצור את הסטרים מיד — רק רצינו את ההרשאה
        stream.getTracks().forEach(t => t.stop())
        setMicPermission('granted')
        // התחל האזנה אוטומטית
        startMic()
      })
      .catch(() => {
        setMicPermission('denied')
      })
  }, [story])

  const page = story?.pages[pageIdx]
  const totalWords = page?.words.length ?? 0
  const allDone = totalWords > 0 && recognized.size === totalWords

  // TTS
  const speakWord = (word: string) => {
    if (!window.speechSynthesis) return
    speechSynthesis.cancel()
    // setTimeout של 0 מבטיח שה-cancel הסתיים לפני ה-speak
    setTimeout(() => {
      const utt = new SpeechSynthesisUtterance(word)
      utt.lang = 'he-IL'; utt.rate = 0.9; utt.pitch = 1.1
      speechSynthesis.speak(utt)
    }, 0)
  }

  const playSuccessSound = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

    const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = ctx.currentTime + i * 0.12
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.3, start + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3)
      osc.start(start)
      osc.stop(start + 0.3)
    })
  }

  // פרטיקלים
  const spawnAt = useCallback((domEl: HTMLElement) => {
    if (!domEl || !pageContainerRef.current) return
    const rect = domEl.getBoundingClientRect()
    const cRect = pageContainerRef.current.getBoundingClientRect()
    const cx = rect.left - cRect.left + rect.width / 2
    const cy = rect.top - cRect.top + rect.height / 2
    setParticles(p => [...p, ...Array.from({ length: 10 }, (_, i) => ({
      id: Math.random(),
      x: cx, y: cy,
      color: BURST_COLORS[i % BURST_COLORS.length],
      angle: (i / 10) * Math.PI * 2,
      dist: 50 + Math.random() * 35,
    }))])
  }, [])

  // חגיגה בסוף עמוד
  const triggerCelebration = useCallback(() => {
    if (celebratingRef.current) return
    celebratingRef.current = true
    setCelebrating(true)
    playSuccessSound()

    if (pageContainerRef.current) {
      const cRect = pageContainerRef.current.getBoundingClientRect()
      for (let j = 0; j < 8; j++) {
        setTimeout(() => {
          setParticles(p => [...p, ...Array.from({ length: 8 }, (_, i) => ({
            id: Math.random(),
            x: Math.random() * cRect.width,
            y: Math.random() * cRect.height,
            color: BURST_COLORS[i % BURST_COLORS.length],
            angle: (i / 8) * Math.PI * 2,
            dist: 55 + Math.random() * 40,
          }))])
        }, j * 80)
      }
    }

    setTimeout(() => {
      setCelebrating(false)
      celebratingRef.current = false
      const currentStory = storyRef.current
      const currentPageIdx = pageIdxRef.current
      if (!currentStory) return

      if (currentPageIdx >= currentStory.pages.length - 1) {
        // סיום סיפור
        if (recognitionRef.current) {
          try { recognitionRef.current.stop() } catch (e) {}
          recognitionRef.current = null
        }
        setListening(false)
        onFinish(3)
        return
      }

      // עמוד הבא
      setPageAnim('exit')
      setTimeout(() => {
        setPageIdx(p => p + 1)
        setRecognized(new Set())
        celebratingRef.current = false
        setCelebrating(false)
      }, 280)
      setTimeout(() => {
        setPageAnim('enter')
      }, 320)
    }, 1500)
  }, [onFinish])

  // זיהוי כל המילים → חגיגה
  useEffect(() => {
    if (!story || !page) return
    if (recognized.size === page.words.length && recognized.size > 0 && !celebratingRef.current) {
      setTimeout(triggerCelebration, 2200)
    }
  }, [recognized, story, page, triggerCelebration])

  // Web Speech API — האזנה
  useEffect(() => {
    if (!listening || !story || !page) return
    const r = recognitionRef.current
    if (!r) return
    r.onresult = (e: any) => {
      let heard = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        heard += e.results[i][0].transcript
      }
      const t = heard.trim()
      setRecognized(prev => {
        const next = new Set(prev)
        page.words.forEach((w, i) => {
          const clean = w.replace(/[^\u05D0-\u05EA]/g, '')
          if (t.includes(clean) || t.includes(w)) next.add(i)
        })
        return next.size !== prev.size ? next : prev
      })
    }
  }, [listening, story, pageIdx, page])

  const startMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.lang = 'he-IL'; r.continuous = true; r.interimResults = true
    r.onerror = () => stopMic()
    r.onend = () => { if (recognitionRef.current) r.start() }
    r.start()
    recognitionRef.current = r
    setListening(true)
  }

  const stopMic = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (e) {}
      recognitionRef.current = null
    }
    setListening(false)
  }

  if (loading) return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Secular One', serif", fontSize: 22,
    }}>
      טוען סיפור...
    </div>
  )

  if (!story || !page) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Secular+One&display=swap');
        @keyframes burst {
          0%   { opacity:1; transform:translate(0,0) scale(1) }
          100% { opacity:0; transform:translate(var(--tx),var(--ty)) scale(0.2) }
        }
        @keyframes pageEnter {
          from { opacity:0; transform:translateX(-40px) rotate(-1deg) }
          to   { opacity:1; transform:translateX(0) rotate(0) }
        }
        @keyframes pageExit {
          from { opacity:1; transform:translateX(0) rotate(0) }
          to   { opacity:0; transform:translateX(40px) rotate(1deg) }
        }
        @keyframes starPop {
          0%   { transform:scale(0) rotate(-15deg); opacity:0 }
          60%  { transform:scale(1.4) rotate(6deg); opacity:1 }
          100% { transform:scale(1) rotate(0); opacity:1 }
        }
        @keyframes micPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.18)} }
        .mic-active { animation: micPulse 0.75s infinite; }
      `}</style>

      <div style={{
        height: '100vh',
        display: 'flex', flexDirection: 'column',
        padding: '1rem 1.25rem', gap: '0.75rem',
        direction: 'rtl', fontFamily: "'Secular One', serif",
        overflow: 'hidden',
      }}>

        <div style={{ minHeight: 44 }}>
          {micPermission === 'denied' && (
            <div style={{
              background: '#FFE066',
              border: '2px solid #111',
              borderRadius: 10,
              padding: '8px 16px',
              fontFamily: "'Secular One', serif",
              fontSize: 14,
              color: '#111',
              boxShadow: '2px 2px 0 #111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <span>⚠️ לא ניתן לגשת למיקרופון — לחצו על 🎤 לניסיון ידני, או אשרו גישה בהגדרות הדפדפן</span>
              <button
                onClick={() => setMicPermission('unknown')}
                style={{
                  background: '#111', border: 'none',
                  borderRadius: '50%',
                  width: 28, height: 28,
                  fontSize: 14, cursor: 'pointer',
                  lineHeight: 1, padding: 0, fontWeight: 'bold',
                  color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                ✕
              </button>
            </div>
          )}
        </div>

        {/* אזור הקריאה */}
        <div ref={pageContainerRef} style={{
          flex: 1, display: 'flex', gap: '1rem', alignItems: 'center',
          position: 'relative', minHeight: 0,
          animation: pageAnim === 'enter'
            ? 'pageEnter 0.35s cubic-bezier(.22,.68,0,1.2)'
            : 'pageExit 0.28s ease forwards',
        }}>

          {/* מילים — ימין */}
          <div style={{
            flex: 1,
            alignSelf: 'stretch',
            background: '#fff',
            border: '3px solid #111',
            borderRadius: 16,
            boxShadow: '5px 5px 0 #111',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.25rem',
            position: 'relative',
          }}>
            {/* GameBackButton — פינה ימנית עליונה */}
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <GameBackButton />
            </div>

            {/* dots התקדמות — מרכז למעלה */}
            <div style={{
              display: 'flex', gap: 7, justifyContent: 'center',
              alignItems: 'center', marginBottom: '1rem', marginTop: 4,
            }}>
              {story.pages.map((_, i) => (
                <div key={i} style={{
                  width: i === pageIdx ? 22 : 10,
                  height: 10,
                  borderRadius: i === pageIdx ? 5 : '50%',
                  background: i === pageIdx ? '#FFE066' : i < pageIdx ? '#4CAF50' : '#e8e4d8',
                  border: '2px solid #111',
                  transition: 'all 0.3s',
                }} />
              ))}
            </div>

            {/* מילים — מרכז */}
            <div style={{
              flex: 1,
              display: 'flex', flexWrap: 'wrap',
              gap: 14, justifyContent: 'center', alignItems: 'center',
            }}>
              {page.words.map((w, i) => (
                <WordChip
                  key={`${pageIdx}-${i}`}
                  word={w}
                  recognized={recognized.has(i)}
                  onTap={(el) => {
                    speakWord(w)
                    setRecognized(prev => { const n = new Set(prev); n.add(i); return n })
                    if (el) spawnAt(el)
                  }}
                />
              ))}
            </div>

            {/* כפתור מיקרופון — פינה ימנית תחתונה */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                className={listening ? 'mic-active' : ''}
                onClick={() => listening ? stopMic() : startMic()}
                style={{
                  width: 50, height: 50, borderRadius: '50%',
                  border: '3px solid #111',
                  background: listening ? '#FF4B6E' : '#fff',
                  boxShadow: listening ? '3px 3px 0 #8b0000' : '3px 3px 0 #111',
                  fontSize: 22, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                🎤
              </button>
            </div>
          </div>

          {/* תמונה — שמאל */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid #111',
            borderRadius: 16,
            boxShadow: '5px 5px 0 #111',
            overflow: 'hidden',
            alignSelf: 'center',
            maxHeight: '100%',
          }}>
            {page.image_url
              ? <img
                  src={page.image_url}
                  alt={`עמוד ${page.page_number}`}
                  style={{
                    display: 'block',
                    maxHeight: 'calc(100vh - 160px)',
                    maxWidth: '100%',
                    objectFit: 'contain',
                  }}
                />
              : <span style={{ fontSize: 'clamp(80px,13vw,120px)', padding: '2rem' }}>
                  {page.emoji ?? '📖'}
                </span>
            }
          </div>

          {/* פרטיקלים */}
          {particles.map(p => (
            <Particle key={p.id} {...p}
              onDone={() => setParticles(ps => ps.filter(x => x.id !== p.id))} />
          ))}

          {/* חגיגה */}
          {celebrating && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 16,
              pointerEvents: 'none', zIndex: 15,
              background: 'rgba(255,255,255,0.9)',
              borderRadius: 16, border: '3px solid #111',
            }}>
              <div style={{
                fontFamily: "'Bangers', cursive",
                fontSize: 'clamp(42px,9vw,72px)',
                color: '#FF4B6E',
                WebkitTextStroke: '3px #111',
                letterSpacing: '0.06em',
                animation: 'starPop 0.4s cubic-bezier(.22,.68,0,1.5)',
                filter: 'drop-shadow(4px 4px 0 #111)',
              }}>
                כל הכבוד!
              </div>
              <div style={{ fontSize: 52 }}>🌟⭐🌟</div>
            </div>
          )}
        </div>

        {/* הוראה בעמוד ראשון */}
        <div style={{ minHeight: 50 }}>
          {pageIdx === 0 && !allDone && (
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              borderTop: '2.5px dashed #bbb',
              paddingTop: '0.5rem',
            }}>
              <div style={{
                position: 'relative',
                background: '#FFE066', border: '3px solid #111',
                borderRadius: 20, padding: '8px 20px',
                fontFamily: "'Bangers', cursive", fontSize: 17,
                letterSpacing: '0.05em', color: '#111',
                boxShadow: '3px 3px 0 #111',
              }}>
                לחצו על מילה לשמיעה, או דברו למיקרופון 🎤
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── רכיבים פנימיים ──

function WordChip({ word, recognized, onTap }: {
  word: string
  recognized: boolean
  onTap: (el: HTMLElement) => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <button
      ref={ref}
      onClick={() => ref.current && onTap(ref.current)}
      onMouseEnter={e => (e.currentTarget.style.transform = recognized ? 'scale(1.08) rotate(-1deg) translateY(-4px)' : 'translateY(-4px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = recognized ? 'scale(1.08) rotate(-1deg)' : 'scale(1)')}
      style={{
      fontSize: 'clamp(30px,5vw,50px)',
      fontFamily: "'Bangers','Secular One',cursive",
      letterSpacing: '0.05em',
      padding: '10px 26px',
      borderRadius: 12,
      border: '3px solid #111',
      background: recognized ? '#4CAF50' : '#fff',
      color: recognized ? '#fff' : '#111',
      cursor: 'pointer',
      transition: 'all 0.2s cubic-bezier(.22,.68,0,1.3)',
      transform: recognized ? 'scale(1.08) rotate(-1deg)' : 'scale(1)',
      boxShadow: recognized ? '4px 4px 0 #1a5c1a' : '4px 4px 0 #111',
    }}>
      {word}
    </button>
  )
}

function Particle({ x, y, color, angle, dist, onDone }: Particle & { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 700)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      width: 12, height: 12, borderRadius: '50%',
      background: color, pointerEvents: 'none',
      border: '2px solid #111',
      animation: 'burst 0.7s ease-out forwards',
      ['--tx' as any]: `${Math.cos(angle) * dist}px`,
      ['--ty' as any]: `${Math.sin(angle) * dist}px`,
      zIndex: 20,
    }} />
  )
}
