'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const GAME_ID = 'surprise-coins-001'
const GAME_DURATION = 60

// ─── Deterministic background ─────────────────────────────────────────────────
const STARS = Array.from({ length: 26 }, (_, i) => ({
  left: `${(i * 61 + 7) % 100}%`,
  top:  `${(i * 37 + 11) % 85}%`,
  sz:   i % 3 === 0 ? 3 : 2,
  delay:`${((i * 0.37) % 4).toFixed(2)}s`,
  dur:  `${(2 + (i % 8) * 0.4).toFixed(2)}s`,
}))

const MUSHROOMS = [
  { left: '8%',  color: '#FF6B9E' },
  { left: '22%', color: '#A78BFA' },
  { left: '72%', color: '#FFAA5E' },
  { left: '88%', color: '#1ED4D9' },
]

const COMBO_COLORS = ['#1ED4D9','#FF6B9E','#FFAA5E','#A78BFA','#5ED17E','#4ECDC4','#FFEEAA']

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = 'idle' | 'tutorial' | 'playing' | 'end'

type Coin = {
  active: boolean; x: number; y: number; vy: number
  size: number; value: number; rare: boolean
  wobble: number; glowPhase: number; paused: boolean
}
type Particle = {
  active: boolean; x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; size: number; star: boolean
}
type Pop = {
  active: boolean; x: number; y: number; vy: number
  value: number; life: number; color: string
}
type ComboDisplay = {
  hits: number; x: number; y: number; life: number; color: string
}

interface GS {
  phase: Phase
  score: number; timeLeft: number; elapsed: number
  explodedCount: number; sdkIdx: number
  coins: Coin[]; particles: Particle[]; pops: Pop[]
  comboDisplay: ComboDisplay | null
  spawnQ: number[]; nextSpawn: number
  lastHit: number; combo: number; comboColorIdx: number
  px: number; py: number; pdown: boolean
  uiDirty: boolean; glowOffAt: number
  raf: number; actx: AudioContext | null
}

function makeGS(): GS {
  return {
    phase: 'idle', score: 0, timeLeft: GAME_DURATION, elapsed: 0,
    explodedCount: 0, sdkIdx: 0,
    coins:     Array.from({ length: 60  }, (): Coin     => ({ active:false, x:0, y:0, vy:0, size:25, value:1, rare:false, wobble:0, glowPhase:0, paused:false })),
    particles: Array.from({ length: 600 }, (): Particle => ({ active:false, x:0, y:0, vx:0, vy:0, life:0, maxLife:800, color:'#FFD700', size:3, star:false })),
    pops:      Array.from({ length: 20  }, (): Pop      => ({ active:false, x:0, y:0, vy:0, value:0, life:0, color:'#FFD700' })),
    comboDisplay: null,
    spawnQ: [], nextSpawn: 0,
    lastHit: 0, combo: 0, comboColorIdx: 0,
    px: -999, py: -999, pdown: false,
    uiDirty: false, glowOffAt: 0,
    raf: 0, actx: null,
  }
}

// ─── Audio ────────────────────────────────────────────────────────────────────
function getActx(g: GS): AudioContext | null {
  if (!g.actx) try { g.actx = new (window.AudioContext || (window as any).webkitAudioContext)() } catch {}
  return g.actx
}
function osc(g: GS, freq: number, type: OscillatorType, freqEnd: number, dur: number, vol: number, delayMs = 0) {
  setTimeout(() => {
    const c = getActx(g); if (!c) return
    try {
      if (c.state === 'suspended') c.resume()
      const o = c.createOscillator(), gain = c.createGain()
      o.connect(gain); gain.connect(c.destination)
      o.type = type
      const t = c.currentTime
      o.frequency.setValueAtTime(freq, t)
      if (freqEnd !== freq) o.frequency.linearRampToValueAtTime(freqEnd, t + dur * 0.4)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(vol, t + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
      o.start(t); o.stop(t + dur + 0.02)
    } catch {}
  }, delayMs)
}
const soundPop     = (g: GS) => osc(g, 660, 'sine',     1200, 0.30, 0.25)
const soundFirework= (g: GS) => { osc(g, 400,'triangle',1000, 0.35, 0.20,   0); osc(g,700,'triangle',1750,0.35,0.20, 80); osc(g,1000,'triangle',2500,0.35,0.20,160) }
const soundJingle  = (g: GS) => { [523,659,784,1047].forEach((f,i) => osc(g, f,'sine',f,0.4,0.22, i*120)) }

// ─── Pool ─────────────────────────────────────────────────────────────────────
function slot<T extends { active: boolean }>(pool: T[]): T | null {
  for (let i = 0; i < pool.length; i++) if (!pool[i].active) return pool[i]
  return null
}

// ─── Spawn ────────────────────────────────────────────────────────────────────
function spawnCoin(g: GS, W: number, paused = false): Coin | null {
  const c = slot(g.coins); if (!c) return null
  const rare = Math.random() < 0.07
  const si   = Math.floor(Math.random() * 3)
  const sizes = [25, 33, 42], vals = [1, 2, 3]
  const sm    = 1 + g.elapsed * 0.01
  c.active = true; c.rare = rare
  c.size   = sizes[si]; c.value = rare ? vals[si] * 3 : vals[si]
  c.x      = c.size + Math.random() * (W - c.size * 2)
  c.y      = -c.size
  c.vy     = (0.8 + Math.random() * 3.5) * sm
  c.wobble = Math.random() * Math.PI * 2
  c.glowPhase = Math.random() * Math.PI * 2
  c.paused = paused
  return c
}

// ─── Burst ────────────────────────────────────────────────────────────────────
function burst(g: GS, x: number, y: number, color: string, count: number, rare: boolean) {
  for (let i = 0; i < count; i++) {
    const p = slot(g.particles); if (!p) break
    const a   = (i / count) * Math.PI * 2 + Math.random() * 0.5
    const spd = 2 + Math.random() * 4
    p.active = true; p.x = x; p.y = y
    p.vx = Math.cos(a) * spd; p.vy = Math.sin(a) * spd - 1.5
    p.life = 1; p.maxLife = 700 + Math.random() * 500
    p.color = rare ? (i % 2 ? '#FF6B9E' : '#A78BFA') : color
    p.size  = 2 + Math.random() * 4; p.star = i % 5 === 0
  }
}

// ─── Draw coin ────────────────────────────────────────────────────────────────
function drawCoin(ctx: CanvasRenderingContext2D, coin: Coin) {
  const { x, y, size, rare, wobble, glowPhase } = coin
  const cx = x + Math.sin(wobble) * 2

  // Halo
  if (rare) {
    ctx.beginPath(); ctx.arc(cx, y, size * 1.65, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(167,139,250,${(0.08 + Math.sin(glowPhase) * 0.05).toFixed(3)})`; ctx.fill()
    ctx.beginPath(); ctx.arc(cx, y, size * 1.35, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,107,158,${(0.12 + Math.sin(glowPhase + 1) * 0.05).toFixed(3)})`; ctx.fill()
  } else {
    ctx.beginPath(); ctx.arc(cx, y, size * 1.22, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,215,0,0.12)'; ctx.fill()
  }

  // Body gradient
  const gr = ctx.createRadialGradient(cx - size * 0.25, y - size * 0.25, size * 0.05, cx, y, size)
  if (rare) {
    gr.addColorStop(0,   '#F0EAFF'); gr.addColorStop(0.25, '#D4AAFF')
    gr.addColorStop(0.55,'#FF6B9E'); gr.addColorStop(0.8,  '#A78BFA'); gr.addColorStop(1, '#3D1A6E')
  } else {
    gr.addColorStop(0,   '#FFFDE0'); gr.addColorStop(0.2,  '#FFD700')
    gr.addColorStop(0.6, '#C8960C'); gr.addColorStop(1,    '#3D2000')
  }
  ctx.beginPath(); ctx.arc(cx, y, size, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill()

  // Rim
  ctx.beginPath(); ctx.arc(cx, y, size, 0, Math.PI * 2)
  ctx.strokeStyle = rare ? '#A78BFA' : '#8B6914'; ctx.lineWidth = 1.5; ctx.stroke()

  // Inner engraved ring
  ctx.beginPath(); ctx.arc(cx, y, size * 0.72, 0, Math.PI * 2)
  ctx.strokeStyle = rare ? 'rgba(93,0,128,0.4)' : 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.stroke()

  // $ — 3 passes (shadow, highlight, main)
  ctx.font = `bold ${Math.round(size * 0.65)}px serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(0,0,0,0.3)';       ctx.fillText('$', cx + 1,    y + 1.5)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillText('$', cx - 0.5,  y - 1)
  ctx.fillStyle = rare ? '#5A0080' : '#8B5E00'; ctx.fillText('$', cx, y)

  // Orbiting dots
  const dotN  = rare ? 6 : 4
  const dotC  = rare ? ['#FF6B9E','#A78BFA'] : ['#FFD700','#FFEEAA']
  for (let i = 0; i < dotN; i++) {
    const a = (i / dotN) * Math.PI * 2 + glowPhase
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * size * 1.08, y + Math.sin(a) * size * 1.08, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = dotC[i % 2]; ctx.fill()
  }
}

// ─── Draw particles ───────────────────────────────────────────────────────────
function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // Pass 1: circles
  for (const p of particles) {
    if (!p.active || p.star) continue
    const hex = Math.round(p.life * 200).toString(16).padStart(2, '0')
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fillStyle = p.color + hex; ctx.fill()
  }
  // Pass 2: stars
  for (const p of particles) {
    if (!p.active || !p.star) continue
    const hex = Math.round(p.life * 220).toString(16).padStart(2, '0')
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.life * 5)
    const r = p.size * 1.6
    ctx.beginPath()
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      ctx.lineTo(Math.cos(a + Math.PI / 4) * r * 0.38, Math.sin(a + Math.PI / 4) * r * 0.38)
    }
    ctx.closePath(); ctx.fillStyle = p.color + hex; ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GameClient() {
  const router    = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gsRef     = useRef<GS>(makeGS())
  const sdkRef    = useRef(false)

  const [ui, setUi] = useState({ phase: 'idle' as Phase, score: 0, timeLeft: GAME_DURATION, glow: false })

  // ── SDK ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (sdkRef.current) return; sdkRef.current = true
    const s = document.createElement('script')
    s.src = '/sdk/mathplatform-sdk-v1.js'
    s.onload = () => {
      const childId = new URLSearchParams(window.location.search).get('childId') || ''
      ;(window as any).MathPlatformSDK?.init?.({ childId })
      ;(window as any).MathPlatformSDK?.emit('GAME_STARTED', { gameId: GAME_ID })
    }
    document.head.appendChild(s)
  }, [])

  // ── SDK helpers ───────────────────────────────────────────────────────────
  const emitAnswer = useCallback(() => {
    const g = gsRef.current
    const idx = g.sdkIdx++
    ;(window as any).MathPlatformSDK?.emit('ANSWER', {
      correct: true, questionId: `coin-${idx}`,
      questionType: 'surprise-coins',
      correctAnswer: 'coin', childAnswer: 'coin', attemptNumber: 1,
    })
  }, [])

  const emitGameOver = useCallback((score: number) => {
    ;(window as any).MathPlatformSDK?.emit('GAME_OVER', {
      score, maxScore: score, stars: 3,
      correctAnswers: score, totalQuestions: score,
    })
  }, [])

  // ── Hit coins ─────────────────────────────────────────────────────────────
  const hitCoins = useCallback((x: number, y: number, now: number) => {
    const g = gsRef.current
    if (g.phase !== 'playing' && g.phase !== 'tutorial') return

    for (const coin of g.coins) {
      if (!coin.active) continue
      const dx = x - coin.x, dy = y - coin.y
      const hitR = coin.size + 28
      if (dx * dx + dy * dy >= hitR * hitR) continue

      // Explode
      coin.active = false
      g.score += coin.value
      g.explodedCount++
      g.uiDirty   = true
      g.glowOffAt = now + 480

      // Combo
      const isCombo = (now - g.lastHit) < 420
      if (isCombo) { g.combo++ } else { g.combo = 1; g.comboColorIdx = (g.comboColorIdx + 1) % COMBO_COLORS.length }
      g.lastHit = now
      if (g.combo >= 2) {
        g.comboDisplay = { hits: g.combo, x: coin.x, y: coin.y - 30, life: 1, color: COMBO_COLORS[g.comboColorIdx] }
      }

      // Particles
      const big = g.explodedCount % 5 === 0 || coin.rare || g.combo >= 4
      burst(g, coin.x, coin.y, coin.rare ? '#FF6B9E' : '#FFD700', big ? 28 : (g.combo >= 3 ? 18 : 12), coin.rare)

      // Score pop
      const p = slot(g.pops)
      if (p) { p.active = true; p.x = coin.x; p.y = coin.y; p.vy = -1.2; p.value = coin.value; p.life = 1; p.color = COMBO_COLORS[g.comboColorIdx] }

      // Audio
      if (big) soundFirework(g); else soundPop(g)

      // Vibration
      if (navigator.vibrate) navigator.vibrate(g.combo >= 3 ? [20, 8, 20, 8, 30] : 12)

      // SDK
      emitAnswer()

      // Tutorial → playing
      if (g.phase === 'tutorial') {
        g.phase      = 'playing'
        g.uiDirty    = true
        g.nextSpawn  = now + 200
      }
    }
  }, [emitAnswer])

  // ── Start / restart ───────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const g      = gsRef.current
    const canvas = canvasRef.current; if (!canvas) return

    g.phase = 'tutorial'; g.score = 0; g.timeLeft = GAME_DURATION; g.elapsed = 0
    g.explodedCount = 0; g.sdkIdx = 0
    g.spawnQ = []; g.nextSpawn = 0
    g.lastHit = 0; g.combo = 0; g.comboDisplay = null
    g.uiDirty = true; g.glowOffAt = 0
    g.coins.forEach(c => { c.active = false })
    g.particles.forEach(p => { p.active = false })
    g.pops.forEach(p => { p.active = false })

    soundJingle(g)

    // Tutorial coin — spawned paused, hovering at 46% height
    const tc = spawnCoin(g, canvas.width, true)
    if (tc) { tc.y = canvas.height * 0.46; tc.vy = 0 }

    setUi({ phase: 'tutorial', score: 0, timeLeft: GAME_DURATION, glow: false })
  }, [])

  // ── RAF loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx    = canvas.getContext('2d')!

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)

    let prevPhase: Phase = 'idle', prevScore = 0, prevTime = GAME_DURATION, prevGlow = false
    let prevFrame = performance.now()

    const loop = (now: number) => {
      const g  = gsRef.current
      g.raf    = requestAnimationFrame(loop)
      const dt = Math.min(now - prevFrame, 50)
      prevFrame = now
      const W  = canvas.width, H = canvas.height
      const sm = 1 + g.elapsed * 0.01

      // ── Playing update ─────────────────────────────────────────────────
      if (g.phase === 'playing') {
        g.elapsed += dt / 1000
        const newT = Math.max(0, GAME_DURATION - g.elapsed)
        if (Math.floor(newT) !== g.timeLeft) { g.timeLeft = Math.floor(newT); g.uiDirty = true }
        if (newT <= 0) { g.phase = 'end'; g.uiDirty = true; emitGameOver(g.score) }

        // Batch spawn
        if (now >= g.nextSpawn) {
          const max  = Math.min(20, 3 + Math.floor(g.explodedCount / 2))
          const min2 = Math.max(1, Math.floor(max * 0.4))
          const n    = min2 + Math.floor(Math.random() * (max - min2 + 1))
          for (let i = 0; i < n; i++) g.spawnQ.push(now + Math.random() * 800)
          g.nextSpawn = now + 300 + Math.random() * 400
        }
        // Drain queue
        for (let i = g.spawnQ.length - 1; i >= 0; i--) {
          if (now >= g.spawnQ[i]) { spawnCoin(g, W); g.spawnQ.splice(i, 1) }
        }
      }

      // ── Coin physics ──────────────────────────────────────────────────
      for (const coin of g.coins) {
        if (!coin.active) continue
        coin.wobble    += 0.04
        coin.glowPhase += 0.03
        if (coin.paused) {
          // Tutorial: gentle bob
          coin.y = H * 0.46 + Math.sin(now * 0.002) * 6
        } else {
          coin.vy += 0.055 * sm
          coin.y  += coin.vy
          if (coin.y > H + coin.size) coin.active = false
        }
      }

      // ── Particle physics ──────────────────────────────────────────────
      for (const p of g.particles) {
        if (!p.active) continue
        p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.vx *= 0.98
        p.life = Math.max(0, p.life - dt / p.maxLife)
        if (p.life <= 0) p.active = false
      }

      // ── Pop physics ───────────────────────────────────────────────────
      for (const p of g.pops) {
        if (!p.active) continue
        p.y   += p.vy
        p.life = Math.max(0, p.life - dt / 900)
        if (p.life <= 0) p.active = false
      }

      // ── Combo display ─────────────────────────────────────────────────
      if (g.comboDisplay) {
        g.comboDisplay.y   -= 0.6
        g.comboDisplay.life = Math.max(0, g.comboDisplay.life - dt / 900)
        if (g.comboDisplay.life <= 0) g.comboDisplay = null
      }

      // ── Render ────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H)

      drawParticles(ctx, g.particles)

      for (const coin of g.coins) {
        if (!coin.active) continue
        drawCoin(ctx, coin)
        // Tutorial finger
        if (coin.paused) {
          ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText('👆', coin.x + coin.size + 18, coin.y)
        }
      }

      // Score pops
      ctx.save()
      for (const p of g.pops) {
        if (!p.active) continue
        ctx.globalAlpha = p.life
        ctx.font = `bold ${18 + p.value * 4}px system-ui`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = p.color; ctx.fillText(`+${p.value}`, p.x, p.y)
      }
      ctx.restore()

      // Combo text
      if (g.comboDisplay && g.comboDisplay.hits >= 2) {
        const cd = g.comboDisplay
        const sc = 1 + Math.sin(cd.life * Math.PI) * 0.15
        ctx.save()
        ctx.globalAlpha = cd.life
        ctx.font = `bold ${Math.round(26 * sc)}px system-ui`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = cd.color; ctx.fillText(`×${cd.hits}`, cd.x, cd.y)
        ctx.restore()
      }

      // ── Flush React UI ────────────────────────────────────────────────
      const newGlow = now < g.glowOffAt
      if (g.uiDirty || newGlow !== prevGlow) {
        if (g.phase !== prevPhase || g.score !== prevScore || g.timeLeft !== prevTime || newGlow !== prevGlow) {
          prevPhase = g.phase; prevScore = g.score; prevTime = g.timeLeft; prevGlow = newGlow
          setUi({ phase: g.phase, score: g.score, timeLeft: g.timeLeft, glow: newGlow })
        }
        g.uiDirty = false
      }
    }

    gsRef.current.raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(gsRef.current.raf)
      window.removeEventListener('resize', resize)
    }
  }, [emitGameOver])

  // ── Pointer handlers ──────────────────────────────────────────────────────
  const xy = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onPMove = (e: React.PointerEvent) => {
    const { x, y } = xy(e)
    const g = gsRef.current; g.px = x; g.py = y
    // Mouse hover OR touch drag — both explode
    if (e.pointerType === 'mouse' || g.pdown) hitCoins(x, y, performance.now())
  }

  const onPDown = (e: React.PointerEvent) => {
    const { x, y } = xy(e)
    const g = gsRef.current; g.pdown = true; g.px = x; g.py = y
    hitCoins(x, y, performance.now())
  }

  const onPUp = () => {
    const g = gsRef.current; g.pdown = false
    setTimeout(() => { if (!gsRef.current.pdown) gsRef.current.combo = 0 }, 470)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const { phase, score, timeLeft, glow } = ui
  const timerColor = timeLeft <= 10 ? '#FF6B9E' : timeLeft <= 20 ? '#FFAA5E' : '#FFEEAA'

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative',
      background: 'linear-gradient(180deg,#2C1A4D 0%,#1a2060 50%,#0f2a18 100%)',
      fontFamily: "var(--font-secular,'Secular One',sans-serif)",
      cursor: (phase === 'playing' || phase === 'tutorial') ? 'none' : 'default',
    }}>
      <style>{`
        @keyframes twinkle   { 0%,100%{opacity:.15} 50%{opacity:.85} }
        @keyframes btnPulse  {
          0%,100%{box-shadow:0 0 20px 6px rgba(212,160,23,.4),0 0 40px 12px rgba(212,160,23,.15)}
          50%    {box-shadow:0 0 32px 14px rgba(212,160,23,.75),0 0 64px 28px rgba(212,160,23,.3)} }
        @keyframes bounce    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes spring    { 0%{transform:scale(0)} 60%{transform:scale(1.25)} 80%{transform:scale(.92)} 100%{transform:scale(1)} }
        @keyframes tPulse    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
      `}</style>

      {/* Stars */}
      {STARS.map((s, i) => (
        <div key={i} aria-hidden style={{
          position: 'absolute', left: s.left, top: s.top,
          width: s.sz, height: s.sz, borderRadius: '50%', background: 'white',
          animation: `twinkle ${s.dur} ${s.delay} ease-in-out infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Meadow */}
      <div aria-hidden style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '26%',
        background: 'linear-gradient(180deg,#1a4a1a 0%,#0f2a18 100%)',
        borderRadius: '60% 60% 0 0 / 30% 30% 0 0', pointerEvents: 'none',
      }}>
        {MUSHROOMS.map((m, i) => (
          <div key={i} style={{
            position: 'absolute', bottom: '35%', left: m.left,
            width: 16, height: 10, background: m.color,
            borderRadius: '50% 50% 0 0', boxShadow: `0 0 8px ${m.color}88`,
          }} />
        ))}
      </div>

      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' }}
        onPointerMove={onPMove}
        onPointerDown={onPDown}
        onPointerUp={onPUp}
        onPointerLeave={onPUp}
      />

      {/* HUD — playing / tutorial */}
      {(phase === 'playing' || phase === 'tutorial') && (
        <>
          {/* Score */}
          <div style={{
            position: 'absolute', top: 14, left: 18,
            fontSize: glow ? 72 : 58, fontWeight: 900, color: '#FFEEAA',
            textShadow: glow
              ? '0 0 8px white,0 0 20px #FFD700,0 0 42px #FFAA5E'
              : '0 2px 10px rgba(0,0,0,.6)',
            transition: 'font-size .15s,text-shadow .15s',
            filter: glow ? 'drop-shadow(0 0 14px #FFD700)' : 'none',
            pointerEvents: 'none', zIndex: 10,
          }}>
            {score}
          </div>

          {/* Timer */}
          <div style={{
            position: 'absolute', top: 14, right: 18,
            fontSize: 58, fontWeight: 900, color: timerColor,
            textShadow: '0 2px 10px rgba(0,0,0,.6)',
            animation: timeLeft <= 10 ? 'tPulse .5s ease-in-out infinite' : 'none',
            pointerEvents: 'none', zIndex: 10,
          }}>
            {timeLeft}
          </div>

          {/* GameBackButton */}
          <button
            onClick={() => router.back()}
            style={{
              position: 'absolute', bottom: 18, right: 18,
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,.08)', border: '1.5px solid rgba(255,255,255,.18)',
              color: 'rgba(255,255,255,.45)', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
            }}
          >←</button>
        </>
      )}

      {/* Idle screen */}
      {phase === 'idle' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <button
            onClick={startGame}
            style={{
              width: 190, height: 190, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'radial-gradient(circle at 35% 35%,#FFEEAA,#FFD700 40%,#C8960C 75%,#8B6000)',
              fontSize: 76, display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'btnPulse 2s ease-in-out infinite',
            }}
          >▶</button>
        </div>
      )}

      {/* End screen */}
      {phase === 'end' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          background: 'rgba(20,10,40,.75)', backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
        }}>
          <div style={{ fontSize: 68, animation: 'bounce 1s ease-in-out infinite' }}>💰</div>
          <div style={{
            fontSize: 100, fontWeight: 900, color: '#FFD700',
            textShadow: '0 0 30px #FFD700,0 0 60px #FFAA5E',
            animation: 'spring .6s cubic-bezier(.34,1.56,.64,1) forwards',
          }}>
            {score}
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={startGame}
              style={{
                width: 64, height: 64, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#34E08E,#1ED4D9)', fontSize: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(52,224,142,.5)',
              }}
            >🔄</button>
            <button
              onClick={() => router.back()}
              style={{
                width: 64, height: 64, borderRadius: '50%', cursor: 'pointer', color: 'white',
                background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.3)',
                fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >←</button>
          </div>
        </div>
      )}
    </div>
  )
}
