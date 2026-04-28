'use client'

const GAME_ID = 'math-addition-subtraction-001'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────────── */
const COLORS = ['#E3000B','#006CB7','#00A650','#FF6B00','#7B2D8B','#00A99D','#CC5500','#2255CC'];
const BRICK_H = 52, UNIT_W = 38, UNIT_GAP = 2, FLOOR_H = 46, GRAVITY = 0.55, BOUNCE = 0.28;
const brickW = (v: number) => v * UNIT_W + (v - 1) * UNIT_GAP;
const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pickColor = (ex?: string) => { const p = ex ? COLORS.filter(c => c !== ex) : COLORS; return p[Math.floor(Math.random() * p.length)]; };
const darken = (hex: string) => {
  const c = parseInt(hex.slice(1), 16);
  return `rgb(${Math.max(0,(c>>16)-45)},${Math.max(0,((c>>8)&255)-45)},${Math.max(0,(c&255)-45)})`;
};

/* ─────────────────────────────────────────────
   AUDIO
───────────────────────────────────────────── */
let audioCtx: AudioContext | null = null;
const getAudio = () => { if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); return audioCtx; };
const playTone = (freq: number, type: OscillatorType, dur: number, vol = 0.3, startFreq: number | null = null) => {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    if (startFreq) { osc.frequency.setValueAtTime(startFreq, ctx.currentTime); osc.frequency.linearRampToValueAtTime(freq, ctx.currentTime + dur * 0.6); }
    else osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch(e) {}
};
const soundSuccess = () => [523,659,784,1047].forEach((f,i) => setTimeout(() => playTone(f,'sine',0.18,0.25), i*80));
const soundWrong = () => playTone(120,'sawtooth',0.35,0.2,280);
const soundMerge = (val: number) => { const freq = 200 + val * 30; playTone(freq,'sine',0.15,0.22,freq*1.4); };
const soundLevelComplete = () => {
  [523,659,784,1047,1318].forEach((f,i) => setTimeout(() => playTone(f,'sine',0.25,0.28), i*100));
  setTimeout(() => playTone(1047,'sine',0.5,0.3), 600);
};
const soundSlice = () => {
  playTone(800,'sawtooth',0.08,0.15,1200);
};

/* ─────────────────────────────────────────────
   LEVEL DEFINITIONS
───────────────────────────────────────────── */
const LEVELS = [
  { op:'+', gen:()=>{ let a,b; do{a=rnd(1,3);b=rnd(1,3);}while(a+b>4); return[a,b,a+b]; }},
  { op:'-', gen:()=>{ const a=4,b=rnd(1,3); return[a,b,a-b]; }},
  { op:'+', gen:()=>{ let a,b; do{a=rnd(1,4);b=rnd(1,4);}while(a+b<3||a+b>5); return[a,b,a+b]; }},
  { op:'-', gen:()=>{ const a=5,b=rnd(1,4); return[a,b,a-b]; }},
  { op:'+', gen:()=>{ let a,b; do{a=rnd(1,5);b=rnd(1,5);}while(a+b<4||a+b>6); return[a,b,a+b]; }},
  { op:'-', gen:()=>{ const a=6,b=rnd(1,5); return[a,b,a-b]; }},
  { op:'+', gen:()=>{ let a,b; do{a=rnd(1,6);b=rnd(1,6);}while(a+b<5||a+b>7); return[a,b,a+b]; }},
  { op:'-', gen:()=>{ const a=7,b=rnd(1,6); return[a,b,a-b]; }},
  { op:'+', gen:()=>{ let a,b; do{a=rnd(1,7);b=rnd(1,7);}while(a+b<6||a+b>8); return[a,b,a+b]; }},
  { op:'-', gen:()=>{ const a=8,b=rnd(1,7); return[a,b,a-b]; }},
  { op:'+', gen:()=>{ let a,b; do{a=rnd(1,8);b=rnd(1,8);}while(a+b<7||a+b>9); return[a,b,a+b]; }},
  { op:'-', gen:()=>{ const a=9,b=rnd(1,8); return[a,b,a-b]; }},
  { op:'+', gen:()=>{ let a,b; do{a=rnd(1,9);b=rnd(1,9);}while(a+b<8||a+b>10); return[a,b,a+b]; }},
  { op:'-', gen:()=>{ const a=10,b=rnd(1,9); return[a,b,a-b]; }},
  { op:'+', gen:()=>{ let a,b; do{a=rnd(2,9);b=rnd(2,9);}while(a+b<=10||a+b>20); return[a,b,a+b]; }},
  { op:'-', gen:()=>{ let a,b; do{a=rnd(11,18);b=rnd(2,9);}while(a-b<1||a%10===0||(a-b)>=10); return[a,b,a-b]; }},
  { op:'+', gen:()=>{ let a,b; do{a=rnd(11,19);b=rnd(1,9);}while(a+b>20); return[a,b,a+b]; }},
  { op:'-', gen:()=>{ let a,b; do{a=rnd(11,18);b=rnd(2,9);}while(a-b<1||(a%10)===0||b>(a%10)); return[a,b,a-b]; }},
  { op:'mix', gen:()=>{
    const pick=rnd(0,3);
    if(pick===0){let a,b;do{a=rnd(2,9);b=rnd(2,9);}while(a+b<=10||a+b>20);return[a,b,a+b,'+'];}
    if(pick===1){let a,b;do{a=rnd(11,18);b=rnd(2,9);}while(a-b<1||a%10===0||(a-b)>=10);return[a,b,a-b,'-'];}
    if(pick===2){let a,b;do{a=rnd(11,19);b=rnd(1,9);}while(a+b>20);return[a,b,a+b,'+'];}
    let a,b;do{a=rnd(11,18);b=rnd(2,9);}while(a-b<1||(a%10)===0||b>(a%10));return[a,b,a-b,'-'];
  }},
  { op:'+chain', gen:()=>{
    const len=rnd(3,4);let nums,s;
    do{nums=Array.from({length:len},()=>rnd(1,6));s=nums.reduce((a,b)=>a+b,0);}while(s<=10||s>20);
    return nums.concat([s]);
  }},
];

/* ─────────────────────────────────────────────
   MAP DATA
───────────────────────────────────────────── */
const NODE_POSITIONS = (() => {
  const pts = [], H = 2900, rows = 21, rowH = H / (rows + 1);
  for (let i = 0; i < rows; i++) {
    const row = rows - i;
    const y = H - row * rowH;
    const x = (i % 2 === 0) ? 100 : 300;
    pts.push({ x, y });
  }
  return pts;
})();

const DECO_ITEMS = [
  {emoji:'🌴',x:20,y:120},{emoji:'🌸',x:340,y:220},{emoji:'⭐',x:60,y:350},
  {emoji:'🦋',x:320,y:450},{emoji:'🌺',x:30,y:580},{emoji:'🎯',x:355,y:680},
  {emoji:'🌺',x:50,y:800},{emoji:'🦜',x:330,y:900},{emoji:'🌪',x:20,y:1050},
  {emoji:'🌈',x:360,y:1150},{emoji:'🏠',x:40,y:1300},{emoji:'🦁',x:340,y:1400},
  {emoji:'🐰',x:25,y:1550},{emoji:'🌙',x:355,y:1650},{emoji:'🐭',x:45,y:1800},
  {emoji:'🌟',x:330,y:1950},{emoji:'🌍',x:30,y:2100},{emoji:'🫧',x:360,y:2200},
  {emoji:'🌊',x:50,y:2400},{emoji:'🌅',x:340,y:2500},
];

const NODE_COLOR_STYLES = [
  'linear-gradient(135deg,#f72585,#b5179e)',
  'linear-gradient(135deg,#7209b7,#560bad)',
  'linear-gradient(135deg,#4361ee,#3a0ca3)',
  'linear-gradient(135deg,#4cc9f0,#4895ef)',
  'linear-gradient(135deg,#06d6a0,#1b9aaa)',
  'linear-gradient(135deg,#ffd60a,#fca311)',
  'linear-gradient(135deg,#ff6b35,#e63946)',
  'linear-gradient(135deg,#2dc653,#008148)',
  'linear-gradient(135deg,#c77dff,#9d4edd)',
  'linear-gradient(135deg,#ff9f1c,#e76f51)',
];

/* ─────────────────────────────────────────────
   SAVE / LOAD
───────────────────────────────────────────── */
const saveState = (s: object) => { try { localStorage.setItem('legoMath_v1', JSON.stringify(s)); } catch(e){} };
const loadState = () => { try { return JSON.parse(localStorage.getItem('legoMath_v1') ?? 'null'); } catch(e){ return null; } };
const defaultState = () => ({ currentLevel: 0, levels: Array.from({length:21},(_,i)=>({stars:0,unlocked:i===0})) });

/* ─────────────────────────────────────────────
   ROBOT SVG
───────────────────────────────────────────── */
const RobotSVG = ({ size = 52 }) => (
  <svg viewBox="0 0 52 80" xmlns="http://www.w3.org/2000/svg" width={size} height={size * 80/52}>
    <line x1="26" y1="0" x2="26" y2="10" stroke="#888" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="26" cy="0" r="4" fill="#ff5566"/>
    <rect x="10" y="10" width="32" height="24" rx="8" fill="#5588ff"/>
    <rect x="12" y="12" width="28" height="20" rx="6" fill="#4477ee"/>
    <ellipse cx="19" cy="22" rx="5" ry="5" fill="white"/>
    <ellipse cx="33" cy="22" rx="5" ry="5" fill="white"/>
    <circle cx="20" cy="22" r="3" fill="#222"/>
    <circle cx="34" cy="22" r="3" fill="#222"/>
    <circle cx="21" cy="21" r="1" fill="white"/>
    <circle cx="35" cy="21" r="1" fill="white"/>
    <path d="M18 30 Q26 36 34 30" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <rect x="12" y="36" width="28" height="26" rx="7" fill="#44aaff"/>
    <rect x="16" y="40" width="20" height="6" rx="3" fill="#ff6644"/>
    <rect x="16" y="47" width="20" height="4" rx="2" fill="#ffcc00"/>
    <rect x="1" y="37" width="10" height="16" rx="5" fill="#5588ff"/>
    <rect x="41" y="37" width="10" height="16" rx="5" fill="#5588ff"/>
    <rect x="14" y="63" width="10" height="14" rx="5" fill="#3366cc"/>
    <rect x="28" y="63" width="10" height="14" rx="5" fill="#3366cc"/>
    <rect x="12" y="74" width="14" height="6" rx="3" fill="#2255aa"/>
    <rect x="26" y="74" width="14" height="6" rx="3" fill="#2255aa"/>
  </svg>
);

/* ─────────────────────────────────────────────
   GENERATE EXERCISES
───────────────────────────────────────────── */
const genExercises = (levelIdx: number) => {
  const lvl = LEVELS[levelIdx];
  const exs = [];
  let prevAns = null;
  for (let i = 0; i < 3; i++) {
    let res, ans, attempt = 0;
    do {
      res = lvl.gen();
      ans = lvl.op === '+chain' ? res[res.length - 1] : res[2];
      attempt++;
    } while (ans === prevAns && attempt < 12);
    prevAns = ans;
    if (lvl.op === '+chain') exs.push({ chain: res.slice(0,-1) as number[], ans: res[res.length-1] as number, op: '+' });
    else if (lvl.op === 'mix') exs.push({ a: res[0] as number, b: res[1] as number, ans: res[2] as number, op: String(res[3]) });
    else exs.push({ a: res[0] as number, b: res[1] as number, ans: res[2] as number, op: lvl.op });
  }
  return exs;
};

const freshExercise = (levelIdx: number, prevAns: number | null) => {
  const lvl = LEVELS[levelIdx];
  let res, ans, att = 0;
  do { res = lvl.gen(); ans = lvl.op==='+chain'?res[res.length-1]:res[2]; att++; } while (ans===prevAns && att<12);
  if (lvl.op==='+chain') return { chain:res.slice(0,-1) as number[], ans:res[res.length-1] as number, op:'+' };
  if (lvl.op==='mix') return { a:res[0] as number, b:res[1] as number, ans:res[2] as number, op:String(res[3]) };
  return { a:res[0] as number, b:res[1] as number, ans:res[2] as number, op:lvl.op };
};

/* ─────────────────────────────────────────────
   CSS (injected once)
───────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap');
.lm-root { font-family: 'Fredoka One', cursive; user-select: none; -webkit-user-select: none; touch-action: none; width:100%; height:100%; position:fixed; inset:0; }
@keyframes lm-decoFloat{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-12px) rotate(6deg)}}
@keyframes lm-nodePulse{0%,100%{box-shadow:0 0 0 4px rgba(255,255,255,0.3),0 6px 20px rgba(0,0,0,0.4)}50%{box-shadow:0 0 0 14px rgba(255,255,255,0.1),0 6px 20px rgba(0,0,0,0.4)}}
@keyframes lm-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
@keyframes lm-trainBob{0%{transform:translateY(-52%)}100%{transform:translateY(-48%)}}
@keyframes lm-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
@keyframes lm-robotBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes lm-robotMapBounce{0%,100%{transform:translate(-50%,-50%) translateY(0)}50%{transform:translate(-50%,-50%) translateY(-6px)}}
@keyframes lm-robotCelebrate{0%{transform:translateY(-12px) rotate(-8deg)}100%{transform:translateY(-4px) rotate(8deg)}}
@keyframes lm-cloudDrift{0%{transform:translateX(0)}100%{transform:translateX(120px)}}
@keyframes lm-heartShake{0%{transform:scale(1)}20%{transform:scale(1.5) rotate(-20deg)}50%{transform:scale(0.8) rotate(10deg)}100%{transform:scale(1)}}
@keyframes lm-heartFall{0%{transform:translateY(0) scale(1.2) rotate(0deg);opacity:1}100%{transform:translateY(110vh) scale(0.5) rotate(30deg);opacity:0}}
@keyframes lm-fall{0%{transform:translateY(-20px) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}
@keyframes lm-mergePop{0%{transform:scale(1.06)}50%{transform:scale(0.97)}100%{transform:scale(1)}}
@keyframes lm-keyFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(120vh) rotate(30deg);opacity:0}}
@keyframes lm-popIn{0%{transform:scale(0.5)}100%{transform:scale(1)}}
@keyframes lm-cardFlipOut{0%{transform:scaleX(1) scaleY(1);opacity:1}100%{transform:scaleX(0) scaleY(0.85);opacity:0.3}}
@keyframes lm-cardFlipIn{0%{transform:scaleX(0) scaleY(0.85);opacity:0.3}100%{transform:scaleX(1) scaleY(1);opacity:1}}
@keyframes lm-lcPop{0%{transform:scale(0.5)}100%{transform:scale(1)}}
@keyframes lm-slashFade{0%{opacity:1;stroke-width:4}100%{opacity:0;stroke-width:1}}
@keyframes lm-fingerDrag{0%,100%{transform:translate(0,0)}45%,55%{transform:translate(72px,0)}}
@keyframes lm-fingerSlash{0%,100%{transform:translate(0,0)}45%,55%{transform:translate(90px,-25px)}}
@keyframes lm-fingerCut{0%,100%{transform:translate(0,0)}45%,55%{transform:translate(18px, 60px)}}
@keyframes lm-tutHint{0%,100%{opacity:0.8}50%{opacity:1;transform:scale(1.03)}}
.lm-tutorial-finger{position:absolute;font-size:2.4rem;pointer-events:none;z-index:20;filter:drop-shadow(2px 3px 4px rgba(0,0,0,0.3));}
.lm-tutorial-hint{position:absolute;background:rgba(0,0,0,0.65);color:white;border-radius:16px;padding:10px 18px;font-size:1.1rem;pointer-events:none;z-index:20;white-space:nowrap;animation:lm-tutHint 1.8s ease-in-out infinite;}
.lm-slash-line-fade{animation:lm-slashFade 0.35s ease-out forwards;}
.lm-deco{position:absolute;font-size:2.5rem;animation:lm-decoFloat 4s ease-in-out infinite;opacity:0.85;}
.lm-node-current{animation:lm-nodePulse 1.4s ease-in-out infinite!important;}
.lm-progress-fill-shine::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent);animation:lm-shimmer 2s infinite;}
.lm-train-engine{position:absolute;left:-22px;top:50%;transform:translateY(-50%) scaleX(-1);font-size:1.5rem;pointer-events:none;filter:drop-shadow(1px 2px 2px rgba(0,0,0,0.25));animation:lm-trainBob 0.5s ease-in-out infinite alternate;}
.lm-qmark-pulse{animation:lm-pulse 1.5s ease-in-out infinite;}
.lm-robot-bounce{animation:lm-robotBounce 2s ease-in-out infinite;}
.lm-robot-celebrate{animation:lm-robotCelebrate 0.5s ease infinite alternate;}
.lm-robot-map-bounce{animation:lm-robotMapBounce 2s ease-in-out infinite;}
.lm-cloud{position:absolute;pointer-events:none;z-index:1;background:white;border-radius:50px;opacity:0.7;filter:blur(1px);animation:lm-cloudDrift linear infinite;}
.lm-heart-shake{animation:lm-heartShake 0.4s ease;}
.lm-confetti-piece{position:absolute;width:11px;height:11px;border-radius:3px;animation:lm-fall linear forwards;}
.lm-brick{position:absolute;border-radius:12px;cursor:grab;touch-action:none;display:flex;align-items:center;justify-content:center;}
.lm-brick.dragging{box-shadow:0 20px 40px rgba(0,0,0,0.3),0 5px 10px rgba(0,0,0,0.15)!important;z-index:1000!important;transform:rotate(2deg) scale(1.08);cursor:grabbing;}
.lm-brick.merge-pop{animation:lm-mergePop 0.3s ease;}
.lm-brick.near-trash{box-shadow:0 0 0 3px #ff2244,0 8px 20px rgba(255,34,68,0.4)!important;transform:scale(0.95)!important;}
.lm-trash-lid{width:48px;height:10px;background:linear-gradient(135deg,#ff4466,#cc0033);border-radius:6px 6px 0 0;border:2px solid #990022;transition:transform 0.2s;transform-origin:center bottom;}
.lm-trash-open .lm-trash-lid{transform:rotate(-45deg) translateY(-6px);}
.lm-trash-eye::after{content:'';width:5px;height:5px;background:#333;border-radius:50%;display:block;}
.lm-trash-open .lm-trash-eye::after{width:6px;height:6px;background:#111;}
.lm-trash-mouth{width:16px;height:6px;border:2px solid white;border-top:none;border-radius:0 0 8px 8px;}
.lm-trash-open .lm-trash-mouth{border-radius:8px 8px 0 0;border:2px solid white;border-bottom:none;}
.lm-progress-track::before{content:'';position:absolute;inset:7px 0;background:repeating-linear-gradient(90deg,transparent,transparent 16px,rgba(0,0,0,0.12) 16px,rgba(0,0,0,0.12) 18px);}
.lm-falling-heart{position:fixed;font-size:2rem;pointer-events:none;z-index:9999;animation:lm-heartFall 1.1s ease-in forwards;}
.lm-key-fall{animation:lm-keyFall 0.8s ease-in forwards;}
.lm-card-flip-out{animation:lm-cardFlipOut 0.22s ease-in forwards;}
.lm-card-flip-in{animation:lm-cardFlipIn 0.22s ease-out forwards;}
.lm-slash-overlay{position:absolute;inset:0;z-index:5;pointer-events:none;}
`;

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface Brick {
  id: number;
  val: number;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  el: HTMLDivElement;
}

type Exercise = {
  ans: number;
  op: string;
  a?: number;
  b?: number;
  chain?: number[];
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function GameClient() {
  const router = useRouter()
  const [screen, setScreen] = useState('map'); // 'map' | 'game'
  const [gameState, setGameState] = useState(() => defaultState());
  const childIdRef = useRef<string | null>(null);
  const [confetti, setConfetti] = useState<{ id: number; left: number; color: string; duration: number; delay: number }[]>([]);

  // Game state
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exIdx, setExIdx] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [mistakes, setMistakes] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [numpadOpen, setNumpadOpen] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [typedAns, setTypedAns] = useState<number | null>(null);
  const [cardFlip, setCardFlip] = useState(''); // '' | 'out' | 'in'
  const [robotCelebrate, setRobotCelebrate] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [lcStars, setLcStars] = useState(0);
  const [hiddenKeys, setHiddenKeys] = useState<Set<number>>(new Set());
  const [shakeHeart, setShakeHeart] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [hintMode, setHintMode] = useState(false);
  const hiddenKeysRef = useRef<Set<number>>(new Set());
  const hintModeRef = useRef(false);

  // Tutorial state
  const [tutorialStep, setTutorialStep] = useState(0); // 0=merge, 1=slice, 2=done
  const tutorialStepRef = useRef(0);

  // Slash state
  const slashStartRef = useRef<{ x: number; y: number } | null>(null);
  const slashSvgRef = useRef<SVGSVGElement | null>(null);
  const slashLineRef = useRef<SVGLineElement | null>(null);
  const isSlashingRef = useRef(false);

  const sessionCorrectRef = useRef(0);
  const sessionTotalRef = useRef(0);

  // Bricks (managed via refs for physics loop)
  const bricksRef = useRef<Brick[]>([]);
  const nextIdRef = useRef(0);
  const playgroundRef = useRef<HTMLDivElement | null>(null);
  const playgroundInnerRef = useRef<HTMLDivElement | null>(null);
  const trashBinRef = useRef<HTMLDivElement | null>(null);
  const physicsRunningRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragBrickRef = useRef<Brick | null>(null);
  const dragOXRef = useRef(0);
  const dragOYRef = useRef(0);
  const mapScreenRef = useRef<HTMLDivElement | null>(null);
  const mapSceneRef = useRef<HTMLDivElement | null>(null);
  const mapRobotRef = useRef<HTMLDivElement | null>(null);
  const exercisesRef = useRef<Exercise[]>([]);
  const exIdxRef = useRef(0);
  const heartsRef = useRef(3);
  const mistakesRef = useRef(0);
  const cleanAnswersRef = useRef(0);
  const progressPctRef = useRef(0);
  const currentLevelIdxRef = useRef(0);
  const numpadOpenRef = useRef(false);
  const answeredRef = useRef(false);
  const trashOpenRef = useRef(false);
  const gameStateRef = useRef(gameState);
  const screenRef = useRef(screen);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { screenRef.current = screen; }, [screen]);

  useEffect(() => {
    const script = document.createElement('script')
    script.src = '/sdk/mathplatform-sdk-v1.js'
    script.onload = () => {
      window.MathPlatformSDK?.emit('GAME_STARTED', { gameId: GAME_ID })
    }
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const childId = params.get('childId')
    childIdRef.current = childId

    if (childId) {
      fetch(`/api/game-progress/${childId}/math-addition-subtraction-001`)
        .then(r => r.json())
        .then(({ progress_data }) => {
          if (progress_data) {
            setGameState(progress_data)
            saveState(progress_data)
          } else {
            const local = loadState()
            if (local) setGameState(local)
          }
        })
        .catch(() => {
          const local = loadState()
          if (local) setGameState(local)
        })
    } else {
      const local = loadState()
      if (local) setGameState(local)
    }
  }, [])

  const typeAnswerRef = useRef<(n: number) => void>(() => {})

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (answeredRef.current) return
      const n = parseInt(e.key)
      if (isNaN(n) || n < 1) return
      const ex = exercisesRef.current[exIdxRef.current]
      if (!ex) return
      const rangeStart = ex.ans <= 10 ? 1 : 11
      const rangeEnd = rangeStart + 9
      if (n >= rangeStart && n <= rangeEnd && !hiddenKeysRef.current.has(n)) {
        typeAnswerRef.current(n)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Inject CSS once
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  /* ─── SAVE STATE ─── */
  const updateAndSave = (updater: (prev: ReturnType<typeof defaultState>) => ReturnType<typeof defaultState>) => {
    setGameState(prev => {
      const next = updater(prev);
      saveState(next);
      if (childIdRef.current) {
        fetch(`/api/game-progress/${childIdRef.current}/math-addition-subtraction-001`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ progress_data: next }),
        }).catch(() => {})
      }
      return next;
    });
  };

  /* ─── MAP ─── */
  const totalStars = () => gameState.levels.reduce((a, l) => a + l.stars, 0);

  const scrollToCurrentLevel = () => {
    if (!mapScreenRef.current) return;
    const pos = NODE_POSITIONS[gameState.currentLevel];
    mapScreenRef.current.scrollTop = Math.max(0, pos.y - 200);
  };

  const buildMapRobot = useCallback((levelIdx: number, animate = false, fromIdx: number | null = null) => {
    if (!mapSceneRef.current) return;
    if (mapRobotRef.current) { mapRobotRef.current.remove(); mapRobotRef.current = null; }
    const toPos = NODE_POSITIONS[levelIdx];
    const rob = document.createElement('div');
    rob.style.cssText = 'position:absolute;z-index:200;pointer-events:none;filter:drop-shadow(2px 3px 4px rgba(0,0,0,0.3));';
    rob.className = 'lm-robot-map-bounce';
    rob.innerHTML = `<svg viewBox="0 0 52 80" xmlns="http://www.w3.org/2000/svg" width="36" height="55">
      <line x1="26" y1="0" x2="26" y2="8" stroke="#888" stroke-width="2" stroke-linecap="round"/>
      <circle cx="26" cy="0" r="3" fill="#ff5566"/>
      <rect x="10" y="8" width="32" height="22" rx="7" fill="#5588ff"/>
      <rect x="12" y="10" width="28" height="18" rx="5" fill="#4477ee"/>
      <ellipse cx="19" cy="20" rx="4.5" ry="4.5" fill="white"/>
      <ellipse cx="33" cy="20" rx="4.5" ry="4.5" fill="white"/>
      <circle cx="20" cy="20" r="2.5" fill="#222"/>
      <circle cx="34" cy="20" r="2.5" fill="#222"/>
      <circle cx="21" cy="19" r="0.8" fill="white"/>
      <circle cx="35" cy="19" r="0.8" fill="white"/>
      <path d="M18 27 Q26 33 34 27" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <rect x="12" y="32" width="28" height="22" rx="6" fill="#44aaff"/>
      <rect x="16" y="36" width="20" height="5" rx="2.5" fill="#ff6644"/>
      <rect x="16" y="42" width="20" height="3" rx="1.5" fill="#ffcc00"/>
      <rect x="1" y="33" width="9" height="14" rx="4.5" fill="#5588ff"/>
      <rect x="42" y="33" width="9" height="14" rx="4.5" fill="#5588ff"/>
      <rect x="14" y="55" width="9" height="12" rx="4.5" fill="#3366cc"/>
      <rect x="29" y="55" width="9" height="12" rx="4.5" fill="#3366cc"/>
      <rect x="12" y="64" width="13" height="5" rx="2.5" fill="#2255aa"/>
      <rect x="27" y="64" width="13" height="5" rx="2.5" fill="#2255aa"/>
    </svg>`;

    if (animate && fromIdx !== null) {
      const fromPos = NODE_POSITIONS[fromIdx];
      rob.style.left = (fromPos.x / 400 * 100) + '%';
      rob.style.top = (fromPos.y - 45) + 'px';
      rob.style.transform = 'translate(-50%,-50%)';
      mapSceneRef.current.appendChild(rob);
      mapRobotRef.current = rob;
      if (mapScreenRef.current) mapScreenRef.current.scrollTo({ top: Math.max(0, fromPos.y - 250), behavior: 'smooth' });
      setTimeout(() => {
        rob.style.transition = 'left 0.9s cubic-bezier(0.4,0,0.2,1), top 0.9s cubic-bezier(0.4,0,0.2,1)';
        rob.style.left = (toPos.x / 400 * 100) + '%';
        rob.style.top = (toPos.y - 45) + 'px';
        setTimeout(() => { if (mapScreenRef.current) mapScreenRef.current.scrollTo({ top: Math.max(0, toPos.y - 250), behavior: 'smooth' }); }, 400);
      }, 400);
      setTimeout(() => { rob.style.transition = 'none'; rob.style.left = (toPos.x / 400 * 100) + '%'; rob.style.top = (toPos.y - 45) + 'px'; }, 1400);
    } else {
      rob.style.left = (toPos.x / 400 * 100) + '%';
      rob.style.top = (toPos.y - 45) + 'px';
      rob.style.transform = 'translate(-50%,-50%)';
      mapSceneRef.current.appendChild(rob);
      mapRobotRef.current = rob;
    }
  }, []);

  useEffect(() => {
    if (screen === 'map') {
      setTimeout(() => {
        if (mapScreenRef.current) {
          const pos = NODE_POSITIONS[gameState.currentLevel];
          mapScreenRef.current.scrollTop = Math.max(0, pos.y - 200);
        }
        buildMapRobot(gameState.currentLevel);
      }, 150);
    }
  }, [screen, gameState.currentLevel, buildMapRobot]);

  /* ─── BRICKS (imperative DOM) ─── */
  const clearBricks = () => {
    bricksRef.current.forEach(b => { if (b.el && b.el.parentNode) b.el.parentNode.removeChild(b.el); });
    bricksRef.current = [];
  };

  const isOverTrash = (b: Brick) => {
    if (!playgroundRef.current || !trashBinRef.current) return false;
    const pgRect = playgroundRef.current.getBoundingClientRect();
    const tRect = trashBinRef.current.getBoundingClientRect();
    const tL = tRect.left - pgRect.left, tT = tRect.top - pgRect.top;
    return b.x < tL + tRect.width && b.x + brickW(b.val) > tL && b.y < tT + tRect.height && b.y + BRICK_H > tT;
  };

  const removeBrickById = (id: number) => {
    const idx = bricksRef.current.findIndex(b => b.id === id);
    if (idx < 0) return;
    const b = bricksRef.current[idx];
    bricksRef.current.splice(idx, 1);
    if (b.el && b.el.parentNode) b.el.parentNode.removeChild(b.el);
  };

  const bricksOverlap = (a: Brick, b: Brick) =>
    a.x < b.x + brickW(b.val) && a.x + brickW(a.val) > b.x && a.y < b.y + BRICK_H && a.y + BRICK_H > b.y;

  const bringToFront = (brick: Brick) => {
    bricksRef.current.forEach(x => { if (x.el) x.el.style.zIndex = '10'; });
    if (brick.el) brick.el.style.zIndex = '100';
  };

  const addBrick = useCallback((val: number, color: string, x: number, y: number) => {
    const id = nextIdRef.current++;
    const brick = { id, val, color, x, y, vx: 0, vy: 0 } as Brick;
    bricksRef.current.push(brick);
    const el = document.createElement('div');
    el.className = 'lm-brick';
    const w = brickW(val);
    el.style.cssText = `width:${w}px;height:${BRICK_H}px;background:${color};box-shadow:0 5px 0 ${darken(color)},0 7px 14px rgba(0,0,0,0.18);left:${x}px;top:${y}px;z-index:10;`;
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:1.6rem;color:rgba(255,255,255,0.95);text-shadow:1px 1px 3px rgba(0,0,0,0.4);position:relative;z-index:2;pointer-events:none;font-family:Fredoka One,cursive;';
    lbl.textContent = String(val);
    el.appendChild(lbl);
    (brick as Brick).el = el;

    setupBrickDrag(el, brick);
    if (playgroundInnerRef.current) playgroundInnerRef.current.appendChild(el);
    return brick;
  }, []);

  const setupBrickDrag = (el: HTMLDivElement, brick: Brick) => {
    let touchStartX = 0, touchStartY = 0, touchMoved = false, lastTapTime = 0;
    const MOVE_THRESHOLD = 8;

    const doSplit = (clientX: number) => {
      if (brick.val <= 1) return;
      const rect = el.getBoundingClientRect();
      const localX = clientX - rect.left;
      const segW = brickW(brick.val) / brick.val;
      let at = Math.floor(localX / segW) + 1;
      at = Math.max(1, Math.min(brick.val - 1, at));
      const v1 = at, v2 = brick.val - at, x = brick.x, y = brick.y, c1 = brick.color, c2 = pickColor(c1);
      removeBrickById(brick.id);
      addBrick(v1, c1, x, y);
      addBrick(v2, c2, x + brickW(v1) + 14, y);
    };

    const startDrag = (cx: number, cy: number) => {
      isDraggingRef.current = true; dragBrickRef.current = brick;
      const rect = el.getBoundingClientRect();
      dragOXRef.current = cx - rect.left; dragOYRef.current = cy - rect.top;
      brick.vx = 0; brick.vy = 0; el.classList.add('dragging'); bringToFront(brick);
      if (!isSlashingRef.current) {
        el.style.cursor = 'grabbing'
      } else {
        el.style.cursor = 'inherit'
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || dragBrickRef.current !== brick) return;
      const pgRect = playgroundRef.current!.getBoundingClientRect();
      brick.x = e.clientX - pgRect.left - dragOXRef.current;
      brick.y = e.clientY - pgRect.top - dragOYRef.current;
      el.style.left = brick.x + 'px'; el.style.top = brick.y + 'px';
      const ov = isOverTrash(brick);
      if (trashBinRef.current) trashBinRef.current.classList.toggle('lm-trash-open', ov);
      el.classList.toggle('near-trash', ov);
      trashOpenRef.current = ov;
      setTrashOpen(ov);
    };
    const onMouseUp = () => {
      if (!isDraggingRef.current || dragBrickRef.current !== brick) return;
      isDraggingRef.current = false; el.classList.remove('dragging', 'near-trash'); dragBrickRef.current = null;
      if (trashBinRef.current) trashBinRef.current.classList.remove('lm-trash-open');
      setTrashOpen(false);
      if (isOverTrash(brick)) { removeBrickById(brick.id); return; }
      tryMerge(brick);
    };
    el.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); startDrag(e.clientX, e.clientY); });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('dblclick', e => { e.preventDefault(); e.stopPropagation(); doSplit(e.clientX); });

    el.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0]; touchStartX = t.clientX; touchStartY = t.clientY; touchMoved = false;
    }, { passive: false });
    el.addEventListener('touchmove', e => {
      e.preventDefault(); if (!e.touches.length) return;
      const t = e.touches[0];
      const dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
      if (!touchMoved && Math.sqrt(dx*dx+dy*dy) > MOVE_THRESHOLD) { touchMoved = true; startDrag(touchStartX, touchStartY); }
      if (touchMoved && isDraggingRef.current && dragBrickRef.current === brick) {
        const pgRect = playgroundRef.current!.getBoundingClientRect();
        brick.x = t.clientX - pgRect.left - dragOXRef.current;
        brick.y = t.clientY - pgRect.top - dragOYRef.current;
        el.style.left = brick.x + 'px'; el.style.top = brick.y + 'px';
        const ov = isOverTrash(brick);
        if (trashBinRef.current) trashBinRef.current.classList.toggle('lm-trash-open', ov);
        el.classList.toggle('near-trash', ov);
        setTrashOpen(ov);
      }
    }, { passive: false });
    el.addEventListener('touchend', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      if (touchMoved && isDraggingRef.current && dragBrickRef.current === brick) {
        isDraggingRef.current = false; el.classList.remove('dragging', 'near-trash'); dragBrickRef.current = null;
        if (trashBinRef.current) trashBinRef.current.classList.remove('lm-trash-open');
        setTrashOpen(false);
        if (isOverTrash(brick)) { removeBrickById(brick.id); return; }
        tryMerge(brick);
      } else {
        const now = Date.now();
        if (now - lastTapTime < 380) { doSplit(t.clientX); lastTapTime = 0; }
        else lastTapTime = now;
      }
      touchMoved = false;
    }, { passive: false });
  };

  const tryMerge = (brick: Brick) => {
    for (const other of bricksRef.current) {
      if (other === brick) continue;
      if (!bricksOverlap(brick, other)) continue;
      doMerge(brick, other); return;
    }
  };

  const tutorialCheckMergeRef = useRef<() => void>(() => {});
  const tutorialCheckSliceRef = useRef<() => void>(() => {});
  const spawnConfettiRef = useRef<(n: number) => void>(() => {});

  const doMerge = (moved: Brick, other: Brick) => {
    const total = moved.val + other.val;
    if (total <= 10) { mergeBricksAction(moved, other, total); }
    else {
      const movedCx = moved.x + brickW(moved.val) / 2;
      const statCx = other.x + brickW(other.val) / 2;
      const stX = other.x, stRX = other.x + brickW(other.val), stY = other.y;
      const rem = total - 10;
      const fromRight = movedCx > statCx;
      mergeBricksAction(moved, other, 10);
      const pgW = playgroundRef.current ? playgroundRef.current.offsetWidth : 300;
      let rx = fromRight ? stX + brickW(10) + 6 : stRX - brickW(10) - brickW(rem) - 6;
      rx = Math.max(0, Math.min(pgW - brickW(rem), rx));
      addBrick(rem, pickColor(), rx, stY);
    }
  };

  const mergeBricksAction = (moved: Brick, stationary: Brick, v: number) => {
    const color = moved.val >= stationary.val ? moved.color : stationary.color;
    const y = stationary.y;
    const movedCx = moved.x + brickW(moved.val) / 2, statCx = stationary.x + brickW(stationary.val) / 2;
    let x = movedCx > statCx ? stationary.x : stationary.x + brickW(stationary.val) - brickW(v);
    const pgW = playgroundRef.current ? playgroundRef.current.offsetWidth : 300;
    x = Math.max(0, Math.min(pgW - brickW(v), x));
    removeBrickById(moved.id); removeBrickById(stationary.id);
    soundMerge(v);
    const m = addBrick(v, color, x, y);
    m.el.classList.add('merge-pop');
    setTimeout(() => m.el.classList.remove('merge-pop'), 350);
    // tutorial check
    setTimeout(() => tutorialCheckMergeRef.current(), 400);
  };

  /* ─── SLASH HELPERS ─── */
  const doSlashSplit = useCallback((sx: number, sy: number, ex: number, ey: number) => {
    // Sample multiple points along the slash line to find a hit
    const steps = 20;
    let hitX: number | null = null, hitBrick: Brick | null = null;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = sx + (ex - sx) * t;
      const py = sy + (ey - sy) * t;
      for (const b of bricksRef.current) {
        if (px < b.x || px > b.x + brickW(b.val)) continue;
        if (py < b.y || py > b.y + BRICK_H) continue;
        if (b.val <= 1) continue;
        hitBrick = b;
        hitX = px;
        break;
      }
      if (hitBrick) break;
    }
    if (!hitBrick || hitX === null) return;

    const localX = hitX - hitBrick.x;
    const segW = brickW(hitBrick.val) / hitBrick.val;
    let at = Math.floor(localX / segW) + 1;
    at = Math.max(1, Math.min(hitBrick.val - 1, at));

    const v1 = at, v2 = hitBrick.val - at;
    const bx = hitBrick.x, by = hitBrick.y, c1 = hitBrick.color, c2 = pickColor(c1);
    removeBrickById(hitBrick.id);
    soundSlice();
    const nb1 = addBrick(v1, c1, bx, by);
    const nb2 = addBrick(v2, c2, bx + brickW(v1) + 10, by);
    nb1.vx = -1.5; nb1.vy = -2;
    nb2.vx = 1.5; nb2.vy = -2;
    // tutorial check
    setTimeout(() => tutorialCheckSliceRef.current(), 400);
  }, [addBrick]);

  /* ─── SLASH pointer handlers for playground ─── */
  const handlePlaygroundPointerDown = useCallback((e: React.PointerEvent) => {
    // Only handle direct playground clicks (not on bricks - bricks stopPropagation on mousedown)
    if (isDraggingRef.current) return;
    if (!playgroundRef.current) return;
    const rect = playgroundRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if we're over a brick — if so, don't start slash
    const overBrick = bricksRef.current.some(b =>
      x >= b.x && x <= b.x + brickW(b.val) && y >= b.y && y <= b.y + BRICK_H
    );
    if (overBrick) return;

    isSlashingRef.current = true;
    if (playgroundRef.current) playgroundRef.current.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Ctext y=\'28\' font-size=\'28\'%3E✂️%3C/text%3E%3C/svg%3E") 16 16, crosshair'
    slashStartRef.current = { x, y };
    if (slashLineRef.current) {
      slashLineRef.current.setAttribute('x1', String(x));
      slashLineRef.current.setAttribute('y1', String(y));
      slashLineRef.current.setAttribute('x2', String(x));
      slashLineRef.current.setAttribute('y2', String(y));
      slashLineRef.current.style.opacity = '1';
      slashLineRef.current.classList.remove('lm-slash-line-fade');
    }
    e.stopPropagation();
  }, []);

  const handlePlaygroundPointerMove = useCallback((e: React.PointerEvent) => {
    if (isSlashingRef.current) {
      if (playgroundRef.current) playgroundRef.current.style.cursor =
        'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Ctext y=\'28\' font-size=\'28\'%3E✂️%3C/text%3E%3C/svg%3E") 16 16, crosshair'
      return
    }
    if (!isSlashingRef.current && playgroundRef.current) {
      playgroundRef.current.style.cursor = 'default'
    }
    if (!isSlashingRef.current || !slashStartRef.current) return;
    if (!playgroundRef.current) return;
    const rect = playgroundRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (slashLineRef.current) {
      slashLineRef.current.setAttribute('x2', String(x));
      slashLineRef.current.setAttribute('y2', String(y));
    }
  }, []);

  const handlePlaygroundPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isSlashingRef.current || !slashStartRef.current) return;
    if (!playgroundRef.current) return;
    const rect = playgroundRef.current.getBoundingClientRect();
    const ex = e.clientX - rect.left;
    const ey = e.clientY - rect.top;
    const { x: sx, y: sy } = slashStartRef.current;

    isSlashingRef.current = false;
    slashStartRef.current = null;
    if (playgroundRef.current) playgroundRef.current.style.cursor = 'default'

    // Fade line out
    if (slashLineRef.current) {
      slashLineRef.current.classList.add('lm-slash-line-fade');
      setTimeout(() => {
        if (slashLineRef.current) {
          slashLineRef.current.style.opacity = '0';
          slashLineRef.current.classList.remove('lm-slash-line-fade');
        }
      }, 350);
    }

    // Need minimum drag length
    const dist = Math.sqrt((ex-sx)**2 + (ey-sy)**2);
    if (dist < 20) return;

    doSlashSplit(sx, sy, ex, ey);
  }, [doSlashSplit]);

  /* ─── PHYSICS LOOP ─── */
  const physicsLoop = useCallback(() => {
    if (!physicsRunningRef.current) return;
    const pg = playgroundRef.current;
    if (!pg) { requestAnimationFrame(physicsLoop); return; }
    const pgH = pg.offsetHeight, pgW = pg.offsetWidth;
    const groundY = pgH - FLOOR_H - BRICK_H;
    bricksRef.current.forEach(b => {
      if (dragBrickRef.current === b) return;
      b.vy += GRAVITY; b.x += b.vx; b.y += b.vy;
      if (b.y >= groundY) { b.y = groundY; b.vy *= -BOUNCE; b.vx *= 0.82; if (Math.abs(b.vy) < 0.5) b.vy = 0; }
      if (b.x < 0) { b.x = 0; b.vx *= -0.4; }
      if (b.x + brickW(b.val) > pgW) { b.x = pgW - brickW(b.val); b.vx *= -0.4; }
      if (b.y < 0) { b.y = 0; b.vy *= -0.2; }
      if (b.el) { b.el.style.left = Math.round(b.x) + 'px'; b.el.style.top = Math.round(b.y) + 'px'; }
    });
    if (!isDraggingRef.current && bricksRef.current.length >= 2) {
      outer: for (let i = 0; i < bricksRef.current.length; i++) {
        for (let j = i + 1; j < bricksRef.current.length; j++) {
          if (bricksOverlap(bricksRef.current[i], bricksRef.current[j])) {
            const a = bricksRef.current[i], b = bricksRef.current[j];
            const sa = Math.abs(a.vx) + Math.abs(a.vy), sb = Math.abs(b.vx) + Math.abs(b.vy);
            const mv = sa >= sb ? a : b, st = mv === a ? b : a;
            doMerge(mv, st); break outer;
          }
        }
      }
    }
    requestAnimationFrame(physicsLoop);
  }, [addBrick]);

  /* ─── LOAD EXERCISE ─── */
  const loadExerciseBricks = useCallback((ex: Exercise) => {
    clearBricks();
    if (!playgroundRef.current) return;
    const pgW = playgroundRef.current.offsetWidth, pgH = playgroundRef.current.offsetHeight;
    const gY = pgH - FLOOR_H - BRICK_H;
    const c1 = pickColor(), c2 = pickColor(c1);
    if (ex.chain) {
      const vals = ex.chain;
      const totalW = vals.reduce((s, v) => s + brickW(v), 0) + (vals.length - 1) * 20;
      let sx = (pgW - totalW) / 2;
      const colors = [c1, c2, ...COLORS.filter(c => c !== c1 && c !== c2)];
      vals.forEach((v, i) => { addBrick(v, colors[i % colors.length], sx, gY - 60); sx += brickW(v) + 20; });
    } else if (ex.op === '-') {
      const w1 = brickW(ex.a!);
      addBrick(ex.a!, c1, (pgW - w1) / 2, gY - 60);
    } else {
      const w1 = brickW(ex.a!), w2 = brickW(ex.b!), gap = 20, totalW = w1 + gap + w2;
      const startX = (pgW - totalW) / 2;
      addBrick(ex.a!, c1, startX, gY - 60);
      addBrick(ex.b!, c2, startX + w1 + gap, gY - 60);
    }
  }, [addBrick]);

  const loadExercise = useCallback((ex: Exercise, animate = true) => {
    if (animate) {
      setCardFlip('out');
      setTimeout(() => {
        setCardFlip('in');
        setAnswered(false);
        setTypedAns(null);
        setNumpadOpen(false);
        numpadOpenRef.current = false;
        hiddenKeysRef.current = new Set(); setHiddenKeys(new Set());
        loadExerciseBricks(ex);
        setTimeout(() => setCardFlip(''), 230);
      }, 220);
    } else {
      setAnswered(false);
      setTypedAns(null);
      setNumpadOpen(false);
      numpadOpenRef.current = false;
      hiddenKeysRef.current = new Set(); setHiddenKeys(new Set());
      setTimeout(() => loadExerciseBricks(ex), 50);
    }
  }, [loadExerciseBricks]);

  /* ─── START LEVEL ─── */
  const startLevel = useCallback((idx: number) => {
    currentLevelIdxRef.current = idx;
    setCurrentLevelIdx(idx);
    const exs = genExercises(idx);
    exercisesRef.current = exs;
    exIdxRef.current = 0;
    heartsRef.current = 3;
    mistakesRef.current = 0;
    cleanAnswersRef.current = 0;
    progressPctRef.current = 0;
    setExercises(exs);
    setExIdx(0);
    setHearts(3);
    setMistakes(0);
    setProgressPct(0);
    setAnswered(false);
    setTypedAns(null);
    setNumpadOpen(false);
    numpadOpenRef.current = false;
    setLevelComplete(false);
    hintModeRef.current = false;
    setHintMode(false);
    setScreen('game');
    physicsRunningRef.current = true;
    requestAnimationFrame(physicsLoop);
    setTimeout(() => loadExercise(exs[0], false), 60);
  }, [loadExercise, physicsLoop]);

  /* ─── START TUTORIAL ─── */
  const startTutorial = useCallback(() => {
    tutorialStepRef.current = 0;
    setTutorialStep(0);
    setProgressPct(0);
    progressPctRef.current = 0;
    setScreen('tutorial');
    physicsRunningRef.current = true;
    requestAnimationFrame(physicsLoop);
    setTimeout(() => {
      if (!playgroundRef.current) return;
      const pgW = playgroundRef.current.offsetWidth;
      const pgH = playgroundRef.current.offsetHeight;
      const gY = pgH - FLOOR_H - BRICK_H - 10;
      clearBricks();
      // Place 2 and 3 bricks with gap
      addBrick(2, '#E3000B', pgW/2 - brickW(2) - 30, gY);
      addBrick(3, '#006CB7', pgW/2 + 30, gY);
    }, 80);
  }, [physicsLoop, addBrick]);

  /* ─── TUTORIAL: watch for merge ─── */
  const tutorialCheckMerge = useCallback(() => {
    if (tutorialStepRef.current !== 0) return;
    const has5 = bricksRef.current.some(b => b.val === 5);
    if (has5) {
      // Wait 2s so child sees the merged brick, then prompt slice
      setTimeout(() => {
        tutorialStepRef.current = 1;
        setTutorialStep(1);
        setProgressPct(50);
      }, 2000);
    }
  }, []);

  /* ─── TUTORIAL: watch for slice ─── */
  const tutorialCheckSlice = useCallback(() => {
    if (tutorialStepRef.current !== 1) return;
    // After slice, the 5 is gone and two smaller bricks exist
    const has5 = bricksRef.current.some(b => b.val === 5);
    if (!has5 && bricksRef.current.length >= 2) {
      tutorialStepRef.current = 2;
      setTutorialStep(2);
      setProgressPct(100);
      soundLevelComplete();
      spawnConfettiRef.current(50);
      setTimeout(() => {
        updateAndSave(prev => {
          const next = { ...prev };
          next.levels[0] = { stars: 3, unlocked: true };
          if (next.levels[1]) next.levels[1] = { ...next.levels[1], unlocked: true };
          next.currentLevel = 1;
          return next;
        });
        setLevelComplete(true);
        setLcStars(3);
      }, 2000);
    }
  }, [updateAndSave]);

  const spawnConfetti = useCallback((n: number) => {
    const all = [...COLORS, '#FFD700', '#FF69B4'];
    const pieces = Array.from({ length: n }, (_, i) => ({
      id: Date.now() + i + Math.random(),
      left: Math.random() * 100,
      color: all[i % all.length],
      duration: 1.4 + Math.random() * 1.4,
      delay: Math.random() * 0.5,
    }));
    setConfetti(prev => [...prev, ...pieces]);
    setTimeout(() => setConfetti(prev => prev.filter(p => !pieces.find(x => x.id === p.id))), 3200);
  }, []);

  useEffect(() => {
    tutorialCheckMergeRef.current = tutorialCheckMerge;
    tutorialCheckSliceRef.current = tutorialCheckSlice;
    spawnConfettiRef.current = spawnConfetti;
  }, [tutorialCheckMerge, tutorialCheckSlice, spawnConfetti]);

  const loseHeart = useCallback(() => {
    if (heartsRef.current <= 0) return;
    setShakeHeart(true);
    setTimeout(() => setShakeHeart(false), 400);
    heartsRef.current--;
    mistakesRef.current++;
    sessionTotalRef.current++;
    setHearts(heartsRef.current);
    setMistakes(mistakesRef.current);

    const hEls = document.querySelectorAll('.lm-heart-el:not(.lm-heart-lost)');
    if (hEls.length) {
      const hEl = hEls[hEls.length - 1];
      const rect = hEl.getBoundingClientRect();
      const fh = document.createElement('div');
      fh.className = 'lm-falling-heart';
      fh.textContent = '❤️';
      fh.style.left = rect.left + 'px'; fh.style.top = rect.top + 'px';
      document.body.appendChild(fh);
      setTimeout(() => fh.remove(), 1200);
    }

    if (heartsRef.current <= 0) {
      const ex = exercisesRef.current[exIdxRef.current];
      if (!ex) return;
      const ans = ex.ans;
      setTimeout(() => {
        const answerBrick = bricksRef.current.find(b => b.val === ans);
        const toRemove = bricksRef.current.filter(b => b !== answerBrick);
        toRemove.forEach(b => removeBrickById(b.id));
        if (!answerBrick && playgroundRef.current) {
          const pgW = playgroundRef.current.offsetWidth;
          const pgH = playgroundRef.current.offsetHeight;
          addBrick(ans, pickColor(), (pgW - brickW(ans)) / 2, pgH - FLOOR_H - BRICK_H - 10);
        }
        hintModeRef.current = true;
        setHintMode(true);
        hiddenKeysRef.current = new Set(); setHiddenKeys(new Set());
      }, 950);
    }
  }, [addBrick]);

  const typeAnswer = useCallback((n: number) => {
    if (answeredRef.current) return;
    const ex = exercisesRef.current[exIdxRef.current];
    if (!ex) return;
    const ans = ex.ans;
    const wasHint = hintModeRef.current;

    if (n === ans) {
      answeredRef.current = true;
      setAnswered(true);
      setTypedAns(n);
      soundSuccess();
      if (!wasHint) {
        cleanAnswersRef.current++;
        sessionCorrectRef.current++;
        sessionTotalRef.current++;
        progressPctRef.current = Math.min(100, cleanAnswersRef.current * 33.34);
        setProgressPct(progressPctRef.current);
      }
      spawnConfetti(wasHint ? 10 : 22);
      setRobotCelebrate(true);
      setTimeout(() => setRobotCelebrate(false), 1200);
      const levelDone = cleanAnswersRef.current >= 3;
      if (levelDone) {
        setTimeout(() => {
          soundLevelComplete();
          spawnConfetti(50);
          const stars = mistakesRef.current === 0 ? 3 : mistakesRef.current <= 2 ? 2 : 1;
          setLcStars(stars);
          updateAndSave(prev => {
            const mapNodeIdx = currentLevelIdxRef.current + 1;
            const next = { ...prev, levels: prev.levels.map((l,i) => i === mapNodeIdx ? { ...l, stars: Math.max(l.stars, stars), unlocked: true } : l) };
            const nextIdx = mapNodeIdx + 1;
            if (nextIdx <= 20) next.levels[nextIdx] = { ...next.levels[nextIdx], unlocked: true };
            if (stars === 3 && nextIdx > next.currentLevel) next.currentLevel = nextIdx;
            return next;
          });
          exIdxRef.current++;
          setExIdx(exIdxRef.current);
          setLevelComplete(true);
          answeredRef.current = false;
        }, 2000);
      } else {
        if (!wasHint) exIdxRef.current++;
        setTimeout(() => {
          hintModeRef.current = false;
          setHintMode(false);
          heartsRef.current = 3;
          setHearts(3);
          answeredRef.current = false;
          hiddenKeysRef.current = new Set(); setHiddenKeys(new Set());
          setExIdx(exIdxRef.current);
          const nextEx = wasHint
            ? freshExercise(currentLevelIdxRef.current, ans)
            : exercisesRef.current[exIdxRef.current];
          if (nextEx) loadExercise(nextEx, true);
        }, 1400);
      }
    } else {
      soundWrong();
      const ex2 = exercisesRef.current[exIdxRef.current];
      const ans2 = ex2 ? ex2.ans : null;
      const isLastHeart = heartsRef.current === 1;
      const keyEls = document.querySelectorAll('.lm-numkey');
      keyEls.forEach(k => {
        const el = k as HTMLElement;
        const kn = +el.dataset.n!;
        const isClicked = kn === n;
        const isWrong = kn !== ans2;
        const isVisible = !hiddenKeysRef.current.has(kn);
        if (isClicked || (isLastHeart && isWrong && isVisible)) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0) return;
          const clone = el.cloneNode(true) as HTMLElement;
          clone.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;background:white;border:3px solid #E3000B;color:#E3000B;border-radius:14px;display:flex;align-items:center;justify-content:center;font-family:'Fredoka One',cursive;font-size:1.4rem;z-index:9990;pointer-events:none;animation:lm-keyFall 0.8s ease-in forwards;`;
          document.body.appendChild(clone);
          setTimeout(() => clone.remove(), 900);
        }
      });
      if (isLastHeart && ans2 !== null) {
        const allWrong = new Set(
          Array.from({length:10}, (_,i) => (ans2 <= 10 ? 1 : 11) + i).filter(x => x !== ans2)
        );
        hiddenKeysRef.current = allWrong;
        setHiddenKeys(new Set(allWrong));
      } else {
        hiddenKeysRef.current = new Set([...hiddenKeysRef.current, n]); setHiddenKeys(new Set(hiddenKeysRef.current));
      }
      loseHeart();
    }
  }, [loseHeart, spawnConfetti, updateAndSave, loadExercise]);

  useEffect(() => {
    typeAnswerRef.current = typeAnswer
  }, [typeAnswer])

  /* ─── GO TO MAP ─── */
  const goToMap = useCallback((withRobot = false, completedStars = 0) => {
    setLevelComplete(false);
    physicsRunningRef.current = false;
    clearBricks();
    setScreen('map');
    if (withRobot) {
      setTimeout(() => {
        buildMapRobot(currentLevelIdxRef.current, true, currentLevelIdxRef.current);
      }, 300);
    }
  }, [buildMapRobot]);

  /* ─── MAP NODE DOUBLE-TAP UNLOCK ─── */
  const unlockTaps = useRef<Record<number, number>>({});
  const handleNodeClick = (i: number) => {
    const gs = gameStateRef.current;
    if (gs.levels[i].unlocked) {
      if (i === 0) { startTutorial(); return; }
      startLevel(i - 1); // levels 1-20 map to LEVELS[0-19]
      return;
    }
    const now = Date.now();
    if (now - (unlockTaps.current[i] || 0) < 400) {
      unlockTaps.current[i] = 0;
      updateAndSave(prev => ({ ...prev, levels: prev.levels.map((l, j) => j === i ? { ...l, unlocked: true } : l) }));
    } else {
      unlockTaps.current[i] = now;
    }
  };

  const currentEx = exercises[exIdx];

  /* ─────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────── */
  return (
    <div className="lm-root" style={{ fontFamily: "'Fredoka One', cursive" }}>

      {/* ── MAP SCREEN ── */}
      {screen === 'map' && (
        <div ref={mapScreenRef} style={{ position:'fixed',inset:0,background:'linear-gradient(160deg,#1a1a6e 0%,#2d6a4f 40%,#74c69d 70%,#b7e4c7 100%)',overflowY:'auto',overflowX:'hidden',touchAction:'pan-y' }}>
          <button
            onClick={() => {
              window.MathPlatformSDK?.emit('GAME_OVER', {
                score: Math.round(
                  (gameState.levels.filter(l => l.stars > 0).reduce((a, l) => a + l.stars, 0) /
                  Math.max(1, gameState.levels.filter(l => l.stars > 0).length)) * 33.3
                ),
                maxScore: 100,
                stars: Math.min(3, Math.max(1, Math.round(
                  gameState.levels.filter(l => l.stars > 0).reduce((a, l) => a + l.stars, 0) /
                  Math.max(1, gameState.levels.filter(l => l.stars > 0).length)
                ))),
                correctAnswers: sessionCorrectRef.current,
                totalQuestions: sessionTotalRef.current,
              })
              router.back()
            }}
            style={{
              position: 'fixed',
              top: 16,
              right: 16,
              zIndex: 300,
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.45)',
              border: '2px solid rgba(255,255,255,0.4)',
              color: 'white',
              fontSize: '1.4rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >
            ✕
          </button>
          <div ref={mapSceneRef} style={{ position:'relative',width:'100%',minHeight:2900,padding:'20px 0 60px' }}>
            <svg style={{ position:'absolute',top:0,left:0,width:'100%',height:2900,pointerEvents:'none' }} viewBox="0 0 400 2900" preserveAspectRatio="none">
              <defs>
                <filter id="glow"><feGaussianBlur stdDeviation="3" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              {(() => {
                let d = `M ${NODE_POSITIONS[0].x} ${NODE_POSITIONS[0].y}`;
                for (let i = 1; i < 21; i++) {
                  const p = NODE_POSITIONS[i], prev = NODE_POSITIONS[i-1];
                  const cx = (p.x + prev.x) / 2;
                  d += ` C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
                }
                return <>
                  <path d={d} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="28"/>
                  <path d={d} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="10" strokeDasharray="18 12" filter="url(#glow)"/>
                </>;
              })()}
            </svg>

            {gameState.levels.map((lv, i) => {
              const pos = NODE_POSITIONS[i];
              const isLocked = !lv.unlocked;
              const isCurrent = i === gameState.currentLevel && lv.stars === 0 && lv.unlocked;
              const isDone = lv.stars > 0;
              return (
                <div
                  key={i}
                  onClick={() => handleNodeClick(i)}
                  className={isCurrent ? 'lm-node-current' : ''}
                  style={{
                    position:'absolute', width:70, height:70, borderRadius:'50%',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    cursor: isLocked ? 'default' : 'pointer',
                    transform:'translate(-50%,-50%)',
                    fontSize:'1.4rem', fontWeight:900,
                    background: isLocked ? 'linear-gradient(135deg,#555,#333)' : NODE_COLOR_STYLES[i % 10],
                    boxShadow: isCurrent ? '0 0 0 8px rgba(255,255,255,0.25),0 6px 20px rgba(0,0,0,0.4)' : '0 6px 20px rgba(0,0,0,0.35), 0 3px 0 rgba(0,0,0,0.4)',
                    border: isCurrent ? '5px solid white' : isDone ? '4px solid rgba(255,255,255,0.7)' : '4px solid rgba(255,255,255,0.4)',
                    filter: isLocked ? 'grayscale(0.7)' : 'none',
                    color: isLocked ? '#888' : 'white',
                    left: (pos.x/400*100)+'%', top: pos.y,
                    zIndex: 10,
                  }}
                >
                  {isLocked ? <div style={{ fontSize:'1.6rem' }}>🔒</div> : <>
                    <div style={{ fontSize: i === 0 ? '1.8rem' : '1.5rem',lineHeight:1 }}>{i === 0 ? '🎓' : i}</div>
                    <div style={{ fontSize:'0.75rem',lineHeight:1,marginTop:2 }}>{'⭐'.repeat(lv.stars)}</div>
                  </>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TUTORIAL SCREEN ── */}
      {screen === 'tutorial' && (
        <div style={{ position:'fixed',inset:0,background:'linear-gradient(180deg,#c8eaf8 0%,#a8d8f0 40%,#d4f0d4 100%)' }}>
          <div style={{ width:'100%',height:'100%',display:'flex',flexDirection:'column',padding:10,gap:8,boxSizing:'border-box' }}>

            {/* Top bar */}
            <div style={{ flexShrink:0,display:'flex',alignItems:'center',gap:10 }}>
              <div onClick={() => goToMap(false)} style={{ width:44,height:44,borderRadius:'50%',background:'white',border:'3px solid #d0e8f8',boxShadow:'0 3px 8px rgba(0,0,0,0.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.3rem',cursor:'pointer',flexShrink:0 }}>←</div>
              <div style={{ flex:1,background:'rgba(255,255,255,0.85)',borderRadius:50,padding:'6px 14px 6px 8px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 3px 10px rgba(0,0,0,0.1)',border:'3px solid #d0e8f8' }}>
                <div className="lm-progress-track" style={{ flex:1,background:'#e8d8b0',borderRadius:50,height:18,overflow:'visible',position:'relative',boxShadow:'inset 0 2px 4px rgba(0,0,0,0.15)',marginRight:28 }}>
                  <div className="lm-progress-fill-shine" style={{ height:'100%',background:'linear-gradient(90deg,#f5a623,#f7c948)',borderRadius:50,width:progressPct+'%',transition:'width 0.5s cubic-bezier(0.34,1.56,0.64,1)',position:'relative',overflow:'visible',boxShadow:'0 2px 6px rgba(200,140,0,0.4)' }}>
                    <span className="lm-train-engine">🚂</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Instruction card */}
            <div style={{ flexShrink:0,background:'rgba(255,255,255,0.92)',borderRadius:28,padding:'14px 20px',boxShadow:'0 8px 24px rgba(100,160,220,0.25)',border:'3px solid rgba(255,255,255,0.9)',textAlign:'center' }}>
              <div style={{ fontSize:'1.5rem', color:'#333' }}>
                {tutorialStep === 0 && '🧲 גרור קובייה אחת על השנייה!'}
                {tutorialStep === 1 && '✂️ עכשיו חתוך את הקובייה — גרור קו עליה!'}
                {tutorialStep === 2 && '🎉 כל הכבוד!'}
              </div>
            </div>

            {/* Playground */}
            <div
              ref={playgroundRef}
              onPointerDown={handlePlaygroundPointerDown}
              onPointerMove={handlePlaygroundPointerMove}
              onPointerUp={handlePlaygroundPointerUp}
              style={{ flex:1,background:'linear-gradient(180deg,#daeef8 0%,#c8e8f5 60%,#b8ddf0 100%)',borderRadius:24,border:'3px solid rgba(255,255,255,0.7)',boxShadow:'0 6px 20px rgba(80,160,220,0.2)',position:'relative',overflow:'hidden',minHeight:0 }}>

              <div ref={playgroundInnerRef} style={{ position:'absolute',inset:0,zIndex:4 }} />

              {/* Slash SVG overlay */}
              <svg ref={slashSvgRef} className="lm-slash-overlay" style={{ width:'100%', height:'100%' }}>
                <line ref={slashLineRef} x1="0" y1="0" x2="0" y2="0" stroke="rgba(255,255,255,0.5)" strokeWidth="3" strokeDasharray="10 5" strokeLinecap="round" style={{ opacity: 0 }} />
              </svg>

              {/* Animated finger hint */}
              {tutorialStep === 0 && (
                <div className="lm-tutorial-finger" style={{
                  bottom: FLOOR_H + BRICK_H + 30,
                  left: '35%',
                  animation: 'lm-fingerDrag 2s ease-in-out infinite',
                }}>👆</div>
              )}
              {tutorialStep === 1 && (
                <div
                  className="lm-tutorial-finger"
                  style={{
                    top: '30%',
                    left: '48%',
                    animation: 'lm-fingerCut 1.4s ease-in-out infinite',
                  }}
                >
                  👆
                </div>
              )}

              {/* Clouds */}
              <div className="lm-cloud" style={{ width:90,height:30,top:'12%',left:-10,animationDuration:'28s' }} />
              <div className="lm-cloud" style={{ width:60,height:20,top:'28%',left:'30%',animationDuration:'36s',animationDelay:'-10s',opacity:0.5 }} />

              {/* Robot */}
              <div className={`lm-robot-bounce${tutorialStep === 2 ? ' lm-robot-celebrate' : ''}`} style={{ position:'absolute',bottom:50,left:14,zIndex:4,width:52,pointerEvents:'none',filter:'drop-shadow(2px 4px 6px rgba(0,0,0,0.2))' }}>
                <RobotSVG size={52} />
              </div>

              {/* Floor */}
              <div style={{ position:'absolute',bottom:0,left:0,right:0,height:46,background:'#A8D8A8',zIndex:2 }} />
            </div>
          </div>
        </div>
      )}

      {/* ── GAME SCREEN ── */}
      {screen === 'game' && (
        <div style={{ position:'fixed',inset:0,background:'linear-gradient(180deg,#c8eaf8 0%,#a8d8f0 40%,#d4f0d4 100%)' }}>
          <div style={{ width:'100%',height:'100%',display:'flex',flexDirection:'column',padding:10,gap:8,boxSizing:'border-box' }}>

            {/* Top bar */}
            <div style={{ flexShrink:0,display:'flex',alignItems:'center',gap:10 }}>
              <div onClick={() => goToMap(false)} style={{ width:44,height:44,borderRadius:'50%',background:'white',border:'3px solid #d0e8f8',boxShadow:'0 3px 8px rgba(0,0,0,0.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.3rem',cursor:'pointer',flexShrink:0 }}>←</div>
              <div style={{ flex:1,background:'rgba(255,255,255,0.85)',borderRadius:50,padding:'6px 14px 6px 8px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 3px 10px rgba(0,0,0,0.1)',border:'3px solid #d0e8f8' }}>
                <div className="lm-progress-track" style={{ flex:1,background:'#e8d8b0',borderRadius:50,height:18,overflow:'visible',position:'relative',boxShadow:'inset 0 2px 4px rgba(0,0,0,0.15)',marginRight:28 }}>
                  <div className="lm-progress-fill-shine" style={{ height:'100%',background:'linear-gradient(90deg,#f5a623,#f7c948)',borderRadius:50,width:progressPct+'%',transition:'width 0.5s cubic-bezier(0.34,1.56,0.64,1)',position:'relative',overflow:'visible',boxShadow:'0 2px 6px rgba(200,140,0,0.4)' }}>
                    <span className="lm-train-engine">🚂</span>
                  </div>
                </div>
              </div>
              <div style={{ display:'flex',gap:4,fontSize:'1.5rem',flexShrink:0 }}>
                {[0,1,2].map(i => (
                  <span key={i} className={`lm-heart-el${i >= hearts ? ' lm-heart-lost' : ''}${i === hearts - 1 && shakeHeart ? ' lm-heart-shake' : ''}`} style={{ display:'inline-block',transition:'transform 0.2s',filter: i >= hearts ? 'grayscale(1) opacity(0.35)' : 'none' }}>❤️</span>
                ))}
              </div>
            </div>

            {/* Exercise Card */}
            <div className={cardFlip === 'out' ? 'lm-card-flip-out' : cardFlip === 'in' ? 'lm-card-flip-in' : ''} style={{ flexShrink:0,background:'rgba(255,255,255,0.92)',borderRadius:28,padding:'14px 20px 12px',boxShadow:'0 8px 24px rgba(100,160,220,0.25)',border:'3px solid rgba(255,255,255,0.9)' }}>
              {currentEx && (
                <>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'center',direction:'ltr',gap:14 }}>
                    <span style={{ fontSize:'3rem',fontWeight:900,minWidth:'2ch',textAlign:'center',color:'#333' }}>
                      {currentEx.chain ? currentEx.chain[0] : currentEx.a}
                    </span>
                    <span style={{ fontSize:'3rem',color:'#bbb',fontWeight:900 }}>
                      {currentEx.chain ? '+' : currentEx.op}
                    </span>
                    <span style={{ fontSize:'3rem',fontWeight:900,minWidth:'2ch',textAlign:'center',color:'#333' }}>
                      {currentEx.chain ? currentEx.chain.slice(1).join(' + ') : currentEx.b}
                    </span>
                    <span style={{ fontSize:'3rem',color:'#bbb',fontWeight:900 }}>=</span>
                    <span
                      className={answered ? '' : 'lm-qmark-pulse'}
                      style={{ fontSize:'3rem',color:'#00A650',minWidth:'2.5ch',textAlign:'center' }}
                    >
                      {answered ? typedAns : '?'}
                    </span>
                  </div>

                  {!answered && (() => {
                    const rangeStart = currentEx.ans <= 10 ? 1 : 11;
                    return (
                      <div style={{ marginTop:10,display:'flex',flexWrap:'wrap',justifyContent:'center',gap:7,direction:'ltr' }}>
                        {Array.from({length:10},(_,i)=>rangeStart+i).map(n => {
                          const hidden = hiddenKeys.has(n);
                          const hideInHint = hintMode && n !== currentEx.ans;
                          return (
                            <div
                              key={n}
                              data-n={n}
                              className="lm-numkey"
                              onPointerDown={() => typeAnswer(n)}
                              style={{
                                width:48,height:48,borderRadius:16,
                                background:'linear-gradient(145deg,#ffffff,#f0f4ff)',
                                border:'none',
                                fontFamily:"'Fredoka One',cursive",fontSize:'1.4rem',
                                color:'#4466cc',cursor:'pointer',
                                boxShadow:'0 5px 0 #aabbd8, 0 6px 12px rgba(80,120,200,0.2)',
                                display:'flex',alignItems:'center',justifyContent:'center',
                                visibility: (hidden || hideInHint) ? 'hidden' : 'visible',
                                pointerEvents: (hidden || hideInHint) ? 'none' : 'auto',
                              }}
                            >
                              {n}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Playground */}
            <div
              ref={playgroundRef}
              onPointerDown={handlePlaygroundPointerDown}
              onPointerMove={handlePlaygroundPointerMove}
              onPointerUp={handlePlaygroundPointerUp}
              style={{ flex:1,background:'linear-gradient(180deg,#daeef8 0%,#c8e8f5 60%,#b8ddf0 100%)',borderRadius:24,border:'3px solid rgba(255,255,255,0.7)',boxShadow:'0 6px 20px rgba(80,160,220,0.2)',position:'relative',overflow:'hidden',minHeight:0 }}>

              <div ref={playgroundInnerRef} style={{ position:'absolute',inset:0,zIndex:4 }} />

              {/* Slash SVG overlay */}
              <svg
                ref={slashSvgRef}
                className="lm-slash-overlay"
                style={{ width:'100%', height:'100%' }}
              >
                <line
                  ref={slashLineRef}
                  x1="0" y1="0" x2="0" y2="0"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="3"
                  strokeDasharray="10 5"
                  strokeLinecap="round"
                  style={{ opacity: 0 }}
                />
              </svg>

              {/* Clouds */}
              <div className="lm-cloud" style={{ width:90,height:30,top:'12%',left:-10,animationDuration:'28s' }} />
              <div className="lm-cloud" style={{ width:60,height:20,top:'28%',left:'30%',animationDuration:'36s',animationDelay:'-10s',opacity:0.5 }} />
              <div className="lm-cloud" style={{ width:70,height:24,top:'15%',right:'10%',animationDuration:'32s',animationDelay:'-5s' }} />

              {/* Robot */}
              <div className={`lm-robot-bounce${robotCelebrate ? ' lm-robot-celebrate' : ''}`} style={{ position:'absolute',bottom:50,left:14,zIndex:4,width:52,pointerEvents:'none',filter:'drop-shadow(2px 4px 6px rgba(0,0,0,0.2))' }}>
                <RobotSVG size={52} />
              </div>

              {/* Plus button */}
              <div onClick={() => addBrick(1, pickColor(), 12, 12)} style={{ position:'absolute',top:12,left:12,width:54,height:54,borderRadius:'50%',background:'linear-gradient(145deg,#ffe033,#ffb300)',border:'3px solid #e0a000',boxShadow:'0 5px 0 #a07000, 0 7px 14px rgba(0,0,0,0.2)',fontSize:'2.2rem',color:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:6,textShadow:'1px 1px 3px rgba(0,0,0,0.3)' }}>＋</div>

              {/* Trash bin */}
              <div ref={trashBinRef} className={trashOpen ? 'lm-trash-open' : ''} style={{ position:'absolute',top:12,right:12,width:52,zIndex:6,display:'flex',flexDirection:'column',alignItems:'center',filter:'drop-shadow(2px 3px 4px rgba(0,0,0,0.2))',transition:'transform 0.2s',transform: trashOpen ? 'scale(1.15) rotate(5deg)' : 'none' }}>
                <div className="lm-trash-lid" />
                <div style={{ width:44,height:48,background:'linear-gradient(160deg,#ff3355,#cc1133)',borderRadius:'6px 6px 14px 14px',border:'2px solid #990022',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,boxShadow:'0 4px 0 #880011, 0 6px 8px rgba(200,0,40,0.3)' }}>
                  <div style={{ display:'flex',gap:8 }}>
                    <div className="lm-trash-eye" style={{ width:10,height:10,background:'white',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 1px 2px rgba(0,0,0,0.3)' }} />
                    <div className="lm-trash-eye" style={{ width:10,height:10,background:'white',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 1px 2px rgba(0,0,0,0.3)' }} />
                  </div>
                  <div className="lm-trash-mouth" />
                </div>
              </div>

              {/* Floor */}
              <div style={{ position:'absolute',bottom:0,left:0,right:0,height:46,background:'#A8D8A8',zIndex:2 }} />
            </div>
          </div>
        </div>
      )}

      {/* ── LEVEL COMPLETE ── */}
      {levelComplete && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000 }}>
          <div style={{ background:'white',borderRadius:30,padding:'32px 40px',textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',border:'6px solid #FFD700',minWidth:280,animation:'lm-lcPop 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <span style={{ fontSize:'4.5rem',display:'block',marginBottom:8 }}>{lcStars===3?'🏆':lcStars===2?'🌟':'👍'}</span>
            <div style={{ fontSize:'2.2rem',marginBottom:18 }}>{'⭐'.repeat(lcStars)}{'☆'.repeat(3-lcStars)}</div>
            <div style={{ display:'flex',justifyContent:'center',gap:16,marginTop:14 }}>
              <button
                onClick={() => goToMap(true, lcStars)}
                style={{ padding:'14px 20px',borderRadius:20,background:'linear-gradient(135deg,#006CB7,#2980b9)',border:'none',cursor:'pointer',boxShadow:'0 6px 0 #1a5f8a',fontSize:'1.1rem',color:'white',fontFamily:"'Fredoka One',cursive" }}
              >
                🗺️ מפת שלבים
              </button>
              <button
                onClick={() => {
                  const completedLevels = gameState.levels.filter(l => l.stars > 0);
                  const avgStars = completedLevels.length > 0
                    ? completedLevels.reduce((a, l) => a + l.stars, 0) / completedLevels.length
                    : lcStars;
                  const finalStars = Math.min(3, Math.max(1, Math.round(avgStars)));
                  window.MathPlatformSDK?.emit('GAME_OVER', {
                    score: Math.round(avgStars * 33.3),
                    maxScore: 100,
                    stars: finalStars,
                    correctAnswers: sessionCorrectRef.current,
                    totalQuestions: sessionTotalRef.current,
                  });
                  router.back();
                }}
                style={{ padding:'14px 20px',borderRadius:20,background:'linear-gradient(135deg,#00A650,#27ae60)',border:'none',cursor:'pointer',boxShadow:'0 6px 0 #1a7a3a',fontSize:'1.1rem',color:'white',fontFamily:"'Fredoka One',cursive" }}
              >
                🏠 מסך הבית
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFETTI ── */}
      <div style={{ position:'fixed',inset:0,pointerEvents:'none',zIndex:9999,overflow:'hidden' }}>
        {confetti.map(p => (
          <div key={p.id} className="lm-confetti-piece" style={{ left: p.left+'%', background: p.color, animationDuration: p.duration+'s', animationDelay: p.delay+'s' }} />
        ))}
      </div>
    </div>
  );
}
