import { useState, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// ─── i18n ────────────────────────────────────────────────────────────────────
const T = {
  ar: {
    dir:"rtl", currency:"ج.م",
    title:"Spending Tracker", subtitle:"تتبع مصاريفك وسيطر على ميزانيتك",
    ob_welcome:"أهلاً بك 👋", ob_sub:"عشان نضبطلك ميزانية منطقية، محتاجين نعرف دخلك الشهري",
    ob_income:"الدخل الشهري الصافي", ob_income_ph:"مثال: 15000",
    ob_savings:"نسبة التوفير", ob_savings_hint:"هنوفّر كذا % من دخلك كل شهر",
    ob_spendable:"المتاح للإنفاق", ob_start:"ابدأ التتبع →", ob_income_err:"من فضلك أدخل دخلاً صحيحاً",
    ob_reset:"إعادة ضبط الإعدادات", ob_preview:"توزيع الميزانية المقترح", ob_more:"+ ٥ فئات أخرى...",
    totalMonth:"إجمالي هذا الشهر", remaining:"الميزانية المتبقية",
    transactions:"عدد المعاملات", dailyAvg:"متوسط يومي",
    thisMonth:"هذا الشهر", from:"من",
    addExpense:"إضافة مصروف", description:"الوصف", amount:"المبلغ", addBtn:"+ إضافة",
    monthlyBudget:"الميزانية الشهرية", editBudget:"تعديل",
    editBudgetTitle:"تعديل الميزانية", editBudgetSub:"اضغط على أي رقم لتعديله — الإجمالي لا يتجاوز المتاح للإنفاق",
    saveBudget:"حفظ التغييرات", cancelBudget:"إلغاء", budgetSaved:"✓ تم الحفظ",
    totalBudget:"إجمالي الميزانية", spendable:"المتاح للإنفاق", over_limit:"⚠️ تجاوزت المتاح للإنفاق",
    spent_label:"اتصرف", left_label:"فاضل", over_label:"تجاوزت بـ", budget_label:"الميزانية",
    income_label:"الدخل", savings_label:"التوفير",
    byCategory:"المصاريف حسب الفئة", recentTxns:"آخر المعاملات",
    all:"الكل", week:"الأسبوع", month:"الشهر",
    noTxns:"لا توجد معاملات", fillData:"من فضلك أكمل البيانات",
    cats:{ food:"🍔 أكل", transport:"🚗 مواصلات", shopping:"🛒 تسوق", health:"💊 صحة",
           entertainment:"🎮 ترفيه", subs:"📱 اشتراكات", rent:"🏠 إيجار",
           education:"📚 تعليم", bills:"⚡ فواتير", other:"🔧 أخرى" }
  },
  en: {
    dir:"ltr", currency:"EGP",
    title:"Spending Tracker", subtitle:"Track your expenses and control your budget",
    ob_welcome:"Welcome 👋", ob_sub:"To set up a smart budget, we need your monthly income",
    ob_income:"Net Monthly Income", ob_income_ph:"e.g. 15000",
    ob_savings:"Savings Rate", ob_savings_hint:"We'll set aside this % every month",
    ob_spendable:"Spendable Amount", ob_start:"Start Tracking →", ob_income_err:"Please enter a valid income",
    ob_reset:"Reset Settings", ob_preview:"Suggested budget distribution", ob_more:"+ 5 more categories...",
    totalMonth:"This Month Total", remaining:"Budget Remaining",
    transactions:"Transactions", dailyAvg:"Daily Average",
    thisMonth:"this month", from:"of",
    addExpense:"Add Expense", description:"Description", amount:"Amount", addBtn:"+ Add",
    monthlyBudget:"Monthly Budget", editBudget:"Edit",
    editBudgetTitle:"Edit Budget", editBudgetSub:"Click any number to edit — total can't exceed spendable amount",
    saveBudget:"Save Changes", cancelBudget:"Cancel", budgetSaved:"✓ Saved",
    totalBudget:"Total Budget", spendable:"Spendable", over_limit:"⚠️ Exceeds spendable amount",
    spent_label:"Spent", left_label:"Left", over_label:"Over by", budget_label:"Budget",
    income_label:"Income", savings_label:"Savings",
    byCategory:"Expenses by Category", recentTxns:"Recent Transactions",
    all:"All", week:"Week", month:"Month",
    noTxns:"No transactions found", fillData:"Please fill in all fields",
    cats:{ food:"🍔 Food", transport:"🚗 Transport", shopping:"🛒 Shopping", health:"💊 Health",
           entertainment:"🎮 Entertainment", subs:"📱 Subscriptions", rent:"🏠 Rent",
           education:"📚 Education", bills:"⚡ Bills", other:"🔧 Other" }
  }
};

// ─── Constants ───────────────────────────────────────────────────────────────
const CAT_COLORS = {
  food:"#7c6af7", transport:"#4fc3a1", shopping:"#f7a35c", health:"#e05c7a",
  entertainment:"#5cc8f7", subs:"#a35cf7", rent:"#f75c8d",
  education:"#5cf7b8", bills:"#f7d35c", other:"#9d9ab8"
};
const BUDGET_KEYS = ["rent","food","bills","transport","shopping","health","subs","entertainment","education","other"];

// Realistic distribution weights (sum = 1.0)
const DIST = { rent:0.35, food:0.20, bills:0.08, transport:0.08,
               shopping:0.09, health:0.04, subs:0.03, entertainment:0.05, education:0.04, other:0.04 };

function distributeBudget(spendable) {
  const b = {};
  BUDGET_KEYS.forEach(k => { b[k] = Math.round(spendable * DIST[k]); });
  return b;
}

const THEMES = {
  dark:{ bg:"#0d0d0f", surface:"#16161a", surface2:"#1e1e24", border:"rgba(255,255,255,0.07)",
         borderInput:"rgba(255,255,255,0.1)", text:"#f0eeff", text2:"#9d9ab8", text3:"#5a5870",
         tooltipBg:"#1e1e24", scrollThumb:"#2a2a32", inputBg:"#1e1e24", inputColor:"#f0eeff" },
  light:{ bg:"#f4f3ff", surface:"#ffffff", surface2:"#f0eefc", border:"rgba(0,0,0,0.07)",
          borderInput:"rgba(0,0,0,0.12)", text:"#1a1830", text2:"#6b6890", text3:"#a8a5c0",
          tooltipBg:"#ffffff", scrollThumb:"#d0cef0", inputBg:"#f0eefc", inputColor:"#1a1830" }
};

const DEFAULT_TXNS = [
  {id:1,name:"غداء مطعم / Restaurant",amt:85,catKey:"food",date:"2026-04-20"},
  {id:2,name:"أوبر / Uber",amt:45,catKey:"transport",date:"2026-04-21"},
  {id:3,name:"نتفلكس / Netflix",amt:149,catKey:"subs",date:"2026-04-19"},
  {id:4,name:"سوبرماركت / Supermarket",amt:320,catKey:"shopping",date:"2026-04-22"},
  {id:5,name:"كافيه / Coffee",amt:65,catKey:"food",date:"2026-04-23"},
  {id:6,name:"إيجار / Rent",amt:2500,catKey:"rent",date:"2026-04-01"},
  {id:7,name:"كهرباء / Electricity",amt:180,catKey:"bills",date:"2026-04-05"},
  {id:8,name:"صيدلية / Pharmacy",amt:95,catKey:"health",date:"2026-04-18"},
];

function fmt(n, lang) {
  if (isNaN(n)) return "0";
  return Math.round(n).toLocaleString(lang==="ar" ? "ar-EG" : "en-US");
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
function Onboarding({ lang, setLang, themeKey, setThemeKey, onDone }) {
  const t = T[lang];
  const th = THEMES[themeKey];
  const [income, setIncome] = useState("");
  const [savingsPct, setSavingsPct] = useState(20);
  const [err, setErr] = useState(false);

  const inc = parseFloat(income) || 0;
  const savings = Math.round(inc * savingsPct / 100);
  const spendable = inc - savings;
  const presets = [5000, 8000, 15000, 25000];

  function handleStart() {
    if (!inc || inc <= 0) { setErr(true); return; }
    onDone({ income: inc, savingsPct, spendable, budgets: distributeBudget(spendable) });
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      padding:"1.5rem", background:th.bg, direction:t.dir,
      fontFamily:lang==="ar"?"'Cairo',sans-serif":"'DM Sans',sans-serif",
      transition:"background 0.3s" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input,select{background:${th.inputBg};border:0.5px solid ${th.borderInput};border-radius:8px;padding:9px 12px;color:${th.inputColor};font-size:14px;width:100%;outline:none}
        input:focus{border-color:#7c6af7} input[type=range]{padding:0;border:none;background:transparent}`}</style>

      {/* Top-right toggles */}
      <div style={{ position:"fixed", top:16, right:lang==="ar"?"auto":16, left:lang==="ar"?16:"auto", display:"flex", gap:8 }}>
        <button onClick={()=>setThemeKey(k=>k==="dark"?"light":"dark")}
          style={{ background:th.surface2, border:`0.5px solid ${th.border}`, borderRadius:8, padding:"6px 12px", color:th.text, cursor:"pointer", fontSize:14 }}>
          {themeKey==="dark"?"☀️":"🌙"}
        </button>
        <button onClick={()=>setLang(l=>l==="ar"?"en":"ar")}
          style={{ background:th.surface2, border:`0.5px solid ${th.border}`, borderRadius:8, padding:"6px 12px", color:th.text, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
          {lang==="ar"?"🌐 English":"🌐 العربية"}
        </button>
      </div>

      <div style={{ width:"100%", maxWidth:420 }}>
        {/* Hero */}
        <div style={{ textAlign:"center", marginBottom:"2rem" }}>
          <div style={{ fontSize:52, marginBottom:12 }}>💸</div>
          <h1 style={{ fontSize:26, fontWeight:700, color:th.text, marginBottom:8 }}>{t.ob_welcome}</h1>
          <p style={{ fontSize:14, color:th.text2, lineHeight:1.7 }}>{t.ob_sub}</p>
        </div>

        {/* Card */}
        <div style={{ background:th.surface, border:`0.5px solid ${th.border}`, borderRadius:20, padding:"1.75rem",
          boxShadow:themeKey==="dark"?"0 24px 60px rgba(0,0,0,0.4)":"0 8px 32px rgba(124,106,247,0.1)" }}>

          {/* Income */}
          <div style={{ marginBottom:"1.25rem" }}>
            <label style={{ fontSize:13, color:th.text2, display:"block", marginBottom:8 }}>{t.ob_income}</label>
            <input type="number" min="0" placeholder={t.ob_income_ph} value={income}
              onChange={e=>{ setIncome(e.target.value); setErr(false); }}
              style={{ fontFamily:"'DM Mono',monospace", fontSize:22, fontWeight:700, textAlign:"center",
                border: err?"1px solid #e05c7a":`0.5px solid ${th.borderInput}`,
                color: err?"#e05c7a":th.text, borderRadius:12, padding:"12px" }} />
            {err && <div style={{ fontSize:12, color:"#e05c7a", marginTop:6, textAlign:"center" }}>{t.ob_income_err}</div>}
            {/* Presets */}
            <div style={{ display:"flex", gap:6, marginTop:10, justifyContent:"center", flexWrap:"wrap" }}>
              {presets.map(p=>(
                <button key={p} onClick={()=>{ setIncome(String(p)); setErr(false); }}
                  style={{ padding:"4px 12px", borderRadius:8, fontSize:12, cursor:"pointer", fontFamily:"inherit",
                    background:parseFloat(income)===p?"#7c6af7":th.surface2,
                    color:parseFloat(income)===p?"#fff":th.text2,
                    border:`0.5px solid ${th.borderInput}` }}>
                  {fmt(p,lang)}
                </button>
              ))}
            </div>
          </div>

          {/* Savings slider */}
          <div style={{ marginBottom:"1.5rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <label style={{ fontSize:13, color:th.text2 }}>{t.ob_savings}</label>
              <span style={{ fontSize:14, fontWeight:700, fontFamily:"'DM Mono',monospace", color:"#4fc3a1" }}>{savingsPct}%</span>
            </div>
            <input type="range" min="0" max="50" step="5" value={savingsPct}
              onChange={e=>setSavingsPct(Number(e.target.value))}
              style={{ width:"100%", accentColor:"#4fc3a1", cursor:"pointer" }} />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:th.text3, marginTop:3 }}>
              <span>0%</span><span>50%</span>
            </div>
          </div>

          {/* Summary — only show when income entered */}
          {inc > 0 && (
            <div style={{ background:th.surface2, borderRadius:12, padding:"1rem 1.25rem", marginBottom:"1.5rem" }}>
              {/* 3 numbers */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, textAlign:"center", marginBottom:12 }}>
                {[
                  { label:t.income_label, val:fmt(inc,lang), color:th.text },
                  { label:t.savings_label, val:fmt(savings,lang), color:"#4fc3a1" },
                  { label:t.ob_spendable, val:fmt(spendable,lang), color:"#7c6af7" },
                ].map((item,i)=>(
                  <div key={i}>
                    <div style={{ fontSize:11, color:th.text3, marginBottom:3 }}>{item.label}</div>
                    <div style={{ fontSize:15, fontWeight:700, fontFamily:"'DM Mono',monospace", color:item.color }}>{item.val}</div>
                    <div style={{ fontSize:10, color:th.text3 }}>{t.currency}</div>
                  </div>
                ))}
              </div>
              {/* Budget preview */}
              <div style={{ borderTop:`0.5px solid ${th.border}`, paddingTop:10 }}>
                <div style={{ fontSize:11, color:th.text3, marginBottom:8, textAlign:"center" }}>{t.ob_preview}</div>
                {BUDGET_KEYS.slice(0,5).map(k=>{
                  const amt = Math.round(spendable * DIST[k]);
                  return (
                    <div key={k} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                      <span style={{ fontSize:11, minWidth:55, color:th.text2 }}>{T[lang].cats[k].split(" ").slice(1).join(" ")}</span>
                      <div style={{ flex:1, background:th.surface, borderRadius:99, height:4 }}>
                        <div style={{ width:`${Math.round(DIST[k]*100*2)}%`, height:4, borderRadius:99, background:CAT_COLORS[k] }} />
                      </div>
                      <span style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:th.text3, minWidth:45, textAlign:lang==="ar"?"left":"right" }}>
                        {fmt(amt,lang)}
                      </span>
                    </div>
                  );
                })}
                <div style={{ textAlign:"center", fontSize:11, color:th.text3, marginTop:4 }}>{t.ob_more}</div>
              </div>
            </div>
          )}

          <button onClick={handleStart}
            style={{ width:"100%", padding:"13px", background:"#7c6af7", color:"#fff", border:"none",
              borderRadius:12, fontFamily:"inherit", fontSize:15, fontWeight:700, cursor:"pointer",
              opacity: inc>0?1:0.6 }}>
            {t.ob_start}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState("ar");
  const [themeKey, setThemeKey] = useState("dark");

  const [profile, setProfile] = useState(()=>{ try { return JSON.parse(localStorage.getItem("sp_profile"))||null; } catch { return null; } });
  const [txns, setTxns] = useState(()=>{ try { return JSON.parse(localStorage.getItem("sp_txns_v2"))||DEFAULT_TXNS; } catch { return DEFAULT_TXNS; } });
  const [budgets, setBudgets] = useState(()=>{
    try {
      const saved = JSON.parse(localStorage.getItem("sp_budgets"));
      if (saved) return saved;
      const p = JSON.parse(localStorage.getItem("sp_profile"));
      return distributeBudget(p?.spendable || 8000);
    } catch { return distributeBudget(8000); }
  });
  const [nextId, setNextId] = useState(()=>{ try { return Math.max(...(JSON.parse(localStorage.getItem("sp_txns_v2"))||DEFAULT_TXNS).map(t=>t.id))+1; } catch { return 10; } });

    // ── Show onboarding if no profile ──
  if (!profile) {
    return <Onboarding lang={lang} setLang={setLang} themeKey={themeKey} setThemeKey={setThemeKey}
      onDone={({income,savingsPct,spendable,budgets:b})=>{ setProfile({income,savingsPct,spendable}); setBudgets(b); }} />;
  }

  return <Dashboard lang={lang} setLang={setLang} themeKey={themeKey} setThemeKey={setThemeKey}
    profile={profile} setProfile={setProfile} txns={txns} setTxns={setTxns}
    budgets={budgets} setBudgets={setBudgets} nextId={nextId} setNextId={setNextId} />;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ lang, setLang, themeKey, setThemeKey, profile, setProfile, txns, setTxns, budgets, setBudgets, nextId, setNextId }) {
  const th = THEMES[themeKey];
  const t = T[lang];

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState({});
  const [budgetSaved, setBudgetSaved] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ name:"", amt:"", catKey:"food", date:new Date().toISOString().split("T")[0] });

  useEffect(()=>{ try { localStorage.setItem("sp_txns_v2", JSON.stringify(txns)); } catch {} }, [txns]);
  useEffect(()=>{ try { localStorage.setItem("sp_budgets", JSON.stringify(budgets)); } catch {} }, [budgets]);
  useEffect(()=>{ try { localStorage.setItem("sp_profile", JSON.stringify(profile)); } catch {} }, [profile]);

  // ── Derived ──
  const now = new Date("2026-04-24");

  const filtered = useMemo(()=> txns.filter(tx=>{
    const d=new Date(tx.date);
    if(filter==="week"){const w=new Date(now);w.setDate(now.getDate()-7);return d>=w;}
    if(filter==="month") return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    return true;
  }).sort((a,b)=>new Date(b.date)-new Date(a.date)), [txns,filter]);

  const monthTxns = useMemo(()=>txns.filter(tx=>{ const d=new Date(tx.date); return d.getMonth()===3&&d.getFullYear()===2026; }), [txns]);
  const monthTotal = monthTxns.reduce((s,tx)=>s+tx.amt, 0);
  const budgetTotal = Object.values(budgets).reduce((s,v)=>s+v, 0);
  const remaining = budgetTotal - monthTotal;

  const catData = useMemo(()=>{
    const totals={};
    filtered.forEach(tx=>{ totals[tx.catKey]=(totals[tx.catKey]||0)+tx.amt; });
    return Object.entries(totals).map(([key,val])=>({ key, val, name:t.cats[key], color:CAT_COLORS[key] }));
  }, [filtered, lang]);

  const monthCatTotals = useMemo(()=>{
    const m={};
    monthTxns.forEach(tx=>{ m[tx.catKey]=(m[tx.catKey]||0)+tx.amt; });
    return m;
  }, [monthTxns]);

  function addTxn() {
    if(!form.name.trim()||!form.amt||parseFloat(form.amt)<=0||!form.date){ alert(t.fillData); return; }
    setTxns(prev=>[...prev,{id:nextId,name:form.name,amt:parseFloat(form.amt),catKey:form.catKey,date:form.date}]);
    setNextId(n=>n+1);
    setForm(f=>({...f,name:"",amt:""}));
  }

  function delTxn(id){ setTxns(prev=>prev.filter(tx=>tx.id!==id)); }

  function openBudgetModal(){ setBudgetDraft({...budgets}); setShowBudgetModal(true); setBudgetSaved(false); }

  function saveBudget(){
    const cleaned={};
    BUDGET_KEYS.forEach(k=>{ cleaned[k]=Math.round(parseFloat(budgetDraft[k])||0); });
    setBudgets(cleaned);
    setBudgetSaved(true);
    setTimeout(()=>{ setShowBudgetModal(false); setBudgetSaved(false); }, 900);
  }

  const draftTotal = BUDGET_KEYS.reduce((s,k)=>s+(parseFloat(budgetDraft[k] ?? budgets[k])||0), 0);
  const draftOverLimit = draftTotal > profile.spendable;

  const card = { background:th.surface, border:`0.5px solid ${th.border}`, borderRadius:14, padding:"1rem 1.25rem" };
  const btnStyle = (active)=>({ padding:"5px 12px", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer",
    border:`0.5px solid ${th.borderInput}`, background:active?"#7c6af7":"transparent",
    color:active?"#fff":th.text2, fontFamily:"inherit" });

  return (
    <div style={{ fontFamily:lang==="ar"?"'Cairo',sans-serif":"'DM Sans',sans-serif", background:th.bg, color:th.text,
      minHeight:"100vh", padding:"1.5rem", direction:t.dir, transition:"background 0.3s,color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input,select{background:${th.inputBg};border:0.5px solid ${th.borderInput};border-radius:8px;padding:9px 12px;color:${th.inputColor};font-size:14px;width:100%;outline:none;transition:background 0.3s,color 0.3s}
        input:focus,select:focus{border-color:#7c6af7}
        select option{background:${th.inputBg};color:${th.inputColor}}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:${th.scrollThumb};border-radius:4px}
        input[type=range]{padding:0;border:none;background:transparent}
      `}</style>

      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.5rem", flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>💸 {t.title}</h1>
          <p style={{ color:th.text2, fontSize:13, display:"flex", gap:12, flexWrap:"wrap" }}>
            <span>{t.income_label}: <strong style={{ color:"#7c6af7", fontFamily:"'DM Mono',monospace" }}>{fmt(profile.income,lang)} {t.currency}</strong></span>
            <span>{t.savings_label}: <strong style={{ color:"#4fc3a1" }}>{profile.savingsPct}%  ({fmt(profile.income*profile.savingsPct/100,lang)} {t.currency})</strong></span>
            <span>{t.ob_spendable}: <strong style={{ color:th.text }}>{fmt(profile.spendable,lang)} {t.currency}</strong></span>
          </p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={()=>{ if(window.confirm(lang==="ar"?"هتتمسح كل الإعدادات، متابع؟":"Reset all settings?")){ localStorage.removeItem("sp_profile"); setProfile(null); } }}
            title={t.ob_reset}
            style={{ background:th.surface2, border:`0.5px solid ${th.border}`, borderRadius:10, padding:"8px 12px", color:th.text3, cursor:"pointer", fontSize:13 }}>⚙️</button>
          <button onClick={()=>setThemeKey(k=>k==="dark"?"light":"dark")}
            style={{ background:th.surface2, border:`0.5px solid ${th.border}`, borderRadius:10, padding:"8px 14px", color:th.text, cursor:"pointer", fontSize:16, transition:"background 0.3s" }}>
            {themeKey==="dark"?"☀️":"🌙"}
          </button>
          <button onClick={()=>setLang(l=>l==="ar"?"en":"ar")}
            style={{ background:th.surface2, border:`0.5px solid ${th.border}`, borderRadius:10, padding:"8px 14px", color:th.text, cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"inherit", transition:"background 0.3s" }}>
            {lang==="ar"?"🌐 English":"🌐 العربية"}
          </button>
        </div>
      </div>

      {/* ── Metrics ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:"1.5rem" }}>
        {[
          { label:t.totalMonth, val:`${fmt(monthTotal,lang)} ${t.currency}`, color:"#e05c7a", sub:`${monthTxns.length} ${t.thisMonth}` },
          { label:t.remaining, val:`${fmt(remaining,lang)} ${t.currency}`, color:remaining>=0?"#4fc3a1":"#e05c7a", sub:`${t.from} ${fmt(budgetTotal,lang)}` },
          { label:t.transactions, val:fmt(monthTxns.length,lang), color:"#7c6af7", sub:t.thisMonth },
          { label:t.dailyAvg, val:`${fmt(Math.round(monthTotal/24),lang)} ${t.currency}`, color:"#f7a35c", sub:"April 2026" },
        ].map((m,i)=>(
          <div key={i} style={card}>
            <div style={{ fontSize:12, color:th.text2, marginBottom:6 }}>{m.label}</div>
            <div style={{ fontSize:20, fontWeight:700, fontFamily:"'DM Mono',monospace", color:m.color }}>{m.val}</div>
            <div style={{ fontSize:11, color:th.text3, marginTop:4 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:"1.5rem", marginBottom:"1.5rem" }}>

        {/* Chart */}
        <div style={card}>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:"1rem" }}>{t.byCategory}</div>
          {catData.length ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={catData} dataKey="val" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3}>
                    {catData.map((e,i)=><Cell key={i} fill={e.color} stroke="none" />)}
                  </Pie>
                  <Tooltip formatter={v=>[`${fmt(v,lang)} ${t.currency}`,""]}
                    contentStyle={{ background:th.tooltipBg, border:`0.5px solid ${th.borderInput}`, borderRadius:8, color:th.text, fontSize:13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:8 }}>
                {catData.map((e,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:th.text2 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:e.color }} />
                    <span>{e.name} {fmt(e.val,lang)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ textAlign:"center", color:th.text3, padding:"3rem", fontSize:14 }}>{t.noTxns}</div>}
        </div>

        {/* Add Form + Budget Bars */}
        <div style={card}>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:"1rem" }}>{t.addExpense}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
            <input style={{ fontFamily:"inherit" }} placeholder={t.description} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
            <input style={{ fontFamily:"inherit" }} type="number" placeholder={t.amount} value={form.amt} onChange={e=>setForm(f=>({...f,amt:e.target.value}))} min="0" step="0.5" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
            <select style={{ fontFamily:"inherit" }} value={form.catKey} onChange={e=>setForm(f=>({...f,catKey:e.target.value}))}>
              {BUDGET_KEYS.map(k=><option key={k} value={k}>{t.cats[k]}</option>)}
            </select>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
          </div>
          <button onClick={addTxn} style={{ width:"100%", padding:"10px", background:"#7c6af7", color:"#fff", border:"none", borderRadius:8, fontFamily:"inherit", fontSize:14, fontWeight:600, cursor:"pointer" }}>
            {t.addBtn}
          </button>

          {/* Budget Bars */}
          <div style={{ marginTop:"1.25rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:600, color:th.text2 }}>{t.monthlyBudget}</div>
              <button onClick={openBudgetModal} style={{ background:"none", border:`0.5px solid ${th.borderInput}`, borderRadius:6, padding:"3px 10px", fontSize:11, color:th.text2, cursor:"pointer", fontFamily:"inherit" }}>
                ✏️ {t.editBudget}
              </button>
            </div>
            {BUDGET_KEYS.filter(k=>budgets[k]>0).slice(0,6).map(k=>{
              const spent=monthCatTotals[k]||0;
              const bud=budgets[k]||0;
              const pct=bud>0?Math.min(100,Math.round(spent/bud*100)):0;
              const col=pct>85?"#e05c7a":pct>60?"#f7a35c":"#4fc3a1";
              return (
                <div key={k} style={{ display:"flex", alignItems:"center", marginBottom:8, gap:8 }}>
                  <div style={{ fontSize:12, minWidth:65, color:th.text }}>{t.cats[k].split(" ").slice(1).join(" ")}</div>
                  <div style={{ flex:1, background:th.surface2, borderRadius:99, height:6 }}>
                    <div style={{ width:`${pct}%`, height:6, borderRadius:99, background:col, transition:"width 0.5s" }} />
                  </div>
                  <div style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:th.text2, minWidth:28 }}>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Budget Edit Modal ── */}
      {showBudgetModal && (
        <div onClick={e=>{ if(e.target===e.currentTarget) setShowBudgetModal(false); }}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(6px)", padding:"1rem" }}>
          <div style={{ background:th.surface, border:`0.5px solid ${th.border}`, borderRadius:20, width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto", direction:t.dir, boxShadow:"0 24px 60px rgba(0,0,0,0.4)" }}>

            {/* Header */}
            <div style={{ padding:"1.25rem 1.5rem", borderBottom:`0.5px solid ${th.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:th.surface, zIndex:1, borderRadius:"20px 20px 0 0" }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700 }}>{t.editBudgetTitle}</div>
                <div style={{ fontSize:12, color:th.text2, marginTop:3 }}>{t.editBudgetSub}</div>
              </div>
              <button onClick={()=>setShowBudgetModal(false)} style={{ background:th.surface2, border:"none", color:th.text2, fontSize:14, cursor:"pointer", width:32, height:32, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>

            {/* Summary: Income / Total Budget / Spendable */}
            <div style={{ margin:"1.25rem 1.5rem 0", background:th.surface2, borderRadius:12, padding:"1rem 1.25rem" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, textAlign:"center", marginBottom:10 }}>
                {[
                  { label:t.income_label, val:fmt(profile.income,lang), color:th.text },
                  { label:t.totalBudget, val:fmt(draftTotal,lang), color:draftOverLimit?"#e05c7a":"#7c6af7" },
                  { label:t.spendable, val:fmt(profile.spendable,lang), color:"#4fc3a1" },
                ].map((item,i)=>(
                  <div key={i}>
                    <div style={{ fontSize:11, color:th.text3, marginBottom:3 }}>{item.label}</div>
                    <div style={{ fontSize:16, fontWeight:700, fontFamily:"'DM Mono',monospace", color:item.color }}>{item.val}</div>
                    <div style={{ fontSize:10, color:th.text3 }}>{t.currency}</div>
                  </div>
                ))}
              </div>
              {/* Usage bar: how much of spendable is allocated */}
              <div style={{ background:th.surface, borderRadius:99, height:7 }}>
                <div style={{ width:`${Math.min(100,draftTotal/profile.spendable*100)}%`, height:7, borderRadius:99, background:draftOverLimit?"#e05c7a":"#7c6af7", transition:"width 0.3s" }} />
              </div>
              {draftOverLimit && <div style={{ fontSize:12, color:"#e05c7a", marginTop:6, textAlign:"center" }}>{t.over_limit}</div>}
            </div>

            {/* Per-category rows */}
            <div style={{ padding:"1rem 1.5rem" }}>
              {BUDGET_KEYS.map(k=>{
                const bud=parseFloat(budgetDraft[k]??budgets[k])||0;
                const spent=monthCatTotals[k]||0;
                const leftover=bud-spent;
                const pct=bud>0?Math.min(100,Math.round(spent/bud*100)):0;
                const barColor=pct>85?"#e05c7a":pct>60?"#f7a35c":"#4fc3a1";
                const isEdited=budgetDraft[k]!==undefined && parseFloat(budgetDraft[k])!==budgets[k];
                return (
                  <div key={k} style={{ padding:"12px 0", borderBottom:`0.5px solid ${th.border}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:CAT_COLORS[k]+"20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                        {t.cats[k].split(" ")[0]}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:th.text }}>{t.cats[k].split(" ").slice(1).join(" ")}</div>
                        <div style={{ fontSize:11, color:leftover<0?"#e05c7a":th.text3, marginTop:2 }}>
                          {t.spent_label} {fmt(spent,lang)} {t.currency}
                          {" · "}
                          {leftover>=0 ? `${t.left_label} ${fmt(leftover,lang)}` : `${t.over_label} ${fmt(Math.abs(leftover),lang)}`}
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
                        <div style={{ fontSize:10, color:th.text3 }}>{t.budget_label}</div>
                        <input type="number" min="0"
                          value={budgetDraft[k]??budgets[k]}
                          onChange={e=>setBudgetDraft(d=>({...d,[k]:e.target.value}))}
                          style={{ width:90, textAlign:"center", fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:600,
                            padding:"5px 8px", borderRadius:8, outline:"none",
                            background:isEdited?"#7c6af720":th.surface2,
                            border:isEdited?"1px solid #7c6af7":`0.5px solid ${th.borderInput}`,
                            color:isEdited?"#7c6af7":th.text }} />
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ flex:1, background:th.surface2, borderRadius:99, height:5 }}>
                        <div style={{ width:`${pct}%`, height:5, borderRadius:99, background:barColor, transition:"width 0.4s" }} />
                      </div>
                      <span style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:barColor, minWidth:32, textAlign:"center" }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding:"1rem 1.5rem", borderTop:`0.5px solid ${th.border}`, display:"flex", gap:8, position:"sticky", bottom:0, background:th.surface, borderRadius:"0 0 20px 20px" }}>
              <button onClick={saveBudget}
                style={{ flex:1, padding:"11px", background:budgetSaved?"#4fc3a1":"#7c6af7", color:"#fff", border:"none", borderRadius:10, fontFamily:"inherit", fontSize:14, fontWeight:600, cursor:"pointer", transition:"background 0.3s" }}>
                {budgetSaved?t.budgetSaved:t.saveBudget}
              </button>
              <button onClick={()=>{ setBudgetDraft({}); setShowBudgetModal(false); }}
                style={{ padding:"11px 20px", background:"transparent", color:th.text2, border:`0.5px solid ${th.borderInput}`, borderRadius:10, fontFamily:"inherit", fontSize:14, cursor:"pointer" }}>
                {t.cancelBudget}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transactions ── */}
      <div style={{ ...card, padding:"1.25rem" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem", flexWrap:"wrap", gap:8 }}>
          <div style={{ fontSize:15, fontWeight:600 }}>{t.recentTxns}</div>
          <div style={{ display:"flex", gap:6 }}>
            {["all","week","month"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={btnStyle(filter===f)}>{t[f]}</button>
            ))}
          </div>
        </div>
        {filtered.length===0
          ? <div style={{ textAlign:"center", color:th.text3, padding:"2rem", fontSize:14 }}>{t.noTxns}</div>
          : filtered.slice(0,15).map(tx=>(
            <div key={tx.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:`0.5px solid ${th.border}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:CAT_COLORS[tx.catKey]+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                  {t.cats[tx.catKey].split(" ")[0]}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:500 }}>{tx.name}</div>
                  <div style={{ fontSize:12, color:th.text2, marginTop:2 }}>{t.cats[tx.catKey]}</div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ textAlign:lang==="ar"?"left":"right" }}>
                  <div style={{ fontSize:15, fontWeight:700, fontFamily:"'DM Mono',monospace", color:"#e05c7a" }}>-{fmt(tx.amt,lang)} {t.currency}</div>
                  <div style={{ fontSize:11, color:th.text3 }}>{new Date(tx.date).toLocaleDateString(lang==="ar"?"ar-EG":"en-GB",{day:"numeric",month:"short"})}</div>
                </div>
                <button onClick={()=>delTxn(tx.id)} style={{ background:"none", border:"none", color:th.text3, cursor:"pointer", fontSize:14, padding:"4px 8px", borderRadius:6 }}>✕</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
