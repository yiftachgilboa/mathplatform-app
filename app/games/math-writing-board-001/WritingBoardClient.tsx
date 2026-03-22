'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Audio ────────────────────────────────────────────────────────────────────
let _actx: AudioContext | null = null;
function getActx() {
  if (!_actx) try { _actx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch {}
  return _actx;
}
function tone(freq: number, type: OscillatorType, dur: number, vol: number, delayMs = 0) {
  setTimeout(() => {
    const c = getActx(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = type; o.frequency.value = freq;
    const t = c.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  }, delayMs);
}
const playPick    = () => { tone(520,'sine',0.13,0.25); tone(780,'sine',0.1,0.2,90); };
const playDrop    = () => { tone(440,'sine',0.1,0.22); tone(600,'sine',0.1,0.2,80); tone(800,'sine',0.13,0.25,160); };
const playTrash   = () => { [220,170,120].forEach((f,i) => tone(f,'sawtooth',0.1,0.18,i*60)); };
const playSuccess = () => { [523,659,784,988,1047].forEach((f,i) => tone(f,'sine',0.3,0.28,i*85)); };
const playCoin    = () => { [880,1100,1320].forEach((f,i) => tone(f,'square',0.07,0.14,i*55)); };

// ─── Data ─────────────────────────────────────────────────────────────────────
const GAME_ID     = 'math-writing-board-001';
const TOTAL       = 3;
const LEFT_ITEMS  = [0,1,2,3,4,'+','−'];
const RIGHT_ITEMS = [5,6,7,8,9,'×','÷','='];
const COLORS: Record<string|number, string> = {
  0:'#A36361', 1:'#C96349', 2:'#F79E7D', 3:'#E7C878', 4:'#88895B',
  5:'#558E9B', 6:'#84A48B', 7:'#A386A9', 8:'#7BB2BA', 9:'#C6B3CA',
  '+'  :'#558E9B', '−':'#C96349', '×':'#A36361', '÷':'#A386A9', '=':'#84A48B',
};
const tc = (l: string|number) => COLORS[l] ?? '#aaa';
let _uid = 1;
const uid = () => String(_uid++);

// ─── Types ────────────────────────────────────────────────────────────────────
type Tile  = { id: string; label: string|number; bx: number; by: number };
type Heart = { id: string; x: number; y: number; vx: number; vy: number; size: number };
type Coin  = { id: string; x: number; y: number; vx: number; vy: number; delay: number };
type Shard = { id: string; x: number; y: number; angle: number; color: string; speed: number };
type Ghost = { label: string|number; x: number; y: number };

// ─── Component ────────────────────────────────────────────────────────────────
export default function WritingBoardClient() {
  const [equation, setEquation] = useState<Tile[]>([]);
  const [hearts,   setHearts]   = useState<Heart[]>([]);
  const [coins,    setCoins]    = useState<Coin[]>([]);
  const [shards,   setShards]   = useState<Shard[]>([]);
  const [score,    setScore]    = useState(0);
  const [done,     setDone]     = useState(false);
  const [glowing,  setGlowing]  = useState(false);
  const [trashHot, setTrashHot] = useState(false);
  const [ghost,    setGhost]    = useState<Ghost|null>(null);

  const drag          = useRef<{id:string; label:string|number}|null>(null);
  const ghostRef      = useRef<Ghost|null>(null);
  const boardRef      = useRef<HTMLDivElement>(null);
  const trashRef      = useRef<HTMLDivElement>(null);
  const boardOverRef  = useRef(false);
  const heartThrottle = useRef(0);
  const scoreRef      = useRef(0);

  // keep scoreRef in sync
  useEffect(() => { scoreRef.current = score; }, [score]);

  // ── SDK init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    (window as any).MathPlatformSDK?.emit('GAME_STARTED', { gameId: GAME_ID });
  }, []);

  // ── Board highlight (direct DOM, no re-render) ─────────────────────────────
  const setBoardHighlight = (on: boolean) => {
    const el = boardRef.current; if (!el) return;
    el.style.border     = on ? '2.5px dashed rgba(85,142,155,0.7)'   : '2.5px dashed rgba(163,134,169,0.4)';
    el.style.background = on ? 'rgba(174,203,184,0.35)' : 'rgba(255,252,245,0.92)';
  };

  // ── Hearts ─────────────────────────────────────────────────────────────────
  const maybeHeart = (x: number, y: number) => {
    const now = Date.now();
    if (now - heartThrottle.current < 500) return;
    heartThrottle.current = now;
    const h: Heart = { id:uid(), x, y, vx:(Math.random()-.5)*70, vy:-(20+Math.random()*50), size:14+Math.random()*10 };
    setHearts(p => [...p, h]);
    setTimeout(() => setHearts(p => p.filter(pp => pp.id !== h.id)), 2800);
  };

  // ── Coins ──────────────────────────────────────────────────────────────────
  const spawnCoins = useCallback(() => {
    const c: Coin[] = Array.from({length:21}, (_,i) => ({
      id: uid(),
      x:  window.innerWidth  * (0.1 + Math.random() * 0.8),
      y:  window.innerHeight * 0.5,
      vx: (Math.random() - 0.5) * 180,
      vy: -(60 + Math.random() * 160),
      delay: i * 40,
    }));
    setCoins(p => [...p, ...c]);
    playCoin();
    setTimeout(() => playCoin(), 400);
    setTimeout(() => playCoin(), 800);
    setTimeout(() => setCoins(p => p.filter(pp => !c.find(cc => cc.id === pp.id))), 5400);
  }, []);

  // ── Shards ─────────────────────────────────────────────────────────────────
  const spawnShards = useCallback((tiles: Tile[]) => {
    const all: Shard[] = tiles.flatMap(tile => {
      const el = document.getElementById('bt-' + tile.id);
      if (!el) return [];
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width/2, cy = r.top + r.height/2;
      return Array.from({length:21}, (_,i) => ({
        id: uid(), x: cx, y: cy,
        angle: (i/21) * Math.PI * 2,
        color: tc(tile.label),
        speed: 60 + Math.random() * 160,
      }));
    });
    setShards(p => [...p, ...all]);
    setTimeout(() => setShards(p => p.filter(pp => !all.find(aa => aa.id === pp.id))), 2700);
  }, []);

  // ── Drag helpers ───────────────────────────────────────────────────────────
  const getXY = (e: PointerEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length)
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if ('changedTouches' in e && e.changedTouches.length)
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: (e as PointerEvent).clientX, y: (e as PointerEvent).clientY };
  };

  const startDrag = (e: React.PointerEvent, label: string|number, fromEq=false, eqId: string|null=null) => {
    e.preventDefault();
    getActx()?.resume();
    playPick();
    const { x, y } = { x: e.clientX, y: e.clientY };
    const id = fromEq ? eqId! : uid();
    if (fromEq) setEquation(eq => eq.filter(t => t.id !== eqId));
    drag.current     = { id, label };
    ghostRef.current = { label, x, y };
    setGhost({ label, x, y });
  };

  // ── Pointer listeners — registered ONCE ───────────────────────────────────
  useEffect(() => {
    const onMove = (e: Event) => {
      if (!drag.current) return;
      e.preventDefault();
      const { x, y } = getXY(e as PointerEvent);

      ghostRef.current = { ...ghostRef.current!, x, y };
      setGhost({ ...ghostRef.current });

      const tr = trashRef.current;
      if (tr) {
        const r = tr.getBoundingClientRect();
        setTrashHot(x>=r.left && x<=r.right && y>=r.top && y<=r.bottom);
      }

      const board = boardRef.current;
      if (board) {
        const r    = board.getBoundingClientRect();
        const over = x>=r.left && x<=r.right && y>=r.top && y<=r.bottom;
        if (over !== boardOverRef.current) {
          boardOverRef.current = over;
          setBoardHighlight(over);
        }
      }
      maybeHeart(x, y);
    };

    const onEnd = (e: Event) => {
      if (!drag.current) return;
      const ds = drag.current;
      const { x, y } = getXY(e as PointerEvent);

      drag.current     = null;
      ghostRef.current = null;
      boardOverRef.current = false;
      setGhost(null);
      setTrashHot(false);
      setBoardHighlight(false);

      const tr = trashRef.current;
      if (tr) {
        const r = tr.getBoundingClientRect();
        if (x>=r.left && x<=r.right && y>=r.top && y<=r.bottom) { playTrash(); return; }
      }

      const board = boardRef.current;
      if (board) {
        const r = board.getBoundingClientRect();
        if (x>=r.left && x<=r.right && y>=r.top && y<=r.bottom) {
          const HALF = 65;
          const bx = Math.min(Math.max(x - r.left - HALF, 0), r.width  - HALF*2);
          const by = Math.min(Math.max(y - r.top  - HALF, 0), r.height - HALF*2);
          playDrop();
          setEquation(eq => [...eq, { id: ds.id, label: ds.label, bx, by }]);
        }
      }
    };

    const opts = { passive: false };
    window.addEventListener('pointermove', onMove, opts);
    window.addEventListener('pointerup',   onEnd,  opts);
    window.addEventListener('touchend',    onEnd,  opts);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onEnd);
      window.removeEventListener('touchend',    onEnd);
    };
  }, []);

  // ── Approve ────────────────────────────────────────────────────────────────
  const onApprove = () => {
    if (equation.length === 0) return;

    (window as any).MathPlatformSDK?.emit('ANSWER', {
      correct:       true,
      questionId:    `q-${String(scoreRef.current + 1).padStart(3,'0')}`,
      questionType:  'free-writing',
      correctAnswer: equation.map(t => t.label).join(''),
      childAnswer:   equation.map(t => t.label).join(''),
      attemptNumber: 1,
    });

    playSuccess();
    setGlowing(true);

    setTimeout(() => {
      spawnShards(equation);
      spawnCoins();
      setEquation([]);
      setGlowing(false);
      setScore(s => {
        const ns = s + 1;
        if (ns >= TOTAL) {
          setTimeout(() => {
            (window as any).MathPlatformSDK?.emit('GAME_OVER', {
              score: 100, maxScore: 100, stars: 3,
              correctAnswers: TOTAL, totalQuestions: TOTAL,
            });
            setDone(true);
          }, 700);
        }
        return ns;
      });
    }, 650);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={S.root} onPointerDown={e => e.preventDefault()}>
      <div style={S.bgDots} />

      {/* DONE */}
      {done && (
        <div style={S.overlay}>
          <div style={S.doneCard}>
            <div style={{fontSize:52}}>🌟</div>
            <h1 style={S.doneTitle}>כל הכבוד! סיימת!</h1>
            <p  style={S.doneSub}>כתבת {TOTAL} דברים יפים 🎨</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <button style={S.doneBtn} onClick={() => { setScore(0); setEquation([]); setDone(false); (window as any).MathPlatformSDK?.emit('GAME_STARTED', { gameId: GAME_ID }); }}>
                שחק שוב
              </button>
              <button style={S.continueBtn} onClick={() => { window.location.href = document.referrer || '/'; }}>
                המשך
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={S.topBar}>
        <div style={S.barWrap}>
          <span style={S.barLabel}>⭐ {score}/{TOTAL}</span>
          <div style={S.barTrack}><div style={{...S.barFill, width:`${score*10}%`}} /></div>
        </div>
        <button style={S.parentBtn} onClick={onApprove}>✓ הורה</button>
      </div>

      {/* MAIN */}
      <div style={S.main}>

        {/* Left palette */}
        <div style={S.palette}>
          {LEFT_ITEMS.map(item => (
            <div key={String(item)} style={{...S.tile, color:tc(item)}}
              onPointerDown={e => { e.stopPropagation(); startDrag(e, item); }}>
              {item}
            </div>
          ))}
        </div>

        {/* Board */}
        <div ref={boardRef} style={S.board}>
          {equation.length === 0 && <span style={S.hint}>גרור לכאן ✏️</span>}
          <div ref={trashRef} style={{...S.trash, ...(trashHot ? S.trashHot : {})}}>🗑️</div>
          {equation.map(tile => (
            <div key={tile.id} id={'bt-'+tile.id}
              style={{
                position:'absolute', left:tile.bx, top:tile.by,
                width:130, height:130,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:116, fontWeight:'bold', lineHeight:1,
                color: tc(tile.label),
                textShadow: glowing
                  ? `0 0 18px ${tc(tile.label)},0 0 36px ${tc(tile.label)}`
                  : `1px 2px 4px rgba(0,0,0,0.18)`,
                transform: glowing ? 'scale(1.2)' : 'scale(1)',
                transition: 'transform 0.3s, text-shadow 0.3s',
                cursor: 'grab', userSelect: 'none',
              }}
              onPointerDown={e => { e.stopPropagation(); startDrag(e, tile.label, true, tile.id); }}>
              {tile.label}
            </div>
          ))}
        </div>

        {/* Right palette */}
        <div style={S.palette}>
          {RIGHT_ITEMS.map(item => (
            <div key={String(item)} style={{...S.tile, color:tc(item)}}
              onPointerDown={e => { e.stopPropagation(); startDrag(e, item); }}>
              {item}
            </div>
          ))}
        </div>

      </div>

      {/* Ghost */}
      {ghost && (
        <div style={{
          position:'fixed', left:ghost.x-30, top:ghost.y-34,
          pointerEvents:'none', userSelect:'none', zIndex:1000,
          fontSize:58, fontWeight:'bold', lineHeight:1,
          color: tc(ghost.label),
          textShadow:`0 0 16px ${tc(ghost.label)}99,0 0 32px ${tc(ghost.label)}55,0 3px 8px rgba(0,0,0,0.25)`,
          transform:'rotate(-6deg) scale(1.05)',
          fontFamily:"'Fredoka One',cursive",
          willChange:'left,top',
        }}>{ghost.label}</div>
      )}

      {hearts.map(h => <HeartP key={h.id} {...h} />)}
      {coins.map(c  => <CoinP  key={c.id} {...c} />)}
      {shards.map(s => <ShardP key={s.id} {...s} />)}
    </div>
  );
}

// ─── Particles ────────────────────────────────────────────────────────────────
function HeartP({x,y,vx,vy,size}: Heart) {
  const [s,setS] = useState({x,y,o:1});
  useEffect(() => {
    let t0=0,raf=0;
    const run = (ts: number) => {
      if (!t0) t0=ts;
      const t=(ts-t0)/2400;
      if (t>=1) return;
      setS({x:x+vx*t, y:y+vy*t+80*t*t, o:t<.7?1:1-(t-.7)/.3});
      raf=requestAnimationFrame(run);
    };
    raf=requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div style={{position:'fixed',left:s.x-size/2,top:s.y-size/2,fontSize:size,opacity:s.o,pointerEvents:'none',zIndex:999}}>❤️</div>;
}

function CoinP({x,y,vx,vy,delay}: Coin) {
  const [s,setS] = useState({x,y,o:1});
  useEffect(() => {
    let t0=0,raf=0;
    const run = (ts: number) => {
      if (!t0) t0=ts+delay;
      const t=Math.max(0,(ts-t0)/4200);
      if (t>=1) return;
      setS({x:x+vx*t, y:y+vy*t+200*t*t, o:t<.75?1:1-(t-.75)/.25});
      raf=requestAnimationFrame(run);
    };
    raf=requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div style={{position:'fixed',left:s.x,top:s.y,fontSize:22,opacity:s.o,pointerEvents:'none',zIndex:998}}>🪙</div>;
}

function ShardP({x,y,angle,color,speed}: Shard) {
  const vx=Math.cos(angle)*speed, vy=Math.sin(angle)*speed;
  const [s,setS] = useState({x,y,o:1,sc:1});
  useEffect(() => {
    let t0=0,raf=0;
    const run = (ts: number) => {
      if (!t0) t0=ts;
      const t=(ts-t0)/2100;
      if (t>=1) return;
      setS({x:x+vx*t, y:y+vy*t+150*t*t, o:1-t, sc:1-t*.6});
      raf=requestAnimationFrame(run);
    };
    raf=requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div style={{
    position:'fixed', left:s.x-7, top:s.y-7, width:14, height:14, borderRadius:4,
    background:color, opacity:s.o,
    transform:`scale(${s.sc}) rotate(${angle*57}deg)`,
    pointerEvents:'none', zIndex:997,
  }} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S: Record<string,React.CSSProperties> = {
  root:{
    width:'100vw', height:'100vh',
    background:'linear-gradient(135deg,#C6B3CA,#AECBB8,#E89B88)',
    fontFamily:"'Fredoka One','Comic Sans MS',cursive",
    overflow:'hidden', position:'relative',
    display:'flex', flexDirection:'column',
    userSelect:'none', touchAction:'none',
  },
  bgDots:{
    position:'absolute', inset:0, pointerEvents:'none',
    backgroundImage:'radial-gradient(circle,rgba(255,255,255,0.22) 1px,transparent 1px)',
    backgroundSize:'28px 28px',
  },
  topBar:{
    display:'flex', alignItems:'center', gap:10,
    padding:'4px 10px',
    background:'rgba(255,255,255,0.35)',
    borderBottom:'1px solid rgba(163,134,169,0.3)',
    flexShrink:0, backdropFilter:'blur(4px)',
  },
  barWrap:{ display:'flex', alignItems:'center', gap:7, flex:1 },
  barLabel:{ color:'#A36361', fontSize:12, fontWeight:'bold', whiteSpace:'nowrap' },
  barTrack:{ flex:1, height:10, background:'rgba(163,134,169,0.25)', borderRadius:99, overflow:'hidden', border:'1px solid rgba(163,134,169,0.3)' },
  barFill:{
    height:'100%',
    background:'linear-gradient(90deg,#C96349,#E7C878,#84A48B)',
    borderRadius:99,
    transition:'width 0.5s cubic-bezier(.34,1.56,.64,1)',
    boxShadow:'0 0 8px #C96349aa',
  },
  parentBtn:{
    background:'linear-gradient(135deg,#558E9B,#84A48B)',
    color:'#fff', border:'none',
    padding:'5px 16px', borderRadius:99,
    fontSize:15, fontWeight:'bold',
    cursor:'pointer', fontFamily:'inherit', flexShrink:0,
    boxShadow:'0 2px 8px rgba(85,142,155,0.4)',
  },
  main:{
    flex:1, display:'flex', flexDirection:'row',
    alignItems:'stretch', gap:3,
    padding:'4px', minHeight:0, overflow:'hidden',
  },
  palette:{
    display:'flex', flexDirection:'column',
    gap:2, width:56, flexShrink:0, justifyContent:'space-around',
  },
  tile:{
    borderRadius:12, cursor:'grab',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:24, fontWeight:'bold',
    flex:1, minHeight:34, maxHeight:60,
    background:'rgba(255,255,255,0.55)',
    border:'1.5px solid rgba(255,255,255,0.8)',
    boxShadow:'0 2px 6px rgba(163,99,97,0.15)',
    userSelect:'none',
  },
  board:{
    flex:2, minWidth:0,
    background:'rgba(255,252,245,0.92)',
    borderRadius:18,
    border:'2.5px dashed rgba(163,134,169,0.4)',
    position:'relative', overflow:'hidden',
    transition:'border 0.12s, background 0.12s',
    boxShadow:'inset 0 2px 12px rgba(163,134,169,0.12), 0 4px 20px rgba(163,99,97,0.1)',
  },
  hint:{
    color:'rgba(163,134,169,0.6)', fontSize:13,
    position:'absolute', inset:0,
    display:'flex', alignItems:'center', justifyContent:'center',
    pointerEvents:'none', direction:'rtl', fontStyle:'italic',
  },
  trash:{
    position:'absolute', right:8, bottom:8,
    fontSize:20, background:'rgba(255,71,87,0.18)',
    borderRadius:50, width:38, height:38,
    display:'flex', alignItems:'center', justifyContent:'center',
    border:'2px solid rgba(255,71,87,0.35)',
    transition:'transform 0.2s, filter 0.2s', zIndex:10,
  },
  trashHot:{
    transform:'scale(1.4)',
    filter:'drop-shadow(0 0 12px #ff4757)',
  },
  overlay:{
    position:'fixed', inset:0, zIndex:2000,
    background:'rgba(198,179,202,0.7)',
    display:'flex', alignItems:'center', justifyContent:'center',
    backdropFilter:'blur(10px)',
  },
  doneCard:{
    background:'linear-gradient(135deg,#FFF8F0,#F9D0CD)',
    borderRadius:28, padding:'32px 40px', textAlign:'center',
    border:'2.5px solid rgba(201,99,73,0.3)',
    boxShadow:'0 8px 40px rgba(163,99,97,0.25)',
    direction:'rtl',
  },
  doneTitle:{ color:'#A36361', fontSize:24, margin:'8px 0 10px' },
  doneSub:{ color:'#88895B', fontSize:16, margin:'0 0 22px' },
  doneBtn:{
    background:'linear-gradient(135deg,#C96349,#F79E7D)',
    border:'none', borderRadius:99,
    padding:'10px 28px', color:'#fff',
    fontSize:16, fontWeight:'bold',
    cursor:'pointer', fontFamily:'inherit',
    boxShadow:'0 4px 16px rgba(201,99,73,0.4)',
  },
  continueBtn:{
    background:'linear-gradient(135deg,#558E9B,#84A48B)',
    border:'none', borderRadius:99,
    padding:'10px 28px', color:'#fff',
    fontSize:16, fontWeight:'bold',
    cursor:'pointer', fontFamily:'inherit',
    boxShadow:'0 4px 16px rgba(85,142,155,0.4)',
  },
};
