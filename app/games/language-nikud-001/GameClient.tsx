'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import bgImage from './assets/bg-nikud-arena.jpg'
import GameBackButton from '@/components/GameBackButton'

type Nikud = 'kamatz' | 'patach'
type LetterBase = { base: string; level: 1 | 2 }
type Letter = { base: string; nikud: Nikud; char: string; level: 1 | 2 }
type QuestionResult = { letter: Letter; firstAttemptCorrect: boolean; attempts: number }
type GamePhase = 'playing' | 'roundEnd' | 'gameOver'
type MicStatus = 'idle' | 'listening'
type CellState = null | 'player' | 'computer'

const KAMATZ = '\u05B8', PATACH = '\u05B7', DAGESH = '\u05BC'
const LEVEL1: LetterBase[] = [
  {base:'א',level:1},{base:'ו',level:1},{base:'ז',level:1},{base:'כ',level:1},
  {base:'ל',level:1},{base:'ס',level:1},{base:'ע',level:1},{base:'צ',level:1},{base:'ת',level:1},
]
const LEVEL2: LetterBase[] = [
  {base:'ב',level:2},{base:'ה',level:2},{base:'ח',level:2},{base:'ט',level:2},
  {base:'מ',level:2},{base:'פ',level:2},{base:'ר',level:2},{base:'ג',level:2},
  {base:'ש',level:2},{base:'י',level:2},{base:'ק',level:2},
]
const WITH_DAGESH = new Set(['כ','ת','ב','פ','ג'])
const ROUND_SIZE = 5
const PLAYER_EMOJI = '🐸'
const COMPUTER_EMOJI = '👹'
const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]

function buildChar(base:string,nikud:Nikud):string {
  return base+(WITH_DAGESH.has(base)?DAGESH:'')+(nikud==='kamatz'?KAMATZ:PATACH)
}
function makeLetter(lb:LetterBase,nikud:Nikud):Letter {
  return {base:lb.base,nikud,char:buildChar(lb.base,nikud),level:lb.level}
}
function randomNikud():Nikud{return Math.random()<0.5?'kamatz':'patach'}
function shuffle<T>(a:T[]):T[]{
  const r=[...a]
  for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]]}
  return r
}
function buildLetterQueue(lv2:number):Letter[]{
  const l1=shuffle(LEVEL1).slice(0,ROUND_SIZE-lv2)
  const l2=shuffle(LEVEL2).slice(0,lv2)
  return shuffle([...l1,...l2].map(lb=>makeLetter(lb,randomNikud())))
}
function computeStars(correct:number,total:number):number{
  const r=correct/total
  if(r>=1)return 5
  if(r>=0.8)return 4
  if(r>=0.6)return 3
  if(r>=0.4)return 2
  return 1
}
function checkWinner(b:CellState[]):CellState{
  for(const[a,c,d]of WINS)if(b[a]&&b[a]===b[c]&&b[a]===b[d])return b[a]
  return null
}
// Never win, always block player, never allow computer to win
function computerMove(board:CellState[],isLast:boolean):number{
  const empty=board.map((v,i)=>v===null?i:-1).filter(i=>i>=0)
  if(!empty.length)return -1
  if(isLast)return empty[0]
  // block player
  for(const idx of empty){
    const t=[...board];t[idx]='player'
    if(checkWinner(t)==='player')return idx
  }
  // avoid winning ourselves
  const safeEmpty=empty.filter(idx=>{
    const t=[...board];t[idx]='computer'
    return checkWinner(t)!=='computer'
  })
  const pool=safeEmpty.length?safeEmpty:empty
  if(pool.includes(4))return 4
  const corners=[0,2,6,8].filter(i=>pool.includes(i))
  if(corners.length)return corners[Math.floor(Math.random()*corners.length)]
  return pool[Math.floor(Math.random()*pool.length)]
}

// ── Audio ─────────────────────────────────────────────────────────────────────
function playTone(f1:number,f2:number,dur=0.3,vol=0.22){
  try{
    const ctx=new AudioContext(),osc=ctx.createOscillator(),g=ctx.createGain()
    osc.connect(g);g.connect(ctx.destination);osc.type='sine'
    g.gain.setValueAtTime(vol,ctx.currentTime)
    osc.frequency.setValueAtTime(f1,ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(f2,ctx.currentTime+dur)
    g.gain.linearRampToValueAtTime(0,ctx.currentTime+dur)
    osc.start(ctx.currentTime);osc.stop(ctx.currentTime+dur+0.05)
  }catch{}
}
function playError(){playTone(420,320,0.28);setTimeout(()=>playTone(360,280,0.28),350)}
function playSuccess(){
  playTone(440,520,0.16,0.25)
  setTimeout(()=>playTone(550,660,0.16,0.25),190)
  setTimeout(()=>playTone(700,880,0.2,0.28),390)
}
function speakLetter(base:string){
  if(!window.speechSynthesis)return
  window.speechSynthesis.cancel()
  const u=new SpeechSynthesisUtterance(base+(WITH_DAGESH.has(base)?DAGESH:'')+KAMATZ)
  u.lang='he-IL';u.rate=0.75;u.pitch=1.1
  window.speechSynthesis.speak(u)
}
function normalize(s:string):string{return s.replace(/[\u0591-\u05C7]/g,'').trim()}
function letterMatches(spoken:string,letter:Letter):boolean{
  const c=normalize(spoken).toLowerCase()
  return c===letter.base||c.startsWith(letter.base)
}

// ── Particles ─────────────────────────────────────────────────────────────────
function burst(el:HTMLElement){
  const colors=['#f472b6','#facc15','#34d399','#60a5fa','#a78bfa','#fb923c','#f87171','#4ade80']
  for(let i=0;i<26;i++){
    const d=document.createElement('div')
    const sz=7+Math.random()*9
    const ang=(Math.PI*2*i)/26+(Math.random()-.5)*.5
    const dist=70+Math.random()*100
    const dx=Math.cos(ang)*dist,dy=Math.sin(ang)*dist-30
    d.style.cssText=`position:absolute;width:${sz}px;height:${sz}px;background:${colors[i%colors.length]};border-radius:${Math.random()>.5?'50%':'2px'};left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:99;animation:ptcl .7s ease-out forwards;--dx:${dx}px;--dy:${dy}px;animation-delay:${Math.random()*60}ms;`
    el.appendChild(d)
    setTimeout(()=>d.remove(),850)
  }
}

// ── Stars ─────────────────────────────────────────────────────────────────────
function StarDisplay({stars,total=5}:{stars:number;total?:number}){
  return(
    <div style={{display:'flex',gap:6,justifyContent:'center'}}>
      {Array.from({length:total}).map((_,i)=>(
        <span key={i} style={{
          fontSize:44,display:'inline-block',
          filter:i<stars?'drop-shadow(0 0 10px #FFD700)':'grayscale(1) opacity(0.3)',
          animation:i<stars?`starPop ${0.28+i*.13}s ease both`:'none',
        }}>⭐</span>
      ))}
    </div>
  )
}

export default function NikudGameClient(){
  const router = useRouter()
  const [hintCell] = useState(()=>Math.floor(Math.random()*9))
  const [letterVisible, setLetterVisible] = useState(true)
  const [showInstruction, setShowInstruction] = useState(false)
  const [level2Count,setLevel2Count]=useState(1)
  const [letterQueue,setLetterQueue]=useState<Letter[]>(()=>buildLetterQueue(1))
  const [queueIdx,setQueueIdx]=useState(-1) // -1 = no letter active yet
  const [roundResults,setRoundResults]=useState<QuestionResult[]>([])
  const [attemptNumber,setAttemptNumber]=useState(1)
  const [hadWrongThisTurn,setHadWrongThisTurn]=useState(false)
  const [phase,setPhase]=useState<GamePhase>('playing')
  const [micStatus,setMicStatus]=useState<MicStatus>('idle')
  const [shake,setShake]=useState(false)
  const [successAnim,setSuccessAnim]=useState(false) // letter pop
  const [board,setBoard]=useState<CellState[]>(Array(9).fill(null))
  const [selectedCell,setSelectedCell]=useState<number|null>(null)
  const [playerTurn,setPlayerTurn]=useState(true)
  const [waitingForAnswer,setWaitingForAnswer]=useState(false)
  const [answeredCells,setAnsweredCells]=useState(0)
  const [playerPower,setPlayerPower]=useState(100)
  const [computerPower,setComputerPower]=useState(100)
  // which cell just got placed (for jump animation)
  const [playerJumpCell,setPlayerJumpCell]=useState<number|null>(null)
  const [computerJumpCell,setComputerJumpCell]=useState<number|null>(null)

  const recRef=useRef<any>(null)
  const listeningRef=useRef(false)
  const pausedRef=useRef(false)
  const letterBgRef=useRef<HTMLDivElement>(null)
  const boardRef=useRef<(HTMLDivElement|null)[]>(Array(9).fill(null))
  const gameStartedRef=useRef(false)

  // stable refs
  const currentLetterRef=useRef<Letter>(letterQueue[0])
  const attemptRef=useRef(1)
  const hadWrongRef=useRef(false)
  const queueIdxRef=useRef(-1)
  const letterQueueRef=useRef(letterQueue)
  const roundResultsRef=useRef(roundResults)
  const answeredRef=useRef(0)
  const level2Ref=useRef(1)
  const boardRef2=useRef<CellState[]>(Array(9).fill(null))
  const selectedCellRef=useRef<number|null>(null)

  const currentLetter=queueIdx>=0?letterQueue[queueIdx]:null
  if(currentLetter)currentLetterRef.current=currentLetter
  attemptRef.current=attemptNumber
  hadWrongRef.current=hadWrongThisTurn
  queueIdxRef.current=queueIdx
  letterQueueRef.current=letterQueue
  roundResultsRef.current=roundResults
  answeredRef.current=answeredCells
  level2Ref.current=level2Count
  boardRef2.current=board
  selectedCellRef.current=selectedCell

  const roundStars=(phase==='roundEnd'||phase==='gameOver')
    ?computeStars(roundResults.filter(r=>r.firstAttemptCorrect).length,roundResults.length):0

  useEffect(()=>{
    if(!gameStartedRef.current){
      gameStartedRef.current=true
      window.MathPlatformSDK?.emit('GAME_STARTED',{gameId:'language-nikud-001'})
    }
  },[])

  const startListeningRef=useRef<()=>void>(()=>{})

  // ── finishRound ─────────────────────────────────────────────────────────────
  const finishRound=useCallback((results:QuestionResult[])=>{
    const correct=results.filter(r=>r.firstAttemptCorrect).length
    const total=results.length||1
    const stars=computeStars(correct,total)
    const allLv2=results.filter(r=>r.letter.level===2).every(r=>r.firstAttemptCorrect)
    window.MathPlatformSDK?.emit('GAME_OVER',{score:correct,maxScore:total,stars,correctAnswers:correct,totalQuestions:total})
    const next=allLv2?Math.min(level2Ref.current+1,5):level2Ref.current
    setLevel2Count(next)
    setSuccessAnim(false)
    setPhase(allLv2&&next>=5?'gameOver':'roundEnd')
  },[])

  // ── Do computer turn ─────────────────────────────────────────────────────────
  const doComputerTurn=useCallback((currentBoard:CellState[],answered:number)=>{
    setTimeout(()=>{
      const isLast=answered>=ROUND_SIZE-1
      const idx=computerMove(currentBoard,isLast)
      if(idx<0){setPlayerTurn(true);setSelectedCell(null);pausedRef.current=false;return}
      const next=[...currentBoard];next[idx]='computer'
      setBoard(next)
      boardRef2.current=next
      setComputerJumpCell(idx)
      setTimeout(()=>setComputerJumpCell(null),1000)
      setPlayerTurn(true)
      setSelectedCell(null)
      pausedRef.current=false
    },700)
  },[])

  // ── Handle correct ──────────────────────────────────────────────────────────
  const handleCorrect=useCallback(()=>{
    pausedRef.current=true
    try{recRef.current?.abort()}catch{}
    listeningRef.current=false
    setMicStatus('idle')
    playSuccess()
    setSuccessAnim(true)
    setLetterVisible(false)
    if(letterBgRef.current)burst(letterBgRef.current)

    const isFirst=!hadWrongRef.current
    const letter=currentLetterRef.current
    const cell=selectedCellRef.current

    window.MathPlatformSDK?.emit('ANSWER',{correct:true,questionId:letter.char,questionType:'letter-sound',correctAnswer:letter.base,childAnswer:letter.base,attemptNumber:attemptRef.current})

    const newResults=[...roundResultsRef.current,{letter,firstAttemptCorrect:isFirst,attempts:attemptRef.current}]
    setRoundResults(newResults)
    setComputerPower(p=>Math.max(0,p-4))

    // Place player emoji on cell + jump animation
    const newBoard=[...boardRef2.current]
    if(cell!==null)newBoard[cell]='player'
    setBoard(newBoard)
    boardRef2.current=newBoard
    if(cell!==null){
      setPlayerJumpCell(cell)
      setTimeout(()=>setPlayerJumpCell(null),1100)
    }

    const newAnswered=answeredRef.current+1
    setAnsweredCells(newAnswered)

    // Check if player won the board
    const playerWon=checkWinner(newBoard)==='player'

    setTimeout(()=>{
      setSuccessAnim(false)
      setLetterVisible(true)
      setWaitingForAnswer(false)

      if(newAnswered>=ROUND_SIZE||playerWon){
        finishRound(newResults)
        return
      }
      doComputerTurn(newBoard,newAnswered)
    },950)
  },[finishRound,doComputerTurn])

  const handleCorrectRef=useRef(handleCorrect)
  handleCorrectRef.current=handleCorrect

  // ── Handle wrong ────────────────────────────────────────────────────────────
  const handleWrong=useCallback((spoken='')=>{
    pausedRef.current=true
    playError()
    setShake(true)
    const letter=currentLetterRef.current
    window.MathPlatformSDK?.emit('ANSWER',{correct:false,questionId:letter.char,questionType:'letter-sound',correctAnswer:letter.base,childAnswer:spoken||'?',attemptNumber:attemptRef.current})
    if(!hadWrongRef.current){
      setPlayerPower(p=>Math.max(0,p-4))
      setHadWrongThisTurn(true)
    }
    // re-queue letter with new nikud
    setLetterQueue(prev=>[...prev,makeLetter({base:letter.base,level:letter.level},randomNikud())])
    setTimeout(()=>{
      setShake(false)
      setAttemptNumber(n=>n+1)
      pausedRef.current=false
      startListeningRef.current()
    },850)
  },[])
  const handleWrongRef=useRef(handleWrong)
  handleWrongRef.current=handleWrong

  // ── Voice ────────────────────────────────────────────────────────────────────
  const startListening=useCallback(()=>{
    if(listeningRef.current||pausedRef.current)return
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition
    if(!SR)return
    const rec=new SR()
    rec.lang='he-IL';rec.continuous=false;rec.interimResults=false;rec.maxAlternatives=5
    recRef.current=rec
    rec.onstart=()=>{listeningRef.current=true;setMicStatus('listening')}
    rec.onresult=(e:any)=>{
      listeningRef.current=false
      const r=e.results[0];const alts:string[]=[]
      for(let i=0;i<r.length;i++)alts.push(r[i].transcript)
      const ok=alts.some(a=>letterMatches(a,currentLetterRef.current))
      if(ok)handleCorrectRef.current();else handleWrongRef.current(normalize(alts[0]||''))
    }
    rec.onerror=(e:any)=>{
      listeningRef.current=false;setMicStatus('idle')
      if(e.error==='not-allowed')return
      if(!pausedRef.current)setTimeout(()=>startListeningRef.current(),400)
    }
    rec.onend=()=>{
      listeningRef.current=false;setMicStatus('idle')
      if(!pausedRef.current)setTimeout(()=>startListeningRef.current(),200)
    }
    try{rec.start()}catch{}
  },[])
  startListeningRef.current=startListening

  const stopListening=useCallback(()=>{
    pausedRef.current=true;listeningRef.current=false
    try{recRef.current?.abort()}catch{}
    setMicStatus('idle')
  },[])

  useEffect(()=>{
    if(phase==='playing'&&waitingForAnswer){
      pausedRef.current=false
      setTimeout(()=>startListeningRef.current(),300)
    }else if(!waitingForAnswer){stopListening()}
  },[waitingForAnswer,phase,stopListening])

  // ── Cell click ───────────────────────────────────────────────────────────────
  const onCellClick=useCallback((idx:number)=>{
    if(!playerTurn||waitingForAnswer||boardRef2.current[idx]!==null)return
    setSelectedCell(idx)
    selectedCellRef.current=idx
    setPlayerTurn(false)
    setWaitingForAnswer(true)
    if(answeredCells===0){
      setShowInstruction(true)
      window.speechSynthesis?.speak(Object.assign(new SpeechSynthesisUtterance('הקריאו את הצליל'),{lang:'he-IL'}))
      setTimeout(()=>setShowInstruction(false),3000)
    }
    setAttemptNumber(1)
    setHadWrongThisTurn(false)
    setQueueIdx(i=>i+1)
  },[playerTurn,waitingForAnswer,answeredCells])

  // ── Next round ───────────────────────────────────────────────────────────────
  const startNextRound=useCallback(()=>{
    const next=level2Ref.current
    const q=buildLetterQueue(next)
    setLetterQueue(q)
    setQueueIdx(-1)
    setRoundResults([])
    setAttemptNumber(1)
    setHadWrongThisTurn(false)
    setBoard(Array(9).fill(null))
    boardRef2.current=Array(9).fill(null)
    setSelectedCell(null)
    setPlayerTurn(true)
    setWaitingForAnswer(false)
    setAnsweredCells(0)
    setPlayerPower(100)
    setComputerPower(100)
    setPlayerJumpCell(null)
    setComputerJumpCell(null)
    setPhase('playing')
  },[])

  // ─── Render ──────────────────────────────────────────────────────────────────
  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Secular+One&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .root{
          direction:rtl;font-family:'Secular One',sans-serif;
          min-height:100vh;

          display:flex;flex-direction:column;align-items:center;justify-content:center;
          padding:12px;color:#f0f4ff;position:relative;overflow:hidden;
        }
        .root::before{
          content:'';position:absolute;inset:0;pointer-events:none;
          background:
            radial-gradient(circle at 5% 50%,rgba(147,51,234,0.22) 0%,transparent 45%),
            radial-gradient(circle at 95% 50%,rgba(220,38,38,0.18) 0%,transparent 45%);
        }

        /* ── Fighters in corners ── */
        .fighter-corner{
          position:fixed;display:flex;flex-direction:column;align-items:center;gap:6px;
          z-index:10;transition:opacity 0.4s;
        }
        .fighter-corner.top-right{top:16px;right:16px;align-items:flex-end}
        .fighter-corner.top-left{top:16px;left:16px;align-items:flex-start}
        .fighter-avatar{font-size:72px;line-height:1;transition:filter 0.4s,transform 0.4s;}
        .power-bar-wrap{width:140px;height:16px;background:rgba(0,0,0,0.5);border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);}
        .power-bar-fill{height:100%;border-radius:8px;transition:width 0.5s ease;}
        .active-fighter .fighter-avatar{filter:drop-shadow(0 0 18px currentColor) brightness(1.3);}
        .inactive-fighter .fighter-avatar{filter:brightness(0.4) saturate(0.3);}
        .active-fighter .power-bar-wrap{box-shadow:0 0 12px rgba(255,255,255,0.2);}

        /* ── Layout ── */
        .game-wrap{
          display:flex;flex-direction:column;align-items:center;gap:10px;
          width:100%;max-width:520px;position:relative;z-index:1;
          padding-top:20px;
        }

        /* ── Board ── */
        .ttt-board{
          display:grid;grid-template-columns:repeat(3,1fr);
          gap:8px;padding:10px;
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.1);
          border-radius:20px;width:100%;
        }
        .ttt-cell{
          aspect-ratio:1;border-radius:14px;
          display:flex;align-items:center;justify-content:center;
          font-size:18px;position:relative;
          transition:all 0.2s;user-select:none;
          border:2px solid transparent;
        }
        .cell-empty{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.1);}
        .cell-empty.can-click{cursor:pointer;animation:cellPulse 2s ease-in-out infinite;}
        .cell-empty.can-click:hover{background:rgba(167,139,250,0.22);border-color:rgba(167,139,250,0.55);transform:scale(1.05);animation:none;}
        .cell-player{background:rgba(99,102,241,0.18);border-color:rgba(99,102,241,0.45);cursor:default;}
        .cell-computer{background:rgba(239,68,68,0.14);border-color:rgba(239,68,68,0.38);cursor:default;}
        .cell-selected{background:rgba(167,139,250,0.28);border-color:rgba(167,139,250,0.8);box-shadow:0 0 22px rgba(167,139,250,0.45);cursor:default;}
        @keyframes cellPulse{0%,100%{border-color:rgba(255,255,255,0.1)}50%{border-color:rgba(167,139,250,0.42)}}

        /* Cell inner letter (challenge) */
        .cell-letter{
          font-size:clamp(56px,16vw,108px);line-height:1;color:#f0f4ff;
          text-shadow:0 0 24px rgba(96,165,250,0.7);user-select:none;
          position:relative;overflow:visible;
        }
        /* Cell emoji (placed) */
        .cell-emoji{font-size:clamp(32px,9vw,58px);line-height:1;}

        /* shake / pop on cell letter */
        @keyframes cShake{
          0%,100%{transform:translateX(0)}
          15%{transform:translateX(-8px) rotate(-3deg)}
          30%{transform:translateX(8px) rotate(3deg)}
          45%{transform:translateX(-6px)}60%{transform:translateX(6px)}
          75%{transform:translateX(-3px)}
        }
        @keyframes cPop{0%{transform:scale(1)}40%{transform:scale(1.22)}70%{transform:scale(0.93)}100%{transform:scale(1)}}
        .c-shake{animation:cShake .52s ease both}
        .c-pop{animation:cPop .46s ease both}

        /* player emoji jump on success */
        @keyframes emojiJump{0%,100%{transform:scale(1)}25%{transform:scale(1.22) translateY(-6px)}60%{transform:scale(0.95)}}
        .emoji-jump{animation:emojiJump .9s ease}

        /* computer emoji gentle bounce */
        @keyframes compBounce{0%,100%{transform:scale(1)}40%{transform:scale(1.06) translateY(-4px)}70%{transform:scale(0.97)}}
        .emoji-bounce{animation:compBounce .8s ease}

        /* particles */
        @keyframes ptcl{0%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(0.2);opacity:0}}

        /* controls bar below board */
        .controls-bar{display:flex;align-items:center;justify-content:center;gap:12px;}
        .btn-listen{
          background:rgba(96,165,250,0.15);border:1.5px solid rgba(96,165,250,0.35);
          color:#93c5fd;border-radius:999px;padding:10px 20px;
          font-family:'Secular One',sans-serif;font-size:16px;
          cursor:pointer;display:flex;align-items:center;gap:7px;transition:background .2s;
        }
        .btn-listen:hover{background:rgba(96,165,250,0.25);}
        .btn-listen:disabled{opacity:.4;cursor:default;}
        .btn-approve{
          width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;
          background:linear-gradient(135deg,#22c55e,#16a34a);
          box-shadow:0 5px 18px rgba(34,197,94,.45);
          font-size:26px;display:flex;align-items:center;justify-content:center;
          transition:transform .15s;color:#fff;flex-shrink:0;
        }
        .btn-approve:hover{transform:scale(1.1);}
        .btn-approve:active{transform:scale(0.95);}
        .mic-ind{
          width:54px;height:54px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:22px;position:relative;transition:all .3s;
        }
        .mic-on{background:linear-gradient(135deg,#ef4444,#f97316);box-shadow:0 6px 20px rgba(239,68,68,.5);}
        .mic-off{background:rgba(255,255,255,.07);border:2px solid rgba(255,255,255,.12);}
        @keyframes pulse-ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.8);opacity:0}}
        .mic-on::before{content:'';position:absolute;inset:-4px;border-radius:50%;border:2px solid #ef4444;animation:pulse-ring 1.1s ease-out infinite;}

        /* finger hint */
        .hint-finger{position:absolute;font-size:26px;bottom:4px;right:4px;pointer-events:none;animation:fBounce 1.2s ease-in-out infinite;}
        @keyframes fBounce{0%,100%{transform:scale(1) rotate(-10deg)}50%{transform:scale(1.2) rotate(10deg)}}

        /* result screen */
        .result-card{
          background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,.1);
          border-radius:28px;padding:36px 32px;
          display:flex;flex-direction:column;align-items:center;gap:22px;
          width:100%;max-width:340px;position:relative;z-index:1;backdrop-filter:blur(16px);
        }
        .btn-primary{
          background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;color:#fff;
          font-family:'Secular One',sans-serif;font-size:28px;
          padding:14px 32px;border-radius:999px;cursor:pointer;
          box-shadow:0 8px 24px rgba(99,102,241,.4);transition:transform .2s;
        }
        .btn-primary:hover{transform:translateY(-2px);}
        .btn-continue{
          background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.18);
          color:#94a3b8;font-family:'Secular One',sans-serif;font-size:28px;
          padding:12px 28px;border-radius:999px;cursor:pointer;
        }
        .btn-continue:hover{background:rgba(255,255,255,.14);}
        @keyframes starPop{0%{transform:scale(0) rotate(-20deg);opacity:0}70%{transform:scale(1.25) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn .4s ease both}
      `}</style>

      <div className="root" style={{backgroundImage:`url(${bgImage.src})`,backgroundSize:'cover',backgroundPosition:'center'}}>
        <GameBackButton />

        {/* ── Fighter corners ── */}
        {phase==='playing'&&(
          <>
            {/* Player — top right (RTL) */}
            <div className={`fighter-corner top-right ${playerTurn&&!waitingForAnswer?'active-fighter':'inactive-fighter'}`}>
              <div className="fighter-avatar">{PLAYER_EMOJI}</div>
              <div className="power-bar-wrap" style={{direction:'ltr'}}>
                <div className="power-bar-fill" style={{
                  width:`${playerPower}%`,
                  background:'linear-gradient(90deg,#6366f1,#a78bfa)',
                  boxShadow:'0 0 8px #a78bfa88',
                }}/>
              </div>
            </div>
            {/* Computer — top left */}
            <div className={`fighter-corner top-left ${!playerTurn||waitingForAnswer?'active-fighter':'inactive-fighter'}`}>
              <div className="fighter-avatar">{COMPUTER_EMOJI}</div>
              <div className="power-bar-wrap">
                <div className="power-bar-fill" style={{
                  width:`${computerPower}%`,
                  background:'linear-gradient(90deg,#ef4444,#f97316)',
                  boxShadow:'0 0 8px #f9731688',
                }}/>
              </div>
            </div>
          </>
        )}

        {/* ── Playing ── */}
        {phase==='playing'&&(
          <div className="game-wrap fade-in">

            {/* Instruction */}
            {showInstruction&&(
              <div style={{fontSize:22,color:'#e2e8f0',textAlign:'center',letterSpacing:1,marginBottom:4}}>
                הקריאו את הצליל
              </div>
            )}

            {/* Board */}
            <div className="ttt-board">
              {board.map((cell,idx)=>{
                const isSelected=idx===selectedCell&&waitingForAnswer
                const canClick=playerTurn&&!waitingForAnswer&&cell===null
                let cls='ttt-cell '
                if(isSelected)cls+='cell-selected'
                else if(cell==='player')cls+='cell-player'
                else if(cell==='computer')cls+='cell-computer'
                else{cls+='cell-empty';if(canClick)cls+=' can-click'}

                return(
                  <div
                    key={idx}
                    ref={el=>{boardRef.current[idx]=el}}
                    className={cls}
                    onClick={()=>onCellClick(idx)}
                    style={{position:'relative',overflow:'visible'}}
                  >
                    {/* Empty selectable: hint finger */}
                    {cell===null&&!isSelected&&canClick&&answeredCells===0&&idx===hintCell&&(
                      <span className="hint-finger">👆</span>
                    )}

                    {/* Selected cell: show letter challenge */}
                    {isSelected&&currentLetter&&(
                      <div
                        ref={letterBgRef}
                        style={{position:'relative',overflow:'visible',display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%'}}
                      >
                        <span className={`cell-letter ${shake?'c-shake':''} ${successAnim?'c-pop':''}`} style={{opacity:letterVisible?1:0,transition:'opacity 0.15s'}}>
                          {currentLetter.char}
                        </span>
                      </div>
                    )}

                    {/* Player emoji */}
                    {cell==='player'&&(
                      <span className={`cell-emoji ${playerJumpCell===idx?'emoji-jump':''}`}>
                        {PLAYER_EMOJI}
                      </span>
                    )}
                    {/* Computer emoji */}
                    {cell==='computer'&&(
                      <span className={`cell-emoji ${computerJumpCell===idx?'emoji-bounce':''}`}>
                        {COMPUTER_EMOJI}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Controls — shown when waiting for answer */}
            {waitingForAnswer&&currentLetter&&(
              <div className="controls-bar">
                <button
                  className="btn-listen"
                  onClick={()=>speakLetter(currentLetter.base)}
                >🔊</button>

                {/* Always show approve button */}
                <button className="btn-approve" onClick={()=>handleCorrectRef.current()}>✓</button>

                {/* Mic indicator */}
                <div className={`mic-ind ${micStatus==='listening'?'mic-on':'mic-off'}`}>🎤</div>
              </div>
            )}
          </div>
        )}

        {/* ── Round end ── */}
        {phase==='roundEnd'&&(
          <div className="result-card fade-in">
            <div style={{fontSize:64}}>🎉</div>
            <StarDisplay stars={roundStars}/>
            <button className="btn-primary" onClick={startNextRound}>⚔️</button>
          </div>
        )}

        {/* ── Game over ── */}
        {phase==='gameOver'&&(
          <div className="result-card fade-in">
            <div style={{fontSize:64}}>🏆</div>
            <StarDisplay stars={roundStars}/>
            <button onClick={()=>router.back()} className="btn-continue">⚔️</button>
          </div>
        )}

      </div>
    </>
  )
}
