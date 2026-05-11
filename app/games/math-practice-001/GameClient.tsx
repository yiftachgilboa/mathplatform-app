'use client'

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import GameBackButton from "@/components/GameBackButton";
import bg from './assets/bg.jpg';

const TOPICS = {
  decompose:  { label: "פירוק מספרים" },
  addSub10:   { label: "חיבור וחיסור עד 10" },
  complete10: { label: "השלמה לעשר" },
  add20:      { label: "חיבור עד 20" },
  sub20:      { label: "חיסור עד 20" },
  add100:     { label: "חיבור עד 100" },
  sub100:     { label: "חיסור עד 100" },
  multiply:   { label: "לוח הכפל" },
  divide:     { label: "חילוק" },
};
const DEFAULT_SETTINGS = { topics:["add20"], multiplyTables:[], breakingTen:false };

const SKY_TOP = "#0f2b6b";
const SKY_BTM = "#1a5fb4";
const TEXT_WHITE = "#ffffff";
const TEXT_DARK  = "#2a0040";

const CUBE_COLORS = [
  { top:"#f878b4", side:"#991155", front:"#cc3380", text:"#fff"    },
  { top:"#ffb3d9", side:"#994466", front:"#ee7ab0", text:"#550033" },
  { top:"#cc88ee", side:"#6622aa", front:"#9944cc", text:"#fff"    },
  { top:"#9966ee", side:"#4422aa", front:"#7744dd", text:"#fff"    },
  { top:"#aaeeff", side:"#2266aa", front:"#66aadd", text:"#222255" },
  { top:"#f878b4", side:"#991155", front:"#cc3380", text:"#fff"    },
  { top:"#cc88ee", side:"#6622aa", front:"#9944cc", text:"#fff"    },
  { top:"#ffb3d9", side:"#994466", front:"#ee7ab0", text:"#550033" },
  { top:"#9966ee", side:"#4422aa", front:"#7744dd", text:"#fff"    },
];

const CORRECT_C = { top:"#66ee99", side:"#118844", front:"#33cc66", text:"#fff" };
const WRONG_C   = { top:"#ff5555", side:"#991111", front:"#cc2222", text:"#fff" };

const CW = 96, CH = 50, CD = 18;
const SVG_W = CW + CD, SVG_H = CH + CD;

const getFS = (k: string, fb: unknown) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const setFS = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

interface Settings {
  topics: string[];
  multiplyTables: number[];
  breakingTen: boolean;
}

interface Question {
  q: string;
  a: number;
  key: string;
}

function generatePool(topic: string, { multiplyTables, breakingTen }: Settings) {
  const pool: Question[] = [], add = (q: string, a: number) => pool.push({ q, a, key: topic + ":" + q + "=" + a });
  if (topic === "decompose") {
    for (let n = 3; n <= 10; n++) for (let a = 1; a < n; a++) add("D|" + n + "|" + a, n - a);
  } else if (topic === "addSub10") {
    for (let a = 1; a <= 9; a++) for (let b = 1; a + b <= 10; b++) add(a + " + " + b, a + b);
    for (let s = 2; s <= 10; s++) for (let b = 1; b < s; b++) add(s + " − " + b, s - b);
  } else if (topic === "complete10") {
    for (let a = 1; a <= 9; a++) add("D|10|" + a, 10 - a);
  } else if (topic === "add20") {
    for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) {
      if (a + b > 20) continue;
      const crossesTen = (a % 10) + b >= 10 && a + b > 10;
      if (breakingTen && !crossesTen) continue;
      if (!breakingTen && crossesTen) continue;
      add(a + " + " + b, a + b);
    }
  } else if (topic === "sub20") {
    for (let s = 2; s <= 20; s++) for (let b = 1; b < s; b++) {
      const crossesTen = (s > 10 && s - b < 10) || (s <= 10 && b > s % 10 && s % 10 !== 0);
      if (breakingTen && !crossesTen) continue;
      if (!breakingTen && crossesTen) continue;
      add(s + " − " + b, s - b);
    }
  } else if (topic === "add100") {
    for (let a = 5; a <= 90; a += 5) for (let b = 5; a + b <= 100; b += 5) {
      const crossesTen = Math.floor(a / 10) !== Math.floor((a + b) / 10) && b % 10 !== 0;
      if (breakingTen && !crossesTen) continue;
      if (!breakingTen && crossesTen) continue;
      add(a + " + " + b, a + b);
    }
  } else if (topic === "sub100") {
    for (let s = 20; s <= 100; s += 10) for (let b = 1; b < s && b <= 50; b += 5) {
      const crossesTen = s % 10 < b % 10;
      if (breakingTen && !crossesTen) continue;
      if (!breakingTen && crossesTen) continue;
      add(s + " − " + b, s - b);
    }
  } else if (topic === "multiply") {
    if (!multiplyTables.length) return pool;
    for (const t of multiplyTables) for (let b = 1; b <= 10; b++) add(t + " × " + b, t * b);
  } else if (topic === "divide") {
    if (!multiplyTables.length) return pool;
    for (const t of multiplyTables.filter(x => x > 0)) for (let b = 1; b <= 10; b++) add((t * b) + " : " + t, b);
  }
  return pool;
}

function pickWeighted(pool: Question[], memory: Record<string, number>, count: number) {
  if (!pool.length) return [];
  const w = pool.map(q => ({ ...q, w: Math.max(0.5, 10 / Math.pow(1.6, memory[q.key] || 0)) }));
  const result: Question[] = [], used = new Set<string>(); let tries = 0;
  while (result.length < count && tries < 1000) {
    tries++;
    if (used.size >= w.length) used.clear();
    const avail = w.filter(x => !used.has(x.key));
    if (!avail.length) break;
    const total = avail.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (const x of avail) { r -= x.w; if (r <= 0) { result.push(x); used.add(x.key); break; } }
  }
  return result.slice(0, count);
}

function buildQuestions(settings: Settings, memory: Record<string, number>) {
  const { topics } = settings;
  if (!topics || !topics.length) return [];
  const n = topics.length, perTopic = Math.floor(9 / n), rem = 9 - perTopic * n;
  const result: Question[] = [];
  topics.forEach((t, i) => result.push(...pickWeighted(generatePool(t, settings), memory, perTopic + (i < rem ? 1 : 0))));
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = result[i]; result[i] = result[j]; result[j] = tmp;
  }
  return result.slice(0, 9);
}

interface CubeProps {
  value: number;
  cubeIdx: number;
  state: string;
  onClick: () => void;
}

function Cube({ value, cubeIdx, state, onClick }: CubeProps) {
  const falling = state === "falling", wrong = state === "wrong", gone = state === "gone";
  const c = falling ? CORRECT_C : wrong ? WRONG_C : (CUBE_COLORS[cubeIdx % CUBE_COLORS.length]);
  const topPts   = CD + ",0 " + SVG_W + ",0 " + CW + "," + CH + " 0," + CH;
  const rightPts = SVG_W + ",0 " + SVG_W + "," + CD + " " + CW + "," + (CH + CD) + " " + CW + "," + CH;
  const frontPts = "0," + CH + " " + CW + "," + CH + " " + CW + "," + (CH + CD) + " 0," + (CH + CD);
  const fs = value > 99 ? 15 : value > 9 ? 22 : 26;
  const tx = CD + (CW - CD) / 2, ty = CH * 0.47;
  return (
    <div
      onClick={(!falling && !wrong && !gone) ? onClick : undefined}
      style={{
        cursor: (!falling && !wrong && !gone) ? "pointer" : "default",
        width: SVG_W, height: SVG_H, userSelect: "none", display: "block",
        opacity: gone ? 0 : 1,
        animation: falling ? "cubefall 0.7s cubic-bezier(0.3,0,0.8,0.6) forwards"
          : wrong ? "shakewrong 0.38s ease forwards" : "none",
      }}
    >
      <svg width={SVG_W} height={SVG_H} style={{ overflow: "visible", display: "block" }}>
        <polygon points={topPts}   fill={c.top}   stroke="#00000022" strokeWidth="1.2" />
        <polygon points={rightPts} fill={c.side}  stroke="#00000033" strokeWidth="1.2" />
        <polygon points={frontPts} fill={c.front} stroke="#00000022" strokeWidth="1.2" />
        {!gone && (
          <text x={tx} y={ty}
            textAnchor="middle" dominantBaseline="middle"
            fill={c.text} fontSize={fs} fontWeight="900"
            fontFamily="'Nunito',sans-serif" style={{ pointerEvents: "none" }}
          >{value}</text>
        )}
      </svg>
    </div>
  );
}

interface SignProps {
  question: Question | null;
  visible: boolean;
  revealAnswer: number | null;
}

function Sign({ question, visible, revealAnswer }: SignProps) {
  if (!question) return null;
  const raw = question.q;
  const isDecomp = raw.startsWith("D|");

  const renderInner = () => {
    if (isDecomp) {
      const parts = raw.split("|");
      const n = parseInt(parts[1]), a = parseInt(parts[2]);
      const BAR_W = 220;
      const bWidth = Math.round((a / n) * BAR_W);
      const qWidth = BAR_W - bWidth;
      const ansColor = revealAnswer != null ? "#33cc77" : "#9966ee";
      return (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
          <div style={{ width: BAR_W, height: 42, background: "#cc4488", borderRadius: 7, border: "2.5px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 22, color: "#fff" }}>{n}</div>
          <div style={{ display: "flex", gap: 5, width: BAR_W }}>
            <div style={{ width: bWidth - 2, height: 42, background: "#4488dd", borderRadius: 7, border: "2.5px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: bWidth < 50 ? 13 : 20, color: "#fff", flexShrink: 0 }}>{a}</div>
            <div style={{ flex: 1, height: 42, background: ansColor, borderRadius: 7, border: "2.5px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: qWidth < 50 ? 13 : 20, color: "#fff", transition: "background 0.3s" }}>{revealAnswer != null ? revealAnswer : "?"}</div>
          </div>
        </div>
      );
    }
    const renderQ = (text: string) => {
      if (!text.includes("?")) return <span>{text}</span>;
      const idx = text.indexOf("?");
      return (
        <>
          <span>{text.slice(0, idx)}</span>
          <span style={{ color: revealAnswer != null ? "#44ff88" : "#ffe033", fontWeight: 900, minWidth: "1.1ch", display: "inline-block", textAlign: "center", transition: "color 0.2s" }}>
            {revealAnswer != null ? revealAnswer : "?"}
          </span>
          <span>{text.slice(idx + 1)}</span>
        </>
      );
    };
    return <div style={{ fontSize: 40, fontWeight: 900, color: TEXT_WHITE, lineHeight: 1.1, textShadow: "0 2px 4px #0006", textAlign: "center" }}>{renderQ(raw)}</div>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 8 }}>
      <div style={{
        background: "linear-gradient(135deg,#a0622a 0%,#c07838 40%,#8b4f1e 100%)",
        border: "3px solid #5a3010",
        borderRadius: 12,
        padding: isDecomp ? "16px 20px 14px" : "10px 28px 12px",
        boxShadow: "0 6px 20px #0005,inset 0 1px 0 #ffffff22",
        minWidth: isDecomp ? "auto" : 160,
        position: "relative",
      }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 10, overflow: "hidden", pointerEvents: "none" }}>
          {[8, 18, 28, 38, 48, 58].map(y => <div key={y} style={{ position: "absolute", left: 0, right: 0, top: y, height: 1, background: "#00000010" }} />)}
        </div>
        <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.15s" }}>
          {renderInner()}
        </div>
      </div>
      <div style={{ width: 10, height: 28, background: "linear-gradient(#7a4010,#a05828,#7a4010)", borderRadius: "0 0 4px 4px", boxShadow: "1px 2px 4px #0005" }} />
    </div>
  );
}

interface SettingsPanelProps {
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
}

function SettingsPanel({ settings, onSave, onClose }: SettingsPanelProps) {
  const [loc, setLoc] = useState({ ...settings, topics: [...settings.topics] });
  const tables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const toggleTopic = (k: string) => {
    const cur = loc.topics;
    if (cur.includes(k)) { if (cur.length === 1) return; setLoc({ ...loc, topics: cur.filter(x => x !== k) }); }
    else setLoc({ ...loc, topics: [...cur, k] });
  };
  const tglTable = (t: number) => {
    const c = loc.multiplyTables;
    if (c.includes(t)) { if (c.length === 1) return; setLoc({ ...loc, multiplyTables: c.filter(x => x !== t) }); }
    else setLoc({ ...loc, multiplyTables: [...c, t].sort((a, b) => a - b) });
  };
  const hasMultDiv = loc.topics.some(t => t === "multiply" || t === "divide");
  const hasAddSub  = loc.topics.some(t => ["add20", "sub20", "add100", "sub100"].includes(t));
  const accent = "#f0a820";
  const TOPIC_KEYS = Object.keys(TOPICS);
  const tBtn = (k: string) => {
    const idx = TOPIC_KEYS.indexOf(k);
    const cc = CUBE_COLORS[idx % CUBE_COLORS.length];
    const active = loc.topics.includes(k);
    return {
      padding: "9px 8px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
      fontFamily: "'Nunito',sans-serif",
      background: active ? cc.top : "rgba(255,255,255,0.08)",
      color: active ? cc.text : TEXT_WHITE,
      border: "2px solid " + (active ? cc.side : "rgba(255,255,255,0.2)"),
      boxShadow: active ? "0 2px 8px " + cc.side + "88" : "none",
      transition: "all 0.15s",
    };
  };
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, direction: "rtl" as const }}>
      <div style={{ background: "#1a3a6b", border: "2px solid " + accent, borderRadius: 16, padding: "26px 24px 22px", width: "min(420px,92vw)", color: TEXT_WHITE, fontFamily: "'Nunito',sans-serif", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ textAlign: "center", color: accent, fontSize: 18, fontWeight: 800, marginBottom: 6 }}>הגדרות</div>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 16 }}>ניתן לבחור יותר מנושא אחד</div>
        <div style={{ fontSize: 11, color: accent, marginBottom: 8, fontWeight: 700, letterSpacing: 1 }}>נושאים</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 18 }}>
          {Object.entries(TOPICS).map(([k, v]) => <button key={k} onClick={() => toggleTopic(k)} style={tBtn(k)}>{v.label}</button>)}
        </div>
        {hasMultDiv && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: accent, marginBottom: 8, fontWeight: 700, letterSpacing: 1 }}>כפולות</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {tables.map(t => (
                <button key={t} onClick={() => tglTable(t)} style={{ width: 34, height: 34, borderRadius: 7, cursor: "pointer", fontFamily: "'Nunito',sans-serif", fontSize: 14, fontWeight: 700, background: loc.multiplyTables.includes(t) ? accent : "rgba(255,255,255,0.08)", color: loc.multiplyTables.includes(t) ? TEXT_DARK : TEXT_WHITE, border: "1px solid " + (loc.multiplyTables.includes(t) ? accent : "rgba(255,255,255,0.2)") }}>{t}</button>
              ))}
            </div>
          </div>
        )}
        {hasAddSub && (
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" checked={loc.breakingTen} onChange={e => setLoc({ ...loc, breakingTen: e.target.checked })} style={{ width: 17, height: 17, accentColor: accent }} />
              עם שבירת עשרת
            </label>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={() => { onSave(loc); onClose(); }} style={{ padding: "10px 28px", background: accent, color: TEXT_DARK, border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "'Nunito',sans-serif", fontSize: 15, fontWeight: 800 }}>שמור</button>
          <button onClick={onClose} style={{ padding: "10px 18px", background: "transparent", color: TEXT_WHITE, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, cursor: "pointer", fontFamily: "'Nunito',sans-serif", fontSize: 15 }}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

function createAudioCtx() {
  try { return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { return null; }
}
function playCorrect(ctx: AudioContext | null) {
  if (!ctx) return;
  const now = ctx.currentTime;
  ([[523.25, 0, 0.09], [659.25, 0.13, 0.09], [1046.5, 0.27, 0.18]] as [number, number, number][]).forEach(([freq, delay, dur]) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + delay);
    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
    osc.start(now + delay); osc.stop(now + delay + dur + 0.02);
  });
}
function playWrong(ctx: AudioContext | null) {
  if (!ctx) return;
  const now = ctx.currentTime;
  ([[220, 0, 0.05], [180, 0.06, 0.1]] as [number, number, number][]).forEach(([freq, delay, dur]) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, now + delay);
    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
    osc.start(now + delay); osc.stop(now + delay + dur + 0.02);
  });
}
function playWin(ctx: AudioContext | null) {
  if (!ctx) return;
  const now = ctx.currentTime;
  ([[523.25, 0], [659.25, 0.1], [783.99, 0.2], [1046.5, 0.32], [783.99, 0.46], [1046.5, 0.56]] as [number, number][]).forEach(([freq, delay]) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + delay);
    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);
    osc.start(now + delay); osc.stop(now + delay + 0.22);
  });
}

function HealthBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ width: 70, height: 9, background: "rgba(0,0,0,0.35)", borderRadius: 5, border: "1px solid rgba(255,255,255,0.2)", overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 4, width: (value * 100) + "%", background: color, transition: "width 0.4s ease" }} />
    </div>
  );
}

function FireOrb({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 46 46" style={{ display: "block", overflow: "visible" }}>
      <circle cx="23" cy="23" r="21" fill="none" stroke="#ff4400" strokeWidth="2" opacity="0.3" />
      <circle cx="23" cy="23" r="18" fill="none" stroke="#ff6600" strokeWidth="1.5" opacity="0.4" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <g key={i} style={{ transformOrigin: "23px 23px", transform: `rotate(${deg}deg)`, animation: `flameRot 1.8s linear ${i * 0.22}s infinite` }}>
          <ellipse cx="23" cy="8" rx="3.5" ry="7" fill={i % 2 === 0 ? "#ff2200" : "#ff6600"} opacity="0.7" />
        </g>
      ))}
      <circle cx="23" cy="23" r="10" fill="#440000" />
      <circle cx="23" cy="23" r="7" fill="#ff3300" />
      <circle cx="23" cy="23" r="4" fill="#ffcc00" />
      <circle cx="21" cy="21" r="2" fill="#ffffff" opacity="0.8" />
      <circle cx="23" cy="23" r="1.5" fill="#ffff88" style={{ transformOrigin: "23px 23px", animation: "orbitSpark 1.1s linear infinite" }}>
        <animateTransform attributeName="transform" type="rotate" from="0 23 23" to="360 23 23" dur="1.1s" repeatCount="indefinite" />
        <animate attributeName="cx" values="36;23;10;23;36" dur="1.1s" repeatCount="indefinite" />
        <animate attributeName="cy" values="23;10;23;36;23" dur="1.1s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function LightOrb({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 46 46" style={{ display: "block", overflow: "visible" }}>
      <circle cx="23" cy="23" r="21" fill="none" stroke="#aaffff" strokeWidth="1.5" opacity="0.25" />
      <circle cx="23" cy="23" r="18" fill="none" stroke="#55eeff" strokeWidth="2" opacity="0.35" style={{ animation: "pulseRing 1.2s ease-in-out infinite" }} />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
        <line key={i}
          x1="23" y1="23"
          x2={23 + Math.cos(deg * Math.PI / 180) * 20}
          y2={23 + Math.sin(deg * Math.PI / 180) * 20}
          stroke={i % 3 === 0 ? "#ffffff" : "#55eeff"}
          strokeWidth={i % 3 === 0 ? "1.2" : "0.7"}
          opacity={i % 3 === 0 ? "0.5" : "0.3"}
          style={{ transformOrigin: "23px 23px", animation: "starSpin 3s linear infinite" }}
        />
      ))}
      <circle cx="23" cy="23" r="12" fill="#003344" opacity="0.6" />
      <circle cx="23" cy="23" r="9" fill="#00aacc" />
      <circle cx="23" cy="23" r="6" fill="#55eeff" />
      <circle cx="23" cy="23" r="3.5" fill="#ffffff" />
      <circle cx="21" cy="21" r="1.5" fill="#ffffff" opacity="0.9" />
      <circle r="2" fill="#aaffff" opacity="0.9">
        <animateTransform attributeName="transform" type="rotate" from="0 23 23" to="360 23 23" dur="0.9s" repeatCount="indefinite" />
        <animate attributeName="cx" values="23;36;23;10;23" dur="0.9s" repeatCount="indefinite" />
        <animate attributeName="cy" values="10;23;36;23;10" dur="0.9s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

interface TrailParticleProps {
  x: number;
  y: number;
  age: number;
  type: string;
  size: number;
}

function TrailParticle({ x, y, age, type, size }: TrailParticleProps) {
  const opacity = Math.max(0, 1 - age);
  const s = size * (0.85 - age * 0.5);
  const bg = type === "fire"
    ? `radial-gradient(circle, #ffcc00 0%, #ff4400 50%, transparent 100%)`
    : `radial-gradient(circle, #ffffff 0%, #55eeff 50%, transparent 100%)`;
  return (
    <div style={{
      position: "absolute",
      left: x, top: y,
      width: s, height: s,
      marginLeft: -s / 2, marginTop: -s / 2,
      borderRadius: "50%",
      background: bg,
      opacity,
      zIndex: 48,
      pointerEvents: "none",
      filter: type === "fire"
        ? `blur(${3 + age * 4}px) brightness(1.5)`
        : `blur(${2 + age * 3}px) brightness(2)`,
    }} />
  );
}

interface Projectile {
  id: number;
  type: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface TrailEntry {
  id: number;
  x: number;
  y: number;
  born: number;
  type: string;
  age: number;
}

function ProjectileLayer({ proj }: { proj: Projectile | null }) {
  const [trails, setTrails] = useState<TrailEntry[]>([]);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const SIZE = 52;
  const DURATION = 1050;

  useEffect(() => {
    if (!proj) { setTrails([]); return; }
    startRef.current = performance.now();
    let particles: { id: number; x: number; y: number; born: number; type: string }[] = [];
    let nextId = 0;

    const tick = (now: number) => {
      const elapsed = now - startRef.current!;
      const t = Math.min(elapsed / DURATION, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      const cx = proj.startX + (proj.endX - proj.startX) * ease;
      const cy = proj.startY + (proj.endY - proj.startY) * ease;

      particles.push({ id: nextId++, x: cx, y: cy, born: elapsed, type: proj.type });
      particles = particles.filter(p => elapsed - p.born < 600);

      setTrails(particles.map(p => ({
        ...p,
        age: (elapsed - p.born) / 600,
      })));

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current!); setTrails([]); };
  }, [proj]);

  if (!proj) return null;
  const { startX, startY, endX, endY, type, id } = proj;
  const dx = endX - startX;
  const dy = endY - startY;

  return (
    <>
      {trails.map(p => (
        <TrailParticle key={p.id} x={p.x} y={p.y} age={p.age} type={p.type} size={SIZE * 0.9} />
      ))}
      <div
        key={id}
        style={{
          position: "absolute",
          left: startX,
          top: startY,
          width: SIZE,
          height: SIZE,
          marginLeft: -SIZE / 2,
          marginTop: -SIZE / 2,
          zIndex: 50,
          pointerEvents: "none",
          animationName: "projMove, projSpin",
          animationDuration: `${DURATION}ms, ${DURATION * 0.6}ms`,
          animationTimingFunction: "cubic-bezier(0.25,0.1,0.5,1), linear",
          animationFillMode: "forwards, none",
          animationIterationCount: "1, infinite",
          ["--dx" as string]: dx + "px",
          ["--dy" as string]: dy + "px",
        }}
      >
        {type === "fire" ? <FireOrb size={SIZE} /> : <LightOrb size={SIZE} />}
      </div>
    </>
  );
}

interface CharacterProps {
  emoji: string;
  side: string;
  hp: number;
  hpColor: string;
  isHit: boolean;
  isRedFlash: boolean;
  villainFalling: boolean;
}

function Character({ emoji, side, hp, hpColor, isHit, isRedFlash, villainFalling }: CharacterProps) {
  let anim;
  if (villainFalling) {
    anim = "villainFall 1.1s cubic-bezier(0.3,0,1,1) forwards";
  } else if (isHit) {
    anim = "villainShake 0.5s ease";
  } else if (isRedFlash) {
    anim = "none";
  } else {
    anim = "charFloat " + (side === "right" ? "3.8s" : "4.3s") + " ease-in-out infinite";
  }

  const filterVal = isRedFlash
    ? "brightness(1.5) sepia(1) saturate(8) hue-rotate(-10deg)"
    : isHit
    ? "drop-shadow(0 0 8px #ffaa00)"
    : "none";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <HealthBar value={hp} color={hpColor} />
      <div style={{
        fontSize: 80, lineHeight: 1,
        animation: anim,
        filter: filterVal,
        transition: isRedFlash ? "filter 0s" : "filter 0.3s",
      }}>
        {emoji}
      </div>
    </div>
  );
}

const ROUND = 9;

export default function GameClient() {
  const GAME_ID = 'math-practice-001';
  const childId = useSearchParams().get('childId');
  const [settings,       setSettings]       = useState<Settings>(() => getFS("mds8", DEFAULT_SETTINGS) as Settings);
  const safeSettings: Settings = {
    topics: settings?.topics ?? ['add20'],
    multiplyTables: settings?.multiplyTables ?? [],
    breakingTen: settings?.breakingTen ?? false,
  };
  const [memory,         setMemory]         = useState<Record<string, number>>(() => getFS("mdm8", {}) as Record<string, number>);
  const [showSettings,   setShowSettings]   = useState(false);
  const [questions,      setQuestions]      = useState<Question[]>([]);
  const [qIdx,           setQIdx]           = useState(0);
  const [qVisible,       setQVisible]       = useState(true);
  const [boardOpts,      setBoardOpts]      = useState<number[]>([]);
  const [cubeStates,     setCubeStates]     = useState<string[]>(Array(9).fill("idle"));

  const [answered,       setAnswered]       = useState(false);
  const [done,           setDone]           = useState(false);
  const [score,          setScore]          = useState(0);
  const [revealAnswer,   setRevealAnswer]   = useState<number | null>(null);
  const firstWrong = useRef(new Set<number>());
  const [heroHp,         setHeroHp]         = useState(1);
  const [villainHp,      setVillainHp]      = useState(1);
  const [heroRedFlash,   setHeroRedFlash]   = useState(false);
  const [villainHit,     setVillainHit]     = useState(false);
  const [villainFalling, setVillainFalling] = useState(false);
  const [proj,           setProj]           = useState<Projectile | null>(null);

  const arenaRef   = useRef<HTMLDivElement | null>(null);
  const heroRef    = useRef<HTMLDivElement | null>(null);
  const villainRef = useRef<HTMLDivElement | null>(null);

  const timers   = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioCtx = useRef<AudioContext | null>(null);
  const getAudio = () => { if (!audioCtx.current) audioCtx.current = createAudioCtx(); return audioCtx.current; };
  const memRef   = useRef(memory);   memRef.current   = memory;
  const qRef     = useRef(questions); qRef.current     = questions;
  const cl       = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const later    = (fn: () => void, ms: number) => { const t = setTimeout(fn, ms); timers.current.push(t); };

  const fireProjectile = useCallback((fromSide: string) => {
    if (!arenaRef.current || !heroRef.current || !villainRef.current) return;
    const arena    = arenaRef.current.getBoundingClientRect();
    const heroR    = heroRef.current.getBoundingClientRect();
    const villainR = villainRef.current.getBoundingClientRect();
    const heroCX    = heroR.left    + heroR.width / 2   - arena.left;
    const heroCY    = heroR.top     + heroR.height / 2  - arena.top;
    const villainCX = villainR.left + villainR.width / 2 - arena.left;
    const villainCY = villainR.top  + villainR.height / 2 - arena.top;
    const isHeroFiring = fromSide === "hero";
    setProj({
      id: Date.now(),
      type: isHeroFiring ? "light" : "fire",
      startX: isHeroFiring ? heroCX    : villainCX,
      startY: isHeroFiring ? heroCY    : villainCY,
      endX:   isHeroFiring ? villainCX : heroCX,
      endY:   isHeroFiring ? villainCY : heroCY,
    });
    later(() => setProj(null), 1150);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startGame = useCallback((s: Settings, mem: Record<string, number>) => {
    cl();
    const qs = buildQuestions(s, mem);
    if (!qs.length) { setQuestions([]); return; }
    const opts = qs.map(q => q.a).sort((a, b) => a - b);
    setQuestions(qs); setQIdx(0); setBoardOpts(opts);
    setCubeStates(Array(9).fill("idle"));
    setAnswered(false); setDone(false); setScore(0);
    setQVisible(true); setRevealAnswer(null);
    firstWrong.current = new Set();
    setHeroHp(1); setVillainHp(1);
    setHeroRedFlash(false); setVillainHit(false); setVillainFalling(false);
    setProj(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const safe = {
      topics: settings?.topics ?? ['add20'],
      multiplyTables: settings?.multiplyTables ?? [],
      breakingTen: settings?.breakingTen ?? false,
    };
    if (!childId) { startGame(safe, memory); return cl; }
    fetch(`/api/targulon/settings?childId=${childId}`)
      .then(r => r.json())
      .then((s: Settings) => {
        const safeS = {
          topics: s?.topics ?? ['add20'],
          multiplyTables: s?.multiplyTables ?? [],
          breakingTen: s?.breakingTen ?? false,
        };
        setSettings(safeS);
        setFS("mds8", safeS);
        startGame(safeS, memRef.current);
      })
      .catch(() => startGame(safe, memory));
    return cl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const script = document.createElement('script')
    script.src = '/sdk/mathplatform-sdk-v1.js'
    script.onload = () => {
      window.MathPlatformSDK?.emit('GAME_STARTED', { gameId: GAME_ID })
    }
    document.head.appendChild(script)
  }, [])

  const handleAnswer = useCallback((val: number, ci: number) => {
    if (answered || done) return;
    const cur = qRef.current[qIdx]; if (!cur) return;
    const ok = val === cur.a;
    window.MathPlatformSDK?.emit('ANSWER', {
      correct: ok,
      questionId: `q-${qIdx}`,
      questionType: cur.key,
      correctAnswer: String(cur.a),
      childAnswer: String(val),
      attemptNumber: 1,
    })
    setAnswered(true);

    if (ok) {
      playCorrect(getAudio());
      fireProjectile("hero");
      later(() => {
        const newHp = Math.max(0, parseFloat((villainHp - 1 / 9).toFixed(4)));
        if (newHp <= 0.001) {
          setVillainHp(0);
          later(() => setVillainFalling(true), 200);
        } else {
          setVillainHit(true);
          setVillainHp(newHp);
          later(() => setVillainHit(false), 500);
        }
      }, 900);
      const newMem = { ...memRef.current, [cur.key]: (memRef.current[cur.key] || 0) + 1 };
      setMemory(newMem); setFS("mdm8", newMem);
      const wrongFirst = firstWrong.current.has(qIdx);
      setScore(s => wrongFirst ? s : s + 1);
      setRevealAnswer(val);
      setCubeStates(prev => { const n = [...prev]; n[ci] = "falling"; return n; });
      later(() => {
        setCubeStates(prev => { const n = [...prev]; n[ci] = "gone"; return n; });
        const next = qIdx + 1;
        if (next >= ROUND) {
          setDone(true);
          const stars = score / ROUND >= 0.9 ? 3 : score / ROUND >= 0.6 ? 2 : 1
          window.MathPlatformSDK?.emit('GAME_OVER', { score, maxScore: ROUND, stars, correctAnswers: score, totalQuestions: ROUND })
          later(() => playWin(getAudio()), 100);
          return;
        }
        later(() => {
          setQVisible(false);
          later(() => { setQIdx(next); setRevealAnswer(null); setAnswered(false); setQVisible(true); }, 200);
        }, 300);
      }, 680);
    } else {
      firstWrong.current.add(qIdx);
      playWrong(getAudio());
      fireProjectile("villain");
      later(() => {
        setHeroRedFlash(true);
        setHeroHp(prev => Math.max(0, parseFloat((prev - 1 / 20).toFixed(4))));
        later(() => setHeroRedFlash(false), 500);
      }, 900);
      setCubeStates(prev => { const n = [...prev]; n[ci] = "wrong"; return n; });
      later(() => { setCubeStates(prev => { const n = [...prev]; n[ci] = "idle"; return n; }); setAnswered(false); }, 450);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, done, qIdx, fireProjectile, villainHp]);

  const handleSave = (s: Settings) => {
    setSettings(s);
    setFS("mds8", s);
    if (childId) {
      fetch('/api/targulon/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, settings: s }),
      });
    }
    startGame(s, memRef.current);
  };

  const boardH = CH * 3 + CD;
  const boardW = SVG_W * 3 - CD * 2;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes cubefall {
          0%   { transform:translateY(0) scale(1); opacity:1; }
          12%  { transform:translateY(-10px) scale(1.06); opacity:1; }
          100% { transform:translateY(400px) scale(0.55) rotate(14deg); opacity:0; }
        }
        @keyframes shakewrong {
          0%,100% { transform:translateX(0); }
          20%     { transform:translateX(-10px); }
          40%     { transform:translateX(10px); }
          60%     { transform:translateX(-6px); }
          80%     { transform:translateX(5px); }
        }
        @keyframes clouddrift {
          0%   { transform:translateX(0); }
          100% { transform:translateX(40px); }
        }
        @keyframes villainShake {
          0%,100% { transform:translateX(0); filter:brightness(1); }
          15%  { transform:translateX(-8px); filter:brightness(2) hue-rotate(30deg); }
          30%  { transform:translateX(8px);  filter:brightness(0.5); }
          45%  { transform:translateX(-6px); filter:brightness(2); }
          60%  { transform:translateX(6px);  filter:brightness(1); }
          75%  { transform:translateX(-4px); }
        }
        @keyframes villainFall {
          0%   { transform:translateY(0)    rotate(0deg)   scale(1);    opacity:1; }
          15%  { transform:translateY(20px) rotate(-15deg) scale(1.05); opacity:1; }
          60%  { transform:translateY(200px) rotate(-80deg) scale(0.8);  opacity:0.7; }
          100% { transform:translateY(600px) rotate(-200deg) scale(0.3); opacity:0; }
        }
        @keyframes charFloat {
          0%,100% { transform:translateY(0); }
          50%     { transform:translateY(-8px); }
        }
        @keyframes boardFloat {
          0%,100% { transform:translateY(0); }
          50%     { transform:translateY(-7px); }
        }
        @keyframes projMove {
          0%   { transform:translate(0,0) scale(1); opacity:1; }
          88%  { opacity:1; }
          100% { transform:translate(var(--dx),var(--dy)) scale(0.55); opacity:0; }
        }
        @keyframes projSpin {
          0%   { filter:hue-rotate(0deg)   brightness(1.3); }
          50%  { filter:hue-rotate(180deg) brightness(2); }
          100% { filter:hue-rotate(360deg) brightness(1.3); }
        }
        @keyframes flameRot {
          0%,100% { transform:rotate(var(--base-rot,0deg)) scaleY(1); }
          50%     { transform:rotate(var(--base-rot,0deg)) scaleY(1.3); }
        }
        @keyframes starSpin {
          0%   { transform:rotate(0deg); }
          100% { transform:rotate(360deg); }
        }
        @keyframes pulseRing {
          0%,100% { opacity:0.35; r:18; }
          50%     { opacity:0.7;  r:21; }
        }
        * { box-sizing:border-box; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        backgroundImage: `url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "'Nunito',sans-serif",
        position: "relative", overflow: "hidden",
      }}>
        <GameBackButton />

        <div style={{ position: 'absolute', top: 180, left: 0, right: 0, bottom: 0, background: 'linear-gradient(180deg,#5dbe6a 0%,#3a9e4a 100%)', zIndex: 0, pointerEvents: 'none' }} />

        {[{ x: 10, y: 5 }, { x: 30, y: 8 }, { x: 60, y: 3 }, { x: 80, y: 9 }, { x: 92, y: 4 }, { x: 45, y: 12 }, { x: 70, y: 7 }].map((s, i) => (
          <div key={i} style={{ position: "absolute", left: s.x + "%", top: s.y + "%", width: 2, height: 2, borderRadius: "50%", background: "#fff", opacity: 0.6, pointerEvents: "none" }} />
        ))}

        {[{ left: "3%", top: "6%", w: 110, delay: "0s" }, { left: "52%", top: "12%", w: 80, delay: "3s" }, { left: "28%", top: "3%", w: 60, delay: "6s" }, { left: "75%", top: "7%", w: 70, delay: "9s" }].map((cl2, i) => (
          <div key={i} style={{ position: "absolute", left: cl2.left, top: cl2.top, animation: "clouddrift 20s ease-in-out " + cl2.delay + " infinite alternate", pointerEvents: "none" }}>
            <svg width={cl2.w} height={cl2.w * 0.5} viewBox="0 0 90 45" style={{ opacity: 0.9 }}>
              <ellipse cx="30" cy="30" rx="30" ry="18" fill="white" />
              <ellipse cx="55" cy="30" rx="28" ry="16" fill="white" />
              <ellipse cx="42" cy="20" rx="20" ry="16" fill="white" />
            </svg>
          </div>
        ))}

        <div style={{ position: "absolute", top: 14, left: 14, zIndex: 20 }}>
          <button onClick={() => setShowSettings(true)} style={{
            background: "rgba(255,255,255,0.25)", backdropFilter: "blur(4px)",
            border: "1.5px solid rgba(255,255,255,0.5)", color: "#fff",
            borderRadius: 10, padding: "6px 14px", cursor: "pointer",
            fontFamily: "'Nunito',sans-serif", fontSize: 16, fontWeight: 700,
          }}>&#9881;</button>
        </div>

        <div
          ref={arenaRef}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 960,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            overflow: "visible",
          }}
        >
          <div style={{
            position: "relative",
            width: "100%",
            height: 180,
            overflow: "visible",
          }}>
            <div style={{
              position: "absolute",
              bottom: 0,
              left: "calc(-50vw + 50%)",
              width: "100vw",
              height: 28,
              background: "linear-gradient(180deg, #6b3a1f 0%, #3d1e08 100%)",
              borderTop: "3px solid #a0622a",
              zIndex: 1,
            }} />

            <div ref={villainRef} style={{
              position: "absolute",
              left: 16,
              bottom: 28,
              zIndex: 5,
              display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <Character
                emoji="👹"
                side="left"
                hp={villainHp}
                hpColor="#ff4444"
                isHit={villainHit}
                isRedFlash={false}
                villainFalling={villainFalling}
              />
            </div>

            <div ref={heroRef} style={{
              position: "absolute",
              right: 16,
              bottom: 28,
              zIndex: 5,
              display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <Character
                emoji="🧙"
                side="right"
                hp={heroHp}
                hpColor="#44ddff"
                isHit={false}
                isRedFlash={heroRedFlash}
                villainFalling={false}
              />
            </div>
          </div>

          <div style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "28px 0 32px",
          }}>
            {done ? (
              <div style={{ textAlign: "center", color: TEXT_WHITE, direction: "rtl", padding: "20px 0", width: "100%", textShadow: "0 1px 4px #0008" }}>
                <div style={{ fontSize: 56, letterSpacing: 6, marginBottom: 24 }}>
                  {score / ROUND >= 0.9 ? "⭐⭐⭐" : score / ROUND >= 0.6 ? "⭐⭐🌑" : "⭐🌑🌑"}
                </div>
                <button onClick={() => startGame(safeSettings, memRef.current)} style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  border: "2.5px solid rgba(255,255,255,0.8)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto", boxShadow: "0 4px 16px #0006",
                }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 .49-3.89" />
                  </svg>
                </button>
              </div>
            ) : questions.length === 0 ? (
              <div style={{ color: TEXT_WHITE, opacity: 0.8, fontSize: 15 }}>אין שאלות — שנה הגדרות</div>
            ) : (
              <div style={{
                position: "relative",
                width: boardW + CD * 2,
                height: boardH,
                marginTop: 110,
                isolation: "isolate",
                animation: "boardFloat 4s ease-in-out infinite",
              }}>
                {/* Sign — centered above col 1 (middle column) of row 0 */}
                <div style={{
                  position: "absolute",
                  bottom: boardH + 4,
                  left: CD * 2 + (SVG_W - CD) + Math.floor(SVG_W / 2),
                  transform: "translateX(-50%)",
                  zIndex: 999,
                  pointerEvents: "none",
                }}>
                  <Sign question={questions[qIdx]} visible={qVisible} revealAnswer={revealAnswer} />
                </div>

                {[0, 1, 2].map(row => (
                  <div key={row} style={{
                    position: "absolute",
                    top: row * CH,
                    left: (2 - row) * CD,
                    width: boardW, height: SVG_H,
                    display: "flex", alignItems: "flex-start",
                  }}>
                    {[0, 1, 2].map(col => {
                      const i = row * 3 + col;
                      const st = cubeStates[i] || "idle";
                      return (
                        <div key={col} style={{
                          position: "relative", width: SVG_W,
                          marginLeft: col === 0 ? 0 : col === 1 ? 0 : -CD,
                          height: SVG_H,
                          zIndex: st === "gone" ? 0 : (col + 1),
                          overflow: "visible", flexShrink: 0,
                        }}>
                          <Cube
                            value={boardOpts[i]}
                            cubeIdx={i}
                            state={st}
                            onClick={() => handleAnswer(boardOpts[i], i)}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          <ProjectileLayer proj={proj} />
        </div>
      </div>

      {showSettings && <SettingsPanel settings={safeSettings} onSave={handleSave} onClose={() => setShowSettings(false)} />}
    </>
  );
}
