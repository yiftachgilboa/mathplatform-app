// @ts-nocheck
'use client'
import { useState, useRef, useEffect } from "react";
import { useRouter } from 'next/navigation';
import GameBackButton from '@/components/GameBackButton';
import { STORIES } from './questions';
import { GAME_IMAGES } from './images';

const GAME_ID = 'math-word-problems-001';

const P = {
  bg:"#f0f7e6", card:"#ffffff", cardBorder:"#a8d56a",
  green1:"#2d6a00", green2:"#4a9400", green3:"#dcf0b0",
  pink:"#d4006e", purple:"#7b1fa2",
  text:"#1a3300", textMid:"#2d5200",
  correct:"#2e7d32", correctBg:"#e8f5e9",
  wrong:"#c62828", wrongBg:"#fce4ec",
  eraser:"#c0392b",
};
const DIGIT_COLORS=["#e53935","#e91e8c","#8e24aa","#1e88e5","#00897b","#43a047","#f4511e","#fb8c00","#e6b800","#00acc1"];
const OP_COLORS={"+":"#fb8c00","−":"#e53935","×":"#8e24aa","÷":"#1e88e5","=":"#2e7d32"};
const ROW1=["0","1","2","3","4","5","6","7","8","9"];
const ROW2=["+","−","×","÷","="];
const NUM_ROWS=8;
const COVER_COLORS=["#e53935","#8e24aa","#00897b","#fb8c00"];

function snapY(y,h){const rH=h/NUM_ROWS;const r=Math.max(0,Math.min(NUM_ROWS-1,Math.round((y-rH/2)/rH)));return r*rH+rH/2;}
function darken(hex){try{const n=parseInt(hex.slice(1),16);const r=Math.max(0,((n>>16)&255)-40);const g=Math.max(0,((n>>8)&255)-40);const b=Math.max(0,(n&255)-40);return`#${((r<<16)|(g<<8)|b).toString(16).padStart(6,"0")}`;}catch(e){return"#333";}}

function playCorrect(){try{const ac=new(window.AudioContext||window.webkitAudioContext)();[[523,0],[659,0.12],[784,0.24],[1047,0.38]].forEach(([f,w])=>{const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.frequency.value=f;o.type="sine";g.gain.setValueAtTime(0.28,ac.currentTime+w);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+w+0.28);o.start(ac.currentTime+w);o.stop(ac.currentTime+w+0.32);});}catch(e){}}
function playWrong(){try{const ac=new(window.AudioContext||window.webkitAudioContext)();[[300,0],[240,0.18]].forEach(([f,w])=>{const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.frequency.value=f;o.type="sawtooth";g.gain.setValueAtTime(0.22,ac.currentTime+w);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+w+0.22);o.start(ac.currentTime+w);o.stop(ac.currentTime+w+0.28);});}catch(e){}}
function playReveal(){try{const ac=new(window.AudioContext||window.webkitAudioContext)();[[400,0],[600,0.08],[800,0.16],[1000,0.24],[1200,0.32]].forEach(([f,w])=>{const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.frequency.value=f;o.type="sine";g.gain.setValueAtTime(0.18,ac.currentTime+w);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+w+0.35);o.start(ac.currentTime+w);o.stop(ac.currentTime+w+0.4);});}catch(e){}}

function StarBurst({active}){
  if(!active)return null;
  return <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:20}}>
    {[0,45,90,135,180,225,270,315].map((deg,i)=>(
      <div key={i} style={{position:"absolute",width:12,height:12,borderRadius:"50%",background:i%2===0?P.green2:P.pink,top:"50%",left:"50%",transform:`rotate(${deg}deg) translateY(-40px)`,animation:"sfmBurst 0.75s ease forwards",animationDelay:i*0.04+"s"}}/>
    ))}
  </div>;
}

function EraserIcon(){return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16l10-10 7 7-3.5 3.5"/><path d="M6.5 17.5l3-3"/></svg>;}

function HLText({text,s,e}){
  if(s==null)return <span>{text}</span>;
  const w=text.slice(s,e);if(!w)return <span>{text}</span>;
  return <span>{text.slice(0,s)}<span style={{color:"#d4006e",fontWeight:800}}>{w}</span>{text.slice(e)}</span>;
}

function PaletteToken({sym,onDragStart,bg}){
  return <div onMouseDown={ev=>onDragStart(ev,sym)} onTouchStart={ev=>onDragStart(ev,sym)}
    style={{flex:"1 0 0",minWidth:0,height:56,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:800,color:"#fff",background:bg||P.green2,border:"none",borderRadius:12,cursor:"grab",touchAction:"none",userSelect:"none",boxShadow:`0 3px 0 ${darken(bg||P.green2)}`}}>
    {sym}
  </div>;
}

function DropZone({rk}){
  const wrapRef=useRef(null);const [items,setItems]=useState([]);const dragNew=useRef(null);const dragExist=useRef(null);const ghostEl=useRef(null);const nid=useRef(1);const [snap,setSnap]=useState({});const [dragging,setDragging]=useState(false);
  useEffect(()=>{setItems([]);setSnap({});},[rk]);
  function sc(sym){const d=ROW1.indexOf(sym);if(d>=0)return DIGIT_COLORS[d];return OP_COLORS[sym]||P.green2;}
  function startNew(e,sym){e.preventDefault();setDragging(true);const src=e.touches?e.touches[0]:e;const col=sc(sym);const g=document.createElement("div");g.textContent=sym;g.style.cssText=`position:fixed;pointer-events:none;z-index:9999;font-size:36px;font-weight:800;color:${col};transform:translate(-50%,-50%) scale(1.2);left:${src.clientX}px;top:${src.clientY}px;`;document.body.appendChild(g);ghostEl.current=g;dragNew.current={sym,col};}
  function startExist(e,id){e.preventDefault();e.stopPropagation();const item=items.find(i=>i.id===id);if(!item)return;setDragging(true);const src=e.touches?e.touches[0]:e;dragExist.current={id,sx:src.clientX,sy:src.clientY,ox:item.x,oy:item.y};}
  useEffect(()=>{
    function mv(e){const de=dragExist.current;if(de){e.preventDefault();const src=e.touches?e.touches[0]:e;setItems(p=>p.map(i=>i.id===de.id?{...i,x:de.ox+(src.clientX-de.sx),y:de.oy+(src.clientY-de.sy)}:i));}if(dragNew.current&&ghostEl.current){e.preventDefault();const src=e.touches?e.touches[0]:e;ghostEl.current.style.left=src.clientX+"px";ghostEl.current.style.top=src.clientY+"px";}}
    function up(e){setDragging(false);const de=dragExist.current;if(de){dragExist.current=null;const wrap=wrapRef.current;if(!wrap)return;const rect=wrap.getBoundingClientRect();setItems(p=>{const item=p.find(i=>i.id===de.id);if(!item)return p;if(item.x<-30||item.y<-30||item.x>rect.width+30||item.y>rect.height+30)return p.filter(i=>i.id!==de.id);const sy=snapY(item.y,rect.height);setSnap(t=>({...t,[de.id]:Date.now()}));return p.map(i=>i.id===de.id?{...i,y:sy}:i);});}if(dragNew.current){const{sym,col}=dragNew.current;if(ghostEl.current){document.body.removeChild(ghostEl.current);ghostEl.current=null;}dragNew.current=null;const wrap=wrapRef.current;if(!wrap)return;const src=e.changedTouches?e.changedTouches[0]:e;const rect=wrap.getBoundingClientRect();const x=src.clientX-rect.left,y=src.clientY-rect.top;if(x>=0&&y>=0&&x<=rect.width&&y<=rect.height){const sy=snapY(y,rect.height);const id=nid.current++;setItems(p=>[...p,{id,sym,x,y:sy,col}]);setSnap(t=>({...t,[id]:Date.now()}));}}}
    window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);window.addEventListener("touchmove",mv,{passive:false});window.addEventListener("touchend",up);
    return()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);window.removeEventListener("touchmove",mv);window.removeEventListener("touchend",up);};
  },[items]);
  return <div style={{display:"flex",flexDirection:"column",gap:8,height:"100%"}}>
    <div style={{display:"flex",gap:6,background:"rgba(255,255,255,0.88)",border:`2px solid ${P.cardBorder}`,borderRadius:14,padding:"10px 12px"}}>
      {ROW1.map((sym,i)=><PaletteToken key={sym} sym={sym} onDragStart={startNew} bg={DIGIT_COLORS[i]}/>)}
    </div>
    <div ref={wrapRef} style={{flex:1,background:"#fff",border:`2px solid ${P.cardBorder}`,borderRadius:14,position:"relative",overflow:"hidden"}}>
      {items.length===0&&!dragging&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:17,fontWeight:600,color:"rgba(74,148,0,0.25)",textAlign:"center",pointerEvents:"none",lineHeight:1.6}}>גררו מספרים<br/>וחשבו כאן</div>}
      {items.map(it=><div key={it.id} className={snap[it.id]?"sfmSnap":""} onMouseDown={e=>startExist(e,it.id)} onTouchStart={e=>startExist(e,it.id)} style={{position:"absolute",left:it.x,top:it.y,transform:"translate(0,-50%)",fontSize:34,fontWeight:800,color:it.col||P.green2,cursor:"grab",userSelect:"none",touchAction:"none",zIndex:5,lineHeight:1}}>{it.sym}</div>)}
    </div>
    <div style={{display:"flex",gap:6,background:"rgba(255,255,255,0.88)",border:`2px solid ${P.cardBorder}`,borderRadius:14,padding:"10px 12px",alignItems:"center"}}>
      {ROW2.map(sym=><PaletteToken key={sym} sym={sym} onDragStart={startNew} bg={OP_COLORS[sym]}/>)}
      <div style={{flex:"0 0 8px"}}/>
      <button onClick={()=>{setItems([]);setSnap({});}} title="מחק הכל" style={{height:56,paddingInline:14,background:P.eraser,border:"none",color:"#fff",borderRadius:12,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 3px 0 #922b21"}}><EraserIcon/></button>
    </div>
  </div>;
}

// ── Story select ──────────────────────────────────────────────────────────────
function StorySelectScreen({onSelect}){
  const [hov,setHov]=useState(null);
  return <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:28}}>
    <div style={{fontSize:28,fontWeight:800,color:P.green1}}>בחרו סיפור</div>
    <div style={{display:"flex",gap:24,flexWrap:"wrap",justifyContent:"center"}}>
      {STORIES.map(story=>{
        const total=story.chapters.reduce((a,c)=>a+c.questions.length,0);
        return <div key={story.id}
          onClick={()=>onSelect(story)}
          onMouseEnter={()=>setHov(story.id)}
          onMouseLeave={()=>setHov(null)}
          style={{background:"#fff",border:`2.5px solid ${P.cardBorder}`,borderRadius:20,
            padding:"28px 36px",cursor:"pointer",minWidth:220,textAlign:"center",
            boxShadow:"0 4px 20px rgba(0,0,0,0.09)",
            transform:hov===story.id?"translateY(-5px)":"translateY(0)",
            transition:"transform 0.15s"}}>
          <div style={{fontSize:26,fontWeight:800,color:P.green1,marginBottom:10}}>{story.title}</div>
          <div style={{fontSize:17,color:P.textMid,marginBottom:8}}>גיבור/ה: <strong>{story.hero}</strong></div>
          <div style={{fontSize:13,color:"#999",marginBottom:18}}>{story.chapters.length} פרקים · {total} שאלות</div>
          <div style={{background:P.green2,color:"#fff",borderRadius:10,padding:"10px 20px",fontSize:16,fontWeight:700,boxShadow:`0 3px 0 ${darken(P.green2)}`}}>
            התחל ▶
          </div>
        </div>;
      })}
    </div>
  </div>;
}

// ── Single question (story format) ───────────────────────────────────────────
function StoryQuestionScreen({question,chapterTitle,questionNum,totalInChapter,dzKey,onCorrect}){
  const [val,setVal]=useState("");
  const [fb,setFb]=useState(null);
  const [burst,setBurst]=useState(false);
  const [cls,setCls]=useState("");
  const [showHint,setShowHint]=useState(false);
  const [answered,setAnswered]=useState(false);
  const [hlRange,setHlRange]=useState(null);
  const ref=useRef(null);
  const ftRef=useRef(true);   // first-try flag
  const attRef=useRef(0);     // wrong-attempt counter

  useEffect(()=>{
    setVal("");setFb(null);setBurst(false);setCls("");
    setShowHint(false);setAnswered(false);setHlRange(null);
    ftRef.current=true;attRef.current=0;
    setTimeout(()=>{if(ref.current)ref.current.focus();},80);
    if(window.speechSynthesis)window.speechSynthesis.cancel();
  },[question.id]);

  const speak=()=>{
    if(!window.speechSynthesis)return;
    window.speechSynthesis.cancel();setHlRange(null);
    const body=question.text;
    const u=new SpeechSynthesisUtterance(body);u.lang="he-IL";u.rate=0.85;
    u.onboundary=(e)=>{
      if(e.name!=="word")return;
      const ci=e.charIndex,cl=e.charLength||0;let start=ci,end=ci;
      if(cl>0){end=ci+cl;}else{let s=ci,en=ci;while(s>0&&!/\s/.test(body[s-1]))s--;while(en<body.length&&!/\s/.test(body[en]))en++;start=s;end=en;}
      while(end>start&&/[.,!?;:]/.test(body[end-1]))end--;
      if(end>start)setHlRange({start,end});
    };
    u.onend=()=>setHlRange(null);u.onerror=()=>setHlRange(null);
    window.speechSynthesis.speak(u);
  };

  const check=()=>{
    if(answered)return;
    const n=parseInt(val);if(isNaN(n))return;
    if(n===question.answer){
      playCorrect();setBurst(true);setCls("sfmPop");setFb("ok");setAnswered(true);
      setTimeout(()=>setBurst(false),900);
    } else {
      playWrong();setCls("sfmShake");setFb(n<question.answer?"low":"high");
      setTimeout(()=>setCls(""),600);
      ftRef.current=false;
      attRef.current+=1;
      setShowHint(true);
    }
  };

  const handleNext=()=>{
    onCorrect(ftRef.current, attRef.current+1);
  };

  // Dots progress indicator
  const dots=Array.from({length:totalInChapter},(_,i)=>
    i<questionNum-1?"●":i===questionNum-1?"◉":"○"
  ).join(" ");

  return <div style={{flex:1,display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:12,minHeight:0}}>
    <DropZone rk={dzKey}/>
    <div style={{display:"flex",gap:8,height:"100%"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:8,minWidth:0}}>
        {/* Chapter + progress bar */}
        <div style={{background:"rgba(255,255,255,0.85)",borderRadius:10,padding:"7px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,fontWeight:600,color:P.textMid}}>
          <span>{chapterTitle}</span>
          <span style={{letterSpacing:2,fontSize:11}}>{dots}</span>
        </div>
        {/* Question card */}
        <div style={{flex:1,background:"rgba(255,255,255,0.92)",borderRadius:16,border:`2px solid ${P.cardBorder}`,padding:"18px 16px 16px",display:"flex",flexDirection:"column",gap:14,overflowY:"auto"}}>
          <div style={{color:P.text,fontSize:18,lineHeight:1.9,fontWeight:500}}>
            <HLText text={question.text} s={hlRange?.start} e={hlRange?.end}/>
          </div>
          <div style={{marginTop:"auto"}}>
            {/* Answer input */}
            <div style={{position:"relative",padding:"12px 14px",borderRadius:12,
              background:fb==="ok"?P.correctBg:fb?P.wrongBg:P.green3,
              border:`1.5px solid ${fb==="ok"?P.correct:fb?P.wrong:P.cardBorder}`}}>
              <StarBurst active={burst}/>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  <button onClick={()=>{if(!answered){setFb(null);setVal(v=>String((parseInt(v)||0)+1));}}}
                    style={{width:52,height:46,background:"#4a9400",border:"none",borderRadius:10,cursor:"pointer",fontSize:24,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 3px 0 #2d6a00"}}>▲</button>
                  <button onClick={()=>{if(!answered){setFb(null);setVal(v=>String(Math.max(0,(parseInt(v)||0)-1)));}}}
                    style={{width:52,height:46,background:"#4a9400",border:"none",borderRadius:10,cursor:"pointer",fontSize:24,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 3px 0 #2d6a00"}}>▼</button>
                </div>
                <input ref={ref} type="number" value={val} placeholder="?" className={cls}
                  readOnly={answered}
                  onChange={e=>{if(!answered){setVal(e.target.value);setFb(null);setCls("");}}}
                  onKeyDown={e=>{if(e.key==="Enter"){answered?handleNext():check();}}}
                  style={{width:130,fontSize:44,fontWeight:800,textAlign:"center",direction:"ltr",
                    border:`2.5px solid ${fb==="ok"?P.correct:fb?P.wrong:P.green2}`,
                    borderRadius:12,padding:"6px 0",color:P.text,background:"#fff",outline:"none"}}/>
                {!answered
                  ? <button onClick={check} style={{width:52,height:96,background:"#4a9400",border:"none",color:"#fff",fontSize:26,borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 0 #2d6a00"}}>✓</button>
                  : <button onClick={handleNext} style={{width:52,height:96,background:P.correct,border:"none",color:"#fff",fontSize:22,borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 0 ${darken(P.correct)}`,animation:"sfmPop 0.3s ease both"}}>←</button>
                }
              </div>
              {fb&&<div className="sfmFadeEl" style={{marginTop:10,padding:"10px 14px",borderRadius:10,fontSize:17,fontWeight:700,background:"#fff",display:"flex",alignItems:"center",gap:10,color:fb==="ok"?P.correct:P.wrong,border:`1.5px solid ${fb==="ok"?P.correct:P.wrong}`}}>
                {fb==="ok"&&<><span style={{fontSize:24}}>🌟</span>כל הכבוד! תשובה נכונה!</>}
                {fb==="low"&&<><span style={{fontSize:22}}>⬆️</span>נסה מספר גדול יותר</>}
                {fb==="high"&&<><span style={{fontSize:22}}>⬇️</span>נסה מספר קטן יותר</>}
              </div>}
            </div>
          </div>
          {showHint&&fb!=="ok"&&<div className="sfmFadeEl" style={{background:P.green3,border:`1px solid ${P.cardBorder}`,borderRadius:8,padding:"10px 14px",fontSize:14,color:P.text}}>
            💡 רמז: <strong>{question.hint}</strong>
          </div>}
        </div>
      </div>
      {/* Speak button */}
      <div style={{display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
        <button onClick={speak} style={{width:44,height:44,background:"#4a9400",border:"none",color:"#fff",fontSize:20,borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 3px 0 #2d6a00"}}>▶</button>
      </div>
    </div>
  </div>;
}

// ── Puzzle reveal (shown after each chapter) ──────────────────────────────────
function PuzzleRevealScreen({solvedCount,imageUrl,nextChapterTitle,onContinue}){
  const isLast=!nextChapterTitle;
  // first solvedCount tiles are revealed
  const solved=COVER_COLORS.map((_,i)=>i<solvedCount);

  return <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20}}>
    {/* Puzzle grid */}
    <div style={{position:"relative",width:"min(72vh,80vw)",aspectRatio:"1",borderRadius:16,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.3)"}}>
      <img src={imageUrl??undefined} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
      <div style={{position:"absolute",inset:0,display:"grid",gridTemplateColumns:"repeat(2,1fr)",gridTemplateRows:"repeat(2,1fr)",gap:2}}>
        {COVER_COLORS.map((color,i)=>{
          const done=solved[i];
          return <div key={i} style={{background:color,transition:"opacity 0.6s, transform 0.6s",opacity:done?0:1,transform:done?"translateY(-110%)":"translateY(0)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {!done&&<div style={{fontSize:32,opacity:0.7}}>?</div>}
          </div>;
        })}
      </div>
    </div>

    {/* Label + continue button */}
    <div style={{textAlign:"center"}}>
      {!isLast&&<div style={{fontSize:14,color:"#aaa",marginBottom:4}}>הפרק הבא:</div>}
      {!isLast&&<div style={{fontSize:18,fontWeight:700,color:P.purple,marginBottom:16}}>{nextChapterTitle}</div>}
      {isLast&&<div style={{fontSize:20,fontWeight:800,color:P.green1,marginBottom:16}}>🎉 סיימת את כל הפרקים!</div>}
      <button onClick={onContinue} style={{background:`linear-gradient(135deg,${P.green2},${P.green1})`,border:"none",color:"#fff",fontSize:17,fontWeight:800,padding:"13px 34px",borderRadius:14,cursor:"pointer",boxShadow:"0 4px 16px rgba(45,106,0,0.4)",animation:"sfmReveal 0.5s ease both"}}>
        {isLast?"לסיכום ←":"המשך ←"}
      </button>
    </div>
  </div>;
}

// ── Game over ─────────────────────────────────────────────────────────────────
function GameOverScreen({storyTitle,ftc,totalQ,stars,score,onBack}){
  const starStr="⭐".repeat(stars)+"☆".repeat(3-stars);
  return <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{background:"#fff",borderRadius:20,padding:"44px 52px",textAlign:"center",boxShadow:"0 8px 32px rgba(0,0,0,0.13)",animation:"sfmReveal 0.5s ease both"}}>
      <div style={{fontSize:48,marginBottom:10}}>{starStr}</div>
      <div style={{fontSize:26,fontWeight:800,color:P.green1,marginBottom:8}}>כל הכבוד!</div>
      <div style={{fontSize:18,color:P.textMid,marginBottom:18}}>סיימת: {storyTitle}</div>
      <div style={{fontSize:15,color:"#888",marginBottom:4}}>תשובות נכונות בניסיון ראשון: <strong>{ftc}/{totalQ}</strong></div>
      <div style={{fontSize:22,fontWeight:700,color:P.green2,marginBottom:30}}>ניקוד: {score}/{totalQ*10}</div>
      <button onClick={onBack} style={{background:`linear-gradient(135deg,${P.green2},${P.green1})`,border:"none",color:"#fff",fontSize:17,fontWeight:800,padding:"13px 34px",borderRadius:14,cursor:"pointer",boxShadow:"0 4px 16px rgba(45,106,0,0.4)",animation:"sfmReveal 0.5s ease both"}}>המשך ←</button>
    </div>
  </div>;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GameClient(){
  const router=useRouter();
  const [screen,setScreen]=useState("story-select");
  const [story,setStory]=useState(null);
  const [chapterIdx,setChapterIdx]=useState(0);
  const [questionIdx,setQuestionIdx]=useState(0);
  const [ftc,setFtc]=useState(0);          // first-try-correct count
  const [finalStars,setFinalStars]=useState(0);
  const [finalScore,setFinalScore]=useState(0);
  const [dzKey,setDzKey]=useState(0);
  const [imageUrl,setImageUrl]=useState(null);

  // SDK
  useEffect(()=>{
    const script=document.createElement('script');
    script.src='/sdk/mathplatform-sdk-v1.js';
    script.onload=()=>{ window.MathPlatformSDK?.emit('GAME_STARTED',{gameId:GAME_ID}); };
    document.head.appendChild(script);
  },[]);

  // CSS
  useEffect(()=>{
    if(document.getElementById("sfm-css"))return;
    const s=document.createElement("style");s.id="sfm-css";
    s.textContent=`
      @keyframes sfmPop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
      @keyframes sfmShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(10px)}60%{transform:translateX(-7px)}80%{transform:translateX(7px)}}
      @keyframes sfmBurst{0%{transform:scale(0) rotate(0deg);opacity:1}100%{transform:scale(2.8) rotate(180deg);opacity:0}}
      @keyframes sfmFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      @keyframes sfmSnap{0%{opacity:0.4;transform:translate(0,-50%) scale(1.3)}100%{opacity:1;transform:translate(0,-50%) scale(1)}}
      @keyframes sfmReveal{0%{transform:scale(0.4);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
      .sfmPop{animation:sfmPop 0.4s ease forwards}
      .sfmShake{animation:sfmShake 0.5s ease}
      .sfmFadeEl{animation:sfmFadeIn 0.25s ease forwards}
      .sfmSnap{animation:sfmSnap 0.18s ease forwards}
      input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
      input[type=number]{-moz-appearance:textfield}
    `;
    document.head.appendChild(s);
    if(window.speechSynthesis){const u=new SpeechSynthesisUtterance("");u.volume=0;window.speechSynthesis.speak(u);window.speechSynthesis.cancel();}
  },[]);

  function handleStorySelect(s){
    setStory(s);setChapterIdx(0);setQuestionIdx(0);setFtc(0);
    setDzKey(k=>k+1);
    // pick a fresh image for this session
    const imgIdx=parseInt(localStorage.getItem(`${GAME_ID}-img-idx`)||'0');
    setImageUrl(GAME_IMAGES[imgIdx%GAME_IMAGES.length].src);
    setScreen("question");
  }

  function handleQuestionCorrect(wasFirstTry,attemptNumber){
    const newFtc=wasFirstTry?ftc+1:ftc;
    if(wasFirstTry)setFtc(newFtc);

    const chapter=story.chapters[chapterIdx];
    const question=chapter.questions[questionIdx];

    window.MathPlatformSDK?.emit('ANSWER',{
      correct:true,
      questionId:question.id,
      questionType:'word-problem',
      correctAnswer:String(question.answer),
      childAnswer:String(question.answer),
      attemptNumber,
    });

    const isLastQ=questionIdx+1>=chapter.questions.length;
    const isLastCh=chapterIdx+1>=story.chapters.length;

    if(!isLastQ){
      setQuestionIdx(q=>q+1);
      setDzKey(k=>k+1);
    } else if(!isLastCh){
      // chapter done (not last) → reveal puzzle tile, then next chapter
      playReveal();
      setScreen("puzzle");
    } else {
      // last chapter done → reveal complete puzzle, then game-over
      playReveal();
      const totalQ=story.chapters.reduce((sum,ch)=>sum+ch.questions.length,0);
      const pct=newFtc/totalQ;
      const stars=pct>=0.83?3:pct>=0.58?2:1;
      const score=newFtc*10;
      window.MathPlatformSDK?.emit('GAME_OVER',{
        score,
        maxScore:totalQ*10,
        stars,
        correctAnswers:totalQ,
        totalQuestions:totalQ,
      });
      setFinalStars(stars);setFinalScore(score);
      setScreen("puzzle");
    }
  }

  function handlePuzzleContinue(){
    const isLast=chapterIdx+1>=story.chapters.length;
    if(isLast){
      // rotate image index for next session
      const imgIdx=parseInt(localStorage.getItem(`${GAME_ID}-img-idx`)||'0');
      localStorage.setItem(`${GAME_ID}-img-idx`,String(imgIdx+1));
      setScreen("game-over");
    } else {
      setChapterIdx(c=>c+1);setQuestionIdx(0);
      setDzKey(k=>k+1);setScreen("question");
    }
  }

  const chapter=story?.chapters[chapterIdx];
  const question=chapter?.questions[questionIdx];
  const totalQ=story?.chapters.reduce((sum,ch)=>sum+ch.questions.length,0)??0;

  return <div dir="rtl" style={{background:"linear-gradient(135deg,#e8f5c8 0%,#f0e8ff 50%,#ffe8f0 100%)",height:"100vh",padding:12,fontFamily:"'Segoe UI',Tahoma,sans-serif",display:"flex",flexDirection:"column"}}>
    <GameBackButton/>

    {screen==="story-select"&&<StorySelectScreen onSelect={handleStorySelect}/>}

    {screen==="question"&&question&&
      <StoryQuestionScreen
        question={question}
        chapterTitle={chapter.title}
        questionNum={questionIdx+1}
        totalInChapter={chapter.questions.length}
        dzKey={dzKey}
        onCorrect={handleQuestionCorrect}
      />
    }

    {screen==="puzzle"&&story&&
      <PuzzleRevealScreen
        solvedCount={chapterIdx+1}
        imageUrl={imageUrl}
        nextChapterTitle={story.chapters[chapterIdx+1]?.title??null}
        onContinue={handlePuzzleContinue}
      />
    }

    {screen==="game-over"&&story&&
      <GameOverScreen
        storyTitle={story.title}
        ftc={ftc}
        totalQ={totalQ}
        stars={finalStars}
        score={finalScore}
        onBack={()=>router.back()}
      />
    }
  </div>;
}
