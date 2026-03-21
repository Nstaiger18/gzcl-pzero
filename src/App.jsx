import { useState, useEffect, useRef, useCallback } from "react";

// ─── Global CSS (iOS system fonts, no Google Fonts) ────────────────────────────
const GS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: #000;
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  ::-webkit-scrollbar { display: none; }
  input[type=number] { -moz-appearance: textfield; }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
  button { cursor: pointer; font-family: inherit; border: none; background: none; -webkit-tap-highlight-color: transparent; }
  input  { border: none; font-family: inherit; -webkit-tap-highlight-color: transparent; }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes sheetIn {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  .fade { animation: fadeSlideUp .22s cubic-bezier(.4,0,.2,1) both; }
  .f1   { animation-delay: .04s; }
  .f2   { animation-delay: .08s; }
  .f3   { animation-delay: .12s; }
  .f4   { animation-delay: .16s; }

  /* iOS-style press state */
  .ios-press { transition: opacity .1s; }
  .ios-press:active { opacity: .6; }
`;

// ─── iOS Dark Palette ──────────────────────────────────────────────────────────
// True iOS dark mode system colors
const IOS = {
  bg:           "#000000",
  bg2:          "#1C1C1E",   // secondary grouped background
  bg3:          "#2C2C2E",   // tertiary background / cell fill
  bg4:          "#3A3A3C",   // elevated fill
  label:        "#FFFFFF",
  label2:       "rgba(235,235,245,0.60)",
  label3:       "rgba(235,235,245,0.30)",
  label4:       "rgba(235,235,245,0.16)",
  sep:          "rgba(84,84,88,0.65)",
  sepStrong:    "rgba(84,84,88,0.90)",
  // System colours
  blue:         "#0A84FF",
  orange:       "#FF9F0A",
  green:        "#32D74B",
  red:          "#FF453A",
  purple:       "#BF5AF2",
  teal:         "#40C8E0",
  yellow:       "#FFD60A",
  pink:         "#FF375F",
};

// Single accent — iOS orange throughout
const ACC = IOS.orange;   // one accent for all tiers
const C1  = ACC;
const C2  = ACC;
const C3  = ACC;
const ERR = IOS.red;      // errors only
const OK  = ACC;

const DA  = { D1:ACC, D2:ACC, D3:ACC, D4:ACC };
const CAT = { Arms:ACC, Legs:ACC, Pull:ACC, Chest:ACC, Delts:ACC, Core:ACC };

// ─── Program data (unchanged) ─────────────────────────────────────────────────
const T1_STAGES = [
  { id:0, sets:4, reps:4, minAmrap:4, label:"4 × 4 + AMRAP" },
  { id:1, sets:4, reps:3, minAmrap:3, label:"4 × 3 + AMRAP" },
  { id:2, sets:4, reps:2, minAmrap:2, label:"4 × 2 + AMRAP" },
];
const T2_STAGES = [
  { id:0, sets:4, reps:12, label:"4 × 12" },
  { id:1, sets:4, reps:10, label:"4 × 10" },
  { id:2, sets:4, reps:8,  label:"4 × 8"  },
];
const T3_TARGETS = [60, 45, 30];
const REST = { T1_work:150, T1_amrap:270, T2:90, T3_round:60 };

const DAYS = [
  { id:"D1", label:"Day 1", theme:"Lower · Pull", isLower:true,
    t1:{ name:"Squat" }, t2:{ name:"Romanian Deadlift" },
    t3:[
      { name:"Leg Extension",       cat:"Legs" },
      { name:"Chest-Supported Row", cat:"Pull" },
      { name:"Decline Sit-Up",      cat:"Core", bw:true },
    ]},
  { id:"D2", label:"Day 2", theme:"Upper · Push", isLower:false,
    t1:{ name:"Bench Press" }, t2:{ name:"Incline Bench Press" },
    t3:[
      { name:"Overhead Tricep Ext", cat:"Arms" },
      { name:"Lateral Raise",       cat:"Delts" },
      { name:"Bicep Curl",          cat:"Arms" },
    ]},
  { id:"D3", label:"Day 3", theme:"Lower · Hinge", isLower:true,
    t1:{ name:"Deadlift" }, t2:{ name:"Barbell Row" },
    t3:[
      { name:"Leg Press",    cat:"Legs" },
      { name:"Lat Pulldown", cat:"Pull" },
      { name:"Leg Curl",     cat:"Legs" },
    ]},
  { id:"D4", label:"Day 4", theme:"Upper · Push/Pull", isLower:false,
    t1:{ name:"Overhead Press" }, t2:{ name:"Close Grip Bench" },
    t3:[
      { name:"Incline DB Press",   cat:"Chest" },
      { name:"Tricep Pushdown",    cat:"Arms" },
      { name:"Bicep Curl (Cable)", cat:"Arms" },
    ]},
];

// ─── Exercise alternatives library ───────────────────────────────────────────
// Key = default exercise name, value = array of alternatives (same movement pattern)
const ALTS = {
  // T1 primary lifts
  "Squat":           ["Front Squat","Box Squat","Safety Bar Squat","Goblet Squat","Hack Squat"],
  "Bench Press":     ["Close Grip Bench","DB Bench Press","Incline Bench Press","Floor Press","DB Floor Press"],
  "Deadlift":        ["Trap Bar Deadlift","Sumo Deadlift","Romanian Deadlift","Rack Pull","DB Deadlift"],
  "Overhead Press":  ["DB Overhead Press","Push Press","Seated OHP","Arnold Press","Z-Press"],
  // T2 volume lifts
  "Romanian Deadlift":    ["Stiff Leg Deadlift","Good Morning","Nordic Curl","Glute Ham Raise","Cable Pull-Through"],
  "Incline Bench Press":  ["DB Incline Press","Incline DB Fly","Cable Fly","Pec Deck","Dips"],
  "Barbell Row":          ["DB Row","Cable Row","T-Bar Row","Chest-Supported Row","Machine Row"],
  "Close Grip Bench":     ["Tricep Dips","DB Skull Crusher","Cable Pushdown","JM Press","Diamond Push-Up"],
  // T3 accessories
  "Leg Extension":        ["Leg Press","Sissy Squat","Spanish Squat","Step-Up","Lunge"],
  "Chest-Supported Row":  ["Cable Row","DB Row","Machine Row","Seal Row","Band Pull-Apart"],
  "Decline Sit-Up":       ["Cable Crunch","Hanging Knee Raise","Ab Wheel","Dragon Flag","Plank"],
  "Overhead Tricep Ext":  ["Tricep Pushdown","Skull Crusher","Dips","Cable Overhead Ext","DB Kickback"],
  "Lateral Raise":        ["Cable Lateral Raise","DB Lateral Raise","Machine Lateral Raise","Face Pull","Band Pull-Apart"],
  "Bicep Curl":           ["Hammer Curl","Incline DB Curl","Cable Curl","Preacher Curl","Concentration Curl"],
  "Leg Press":            ["Hack Squat","Belt Squat","DB Squat","Bulgarian Split Squat","Step-Up"],
  "Lat Pulldown":         ["Pull-Up","Assisted Pull-Up","Cable Row","DB Row","Machine Row"],
  "Leg Curl":             ["Romanian Deadlift","Nordic Curl","Glute Ham Raise","Cable Pull-Through","DB Leg Curl"],
  "Incline DB Press":     ["Cable Fly","Pec Deck","DB Fly","Incline Bench Press","Push-Up"],
  "Tricep Pushdown":      ["Overhead Tricep Ext","Skull Crusher","Dips","Close Grip Bench","Diamond Push-Up"],
  "Bicep Curl (Cable)":   ["DB Curl","Hammer Curl","Preacher Curl","Incline DB Curl","Concentration Curl"],
};
const DEF_T1TM = { Squat:225,"Bench Press":155,Deadlift:275,"Overhead Press":95 };
const DEF_T2TM = { "Romanian Deadlift":135,"Incline Bench Press":95,"Barbell Row":115,"Close Grip Bench":95 };
const DEF_T3W  = {
  "Leg Extension":60,"Chest-Supported Row":50,"Decline Sit-Up":0,
  "Overhead Tricep Ext":40,"Lateral Raise":20,"Bicep Curl":30,
  "Leg Press":135,"Lat Pulldown":70,"Leg Curl":55,
  "Incline DB Press":40,"Tricep Pushdown":40,"Bicep Curl (Cable)":30,
};

const r5 = (w,s=5) => Math.round(w/s)*s;

function initT1() {
  const o={};
  DAYS.forEach(d=>{ const tm=DEF_T1TM[d.t1.name]||135; o[d.t1.name]={ weight:r5(tm*.8,d.isLower?10:5),stage:0,lastAmrap:null,tm,stageWeights:[null,null,null] }; });
  return o;
}
function initT2() {
  const o={};
  DAYS.forEach(d=>{ const tm=DEF_T2TM[d.t2.name]||95; o[d.t2.name]={ weight:r5(tm*.8),stage:0,tm,stageWeights:[null,null,null] }; });
  return o;
}
function initT3() {
  const o={};
  DAYS.forEach(d=>d.t3.forEach(t=>{ o[t.name]={ weight:DEF_T3W[t.name]||40,stage:0,lastSets:null,stageWeights:[null,null,null] }; }));
  return o;
}

const emptyRounds = (nEx) => [Array(nEx).fill("")];

// ─── Rest timer hook (unchanged) ──────────────────────────────────────────────
function useTimer() {
  const [active,setActive]=useState(false);
  const [total,setTotal]=useState(0);
  const [elapsed,setElapsed]=useState(0);
  const iv=useRef(null);
  const start=useCallback(s=>{ clearInterval(iv.current); setTotal(s); setElapsed(0); setActive(true);
    iv.current=setInterval(()=>setElapsed(e=>{ if(e+1>=s){clearInterval(iv.current);setActive(false);return 0;} return e+1; }),1000); },[]);
  const cancel=useCallback(()=>{ clearInterval(iv.current); setActive(false); setElapsed(0); },[]);
  useEffect(()=>()=>clearInterval(iv.current),[]);
  return { active, rem:total-elapsed, pct:total>0?elapsed/total:0, start, cancel };
}

// ─── iOS UI Primitives ────────────────────────────────────────────────────────

// Grouped section with header label + inset rounded card
function Section({ label, children, style={} }) {
  return (
    <div style={{ marginBottom:28, ...style }}>
      {label && (
        <div style={{ fontSize:13, fontWeight:400, color:IOS.label3,
          letterSpacing:.3, textTransform:"uppercase", marginBottom:6,
          paddingLeft:20 }}>
          {label}
        </div>
      )}
      <div style={{ background:IOS.bg2, borderRadius:12, overflow:"hidden",
        marginLeft:0, marginRight:0 }}>
        {children}
      </div>
    </div>
  );
}

// Row inside a Section — iOS list cell style
function Row({ children, sep=true, style={} }) {
  return (
    <div style={{ position:"relative", ...style }}>
      <div style={{ padding:"12px 20px" }}>{children}</div>
      {sep && <div style={{ position:"absolute", bottom:0, left:20, right:0,
        height:"0.5px", background:IOS.sep }}/>}
    </div>
  );
}

// iOS system badge / colored pill label
function Badge({ color, children, style={} }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center",
      background:color, borderRadius:6, fontSize:12, fontWeight:700,
      color:"#000", padding:"2px 8px", letterSpacing:.2, ...style }}>
      {children}
    </span>
  );
}

// Tier badge (T1/T2/T3)
function TierBadge({ tier }) {
  const color = tier==="T1"?C1:tier==="T2"?C2:C3;
  return <Badge color={color}>{tier}</Badge>;
}

// iOS segmented-control style stage indicator
function StageSegment({ stage, color }) {
  return (
    <div style={{ display:"flex", gap:4, margin:"10px 0 14px" }}>
      {[0,1,2].map(i=>(
        <div key={i} style={{ flex:1, height:4, borderRadius:99,
          background:i===stage?color:i<stage?`${color}40`:IOS.bg4,
          transition:"all .25s" }}/>
      ))}
    </div>
  );
}

// Large weight display (SF Mono-ish via ui-monospace)
function WeightDisplay({ value, color=IOS.label }) {
  return (
    <div style={{ display:"flex", alignItems:"baseline", gap:6, margin:"4px 0 12px" }}>
      <span style={{ fontFamily:"ui-monospace, 'SF Mono', monospace",
        fontSize:60, fontWeight:600, color, letterSpacing:-2, lineHeight:1 }}>{value}</span>
      <span style={{ fontSize:17, color:IOS.label3, fontWeight:400 }}>lb</span>
    </div>
  );
}

// iOS-style stepper: − [value] +
function Stepper({ val, onChange, inc=5, color=IOS.label }) {
  const adj=d=>onChange(Math.max(0,r5(val+d,inc)));
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <button className="ios-press" onClick={()=>adj(-inc)} style={{
        width:32, height:32, borderRadius:16, background:IOS.bg3,
        color:color, fontSize:18, display:"flex", alignItems:"center", justifyContent:"center",
        flexShrink:0 }}>−</button>
      <input type="number" inputMode="decimal" value={val}
        onChange={e=>onChange(parseFloat(e.target.value)||0)}
        style={{ flex:1, textAlign:"center",
          fontFamily:"ui-monospace,'SF Mono',monospace",
          fontSize:18, fontWeight:600, color,
          background:IOS.bg3, borderRadius:8, padding:"7px 0",
          border:`1px solid ${IOS.sep}` }}/>
      <button className="ios-press" onClick={()=>adj(inc)} style={{
        width:32, height:32, borderRadius:16, background:IOS.bg3,
        color:color, fontSize:18, display:"flex", alignItems:"center", justifyContent:"center",
        flexShrink:0 }}>+</button>
    </div>
  );
}

// Set check buttons (iOS filled circle style)
function SetChecks({ total, id, sets, toggle, color, onDone }) {
  return (
    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
      {Array.from({length:total}).map((_,i)=>{
        const k=`${id}-${i}`, done=!!sets[k];
        return (
          <button key={i} className="ios-press" onClick={()=>{ toggle(k); if(!done&&onDone) onDone(); }}
            style={{ width:52, height:52, borderRadius:26,
              background:done?color:IOS.bg3, color:done?"#000":IOS.label3,
              fontSize:done?20:17, fontWeight:700,
              border:done?"none":`1.5px solid ${IOS.sep}`,
              boxShadow:done?`0 2px 12px ${color}50`:"none",
              transition:"all .18s cubic-bezier(.4,0,.2,1)",
              transform:done?"scale(1.05)":"scale(1)" }}>
            {done?"✓":i+1}
          </button>
        );
      })}
    </div>
  );
}

// iOS blue text button
function TextBtn({ children, onClick, color=ACC, style={} }) {
  return (
    <button className="ios-press" onClick={onClick} style={{
      color, fontSize:17, fontWeight:400, background:"transparent", ...style }}>
      {children}
    </button>
  );
}

// iOS filled pill primary button
function PrimaryBtn({ children, onClick, disabled, color=ACC, style={} }) {
  return (
    <button className="ios-press" onClick={disabled?undefined:onClick} style={{
      width:"100%", padding:"15px 0", borderRadius:14,
      background:disabled?IOS.bg3:color,
      color:disabled?IOS.label3:"#000",
      fontSize:17, fontWeight:600,
      border:`1px solid ${disabled?IOS.sep:"transparent"}`,
      cursor:disabled?"default":"pointer",
      transition:"all .18s", ...style }}>
      {children}
    </button>
  );
}

// Inline timer button
function TimerBtn({ secs, start }) {
  const m=Math.floor(secs/60), s=secs%60;
  return (
    <button className="ios-press" onClick={()=>start(secs)} style={{
      display:"inline-flex", alignItems:"center", gap:5,
      color:ACC, fontSize:15, fontWeight:500, background:"transparent" }}>
      <span>⏱</span> {m}:{String(s).padStart(2,"0")}
    </button>
  );
}

// Section header label text (the uppercase gray ones)
function SectionLabel({ children, accent }) {
  return (
    <div style={{ fontSize:13, fontWeight:400, color:accent||IOS.label3,
      letterSpacing:.3, textTransform:"uppercase",
      marginBottom:6, paddingLeft:20 }}>
      {children}
    </div>
  );
}

// ─── Rest timer — iOS bottom sheet style ─────────────────────────────────────
function RestSheet({ timer }) {
  const { active, rem, pct, cancel } = timer;
  if (!active) return null;
  const R=56, circ=2*Math.PI*R, m=Math.floor(rem/60), s=rem%60;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex",
      flexDirection:"column", justifyContent:"flex-end",
      background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}>
      <div style={{ background:IOS.bg2, borderRadius:"24px 24px 0 0",
        padding:"24px 24px max(28px,env(safe-area-inset-bottom))",
        animation:"sheetIn .32s cubic-bezier(.4,0,.2,1) both",
        display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
        {/* Drag handle */}
        <div style={{ width:36, height:5, borderRadius:99, background:IOS.bg4, marginBottom:4 }}/>
        <div style={{ fontSize:15, fontWeight:600, color:IOS.label2, letterSpacing:.5, textTransform:"uppercase" }}>Rest</div>
        <div style={{ position:"relative", width:140, height:140 }}>
          <svg width="140" height="140" style={{ transform:"rotate(-90deg)" }}>
            <circle cx="70" cy="70" r={R} fill="none" stroke={IOS.bg4} strokeWidth="6"/>
            <circle cx="70" cy="70" r={R} fill="none" stroke={ACC} strokeWidth="6"
              strokeDasharray={circ} strokeDashoffset={circ*pct}
              strokeLinecap="round" style={{ transition:"stroke-dashoffset 1s linear" }}/>
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
            justifyContent:"center", fontFamily:"ui-monospace,'SF Mono',monospace",
            fontSize:36, fontWeight:600, color:IOS.label, letterSpacing:-1 }}>
            {m}:{String(s).padStart(2,"0")}
          </div>
        </div>
        <button className="ios-press" onClick={cancel} style={{
          width:"100%", padding:"15px", borderRadius:14,
          background:IOS.bg3, color:IOS.label, fontSize:17, fontWeight:600,
          border:`1px solid ${IOS.sep}` }}>
          Skip Rest
        </button>
      </div>
    </div>
  );
}

// ─── Exercise Swap Sheet ──────────────────────────────────────────────────────
function SwapSheet({ slotKey, currentName, defaultName, onSwap, onClose }) {
  const alts = ALTS[defaultName] || [];
  const [custom, setCustom] = useState("");

  const doSwap = (name) => { onSwap(slotKey, name); onClose(); };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex",
      flexDirection:"column", justifyContent:"flex-end",
      background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:IOS.bg2, borderRadius:"24px 24px 0 0",
        paddingBottom:"max(20px,env(safe-area-inset-bottom))",
        animation:"sheetIn .3s cubic-bezier(.4,0,.2,1) both",
        maxHeight:"80vh", overflowY:"auto" }}>

        {/* Handle */}
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}>
          <div style={{width:36,height:5,borderRadius:99,background:IOS.bg4}}/>
        </div>

        {/* Header */}
        <div style={{padding:"8px 20px 16px",borderBottom:`0.5px solid ${IOS.sep}`}}>
          <div style={{fontSize:13,color:IOS.label3,textTransform:"uppercase",letterSpacing:.5,marginBottom:2}}>
            Swap Exercise
          </div>
          <div style={{fontSize:20,fontWeight:700,color:IOS.label}}>{defaultName}</div>
          {currentName!==defaultName&&(
            <div style={{fontSize:13,color:ACC,marginTop:4}}>Currently: {currentName}</div>
          )}
        </div>

        {/* Restore default */}
        {currentName!==defaultName&&(
          <button className="ios-press" onClick={()=>doSwap(defaultName)} style={{
            width:"100%",padding:"14px 20px",display:"flex",justifyContent:"space-between",
            alignItems:"center",background:"transparent",
            borderBottom:`0.5px solid ${IOS.sep}` }}>
            <span style={{fontSize:17,color:ACC,fontWeight:500}}>↩ Restore default ({defaultName})</span>
          </button>
        )}

        {/* Alternatives */}
        {alts.map((name,i)=>{
          const isCurrent = name===currentName;
          return (
            <button key={i} className="ios-press" onClick={()=>doSwap(name)} style={{
              width:"100%",padding:"14px 20px",display:"flex",justifyContent:"space-between",
              alignItems:"center",background:isCurrent?`${ACC}15`:"transparent",
              borderBottom:i<alts.length-1?`0.5px solid ${IOS.sep}`:"none" }}>
              <span style={{fontSize:17,color:isCurrent?ACC:IOS.label}}>{name}</span>
              {isCurrent&&<span style={{fontSize:15,color:ACC}}>✓</span>}
            </button>
          );
        })}

        {/* Custom exercise input */}
        <div style={{padding:"16px 20px",borderTop:`0.5px solid ${IOS.sep}`}}>
          <div style={{fontSize:13,color:IOS.label3,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>
            Custom exercise
          </div>
          <div style={{display:"flex",gap:10}}>
            <input value={custom} onChange={e=>setCustom(e.target.value)}
              placeholder="Type any exercise name…"
              style={{flex:1,background:IOS.bg3,borderRadius:10,padding:"10px 14px",
                fontSize:16,color:IOS.label,border:`1px solid ${IOS.sep}`}}/>
            <button className="ios-press" onClick={()=>{ if(custom.trim()) doSwap(custom.trim()); }}
              style={{background:ACC,color:"#000",borderRadius:10,padding:"10px 18px",
                fontSize:16,fontWeight:600}}>
              Use
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
const TAB_ICONS = {
  workout: (a) => (
    <svg width="25" height="25" viewBox="0 0 25 25" fill="none">
      <path d="M4 12.5h3.5M17.5 12.5H21M7.5 9v7M17.5 9v7M7.5 12.5h10" stroke={a?ACC:IOS.label3} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  history: (a) => (
    <svg width="25" height="25" viewBox="0 0 25 25" fill="none">
      <rect x="4" y="5" width="17" height="16" rx="3" stroke={a?ACC:IOS.label3} strokeWidth="1.8"/>
      <path d="M8 10h9M8 14h6" stroke={a?ACC:IOS.label3} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M8 4v3M17 4v3" stroke={a?ACC:IOS.label3} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  info: (a) => (
    <svg width="25" height="25" viewBox="0 0 25 25" fill="none">
      <circle cx="12.5" cy="12.5" r="8.5" stroke={a?ACC:IOS.label3} strokeWidth="1.8"/>
      <path d="M12.5 11v5M12.5 9.5v.5" stroke={a?ACC:IOS.label3} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  setup: (a) => (
    <svg width="25" height="25" viewBox="0 0 25 25" fill="none">
      <circle cx="12.5" cy="12.5" r="3" stroke={a?ACC:IOS.label3} strokeWidth="1.8"/>
      <path d="M12.5 4v2M12.5 19v2M4 12.5h2M19 12.5h2M6.3 6.3l1.4 1.4M17.3 17.3l1.4 1.4M6.3 18.7l1.4-1.4M17.3 7.7l1.4-1.4" stroke={a?ACC:IOS.label3} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
};

function TabBar({ screen, go }) {
  const tabs = [
    { id:"workout", label:"Workout" },
    { id:"history", label:"Log" },
    { id:"info",    label:"Guide" },
    { id:"setup",   label:"Setup" },
  ];
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:200,
      background:"rgba(28,28,30,0.92)", backdropFilter:"blur(20px) saturate(180%)",
      borderTop:`0.5px solid ${IOS.sep}`,
      display:"flex", justifyContent:"space-around",
      padding:"8px 0 max(16px,env(safe-area-inset-bottom))" }}>
      {tabs.map(tab=>{
        const a = screen===tab.id;
        return (
          <button key={tab.id} onClick={()=>go(tab.id)} style={{
            display:"flex", flexDirection:"column", alignItems:"center", gap:3,
            background:"transparent", padding:"0 12px",
            color:a?ACC:IOS.label3, fontSize:10, fontWeight:a?600:400,
            transition:"color .15s" }}>
            {TAB_ICONS[tab.id](a)}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Giant Set Logger ─────────────────────────────────────────────────────────
function GiantSetLogger({ exercises, t3states, onWeightChange, onSwap, rounds, onRoundsChange, timerStart }) {
  const nEx=exercises.length, maxRounds=4;
  const totals=exercises.map((_,ei)=>rounds.reduce((s,r)=>s+(parseInt(r[ei])||0),0));

  const doneBeforeRound=(ei,ri)=>{
    let c=0; for(let r=0;r<ri;r++) c+=parseInt(rounds[r][ei])||0;
    return c>=T3_TARGETS[t3states[ei]?.stage||0];
  };
  const updateRep=(ri,ei,val)=>onRoundsChange(rounds.map((r,i)=>i===ri?r.map((v,j)=>j===ei?val:v):r));
  const anyUnfinished=exercises.some((_,ei)=>totals[ei]<T3_TARGETS[t3states[ei]?.stage||0]);

  return (
    <div>
      {/* ── Exercise progress rows ── */}
      <Section label="Exercises">
        {exercises.map((ex,ei)=>{
          const cc=CAT[ex.cat]||C3, st=t3states[ei]||{weight:40,stage:0};
          const tgt=T3_TARGETS[st.stage], tot=totals[ei], done=tot>=tgt;
          const isLast=ei===exercises.length-1;
          return (
            <Row key={ei} sep={!isLast} style={{ background:done?`${C3}0F`:undefined }}>
              {/* Row 1: name + counter */}
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <div style={{ width:8, height:8, borderRadius:4, background:cc, flexShrink:0 }}/>
                <span style={{ fontSize:17, fontWeight:600, color:done?C3:IOS.label, flex:1, minWidth:0 }}>
                  {ex.name}
                </span>
                {ex.isSwapped&&(
                  <span style={{fontSize:11,color:ACC,fontWeight:600,background:`${ACC}20`,
                    borderRadius:6,padding:"2px 6px",flexShrink:0}}>swapped</span>
                )}
                <span style={{ fontFamily:"ui-monospace,'SF Mono',monospace",
                  fontSize:14, fontWeight:600, color:done?C3:IOS.label3, flexShrink:0 }}>
                  {tot}/{tgt}
                </span>
              </div>
              {/* Row 2: stage info + swap + stepper */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:13, color:IOS.label3, flex:1, minWidth:0 }}>
                  Stage {st.stage+1} · {tgt} reps{ex.bw?" · BW":""}
                </span>
                <button className="ios-press" onClick={()=>onSwap&&onSwap(ei)}
                  style={{fontSize:12,color:ACC,fontWeight:600,background:`${ACC}18`,
                    borderRadius:6,padding:"3px 10px",flexShrink:0}}>
                  Swap
                </button>
                {!ex.bw && (
                  <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
                    <button className="ios-press"
                      onClick={()=>onWeightChange(ex.name,Math.max(0,r5(st.weight-5)))}
                      style={{ width:30,height:30,borderRadius:15,background:IOS.bg3,
                        color:IOS.label,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center" }}>−</button>
                    <span style={{ fontFamily:"ui-monospace,'SF Mono',monospace",
                      fontSize:15,fontWeight:600,color:IOS.label,minWidth:34,textAlign:"center" }}>{st.weight}</span>
                    <button className="ios-press"
                      onClick={()=>onWeightChange(ex.name,r5(st.weight+5))}
                      style={{ width:30,height:30,borderRadius:15,background:IOS.bg3,
                        color:IOS.label,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
                    <span style={{ fontSize:12,color:IOS.label3 }}>lb</span>
                  </div>
                )}
              </div>
              {/* Progress bar */}
              <div style={{ height:3, background:IOS.bg4, borderRadius:99, marginTop:8, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.min(tot/tgt,1)*100}%`,
                  background:done?C3:ACC, borderRadius:99, transition:"width .2s" }}/>
              </div>
            </Row>
          );
        })}
      </Section>

      {/* ── Rounds ── */}
      {rounds.map((round,ri)=>(
        <Section key={ri} label={`Round ${ri+1}`}>
          {exercises.map((ex,ei)=>{
            const val=round[ei], n=parseInt(val)||0;
            const finished=doneBeforeRound(ei,ri);
            const isLast=ei===exercises.length-1;
            return (
              <Row key={ei} sep={!isLast}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ flex:1, fontSize:17,
                    color:finished?IOS.label3:IOS.label,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {ex.name}
                  </span>
                  {finished ? (
                    <div style={{ width:72, height:44, display:"flex", alignItems:"center",
                      justifyContent:"center", borderRadius:10,
                      background:`${C3}18`, border:`1px solid ${C3}40` }}>
                      <span style={{ color:C3, fontSize:18, fontWeight:600 }}>✓</span>
                    </div>
                  ) : (
                    <input type="number" inputMode="numeric" min="0" placeholder="—" value={val}
                      onChange={e=>updateRep(ri,ei,e.target.value)}
                      style={{ width:72, textAlign:"center",
                        fontFamily:"ui-monospace,'SF Mono',monospace",
                        fontSize:22, fontWeight:600,
                        color:n>0?IOS.label:IOS.label3,
                        background:n>0?IOS.bg3:IOS.bg4,
                        border:`1px solid ${n>0?IOS.sepStrong:IOS.sep}`,
                        borderRadius:10, padding:"9px 0",
                        transition:"all .15s", flexShrink:0 }}/>
                  )}
                  <span style={{ fontSize:14, color:IOS.label3, width:14, flexShrink:0 }}>r</span>
                </div>
              </Row>
            );
          })}
        </Section>
      ))}

      {/* ── Controls ── */}
      <div style={{ display:"flex", gap:12, marginBottom:8 }}>
        {anyUnfinished && rounds.length<maxRounds && (
          <button className="ios-press" onClick={()=>onRoundsChange([...rounds,Array(nEx).fill("")])}
            style={{ flex:1,padding:"13px",borderRadius:12,
              background:IOS.bg2, border:`1px solid ${IOS.sep}`,
              color:ACC, fontSize:16, fontWeight:600 }}>
            + Add Round
          </button>
        )}
        <button className="ios-press" onClick={()=>timerStart(REST.T3_round)}
          style={{ flex:1,padding:"13px",borderRadius:12,
            background:IOS.bg2, border:`1px solid ${IOS.sep}`,
            color:ACC, fontSize:16, fontWeight:500 }}>
          ⏱ Rest {Math.floor(REST.T3_round/60)}:00
        </button>
      </div>

      {/* ── Feedback ── */}
      {exercises.map((ex,ei)=>{
        const stage=t3states[ei]?.stage||0, tgt=T3_TARGETS[stage];
        const tot=totals[ei], used=rounds.filter(r=>parseInt(r[ei])>0).length;
        if(tot<tgt) return null;
        let msg, ok;
        if(used<=2){ msg=stage<2?`${ex.name} → advance to Stage ${stage+2}`:`${ex.name} → +10 lb, restart Stage 1`; ok=true; }
        else if(used>=5){ msg=`${ex.name}: 5+ rounds — reduce weight or use myo-reps`; ok=false; }
        else{ msg=`${ex.name}: ${tgt} reps completed in ${used} rounds`; ok=true; }
        return (
          <div key={ei} style={{ display:"flex",alignItems:"flex-start",gap:8,
            padding:"10px 12px",background:ok?`${C3}12`:`${ERR}12`,
            borderRadius:10, marginBottom:8,
            border:`1px solid ${ok?C3+"40":ERR+"40"}` }}>
            <span style={{ fontSize:16 }}>{ok?"✓":"⚠"}</span>
            <span style={{ fontSize:15, color:ok?C3:ERR }}>{msg}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [ready,      setReady]      = useState(false);
  const [screen,     setScreen]     = useState("workout");
  const [t1s,        setT1s]        = useState(initT1);
  const [t2s,        setT2s]        = useState(initT2);
  const [t3s,        setT3s]        = useState(initT3);
  const [dayIdx,     setDayIdx]     = useState(0);
  const [viewDay,    setViewDay]    = useState(0);
  const [sets,       setSets]       = useState({});
  const [amrap,      setAmrap]      = useState("");
  const [gsRounds,   setGsRounds]   = useState(emptyRounds(3));
  const [t2Advanced, setT2Advanced] = useState(false);
  const [done,       setDone]       = useState(false);
  const [hist,       setHist]       = useState([]);
  const [firstVisit, setFirstVisit] = useState(true);
  const [swaps,      setSwaps]      = useState({});   // { "D1.t1":"Front Squat", "D1.t3.0":"Hack Squat" }
  const [swapSheet,  setSwapSheet]  = useState(null); // { slotKey, currentName, defaultName }
  const timer = useTimer();

  const sv=useCallback((k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},[]);
  const ld=useCallback((k)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):null;}catch(e){return null;}},[]);

  useEffect(()=>{
    (async()=>{
      const [sc,t1,t2,t3,di,hi,sw]=await Promise.all(["screen","t1s","t2s","t3s","dayIdx","hist","swaps"].map(ld));
      if(sc){setScreen(sc);setFirstVisit(false);}
      if(t1)setT1s(t1); if(t2)setT2s(t2); if(t3)setT3s(t3);
      const d=di!=null?di:0; if(di!=null)setDayIdx(d); setViewDay(d);
      if(hi)setHist(hi); if(sw)setSwaps(sw); setReady(true);
    })();
  },[ld]);

  // Resolve active exercise name for a slot — must be defined before day/t1lift/t2lift
  const slotName = (dayId, tier, idx=null) => {
    const key = idx===null ? `${dayId}.${tier}` : `${dayId}.${tier}.${idx}`;
    return swaps[key] || (
      tier==="t1" ? DAYS.find(d=>d.id===dayId).t1.name :
      tier==="t2" ? DAYS.find(d=>d.id===dayId).t2.name :
      DAYS.find(d=>d.id===dayId).t3[idx].name
    );
  };

  const day=DAYS[viewDay], isCurrentDay=viewDay===dayIdx, dacc=DA[day.id];
  const t1lift=t1s[slotName(day.id,"t1")]||{weight:135,stage:0,lastAmrap:null,tm:150};
  const t2lift=t2s[slotName(day.id,"t2")]||{weight:95,stage:0,tm:110};
  const t1cfg=T1_STAGES[Math.min(t1lift.stage||0, T1_STAGES.length-1)];
  const t2cfg=T2_STAGES[Math.min(t2lift.stage||0, T2_STAGES.length-1)];
  const inc1=day.isLower?10:5, amrapN=parseInt(amrap)||0;
  const amrapMin=t1cfg.minAmrap;
  const amrapBelowMin=amrap!==""&&amrapN<amrapMin;
  const amrapStall=amrap!==""&&(amrapBelowMin||(t1lift.lastAmrap!==null&&amrapN<=t1lift.lastAmrap));
  const amrapPass=amrap!==""&&!amrapStall;

  const handleSwap = (slotKey, newName) => {
    const ns = {...swaps, [slotKey]: newName};
    setSwaps(ns); sv("swaps", ns);
    if (slotKey.includes(".t3.")) { setGsRounds(emptyRounds(day.t3.length)); setSets({}); }
    if (slotKey.includes(".t1")) { setAmrap(""); setSets({}); }
    if (slotKey.includes(".t2")) { setSets({}); }
  };

  const openSwap = (dayId, tier, idx=null) => {
    const key = idx===null ? `${dayId}.${tier}` : `${dayId}.${tier}.${idx}`;
    const defaultName = idx===null
      ? DAYS.find(d=>d.id===dayId)[tier].name
      : DAYS.find(d=>d.id===dayId).t3[idx].name;
    setSwapSheet({ slotKey:key, currentName:slotName(dayId,tier,idx), defaultName });
  };

  // Active exercise names for current viewed day
  const t1Name = slotName(day.id, "t1");
  const t2Name = slotName(day.id, "t2");
  const toggle=k=>setSets(p=>({...p,[k]:!p[k]}));
  const gsTotal=ei=>gsRounds.reduce((s,r)=>s+(parseInt(r[ei])||0),0);
  const gsSets=ei=>gsRounds.filter(r=>parseInt(r[ei])>0).length;

  const complete=async()=>{
    const nt1={...t1s},nt2={...t2s},nt3={...t3s};
    const c1={...nt1[t1Name]||{weight:135,stage:0,lastAmrap:null,tm:150,stageWeights:[null,null,null]}};
    const c2={...nt2[t2Name]||{weight:95,stage:0,tm:110,stageWeights:[null,null,null]}};
    c1.stageWeights=[...(c1.stageWeights||[null,null,null])];
    c2.stageWeights=[...(c2.stageWeights||[null,null,null])];
    const nextT1W=(toStage,cur,inc)=>{const savedW=c1.stageWeights[toStage];return savedW!==null?r5(savedW+inc,inc):r5(cur+inc,inc);};
    if(amrapStall){
      c1.stageWeights[c1.stage]=c1.weight;
      const ns=c1.stage<2?c1.stage+1:0;
      c1.weight=nextT1W(ns,c1.weight,inc1); c1.stage=ns; c1.lastAmrap=null;
    } else { c1.weight+=inc1; c1.lastAmrap=amrapN; }
    nt1[t1Name]=c1;
    if(!t2Advanced){c2.weight+=5;} nt2[t2Name]=c2;
    day.t3.forEach((t,ei)=>{
      const activeName=slotName(day.id,"t3",ei);
      const ex={...nt3[activeName]||{weight:40,stage:0,lastSets:null,stageWeights:[null,null,null]}};
      ex.stageWeights=[...(ex.stageWeights||[null,null,null])];
      const used=gsSets(ei),tot=gsTotal(ei),tgt=T3_TARGETS[ex.stage];
      if(tot>=tgt){
        ex.lastSets=used;
        if(used<=2){
          ex.stageWeights[ex.stage]=ex.weight;
          if(ex.stage<2){const savedW=ex.stageWeights[ex.stage+1];ex.weight=savedW!==null?r5(savedW+5):r5(ex.weight+5);ex.stage+=1;}
          else{const savedW=ex.stageWeights[0];ex.weight=savedW!==null?r5(savedW+10):r5(ex.weight+10);ex.stage=0;}
        }
      }
      nt3[activeName]=ex;
    });
    const entry={date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),
      day:day.id,dayName:t1Name,t1w:t1lift.weight,t1stage:t1lift.stage,
      amrap:amrapN,lastAmrap:t1lift.lastAmrap,stalled:amrapStall,t2w:t2lift.weight,t2stage:t2lift.stage};
    const nh=[entry,...hist.slice(0,49)],nd=(dayIdx+1)%4;
    setT1s(nt1);setT2s(nt2);setT3s(nt3);setHist(nh);
    setDayIdx(nd);setViewDay(nd);setSets({});setAmrap("");
    setGsRounds(emptyRounds(DAYS[nd].t3.length));
    setT2Advanced(false);setDone(true);setFirstVisit(false);
    sv("t1s",nt1);sv("t2s",nt2);sv("t3s",nt3);
    sv("hist",nh);sv("dayIdx",nd);sv("screen","workout");
  };

  const advanceT2=async()=>{
    const k=t2Name, c={...t2s[k]||{weight:95,stage:0,tm:110,stageWeights:[null,null,null]}};
    c.stageWeights=[...(c.stageWeights||[null,null,null])];
    c.stageWeights[c.stage]=c.weight;
    const ns=c.stage<2?c.stage+1:0;
    const savedW=c.stageWeights[ns];
    c.weight=savedW!==null?r5(savedW+5):r5(c.weight+5); c.stage=ns;
    const nt={...t2s,[k]:c};setT2s(nt);setT2Advanced(true);sv("t2s",nt);
  };

  const go=s=>{setScreen(s);if(s!=="workout")setDone(false);};
  const goWorkout=()=>{setViewDay(dayIdx);go("workout");};

  const page={minHeight:"100vh",background:IOS.bg,color:IOS.label,
    paddingTop:"env(safe-area-inset-top)",
    paddingBottom:"calc(90px + env(safe-area-inset-bottom))",
    paddingLeft:"env(safe-area-inset-left)",
    paddingRight:"env(safe-area-inset-right)"};
  const body={maxWidth:460,margin:"0 auto",padding:"0 12px 32px"};

  // ── Loading ────────────────────────────────────────────────────────────────
  if(!ready) return (
    <div style={{...page,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{GS}</style>
      <div style={{width:28,height:28,border:`2.5px solid ${IOS.bg3}`,borderTopColor:ACC,
        borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
    </div>
  );

  // ── SETUP ──────────────────────────────────────────────────────────────────
  if(screen==="setup"){
    const launch=async()=>{setScreen("workout");setViewDay(dayIdx);setDone(false);setFirstVisit(false);
      sv("screen","workout");sv("t1s",t1s);sv("t2s",t2s);sv("t3s",t3s);};
    return (
      <div style={page}><style>{GS}</style>
      <div style={{...body,paddingTop:24}}>
        <div className="fade" style={{marginBottom:8,paddingLeft:4}}>
          <div style={{fontSize:11,fontWeight:600,color:ACC,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>GZCL P-ZERO</div>
          <div style={{fontSize:34,fontWeight:700,color:IOS.label,letterSpacing:-.5,lineHeight:1.1}}>Setup</div>
          <div style={{fontSize:15,color:IOS.label2,marginTop:8,lineHeight:1.5}}>T1 TM = 90% of 1RM · T2 TM = 60–70% of T1 1RM · Starting weight = 80% of TM</div>
        </div>

        <Section label="T1 — Primary Lifts">
          {DAYS.map((d,i)=>{
            const k=d.t1.name,cur=t1s[k]||{tm:135};
            const isLast=i===DAYS.length-1;
            return (
              <Row key={k} sep={!isLast} style={{background:undefined}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:17,fontWeight:600,color:IOS.label}}>{k}</div>
                    <div style={{fontSize:13,color:IOS.label3,marginTop:1}}>{d.label} · {d.isLower?"+10 lb":"+5 lb"}/session</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:IOS.label3}}>Start weight</div>
                    <div style={{fontFamily:"ui-monospace,'SF Mono',monospace",fontSize:17,fontWeight:600,color:DA[d.id]}}>{r5((cur.tm||135)*.8,d.isLower?10:5)} lb</div>
                  </div>
                </div>
                <Stepper val={cur.tm||135} inc={d.isLower?10:5} color={DA[d.id]}
                  onChange={v=>setT1s(p=>({...p,[k]:{...p[k],tm:v,weight:r5(v*.8,d.isLower?10:5)}}))}/>
              </Row>
            );
          })}
        </Section>

        <Section label="T2 — Volume Lifts">
          {DAYS.map((d,i)=>{
            const k=d.t2.name,cur=t2s[k]||{tm:95};
            const isLast=i===DAYS.length-1;
            return (
              <Row key={k} sep={!isLast}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:17,fontWeight:600,color:IOS.label}}>{k}</div>
                    <div style={{fontSize:13,color:IOS.label3,marginTop:1}}>{d.label} · +5 lb/session</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:IOS.label3}}>Start weight</div>
                    <div style={{fontFamily:"ui-monospace,'SF Mono',monospace",fontSize:17,fontWeight:600,color:C2}}>{r5((cur.tm||95)*.8)} lb</div>
                  </div>
                </div>
                <Stepper val={cur.tm||95} inc={5} color={C2}
                  onChange={v=>setT2s(p=>({...p,[k]:{...p[k],tm:v,weight:r5(v*.8)}}))}/>
              </Row>
            );
          })}
        </Section>

        <PrimaryBtn onClick={launch} color={ACC} style={{marginTop:8}}>Save & Start →</PrimaryBtn>
      </div>
      <TabBar screen={screen} go={s=>{if(s==="workout")goWorkout();else go(s);}}/>
      </div>
    );
  }

  // ── Large-title header ─────────────────────────────────────────────────────
  const Hdr=({title,sub})=>(
    <div style={{maxWidth:460,margin:"0 auto",padding:"16px 20px 0"}}>
      <div className="fade" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:11,fontWeight:600,color:ACC,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>GZCL P-ZERO</div>
          <div style={{fontSize:34,fontWeight:700,color:IOS.label,letterSpacing:-.5,lineHeight:1.1}}>{title}</div>
          {sub&&<div style={{fontSize:15,color:IOS.label2,marginTop:4}}>{sub}</div>}
        </div>
        {/* Day navigation pills */}
        <div style={{display:"flex",gap:7,paddingTop:10}}>
          {DAYS.map((d,i)=>{
            const isView=i===viewDay,isCur=i===dayIdx,col=DA[d.id];
            return (
              <button key={d.id} className="ios-press" onClick={()=>setViewDay(i)} style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"transparent",padding:"2px 0"}}>
                <div style={{width:isView?26:10,height:10,borderRadius:99,
                  background:isView?col:isCur?`${col}60`:IOS.bg3,
                  boxShadow:isView?`0 0 8px ${col}80`:"none",transition:"all .22s"}}/>
                {isCur&&!isView&&<div style={{width:4,height:4,borderRadius:99,background:`${col}70`}}/>}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{height:"0.5px",background:IOS.sep,marginTop:14}}/>
    </div>
  );

  // ── HISTORY ───────────────────────────────────────────────────────────────
  if(screen==="history") return (
    <div style={page}><style>{GS}</style>
    <Hdr title="Workout Log" sub={`${hist.length} sessions`}/>
    <div style={body}>
      {hist.length===0&&(
        <div style={{textAlign:"center",paddingTop:60,color:IOS.label3,fontSize:17}}>
          No sessions yet
          <div style={{fontSize:15,color:IOS.label4,marginTop:8}}>Complete a workout to begin your log.</div>
        </div>
      )}
      {hist.length>0&&(
        <Section label="Recent Sessions" style={{marginTop:16}}>
          {hist.map((h,i)=>{
            const isLast=i===hist.length-1;
            return (
              <Row key={i} sep={!isLast}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <div style={{width:10,height:10,borderRadius:5,background:DA[h.day],flexShrink:0}}/>
                      <span style={{fontSize:17,fontWeight:600,color:IOS.label}}>{h.dayName}</span>
                      <span style={{fontSize:13,color:IOS.label3}}>{h.date}</span>
                    </div>
                    <div style={{fontSize:15,color:IOS.label2}}>
                      {T1_STAGES[h.t1stage]?.sets}×{T1_STAGES[h.t1stage]?.reps} @ {h.t1w} lb · AMRAP {h.amrap}
                      {h.lastAmrap!=null&&<span style={{color:IOS.label3}}> (prev {h.lastAmrap})</span>}
                    </div>
                    <div style={{fontSize:13,color:IOS.label3,marginTop:2}}>
                      T2 {T2_STAGES[h.t2stage]?.sets}×{T2_STAGES[h.t2stage]?.reps} @ {h.t2w} lb
                    </div>
                  </div>
                  <div style={{flexShrink:0,marginLeft:12,paddingTop:2}}>
                    <span style={{fontSize:13,fontWeight:600,color:h.stalled?ERR:OK}}>
                      {h.stalled?"↗ Stage up":"↑ Weight up"}
                    </span>
                  </div>
                </div>
              </Row>
            );
          })}
        </Section>
      )}
    </div>
    <TabBar screen={screen} go={s=>{if(s==="workout")goWorkout();else go(s);}}/>
    </div>
  );

  // ── INFO ──────────────────────────────────────────────────────────────────
  if(screen==="info") return (
    <div style={page}><style>{GS}</style>
    <Hdr title="Program Guide" sub="P-Zero by Cody Lefever"/>
    <div style={body}>
      <Section label="Time Per Workout" style={{marginTop:16}}>
        <Row sep={false}>
          <div style={{display:"flex",justifyContent:"space-around",padding:"6px 0"}}>
            {[["T1","~27 min",C1],["T2","~10 min",C2],["T3","~18 min",C3],["Total","~58 min",ACC]].map(([l,v,c])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontFamily:"ui-monospace,'SF Mono',monospace",fontSize:20,fontWeight:600,color:c}}>{v}</div>
                <div style={{fontSize:12,color:IOS.label3,marginTop:3}}>{l}</div>
              </div>
            ))}
          </div>
        </Row>
      </Section>
      {[
        {tier:"T1",color:C1,title:"T1 — Primary Strength",points:["TM = 90% of 1RM. Starting weight = 80% of TM.","Add weight every session: upper +5 lb, lower +10 lb.","Stages: 4×4 → 4×3 → 4×2, each with a last-set AMRAP.","Below minimum reps or no AMRAP improvement → advance stage.","After Stage 3 stalls → restart Stage 1 heavier."]},
        {tier:"T2",color:C2,title:"T2 — Volume Compound",points:["TM = 60–70% of T1 1RM or 90% of 10RM. Start at 80% of TM.","Add +5 lb every session when all reps are completed. No AMRAP.","Stages: 4×12 → 4×10 → 4×8.","Tap 'Advance Stage' when you can't complete all reps."]},
        {tier:"T3",color:C3,title:"T3 — Giant Set Accessories",points:["3 exercises performed back-to-back as a giant set.","Stage 1: 60 reps · Stage 2: 45 reps · Stage 3: 30 reps.","Complete target across up to 4 rounds.","Done in ≤2 rounds → advance stage. 5+ rounds → reduce weight.","Add weight when density improves before adding weight."]},
      ].map(({tier,color,title,points})=>(
        <Section key={tier} label={title}>
          {points.map((p,j)=>(
            <Row key={j} sep={j<points.length-1}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{width:7,height:7,borderRadius:99,background:color,flexShrink:0,marginTop:5}}/>
                <span style={{fontSize:15,color:IOS.label2,lineHeight:1.5}}>{p}</span>
              </div>
            </Row>
          ))}
        </Section>
      ))}
      <Section label="Rest Periods">
        {[["T1 Work Sets","2–3 min",C1],["T1 Heavy / AMRAP","4–5 min",C1],["T2","1–2 min",C2],["T3 Between Rounds","30–90 sec",C3]].map(([l,v,c],i,arr)=>(
          <Row key={l} sep={i<arr.length-1}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:17,color:IOS.label}}>{l}</span>
              <span style={{fontFamily:"ui-monospace,'SF Mono',monospace",fontSize:15,fontWeight:600,color:c}}>{v}</span>
            </div>
          </Row>
        ))}
      </Section>
    </div>
    <TabBar screen={screen} go={s=>{if(s==="workout")goWorkout();else go(s);}}/>
    </div>
  );

  // ── POST DONE ─────────────────────────────────────────────────────────────
  if(screen==="workout"&&done){
    const last=hist[0],nd=DAYS[dayIdx],ndT1Name=slotName(nd.id,"t1"),nt1=t1s[ndT1Name]||{weight:135,stage:0};
    return (
      <div style={page}><style>{GS}</style>
      <div style={{...body,paddingTop:48}}>
        <div className="fade" style={{marginBottom:32,textAlign:"center"}}>
          <div style={{fontSize:56,marginBottom:12}}>{last?.stalled?"📈":"✅"}</div>
          <div style={{fontSize:11,fontWeight:600,color:ACC,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>
            {last?.stalled?"Stage Advanced":"Session Logged"}
          </div>
          <div style={{fontSize:28,fontWeight:700,color:IOS.label,letterSpacing:-.3}}>{last?.dayName}</div>
          <div style={{fontFamily:"ui-monospace,'SF Mono',monospace",fontSize:17,color:IOS.label2,marginTop:8}}>
            {last?.t1w} lb · AMRAP {last?.amrap}
            {last?.lastAmrap!=null&&<span style={{color:IOS.label3}}> (prev {last.lastAmrap})</span>}
          </div>
          {last?.stalled&&<div style={{fontSize:15,color:ACC,marginTop:6}}>
            → Stage {Math.min((last.t1stage||0)+2,3)}{(last.t1stage||0)>=2?" · restart heavier":""}
          </div>}
        </div>
        <Section label="Next Session">
          <Row sep={false}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:12,height:12,borderRadius:6,background:DA[nd.id]}}/>
              <span style={{fontSize:20,fontWeight:700,color:IOS.label}}>{nd.label}</span>
              <span style={{fontSize:15,color:IOS.label3}}>{nd.theme}</span>
            </div>
            <div style={{fontSize:15,color:IOS.label2}}>
              T1: {ndT1Name} · <span style={{fontFamily:"ui-monospace,'SF Mono',monospace",color:IOS.label}}>{nt1.weight} lb</span> · {T1_STAGES[Math.min(nt1.stage||0,T1_STAGES.length-1)]?.label}
            </div>
          </Row>
        </Section>
        <PrimaryBtn onClick={()=>setDone(false)} color={ACC} style={{marginTop:8}}>View Next Session</PrimaryBtn>
      </div>
      <TabBar screen={screen} go={s=>{if(s==="workout")goWorkout();else go(s);}}/>
      </div>
    );
  }

  // ── MAIN WORKOUT ──────────────────────────────────────────────────────────
  const isPreview=!isCurrentDay;

  return (
    <div style={page}><style>{GS}</style>
    <Hdr title={day.label} sub={day.theme}/>
    <div style={body}>

      {/* First-visit hint */}
      {firstVisit&&isCurrentDay&&(
        <div className="fade" style={{marginTop:16,padding:"12px 16px",background:IOS.bg2,
          borderRadius:12,border:`1px solid ${IOS.sep}`}}>
          <span style={{fontSize:15,color:IOS.label2}}>
            First time? Tap <TextBtn onClick={()=>go("setup")} style={{fontSize:15,display:"inline"}}>Setup</TextBtn> to configure your Training Maxes.
          </span>
        </div>
      )}

      {/* Preview banner */}
      {isPreview&&(
        <div className="fade" style={{marginTop:16,padding:"12px 16px",
          background:`${dacc}18`,borderRadius:12,border:`1px solid ${dacc}40`,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:dacc,letterSpacing:.5,textTransform:"uppercase",marginBottom:2}}>Preview</div>
            <div style={{fontSize:15,color:IOS.label2}}>Viewing {day.label} — current is <strong style={{color:IOS.label}}>{DAYS[dayIdx].label}</strong></div>
          </div>
          <TextBtn onClick={()=>setViewDay(dayIdx)} color={ACC}>← Back</TextBtn>
        </div>
      )}

      {/* ── T1 ─────────────────────────────────────────────── */}
      <Section label="T1 — Primary Strength" style={{marginTop:20}}>
        <Row sep={false} style={{paddingBottom:0}}>
          {/* Row 1: badge + name */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:2}}>
            <TierBadge tier="T1"/>
            <span style={{fontSize:22,fontWeight:700,color:IOS.label,letterSpacing:-.3,flex:1,minWidth:0}}>
              {t1Name}
            </span>
            {t1Name!==day.t1.name&&<span style={{fontSize:11,color:ACC,fontWeight:600,background:`${ACC}20`,borderRadius:6,padding:"2px 7px",flexShrink:0}}>swapped</span>}
          </div>
          {/* Row 2: stage info + actions */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:14,color:IOS.label3}}>{t1cfg.label} · +{inc1} lb/session</span>
            {!isPreview&&(
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <button className="ios-press" onClick={()=>openSwap(day.id,"t1")}
                  style={{fontSize:13,color:ACC,fontWeight:600,background:`${ACC}18`,borderRadius:8,padding:"5px 12px"}}>
                  Swap
                </button>
                <TimerBtn secs={REST.T1_work} start={timer.start}/>
              </div>
            )}
          </div>
          <StageSegment stage={t1lift.stage} color={C1}/>
          <WeightDisplay value={t1lift.weight} color={C1}/>
          {!isPreview&&(
            <>
              <Stepper val={t1lift.weight} inc={inc1} color={C1}
                onChange={v=>setT1s(p=>({...p,[t1Name]:{...p[t1Name],weight:v}}))}/>

              {/* Work sets */}
              <div style={{marginTop:18,paddingTop:16,borderTop:`0.5px solid ${IOS.sep}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                  <span style={{fontSize:15,fontWeight:600,color:IOS.label2}}>{t1cfg.sets-1} Work Sets × {t1cfg.reps} Reps</span>
                  <TimerBtn secs={REST.T1_work} start={timer.start}/>
                </div>
                <SetChecks total={t1cfg.sets-1} id={`t1w-${day.id}`} sets={sets} toggle={toggle}
                  color={C1} onDone={()=>timer.start(REST.T1_work)}/>
              </div>

              {/* AMRAP */}
              <div style={{marginTop:16,paddingTop:16,borderTop:`0.5px solid ${IOS.sep}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:15,fontWeight:600,color:IOS.label2}}>Last Set — AMRAP</span>
                  <TimerBtn secs={REST.T1_amrap} start={timer.start}/>
                </div>
                <div style={{fontSize:14,color:IOS.label3,marginBottom:10}}>
                  Minimum {amrapMin} reps to stay in Stage {t1lift.stage+1}
                  {t1lift.lastAmrap!==null&&<span> · Previous: <strong style={{color:IOS.label,fontFamily:"ui-monospace,'SF Mono',monospace"}}>{t1lift.lastAmrap}</strong></span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <input type="number" inputMode="numeric" min="0" max="40" placeholder="0" value={amrap}
                    onChange={e=>setAmrap(e.target.value)}
                    style={{width:84,textAlign:"center",
                      fontFamily:"ui-monospace,'SF Mono',monospace",
                      fontSize:38,fontWeight:700,color:C1,
                      background:IOS.bg3,borderRadius:14,padding:"10px 0",
                      border:`1.5px solid ${C1}50`}}/>
                  <div style={{flex:1,fontSize:15,lineHeight:1.5}}>
                    {amrap!==""&&amrapPass&&<span style={{color:OK,fontWeight:500}}>
                      {amrapN} reps ✓ — +{inc1} lb next session
                    </span>}
                    {amrap!==""&&amrapStall&&amrapBelowMin&&<span style={{color:ERR,fontWeight:500}}>
                      Below minimum ({amrapN} &lt; {amrapMin}) — advancing to Stage {Math.min(t1lift.stage+2,3)}{t1lift.stage>=2?" (restart heavier)":""}
                    </span>}
                    {amrap!==""&&amrapStall&&!amrapBelowMin&&<span style={{color:ERR,fontWeight:500}}>
                      No improvement — advancing to Stage {Math.min(t1lift.stage+2,3)}{t1lift.stage>=2?" (restart heavier)":""}
                    </span>}
                    {amrap===""&&<span style={{color:IOS.label4}}>Enter your reps</span>}
                  </div>
                </div>
              </div>

              {/* TM adjust */}
              <div style={{marginTop:16,paddingTop:14,borderTop:`0.5px solid ${IOS.sep}`}}>
                <div style={{fontSize:14,color:IOS.label3,marginBottom:10}}>Adjust Training Max</div>
                <Stepper val={t1lift.tm||150} inc={inc1} color={IOS.label3}
                  onChange={v=>setT1s(p=>({...p,[t1Name]:{...p[t1Name],tm:v}}))}/>
              </div>
            </>
          )}
        </Row>
      </Section>

      {/* ── T2 ─────────────────────────────────────────────── */}
      <Section label="T2 — Volume Compound">
        <Row sep={false}>
          {/* Row 1: badge + name */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:2}}>
            <TierBadge tier="T2"/>
            <span style={{fontSize:22,fontWeight:700,color:IOS.label,letterSpacing:-.3,flex:1,minWidth:0}}>
              {t2Name}
            </span>
            {t2Name!==day.t2.name&&<span style={{fontSize:11,color:ACC,fontWeight:600,background:`${ACC}20`,borderRadius:6,padding:"2px 7px",flexShrink:0}}>swapped</span>}
          </div>
          {/* Row 2: stage info + actions */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:14,color:IOS.label3}}>{t2cfg.label} · No AMRAP · +5 lb/session</span>
            {!isPreview&&(
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <button className="ios-press" onClick={()=>openSwap(day.id,"t2")}
                  style={{fontSize:13,color:ACC,fontWeight:600,background:`${ACC}18`,borderRadius:8,padding:"5px 12px"}}>
                  Swap
                </button>
                <TimerBtn secs={REST.T2} start={timer.start}/>
              </div>
            )}
          </div>
          <StageSegment stage={t2lift.stage} color={C2}/>
          <WeightDisplay value={t2lift.weight} color={C2}/>
          {!isPreview&&(
            <>
              <Stepper val={t2lift.weight} inc={5} color={C2}
                onChange={v=>setT2s(p=>({...p,[t2Name]:{...p[t2Name],weight:v}}))}/>
              <div style={{marginTop:16,paddingTop:16,borderTop:`0.5px solid ${IOS.sep}`}}>
                <div style={{fontSize:15,fontWeight:600,color:IOS.label2,marginBottom:12}}>
                  {t2cfg.sets} Sets × {t2cfg.reps} Reps
                </div>
                <SetChecks total={t2cfg.sets} id={`t2-${day.id}`} sets={sets} toggle={toggle}
                  color={C2} onDone={()=>timer.start(REST.T2)}/>
              </div>
              <button className="ios-press" onClick={advanceT2} style={{
                width:"100%",marginTop:14,padding:"12px",borderRadius:12,
                background:IOS.bg3,border:`1px solid ${IOS.sep}`,
                color:IOS.label3,fontSize:15}}>
                Can't complete all reps → Advance Stage
              </button>
            </>
          )}
        </Row>
      </Section>

      {/* ── T3 Giant Set ─────────────────────────────────────── */}
      <SectionLabel accent={C3}>T3 — Giant Set Accessories</SectionLabel>
      {!isPreview ? (
        <GiantSetLogger
          exercises={day.t3.map((t,ei)=>({...t, name:slotName(day.id,"t3",ei), defaultName:t.name, isSwapped:slotName(day.id,"t3",ei)!==t.name}))}
          t3states={day.t3.map((t,ei)=>t3s[slotName(day.id,"t3",ei)]||{weight:40,stage:0,stageWeights:[null,null,null]})}
          onWeightChange={(name,val)=>setT3s(p=>({...p,[name]:{...p[name],weight:val}}))}
          onSwap={(ei)=>openSwap(day.id,"t3",ei)}
          rounds={gsRounds}
          onRoundsChange={r=>setGsRounds(r)}
          timerStart={timer.start}/>
      ) : (
        <Section>
          {day.t3.map((t,i)=>{
            const activeName=slotName(day.id,"t3",i);
            const ex=t3s[activeName]||{weight:40,stage:0};
            const cc=CAT[t.cat]||C3;
            const isLast=i===day.t3.length-1;
            return (
              <Row key={t.name} sep={!isLast}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:10,height:10,borderRadius:5,background:cc}}/>
                  <span style={{fontSize:17,color:IOS.label,flex:1}}>{activeName}</span>
                  <span style={{fontSize:14,color:IOS.label3}}>Stage {ex.stage+1} · {T3_TARGETS[ex.stage]}r</span>
                  {!t.bw&&<span style={{fontFamily:"ui-monospace,'SF Mono',monospace",fontSize:15,fontWeight:600,color:IOS.label}}>{ex.weight} lb</span>}
                </div>
              </Row>
            );
          })}
          <Row sep={false}>
            <div style={{fontSize:14,color:IOS.label3}}>Preview only — log on current day</div>
          </Row>
        </Section>
      )}

      {/* Log / Back button */}
      {!isPreview ? (
        <PrimaryBtn onClick={amrap!==""?complete:undefined} disabled={amrap===""} color={ACC} style={{marginTop:8}}>
          {amrap!==""?"Log Session ✓":"Enter T1 AMRAP reps to log"}
        </PrimaryBtn>
      ) : (
        <PrimaryBtn onClick={()=>setViewDay(dayIdx)} color={ACC} style={{marginTop:8}}>
          ← Go to Current Session
        </PrimaryBtn>
      )}

    </div>
    <TabBar screen={screen} go={s=>{if(s==="workout")goWorkout();else go(s);}}/>
    <RestSheet timer={timer}/>
    {swapSheet&&(
      <SwapSheet
        slotKey={swapSheet.slotKey}
        currentName={swapSheet.currentName}
        defaultName={swapSheet.defaultName}
        onSwap={handleSwap}
        onClose={()=>setSwapSheet(null)}/>
    )}
    </div>
  );
}
