import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import "./app.css";

function fmtRupee(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
function catEmoji(c) {
  var m = {Cleaning:"🧹",Security:"🛡️",Electricity:"⚡",Repairs:"🔧",Maintenance:"🏗️",Admin:"📁",Salary:"👷",Sewage:"🚿","Staff Welfare":"🎁",Other:"📌","Fixed Deposit":"🏦"};
  return m[c] || "📋";
}
function monthLabel(bm) {
  if (!bm) return "";
  var parts = bm.split("-");
  var y = parts[0], m = parseInt(parts[1]);
  var names = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return names[m] + " " + y;
}

var ALL_MONTHS = [
  "2022-06","2022-07","2022-08","2022-09","2022-10","2022-11","2022-12",
  "2023-01","2023-02","2023-03","2023-04","2023-05","2023-06","2023-07","2023-08","2023-09","2023-10","2023-11","2023-12",
  "2024-01","2024-02","2024-03","2024-04","2024-05","2024-06","2024-07","2024-08","2024-09","2024-10","2024-11","2024-12",
  "2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12",
  "2026-01","2026-02","2026-03","2026-04","2026-05"
];

var PINS = { admin: { pin:"2024", role:"admin", name:"Committee Admin" }, staff: { pin:"1234", role:"staff", name:"Staff User" } };

function LoginScreen(props) {
  var [uname, setUname] = useState("");
  var [pin, setPin] = useState("");
  var [err, setErr] = useState("");
  var [busy, setBusy] = useState(false);
  var [show, setShow] = useState(false);

  function doLogin() {
    setErr("");
    var u = uname.trim().toLowerCase();
    var found = PINS[u];
    if (!found) { setErr("Username not found"); return; }
    if (pin !== found.pin) { setErr("Incorrect PIN"); return; }
    setBusy(true);
    setTimeout(function() {
      props.onLogin({ user: { id: "temp-"+u }, temp: true, profile: Object.assign({}, found, { id: "temp-"+u }) });
    }, 500);
  }

  return (
    <div className="login-wrap">
      <div className="login-logo">🏛</div>
      <div className="login-title">Antony Pallazo</div>
      <div className="login-sub">Apartment Management</div>
      <div className="login-card">
        <div style={{fontSize:16,fontWeight:700,marginBottom:6}}>Welcome back</div>
        <div style={{fontSize:13,color:"var(--muted)",marginBottom:20,lineHeight:1.5}}>Enter your username and PIN to continue</div>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="form-input" type="text" placeholder="e.g. admin" value={uname}
            onChange={function(e){setUname(e.target.value);setErr("");}}
            onKeyDown={function(e){if(e.key==="Enter")doLogin();}} autoCapitalize="none"/>
        </div>
        <div className="form-group">
          <label className="form-label">PIN</label>
          <div style={{position:"relative"}}>
            <input className="form-input" type={show?"text":"password"} placeholder="Enter PIN"
              maxLength={6} value={pin}
              onChange={function(e){setPin(e.target.value.replace(/\D/g,""));setErr("");}}
              onKeyDown={function(e){if(e.key==="Enter")doLogin();}} style={{paddingRight:42}}/>
            <button onClick={function(){setShow(function(p){return !p;})}}
              style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"var(--muted)"}}>
              {show?"🙈":"👁"}
            </button>
          </div>
        </div>
        {err && <div style={{background:"#FDEDEC",color:"var(--red)",fontSize:12,padding:"8px 12px",borderRadius:8,marginBottom:12,fontWeight:500}}>⚠️ {err}</div>}
        <button className="btn btn-primary" onClick={doLogin} disabled={busy}>
          {busy?<span className="spinner"/>:"🔓 Login"}
        </button>
        <div style={{marginTop:18,padding:"11px 13px",background:"var(--bg)",borderRadius:10,fontSize:12,color:"var(--muted)",lineHeight:1.8}}>
          <div style={{fontWeight:700,color:"var(--text)",marginBottom:2}}>Credentials:</div>
          <div>👤 Admin → <b>admin</b> / PIN: <b>2024</b></div>
          <div>👤 Staff → <b>staff</b> / PIN: <b>1234</b></div>
        </div>
      </div>
      <div style={{color:"rgba(255,255,255,.2)",fontSize:11,marginTop:18,textAlign:"center"}}>⚠️ Temporary PIN login · OTP coming soon</div>
    </div>
  );
}

function LoadingScreen(props) {
  return (
    <div className="loading-wrap">
      <div style={{fontSize:44}}>🏛</div>
      <div style={{color:"rgba(255,255,255,.5)",fontSize:13,marginTop:8}}>{props.msg || "Loading…"}</div>
      {props.dots && (
        <div style={{marginTop:16,display:"flex",gap:6}}>
          {[0,1,2].map(function(i){return(
            <div key={i} style={{width:8,height:8,borderRadius:"50%",background:"#D4A853",animation:"pulse 1.2s ease-in-out "+i*0.2+"s infinite"}}/>
          );})}
        </div>
      )}
    </div>
  );
}

// Helper: get bill for flat in a given month
function getBill(bills, flatId, month) {
  for (var i = 0; i < bills.length; i++) {
    if (bills[i].flat_id === flatId && bills[i].billing_month === month) return bills[i];
  }
  return null;
}

function getStatus(bill) {
  if (!bill) return "paid"; // no bill = treat as paid (data gap), not overdue
  return bill.status;
}

export default function App() {
  var [session, setSession] = useState(null);
  var [userProfile, setUserProfile] = useState(null);
  var [appLoading, setAppLoading] = useState(true);
  var [dataLoading, setDataLoading] = useState(false);
  var [tab, setTab] = useState("home");
  var [flats,            setFlats]            = useState([]);
  var [monthlySummaries, setMonthlySummaries] = useState([]);
  var [monthBillsData,   setMonthBillsData]   = useState([]);
  var [overdueBills,     setOverdueBills]     = useState([]);
  var [allPayments,      setAllPayments]      = useState([]);
  var [allExpenses,      setAllExpenses]      = useState([]);
  var [notices,          setNotices]          = useState([]);
  var [otherIncome,      setOtherIncome]      = useState([]);
  var [corpusData,       setCorpusData]       = useState([]);
  var [fdData,           setFdData]           = useState([]);
  var [acctSettings,     setAcctSettings]     = useState({});
  var [selMonth, setSelMonth] = useState("2026-05");
  var [selFlat, setSelFlat] = useState(null);
  var [filter, setFilter] = useState("all");
  var [search, setSearch] = useState("");
  var [toast, setToast] = useState(null);
  var [payModal, setPayModal] = useState(false);
  var [noticePanel, setNoticePanel] = useState(null);
  var [payForm, setPayForm] = useState({amount:"",mode:"Cash",ref:""});

  // loadMonthData: fetch bills only for the selected month (30 rows max)
  var loadMonthData = useCallback(async function(month) {
    var result = await supabase
      .from("flat_month_status")
      .select("*")
      .eq("billing_month", month);
    if (result.data) setMonthBillsData(result.data);
  }, []);

  var loadData = useCallback(async function() {
    setDataLoading(true);
    try {
      var results = await Promise.all([
        // Flats: 30 rows max — always safe
        supabase.from("flats").select("*").order("block").order("flat_no"),
        // Monthly summaries: 48 rows (one per month) — always safe
        supabase.from("monthly_summary").select("*").order("billing_month", {ascending:false}),
        // Overdue: only overdue bills — max 50-100 rows ever
        supabase.from("overdue_summary").select("*").order("flat_id").order("billing_month"),
        // Expenses: paginate to latest 500
        supabase.from("expenses").select("*").order("expense_date",{ascending:false}).limit(500),
        // Notices, corpus, FD, other income — all small tables
        supabase.from("notices").select("*").order("posted_at",{ascending:false}),
        supabase.from("other_income").select("*").order("received_date",{ascending:false}),
        supabase.from("corpus_payments").select("*").order("paid_date",{ascending:false}),
        supabase.from("fixed_deposits").select("*").order("invested_date",{ascending:false}),
        supabase.from("account_settings").select("*"),
        // Payments summary by month (for income tab)
        supabase.from("payments").select("flat_id,billing_month,amount_paid,payment_date").order("payment_date",{ascending:false}).limit(500),
      ]);
      if (results[0].data) setFlats(results[0].data);
      if (results[1].data) setMonthlySummaries(results[1].data);
      if (results[2].data) setOverdueBills(results[2].data);
      if (results[3].data) setAllExpenses(results[3].data);
      if (results[4].data) setNotices(results[4].data);
      if (results[5].data) setOtherIncome(results[5].data);
      if (results[6].data) setCorpusData(results[6].data);
      if (results[7].data) setFdData(results[7].data);
      if (results[8].data) {
        var settings = {};
        results[8].data.forEach(function(row) { settings[row.key] = row.value; });
        setAcctSettings(settings);
      }
      if (results[9].data) setAllPayments(results[9].data);
    } catch(e) { console.error("loadData error:", e); }
    setDataLoading(false);
  }, []);

  async function loadUserProfile(uid) {
    var result = await supabase.from("users").select("*").eq("id",uid).single();
    setUserProfile(result.data);
    setAppLoading(false);
  }

  useEffect(function() {
    var saved = localStorage.getItem("pallazo_temp_session");
    if (saved) {
      try {
        var parsed = JSON.parse(saved);
        setSession(parsed);
        setUserProfile(parsed.profile);
        setAppLoading(false);
        loadData(); // ← call directly, don't rely on the [session] effect
        return;
      } catch(e) { localStorage.removeItem("pallazo_temp_session"); }
    }
    supabase.auth.getSession().then(function(result) {
      var sess = result.data.session;
      setSession(sess);
      if (sess) loadUserProfile(sess.user.id);
      else setAppLoading(false);
    });
    var sub = supabase.auth.onAuthStateChange(function(_e, sess) {
      setSession(sess);
      if (sess) loadUserProfile(sess.user.id);
      else { setAppLoading(false); setUserProfile(null); }
    });
    return function() { sub.data.subscription.unsubscribe(); };
  }, [loadData]);

  useEffect(function() {
    // Only trigger for real Supabase sessions (not temp PIN sessions)
    // Temp sessions call loadData() directly above
    if (session && !session.temp) loadData();
  }, [session, loadData]);

  // When selMonth changes, load that month's flat bills (30 rows)
  useEffect(function() {
    if (session && flats.length > 0) loadMonthData(selMonth);
  }, [selMonth, session, flats.length, loadMonthData]);

  function showToast(msg) { setToast(msg); setTimeout(function(){ setToast(null); }, 2800); }

  async function handleLogout() {
    localStorage.removeItem("pallazo_temp_session");
    if (session && !session.temp) await supabase.auth.signOut();
    setSession(null); setUserProfile(null);
    showToast("Logged out");
  }

  async function handlePayment() {
    var amt = parseInt(payForm.amount, 10);
    if (!amt || amt <= 0) { showToast("⚠️ Enter a valid amount"); return; }
    var flat = selFlat;
    var result = await supabase.from("payments").insert({
      flat_id: flat.id, billing_month: selMonth,
      amount_paid: amt, mode: payForm.mode,
      reference: payForm.ref,
      payment_date: new Date().toISOString().split("T")[0]
    });
    if (result.error) { showToast("❌ " + result.error.message); return; }
    await supabase.from("bills").update({status:"paid",arrears:0}).eq("flat_id",flat.id).eq("billing_month",selMonth);
    await loadData();
    await loadMonthData(selMonth);
    setPayModal(false);
    setPayForm({amount:"",mode:"Cash",ref:""});
    showToast("✅ Payment saved!");
  }

  // Render guards
  if (appLoading) return <LoadingScreen msg="Loading Antony Pallazo…"/>;
  if (!session) return <LoginScreen onLogin={function(s) {
    if (s.temp) { localStorage.setItem("pallazo_temp_session", JSON.stringify(s)); setUserProfile(s.profile); }
    else loadUserProfile(s.user.id);
    setSession(s);
  }}/>;
  if (dataLoading || flats.length === 0) return <LoadingScreen msg="Loading apartment data…" dots/>;

  // ── Monthly summary from view (never hits row limits) ─────────
  var mSummary = monthlySummaries.find(function(s){ return s.billing_month === selMonth; }) || {};
  var collected  = mSummary.collected  || 0;
  var totalDues  = mSummary.dues       || 0;
  var expected   = mSummary.expected   || flats.reduce(function(s,f){return s+f.monthly_charge;},0);
  var paidCnt    = mSummary.paid_count   || 0;
  var overdCnt   = mSummary.overdue_count || 0;
  var partCnt    = 0;
  var collPct    = expected > 0 ? Math.round((collected/expected)*100) : 0;

  // ── Month bills: 30 rows from flat_month_status view ─────────
  var monthBills = monthBillsData; // already filtered by selMonth in DB query
  var monthExp   = allExpenses.filter(function(e){ return e.billing_month === selMonth; });
  var monthlyExp = monthExp.reduce(function(s,e){return s+e.amount;},0);
  var totalExp   = allExpenses.reduce(function(s,e){return s+e.amount;},0);

  function getBillForFlat(flatId) {
    return monthBills.find(function(b){ return b.flat_id === flatId; }) || null;
  }
  function getStatusForFlat(flatId) {
    var b = getBillForFlat(flatId);
    return b ? b.status : "overdue";
  }

  // ── Overdue: from overdue_summary view (only overdue rows) ────
  var overdueByFlat = {};
  overdueBills.forEach(function(b) {
    if (!overdueByFlat[b.flat_id]) overdueByFlat[b.flat_id] = [];
    overdueByFlat[b.flat_id].push({ month: b.billing_month, amount: b.arrears });
  });

  var totalOverdueAmt = overdueBills.reduce(function(s,b){ return s+(b.arrears||0); }, 0);

  var overdueByYear = {};
  overdueBills.forEach(function(b) {
    var yr = b.billing_month.slice(0,4);
    if (!overdueByYear[yr]) overdueByYear[yr] = { total:0, flats:{} };
    overdueByYear[yr].total += (b.arrears||0);
    if (!overdueByYear[yr].flats[b.flat_id]) overdueByYear[yr].flats[b.flat_id] = 0;
    overdueByYear[yr].flats[b.flat_id] += (b.arrears||0);
  });

  var filteredFlats = flats.filter(function(f) {
    var st = getStatusForFlat(f.id);
    var okF = filter==="all"||filter===st||(filter==="3bhk"&&f.bhk_type==="3BHK")||(filter==="2bhk"&&f.bhk_type==="2BHK")||(filter==="1bhk"&&f.bhk_type==="1BHK");
    var okS = !search||f.flat_no.toLowerCase().includes(search.toLowerCase())||f.block.toLowerCase().includes(search.toLowerCase());
    return okF && okS;
  });

  var bankBal = parseFloat(acctSettings.net_bank_balance || 0);
  var activeFD = parseFloat(acctSettings.active_fd_amount || 0);
  var totalMaint = parseFloat(acctSettings.total_maintenance || 0);
  var totalCorpus = parseFloat(acctSettings.total_corpus || 0);
  var totalOtherInc = parseFloat(acctSettings.total_other_income || 0);
  var fdMatured = parseFloat(acctSettings.total_fd_matured || 0);
  var totalExpAmt = parseFloat(acctSettings.total_expenses || 0);
  var totalIncome = parseFloat(acctSettings.opening_balance||0) + totalMaint + totalCorpus + totalOtherInc + fdMatured;

  var sharedProps = {
    flats, monthlySummaries, monthBillsData, overdueBills, allPayments, allExpenses,
    notices, showToast, setTab, userProfile, selMonth, setSelMonth,
    getBillForFlat, getStatusForFlat,
    monthBills, monthExp, collected, totalDues, expected, paidCnt, overdCnt, partCnt,
    monthlyExp, totalExp, collPct, overdueByFlat, overdueByYear, totalOverdueAmt,
    otherIncome, corpusData, fdData, acctSettings,
    bankBal, activeFD, totalMaint, totalCorpus, totalOtherInc, fdMatured,
    totalExpAmt, totalIncome, filteredFlats, filter, setFilter, search, setSearch,
    selFlat: selFlat, setSelFlat: setSelFlat
  };

  return (
    <div className="app">
      <header className="header">
        <div className="hdr-logo">
          <div className="hdr-icon">🏛</div>
          <div>
            <div className="hdr-name">Antony Pallazo</div>
            <div className="hdr-sub">{userProfile?.role==="admin"?"Admin":userProfile?.name} · {monthLabel(selMonth)}</div>
          </div>
        </div>
        <div className="hdr-btns">
          <button className="icon-btn" onClick={function(){showToast("🔔 Coming soon");}}>🔔</button>
          <button className="icon-btn" onClick={handleLogout} title="Logout">🚪</button>
        </div>
      </header>

      <div className="content">
        {tab==="home"     && <HomeTab     {...sharedProps}/>}
        {tab==="flats"    && <FlatsTab    {...sharedProps}/>}
        {tab==="overdue"  && <OverdueTab  {...sharedProps}/>}
        {tab==="income"   && <IncomeTab   {...sharedProps} reload={loadData}/>}
        {tab==="expenses" && <ExpensesTab {...sharedProps} reload={loadData}/>}
      </div>

      <nav className="tabbar">
        {[{id:"home",icon:"🏠",label:"Home"},{id:"flats",icon:"🏢",label:"Flats"},{id:"overdue",icon:"🚨",label:"Overdue"},{id:"income",icon:"💰",label:"Income"},{id:"expenses",icon:"💳",label:"Expenses"}].map(function(t){
          return (
            <button key={t.id} className={"tab-item"+(tab===t.id?" active":"")} onClick={function(){setTab(t.id);}}>
              <span className="tab-icon">{t.icon}</span>{t.label}
            </button>
          );
        })}
      </nav>

      {selFlat && (
        <div className="overlay" onClick={function(){setSelFlat(null);}}>
          <div className="sheet" onClick={function(e){e.stopPropagation();}}>
            <div className="sheet-handle"/>
            <div className="sheet-head">
              <div>
                <div className="sheet-title">Flat {selFlat.flat_no}</div>
                <div className="sheet-sub">{selFlat.bhk_type} · Block {selFlat.block} · {selFlat.occupancy==="owner"?"Owner":"Rented"}</div>
              </div>
              <button className="close-btn" onClick={function(){setSelFlat(null);}}>✕</button>
            </div>
            <div className="sheet-body">
              <div className="amt-block">
                <div className="ab-label">Total Outstanding (All Time)</div>
                <div className="ab-value">{fmtRupee(totalOverdueAmt && overdueByFlat[selFlat.id] ? overdueByFlat[selFlat.id].reduce(function(s,x){return s+x.amount;},0) : 0)}</div>
                <div className="ab-detail">{monthLabel(selMonth)} charge: {fmtRupee(selFlat.monthly_charge)} · Status: {getStatusForFlat(selFlat.id)}</div>
              </div>
              <div className="card mb14">
                {[["Flat",selFlat.flat_no],["Type",selFlat.bhk_type],["Block",selFlat.block],["Monthly Charge",fmtRupee(selFlat.monthly_charge)],["Status",getStatusForFlat(selFlat.id)]].map(function(row){
                  return (<div key={row[0]} className="info-row"><span className="ir-label">{row[0]}</span><span className="ir-value">{row[1]}</span></div>);
                })}
              </div>
              {overdueByFlat[selFlat.id] && overdueByFlat[selFlat.id].length > 0 && (
                <>
                  <div className="sec-title" style={{marginBottom:8}}>Overdue Breakdown</div>
                  <div className="card mb14">
                    {overdueByFlat[selFlat.id].sort(function(a,b){return a.month.localeCompare(b.month);}).map(function(m){
                      return (<div key={m.month} className="info-row"><span className="ir-label">{monthLabel(m.month)}</span><span className="ir-value" style={{color:"var(--red)"}}>{fmtRupee(m.amount)}</span></div>);
                    })}
                  </div>
                </>
              )}
              <div className="btn-grid">
                <button className="btn btn-primary" onClick={function(){setPayModal(true);}}>💸 Record Payment</button>
                <button className="btn btn-secondary" onClick={function(){showToast("💬 Reminder sent to Flat "+selFlat.flat_no);}}>💬 Remind</button>
                <button className="btn btn-secondary" onClick={function(){showToast("📄 Receipt for Flat "+selFlat.flat_no);}}>📄 Receipt</button>
                <button className="btn btn-secondary" onClick={function(){showToast("📤 Bill sent to Flat "+selFlat.flat_no);}}>📤 Send Bill</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {payModal && selFlat && (
        <div className="overlay" onClick={function(){setPayModal(false);}}>
          <div className="sheet" onClick={function(e){e.stopPropagation();}}>
            <div className="sheet-handle"/>
            <div className="sheet-head">
              <div><div className="sheet-title">Record Payment</div><div className="sheet-sub">Flat {selFlat.flat_no} · {fmtRupee(selFlat.monthly_charge)}/month</div></div>
              <button className="close-btn" onClick={function(){setPayModal(false);}}>✕</button>
            </div>
            <div className="sheet-body">
              <div className="form-group"><label className="form-label">Amount (₹)</label><input className="form-input" type="number" placeholder="e.g. 2000" value={payForm.amount} onChange={function(e){setPayForm(function(p){return Object.assign({},p,{amount:e.target.value});});}}/></div>
              <div className="form-group"><label className="form-label">Mode</label>
                <select className="form-input" value={payForm.mode} onChange={function(e){setPayForm(function(p){return Object.assign({},p,{mode:e.target.value});});}}>
                  <option>Cash</option><option>UPI</option><option>NEFT</option><option>IMPS</option><option>Cheque</option><option>Bank Transfer</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Reference</label><input className="form-input" placeholder="Optional" value={payForm.ref} onChange={function(e){setPayForm(function(p){return Object.assign({},p,{ref:e.target.value});});}}/></div>
              <button className="btn btn-success mt10" onClick={handlePayment}>✅ Confirm & Save</button>
              <button className="btn btn-secondary mt10" onClick={function(){setPayModal(false);}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {noticePanel && (
        <div className="overlay" onClick={function(){setNoticePanel(null);}}>
          <div className="sheet" onClick={function(e){e.stopPropagation();}}>
            <div className="sheet-handle"/>
            <div className="sheet-head">
              <div style={{flex:1,paddingRight:12}}><div className="sheet-title">{noticePanel.title}</div><div className="sheet-sub">{noticePanel.target}</div></div>
              <button className="close-btn" onClick={function(){setNoticePanel(null);}}>✕</button>
            </div>
            <div className="sheet-body">
              <p style={{fontSize:14,lineHeight:1.75}}>{noticePanel.body}</p>
              <div className="btn-grid mt14">
                <button className="btn btn-primary" onClick={function(){showToast("📤 Resent");setNoticePanel(null);}}>📤 Resend</button>
                <button className="btn btn-secondary" onClick={function(){setNoticePanel(null);}}>✕ Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function MonthSelector(props) {
  var idx = ALL_MONTHS.indexOf(props.selMonth);
  return (
    <div className="month-selector">
      <button className="month-nav" onClick={function(){props.setSelMonth(ALL_MONTHS[idx-1]);}} disabled={idx<=0}>‹</button>
      <select className="month-select" value={props.selMonth} onChange={function(e){props.setSelMonth(e.target.value);}}>
        {ALL_MONTHS.slice().reverse().map(function(m){return <option key={m} value={m}>{monthLabel(m)}</option>;})}
      </select>
      <button className="month-nav" onClick={function(){props.setSelMonth(ALL_MONTHS[idx+1]);}} disabled={idx>=ALL_MONTHS.length-1}>›</button>
    </div>
  );
}

function HomeTab(props) {
  return (
    <>
      <div className="hero">
        <div className="hero-greeting">Committee Admin</div>
        <div className="hero-name">Antony Pallazo</div>
        <div className="hero-month">{monthLabel(props.selMonth)} · {props.flats.length} Flats</div>
        <div className="hero-divider"/>
        <div className="hero-stats">
          <div><div className="hs-val">{fmtRupee(props.collected)}</div><div className="hs-label">Collected</div></div>
          <div><div className="hs-val orange">{fmtRupee(props.totalOverdueAmt)}</div><div className="hs-label">All-time Dues</div></div>
          <div><div className="hs-val" style={{color:"#7DCEA0"}}>{fmtRupee(props.bankBal)}</div><div className="hs-label">Bank Balance</div></div>
        </div>
      </div>

      <MonthSelector selMonth={props.selMonth} setSelMonth={props.setSelMonth}/>

      <div style={{padding:"0 16px 12px"}}>
        <div className="card">
          <div style={{padding:"13px 16px 11px"}}>
            <div className="coll-row"><span>{monthLabel(props.selMonth)} Collection</span><b>{fmtRupee(props.collected)} / {fmtRupee(props.expected)}</b></div>
            <div className="multi-bar">
              <div className="bar-paid"    style={{width:props.monthBills.length>0?(props.paidCnt/props.monthBills.length*100)+"%":"0%"}}/>
              <div className="bar-partial" style={{width:props.monthBills.length>0?(props.partCnt/props.monthBills.length*100)+"%":"0%"}}/>
              <div className="bar-overdue" style={{width:props.monthBills.length>0?(props.overdCnt/props.monthBills.length*100)+"%":"0%"}}/>
            </div>
            <div className="bar-legend">
              {[["#2D7A4F",props.paidCnt+" Paid"],["#D4691E",props.partCnt+" Partial"],["#C0392B",props.overdCnt+" Overdue"]].map(function(x){
                return <div key={x[1]} className="bar-dot"><div className="dot" style={{background:x[0]}}/>{x[1]}</div>;
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card green"><div className="sc-label">Month Collected</div><div className="sc-value">{fmtRupee(props.collected)}</div><div className="sc-sub">{props.paidCnt} of {props.monthBills.length} flats</div></div>
        <div className="stat-card red"><div className="sc-label">All-Time Dues</div><div className="sc-value">{fmtRupee(props.totalOverdueAmt)}</div><div className="sc-sub">11 flats · 22 months</div></div>
        <div className="stat-card gold"><div className="sc-label">Month Expected</div><div className="sc-value">{fmtRupee(props.expected)}</div><div className="sc-sub">{props.monthBills.length} flats</div></div>
        <div className="stat-card"><div className="sc-label">Month Expenses</div><div className="sc-value">{fmtRupee(props.monthlyExp)}</div><div className="sc-sub">{monthLabel(props.selMonth)}</div></div>
      </div>

      <div style={{margin:"0 16px 12px",background:"linear-gradient(135deg,#0D2B1F,#1A4A30)",borderRadius:14,padding:"16px"}}>
        <div style={{color:"rgba(255,255,255,.5)",fontSize:10,letterSpacing:"1px",textTransform:"uppercase",marginBottom:6}}>Estimated Bank Balance (All-Time)</div>
        <div style={{color:"#7DCEA0",fontSize:26,fontWeight:700,fontFamily:"'Playfair Display',serif"}}>{fmtRupee(props.bankBal)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:12}}>
          {[["Total Income",fmtRupee(props.totalIncome),"#7DCEA0"],["Total Expenses",fmtRupee(props.totalExpAmt),"#E08080"],["FD Asset",fmtRupee(props.activeFD),"#D4A853"]].map(function(x){
            return <div key={x[0]}><div style={{color:"rgba(255,255,255,.4)",fontSize:9,marginBottom:3}}>{x[0]}</div><div style={{color:x[2],fontSize:13,fontWeight:700}}>{x[1]}</div></div>;
          })}
        </div>
        <div style={{marginTop:10,fontSize:10,color:"rgba(255,255,255,.3)"}}>
          Opening {fmtRupee(parseFloat(props.acctSettings.opening_balance||0))} + Maint {fmtRupee(props.totalMaint)} + Corpus {fmtRupee(props.totalCorpus)} + Other {fmtRupee(props.totalOtherInc+props.fdMatured)} − Exp {fmtRupee(props.totalExpAmt)}
        </div>
      </div>

      <div className="section"><div className="sec-title">Quick Actions</div></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,padding:"0 16px 12px"}}>
        {[{icon:"🏢",label:"All Flats",action:function(){props.setTab("flats");}},{icon:"🚨",label:"Overdue",action:function(){props.setTab("overdue");}},{icon:"💰",label:"Income",action:function(){props.setTab("income");}},{icon:"📤",label:"Reminders",action:function(){props.showToast("📤 Reminders sent to "+props.overdCnt+" defaulters");}}].map(function(q){
          return <button key={q.label} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:"pointer",background:"none",border:"none"}} onClick={q.action}><div style={{width:52,height:52,borderRadius:13,background:"var(--card)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:21}}>{q.icon}</div><div style={{fontSize:10.5,fontWeight:600,color:"var(--muted)",textAlign:"center"}}>{q.label}</div></button>;
        })}
      </div>

      {props.overdCnt > 0 && (
        <>
          <div className="section"><div className="sec-title">Not Paid – {monthLabel(props.selMonth)}</div></div>
          <div className="px16 mb14">
            <div className="card">
              {props.monthBills.filter(function(b){return b.status==="overdue";}).map(function(b){
                var f = props.flats.find(function(x){return x.id===b.flat_id;});
                if (!f) return null;
                return (
                  <div key={b.flat_id} className="flat-item" onClick={function(){props.setSelFlat(f);}}>
                    <div className="fi-left"><div className="fi-avatar overdue">{f.flat_no}</div><div><div className="fi-name">Flat {f.flat_no}</div><div className="fi-meta">{f.bhk_type} · Block {f.block}</div></div></div>
                    <div className="fi-right"><div className="fi-amount overdue">{fmtRupee(b.arrears||b.total_amount)}</div><div className="chip overdue">Overdue</div></div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function FlatsTab(props) {
  return (
    <>
      <MonthSelector selMonth={props.selMonth} setSelMonth={props.setSelMonth}/>
      <div className="search-wrap"><span className="search-icon">🔍</span><input className="search-input" placeholder="Search flat or block…" value={props.search} onChange={function(e){props.setSearch(e.target.value);}}/></div>
      <div className="filter-bar">
        {[["all","All"],["paid","Paid"],["overdue","Overdue"],["3bhk","3BHK"],["2bhk","2BHK"],["1bhk","1BHK"]].map(function(x){
          return <button key={x[0]} className={"pill"+(props.filter===x[0]?" active":"")} onClick={function(){props.setFilter(x[0]);}}>{x[1]}</button>;
        })}
      </div>
      <div className="px16 mb14">
        <div className="card">
          {props.filteredFlats.length===0 && <div className="empty"><div className="empty-icon">🏢</div><div>No flats match</div></div>}
          {props.filteredFlats.map(function(f) {
            var st = props.getStatusForFlat(f.id);
            var bill = props.getBillForFlat(f.id);
            var displaySt = (st === "no-data") ? "paid" : st; // no bill = treat as paid for display
            return (
              <div key={f.id} className="flat-item" onClick={function(){props.setSelFlat(f);}}>
                <div className="fi-left"><div className={"fi-avatar "+displaySt}>{f.flat_no}</div><div><div className="fi-name">Flat {f.flat_no} <span style={{fontSize:11,color:"var(--muted)",fontWeight:400}}>· {f.bhk_type}</span></div><div className="fi-meta">Block {f.block} · {f.occupancy==="owner"?"Owner Occupied":"Rented"}</div></div></div>
                <div className="fi-right">
                  {displaySt==="paid"
                    ? <div className="fi-amount paid">{fmtRupee(bill?bill.total_amount:f.monthly_charge)}</div>
                    : <div className={"fi-amount "+displaySt}>{fmtRupee(bill&&bill.arrears?bill.arrears:f.monthly_charge)}</div>}
                  <div className={"chip "+displaySt}>{displaySt==="paid"?"Paid":"Overdue"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function OverdueTab(props) {
  var [view, setView] = useState("flat");
  var overdueFlats = props.flats.filter(function(f){ return props.overdueByFlat[f.id] && props.overdueByFlat[f.id].length > 0; }).sort(function(a,b){
    var ta = props.overdueByFlat[a.id].reduce(function(s,x){return s+x.amount;},0);
    var tb = props.overdueByFlat[b.id].reduce(function(s,x){return s+x.amount;},0);
    return tb - ta;
  });

  return (
    <>
      <div style={{padding:"14px 16px 8px"}}>
        <div style={{background:"linear-gradient(135deg,#C0392B,#E05B4E)",borderRadius:14,padding:"14px 16px"}}>
          <div style={{color:"rgba(255,255,255,.6)",fontSize:10,letterSpacing:"1px",textTransform:"uppercase",marginBottom:4}}>Total All-Time Outstanding Dues</div>
          <div style={{color:"#FFF",fontSize:28,fontWeight:700,fontFamily:"'Playfair Display',serif"}}>{fmtRupee(props.totalOverdueAmt)}</div>
          <div style={{color:"rgba(255,255,255,.7)",fontSize:12,marginTop:4}}>{overdueFlats.length} flats · 22 months unpaid</div>
        </div>
      </div>

      <div className="income-tabs">
        {[["flat","By Flat"],["year","By Year"],["month","By Month"]].map(function(x){
          return <button key={x[0]} className={"income-tab"+(view===x[0]?" active":"")} onClick={function(){setView(x[0]);}}>{x[1]}</button>;
        })}
      </div>

      {view==="flat" && (
        <div style={{padding:"10px 16px 24px"}}>
          <div className="card">
            {overdueFlats.length===0 && <div className="empty"><div className="empty-icon">✅</div><div>No outstanding dues!</div></div>}
            {overdueFlats.map(function(f){
              var months = props.overdueByFlat[f.id] || [];
              var tot = months.reduce(function(s,x){return s+x.amount;},0);
              return (
                <div key={f.id} style={{borderBottom:"1px solid var(--border)"}}>
                  <div className="flat-item" onClick={function(){props.setSelFlat(f);}} style={{borderBottom:"none"}}>
                    <div className="fi-left"><div className="fi-avatar overdue">{f.flat_no}</div><div><div className="fi-name">Flat {f.flat_no} <span style={{fontSize:11,color:"var(--muted)",fontWeight:400}}>· {f.bhk_type}</span></div><div className="fi-meta">{months.length} month{months.length>1?"s":""} unpaid · Block {f.block}</div></div></div>
                    <div className="fi-right"><div className="fi-amount overdue">{fmtRupee(tot)}</div><div className="chip overdue">{months.length} Month{months.length>1?"s":""}</div></div>
                  </div>
                  <div style={{padding:"0 16px 10px"}}>
                    {months.slice().sort(function(a,b){return a.month.localeCompare(b.month);}).map(function(m){
                      return <div key={m.month} className="overdue-month-row"><span style={{color:"var(--muted)"}}>{monthLabel(m.month)}</span><span style={{fontWeight:600,color:"var(--red)"}}>{fmtRupee(m.amount)}</span></div>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view==="year" && (
        <div style={{padding:"10px 16px 24px"}}>
          <div className="card">
            {Object.keys(props.overdueByYear).sort().reverse().map(function(yr){
              var yd = props.overdueByYear[yr];
              return (
                <div key={yr} style={{borderBottom:"1px solid var(--border)"}}>
                  <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><div style={{fontSize:15,fontWeight:700}}>FY {yr}</div><div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{Object.keys(yd.flats).length} flats overdue</div></div>
                    <div style={{fontSize:16,fontWeight:700,color:"var(--red)"}}>{fmtRupee(yd.total)}</div>
                  </div>
                  <div style={{padding:"0 16px 10px"}}>
                    {Object.keys(yd.flats).sort().map(function(flat){
                      return <div key={flat} className="overdue-month-row"><span>Flat {flat}</span><span style={{fontWeight:600,color:"var(--red)"}}>{fmtRupee(yd.flats[flat])}</span></div>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view==="month" && (
        <div style={{padding:"10px 16px 24px"}}>
          <div className="card">
            {(function(){
              var byMonth = {};
              Object.keys(props.overdueByFlat).forEach(function(flat){
                props.overdueByFlat[flat].forEach(function(item){
                  if (!byMonth[item.month]) byMonth[item.month] = {total:0,flats:[]};
                  byMonth[item.month].total += item.amount;
                  byMonth[item.month].flats.push({flat:flat, amount:item.amount});
                });
              });
              return Object.keys(byMonth).sort().reverse().map(function(m){
                var md = byMonth[m];
                return (
                  <div key={m} style={{borderBottom:"1px solid var(--border)"}}>
                    <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div><div style={{fontSize:15,fontWeight:700}}>{monthLabel(m)}</div><div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{md.flats.length} flat{md.flats.length>1?"s":""} overdue</div></div>
                      <div style={{fontSize:16,fontWeight:700,color:"var(--red)"}}>{fmtRupee(md.total)}</div>
                    </div>
                    <div style={{padding:"0 16px 10px"}}>
                      {md.flats.map(function(x){
                        return <div key={x.flat} className="overdue-month-row"><span>Flat {x.flat}</span><span style={{fontWeight:600,color:"var(--red)"}}>{fmtRupee(x.amount)}</span></div>;
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </>
  );
}

function IncomeTab(props) {
  var [sec, setSec]           = useState("other");
  var [showForm, setShowForm] = useState(false);
  var [editing, setEditing]   = useState(null);
  var [saving, setSaving]     = useState(false);
  var [formType, setFormType] = useState("other"); // other | corpus | fd
  var [form, setForm]         = useState({});

  var totalFdMat = props.fdData.filter(function(f){return f.status==="matured";}).reduce(function(s,f){return s+(f.matured_amount||0);},0);
  var totalFdInv = props.fdData.reduce(function(s,f){return s+(f.invested_amount||0);},0);

  function openAdd(type) { setFormType(type); setEditing(null); setForm({}); setShowForm(true); }
  function openEdit(type, item) { setFormType(type); setEditing(item); setForm({...item}); setShowForm(true); }

  async function saveForm() {
    setSaving(true);
    var result;
    if (formType === "other") {
      if (!form.source || !form.amount) { props.showToast("⚠️ Fill source and amount"); setSaving(false); return; }
      var data = { source: form.source, amount: parseFloat(form.amount), received_date: form.received_date || null };
      result = editing ? await supabase.from("other_income").update(data).eq("id", editing.id) : await supabase.from("other_income").insert(data);
    } else if (formType === "corpus") {
      if (!form.flat_id || !form.amount) { props.showToast("⚠️ Fill flat and amount"); setSaving(false); return; }
      var data = { flat_id: form.flat_id, amount: parseFloat(form.amount), paid_date: form.paid_date || null, mode: form.mode || "Bank Transfer" };
      result = editing ? await supabase.from("corpus_payments").update(data).eq("id", editing.id) : await supabase.from("corpus_payments").insert(data);
    } else if (formType === "fd") {
      if (!form.account_no || !form.invested_amount) { props.showToast("⚠️ Fill account no and amount"); setSaving(false); return; }
      var data = { account_no: form.account_no, invested_amount: parseFloat(form.invested_amount), invested_date: form.invested_date || null, matured_amount: form.matured_amount ? parseFloat(form.matured_amount) : null, matured_date: form.matured_date || null, status: form.matured_amount ? "matured" : "active" };
      result = editing ? await supabase.from("fixed_deposits").update(data).eq("id", editing.id) : await supabase.from("fixed_deposits").insert(data);
    }
    setSaving(false);
    if (result && result.error) { props.showToast("❌ " + result.error.message); return; }
    props.showToast(editing ? "✅ Updated!" : "✅ Added!");
    setShowForm(false);
    await props.reload();
  }

  async function deleteItem(table, id) {
    if (!window.confirm("Delete this record? This cannot be undone.")) return;
    await supabase.from(table).delete().eq("id", id);
    props.showToast("🗑 Deleted");
    await props.reload();
  }

  var ALL_FLATS_LIST = ["A1","A2","A3","A4","A5","A6","B1","B2","B3","B4","B5","B6","C1","C2","C3","C4","C5","C6","D1D2","D3","D4","D5","E1","E2","E3","E4","F1","F2","F3","F4"];

  return (
    <>
      <div style={{background:"linear-gradient(135deg,#1A1410,#2C2018)",margin:"14px 16px 0",borderRadius:16,padding:"16px 18px"}}>
        <div style={{color:"rgba(255,255,255,.5)",fontSize:10,letterSpacing:"1px",textTransform:"uppercase",marginBottom:12}}>All-Time Income Summary</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[["Maintenance",fmtRupee(props.totalMaint),"1,418 payments"],["Other Income",fmtRupee(props.totalOtherInc),"Interest, rent & refunds"],["Corpus Fund",fmtRupee(props.totalCorpus),"30 flats · one-time"],["FD Matured",fmtRupee(props.fdMatured),"₹"+totalFdInv.toLocaleString("en-IN")+" invested"]].map(function(x){
            return <div key={x[0]}><div style={{color:"rgba(255,255,255,.5)",fontSize:10,marginBottom:3}}>{x[0]}</div><div style={{color:"#FFF",fontSize:17,fontWeight:700}}>{x[1]}</div><div style={{color:"rgba(255,255,255,.4)",fontSize:10,marginTop:1}}>{x[2]}</div></div>;
          })}
        </div>
      </div>

      <div className="income-tabs">
        {[["other","Other Income"],["corpus","Corpus Fund"],["fd","Fixed Deposits"]].map(function(x){
          return <button key={x[0]} className={"income-tab"+(sec===x[0]?" active":"")} onClick={function(){setSec(x[0]);}}>{x[1]}</button>;
        })}
      </div>

      {/* ── Other Income ── */}
      {sec==="other" && (
        <div style={{padding:"10px 16px 24px"}}>
          <div className="row-between mb14" style={{marginBottom:10}}>
            <div style={{fontSize:12,color:"var(--muted)"}}>{props.otherIncome.filter(function(x){return x.source!=="Opening Bank Balance";}).length} records</div>
            <button className="add-btn" onClick={function(){openAdd("other");}}>＋ Add Income</button>
          </div>
          <div className="card">
            {props.otherIncome.filter(function(x){return x.source!=="Opening Bank Balance";}).map(function(item,i){
              var icon = item.source&&(item.source.toLowerCase().includes("fd")||item.source.toLowerCase().includes("fixed"))?"🏦":item.source&&item.source.toLowerCase().includes("interest")?"📈":"💵";
              return (
                <div key={item.id||i} className="income-item">
                  <div className="income-icon" style={{background:"#1A2A3A"}}>{icon}</div>
                  <div className="income-info"><div className="income-src">{item.source}</div><div className="income-date">{item.received_date||"Date not recorded"}</div></div>
                  <div style={{textAlign:"right"}}>
                    <div className="income-amt">{fmtRupee(item.amount)}</div>
                    <div style={{display:"flex",gap:4,marginTop:4}}>
                      <button onClick={function(){openEdit("other",item);}} style={{border:"none",background:"var(--bg)",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer",color:"var(--gold)"}}>✏️</button>
                      <button onClick={function(){deleteItem("other_income",item.id);}} style={{border:"none",background:"var(--bg)",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer",color:"var(--red)"}}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Corpus Fund ── */}
      {sec==="corpus" && (
        <div style={{padding:"10px 16px 24px"}}>
          <div style={{background:"linear-gradient(135deg,#B8860B,#D4A853)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
            <div style={{color:"rgba(255,255,255,.7)",fontSize:10,letterSpacing:"1px",textTransform:"uppercase"}}>Total Corpus Fund</div>
            <div style={{color:"#FFF",fontSize:26,fontWeight:700,fontFamily:"'Playfair Display',serif",marginTop:4}}>{fmtRupee(props.totalCorpus)}</div>
            <div style={{color:"rgba(255,255,255,.7)",fontSize:12,marginTop:4}}>{props.corpusData.length} of 30 flats paid</div>
          </div>
          <div className="row-between" style={{marginBottom:10}}>
            <div style={{fontSize:12,color:"var(--muted)"}}>{props.corpusData.length} entries</div>
            <button className="add-btn" onClick={function(){openAdd("corpus");}}>＋ Add Entry</button>
          </div>
          <div className="card">
            {props.corpusData.map(function(c,i){
              return (
                <div key={c.id||i} className="corpus-item">
                  <div><div className="corpus-flat">Flat {c.flat_id}</div><div className="corpus-date">{c.paid_date||"—"} · {c.mode||"—"}</div></div>
                  <div style={{textAlign:"right"}}>
                    <div className="corpus-amt">{fmtRupee(c.amount)}</div>
                    <div style={{display:"flex",gap:4,marginTop:4}}>
                      <button onClick={function(){openEdit("corpus",c);}} style={{border:"none",background:"var(--bg)",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer",color:"var(--gold)"}}>✏️</button>
                      <button onClick={function(){deleteItem("corpus_payments",c.id);}} style={{border:"none",background:"var(--bg)",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer",color:"var(--red)"}}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Fixed Deposits ── */}
      {sec==="fd" && (
        <div style={{padding:"10px 16px 24px"}}>
          <div className="row-between" style={{marginBottom:10}}>
            <div style={{fontSize:12,color:"var(--muted)"}}>{props.fdData.length} FD account{props.fdData.length!==1?"s":""}</div>
            <button className="add-btn" onClick={function(){openAdd("fd");}}>＋ Add FD</button>
          </div>
          {props.fdData.map(function(fd,i){
            return (
              <div key={fd.id||i} className="fd-card" style={{marginBottom:12}}>
                <div className="fd-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div className="fd-acc">A/c: {fd.account_no}</div>
                    <div className="fd-amt">{fmtRupee(fd.invested_amount)}</div>
                    <div className={"fd-status "+(fd.status==="matured"?"fd-matured":"fd-active")}>{fd.status==="matured"?"✓ Matured":"⏳ Active"}</div>
                  </div>
                  <div style={{display:"flex",gap:6,marginTop:4}}>
                    <button onClick={function(){openEdit("fd",fd);}} style={{border:"none",background:"rgba(255,255,255,.15)",borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer",color:"#FFF"}}>✏️ Edit</button>
                    <button onClick={function(){deleteItem("fixed_deposits",fd.id);}} style={{border:"none",background:"rgba(255,255,255,.15)",borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer",color:"#FFC0C0"}}>🗑</button>
                  </div>
                </div>
                <div>
                  {[["Invested",fmtRupee(fd.invested_amount)],["Invested Date",fd.invested_date||"—"],["Matured Amount",fd.matured_amount?fmtRupee(fd.matured_amount):"Not yet matured"],["Maturity Date",fd.matured_date||"—"],fd.matured_amount&&["Interest Earned",fmtRupee(fd.matured_amount-fd.invested_amount)]].filter(Boolean).map(function(row){
                    return <div key={row[0]} className="info-row"><span className="ir-label">{row[0]}</span><span className="ir-value">{row[1]}</span></div>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add/Edit Sheet ── */}
      {showForm && (
        <div className="overlay" onClick={function(){setShowForm(false);}}>
          <div className="sheet" onClick={function(e){e.stopPropagation();}}>
            <div className="sheet-handle"/>
            <div className="sheet-head">
              <div>
                <div className="sheet-title">{editing?"Edit":"Add"} {formType==="other"?"Income":formType==="corpus"?"Corpus Entry":"Fixed Deposit"}</div>
                <div className="sheet-sub">* required fields</div>
              </div>
              <button className="close-btn" onClick={function(){setShowForm(false);}}>✕</button>
            </div>
            <div className="sheet-body">
              {formType==="other" && <>
                <div className="form-group"><label className="form-label">Source *</label><input className="form-input" placeholder="e.g. Bank Interest, Gym Rent" value={form.source||""} onChange={function(e){setForm(function(p){return{...p,source:e.target.value};});}}/></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div className="form-group"><label className="form-label">Amount (₹) *</label><input className="form-input" type="number" placeholder="0" value={form.amount||""} onChange={function(e){setForm(function(p){return{...p,amount:e.target.value};});}}/></div>
                  <div className="form-group"><label className="form-label">Date Received</label><input className="form-input" type="date" value={form.received_date||""} onChange={function(e){setForm(function(p){return{...p,received_date:e.target.value};});}}/></div>
                </div>
              </>}

              {formType==="corpus" && <>
                <div className="form-group"><label className="form-label">Flat *</label>
                  <select className="form-input" value={form.flat_id||""} onChange={function(e){setForm(function(p){return{...p,flat_id:e.target.value};});}}>
                    <option value="">Select Flat</option>
                    {ALL_FLATS_LIST.map(function(f){return <option key={f} value={f}>{f}</option>;})}
                  </select>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div className="form-group"><label className="form-label">Amount (₹) *</label><input className="form-input" type="number" placeholder="5000" value={form.amount||""} onChange={function(e){setForm(function(p){return{...p,amount:e.target.value};});}}/></div>
                  <div className="form-group"><label className="form-label">Date Paid</label><input className="form-input" type="date" value={form.paid_date||""} onChange={function(e){setForm(function(p){return{...p,paid_date:e.target.value};});}}/></div>
                </div>
                <div className="form-group"><label className="form-label">Mode</label>
                  <select className="form-input" value={form.mode||"Bank Transfer"} onChange={function(e){setForm(function(p){return{...p,mode:e.target.value};});}}>
                    {["Cash","UPI","NEFT","IMPS","Cheque","Bank Transfer"].map(function(m){return <option key={m}>{m}</option>;})}
                  </select>
                </div>
              </>}

              {formType==="fd" && <>
                <div className="form-group"><label className="form-label">Account Number *</label><input className="form-input" placeholder="e.g. 270213007407" value={form.account_no||""} onChange={function(e){setForm(function(p){return{...p,account_no:e.target.value};});}}/></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div className="form-group"><label className="form-label">Invested Amount *</label><input className="form-input" type="number" placeholder="0" value={form.invested_amount||""} onChange={function(e){setForm(function(p){return{...p,invested_amount:e.target.value};});}}/></div>
                  <div className="form-group"><label className="form-label">Invested Date</label><input className="form-input" type="date" value={form.invested_date||""} onChange={function(e){setForm(function(p){return{...p,invested_date:e.target.value};});}}/></div>
                </div>
                <div style={{padding:"10px 0 6px",fontSize:12,fontWeight:600,color:"var(--muted)",letterSpacing:".5px",textTransform:"uppercase"}}>Maturity details (fill when FD matures)</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div className="form-group"><label className="form-label">Matured Amount</label><input className="form-input" type="number" placeholder="Leave blank if active" value={form.matured_amount||""} onChange={function(e){setForm(function(p){return{...p,matured_amount:e.target.value};});}}/></div>
                  <div className="form-group"><label className="form-label">Maturity Date</label><input className="form-input" type="date" value={form.matured_date||""} onChange={function(e){setForm(function(p){return{...p,matured_date:e.target.value};});}}/></div>
                </div>
              </>}

              <button className="btn btn-success" onClick={saveForm} disabled={saving}>{saving?<span className="spinner"/>:(editing?"✅ Update":"✅ Save")}</button>
              <button className="btn btn-secondary mt10" onClick={function(){setShowForm(false);}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ExpensesTab(props) {
  var [viewAll, setViewAll]   = useState(false);
  var [showForm, setShowForm] = useState(false);
  var [editing, setEditing]   = useState(null);
  var [saving, setSaving]     = useState(false);
  var [deleting, setDeleting] = useState(null);
  var CATS = ["Salary","Electricity","Sewage","Repairs","Cleaning","Maintenance","Staff Welfare","Admin","Other"];
  var emptyForm = {vendor:"",category:"Salary",amount:"",expense_date:"",billing_month:props.selMonth,invoice_no:""};
  var [form, setForm]         = useState(emptyForm);

  var displayed = viewAll ? props.allExpenses : props.monthExp;
  var total = displayed.reduce(function(s,e){return s+e.amount;},0);
  var bycat = {};
  displayed.forEach(function(e){ bycat[e.category]=(bycat[e.category]||0)+e.amount; });

  function openAdd() { setForm({...emptyForm, billing_month:props.selMonth}); setEditing(null); setShowForm(true); }
  function openEdit(e) { setForm({vendor:e.vendor||"",category:e.category||"Other",amount:String(e.amount||""),expense_date:e.expense_date||"",billing_month:e.billing_month||props.selMonth,invoice_no:e.invoice_no||""}); setEditing(e); setShowForm(true); }

  async function saveExpense() {
    if (!form.vendor || !form.amount || !form.expense_date) { props.showToast("⚠️ Fill vendor, amount and date"); return; }
    setSaving(true);
    var data = { vendor:form.vendor.trim(), category:form.category, amount:parseFloat(form.amount), expense_date:form.expense_date, billing_month:form.billing_month, invoice_no:form.invoice_no.trim()||null };
    var result;
    if (editing) result = await supabase.from("expenses").update(data).eq("id", editing.id);
    else result = await supabase.from("expenses").insert(data);
    setSaving(false);
    if (result.error) { props.showToast("❌ "+result.error.message); return; }
    props.showToast(editing ? "✅ Expense updated!" : "✅ Expense added!");
    setShowForm(false);
    await props.reload();
  }

  async function deleteExpense(e) {
    if (!window.confirm("Delete this expense? This cannot be undone.")) return;
    setDeleting(e.id);
    await supabase.from("expenses").delete().eq("id", e.id);
    setDeleting(null);
    props.showToast("🗑 Expense deleted");
    await props.reload();
  }

  return (
    <>
      {!viewAll && <MonthSelector selMonth={props.selMonth} setSelMonth={props.setSelMonth}/>}
      <div style={{padding:"0 16px 10px",marginTop:viewAll?14:0}}>
        <div className="card">
          <div style={{padding:"14px 16px 12px"}}>
            <div style={{fontSize:10,letterSpacing:"1.2px",textTransform:"uppercase",color:"var(--muted)",marginBottom:6,fontWeight:700}}>{viewAll?"All-Time Expenses":"Expenses – "+monthLabel(props.selMonth)}</div>
            <div style={{fontSize:26,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"var(--red)"}}>{fmtRupee(total)}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:10}}>
              {Object.keys(bycat).sort(function(a,b){return bycat[b]-bycat[a];}).map(function(c){
                return <div key={c} style={{background:"var(--bg)",borderRadius:7,padding:"4px 10px",fontSize:11,fontWeight:600}}>{catEmoji(c)} {c}: {fmtRupee(bycat[c])}</div>;
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="section row-between">
        <div className="sec-title" style={{marginBottom:0}}>{viewAll?"All Expenses ("+props.allExpenses.length+")":monthLabel(props.selMonth)+" ("+props.monthExp.length+")"}</div>
        <div style={{display:"flex",gap:8}}>
          <button className="add-btn" onClick={openAdd}>＋ Add</button>
          <button className="add-btn" style={{background:viewAll?"var(--muted)":"var(--gold)"}} onClick={function(){setViewAll(function(v){return !v;});}}>
            {viewAll?"📅 Month":"📋 All"}
          </button>
        </div>
      </div>

      <div className="px16 mb14 mt10">
        <div className="card">
          {displayed.length===0 && <div className="empty"><div className="empty-icon">💳</div><div>No expenses for this {viewAll?"period":"month"}</div></div>}
          {displayed.map(function(e,i){
            return (
              <div key={e.id||i} className="exp-item" style={{position:"relative"}}>
                <div className="exp-icon">{catEmoji(e.category)}</div>
                <div className="exp-info"><div className="exp-vendor">{e.vendor}</div><div className="exp-cat">{e.category}{e.billing_month?" · "+monthLabel(e.billing_month):""}{e.invoice_no?" · "+e.invoice_no:""}</div></div>
                <div className="exp-right" style={{textAlign:"right"}}>
                  <div className="exp-amount">{fmtRupee(e.amount)}</div>
                  <div className="exp-date">{e.expense_date}</div>
                  <div style={{display:"flex",gap:4,marginTop:4,justifyContent:"flex-end"}}>
                    <button onClick={function(){openEdit(e);}} style={{border:"none",background:"var(--bg)",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer",color:"var(--gold)"}}>✏️ Edit</button>
                    <button onClick={function(){deleteExpense(e);}} disabled={deleting===e.id} style={{border:"none",background:"var(--bg)",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer",color:"var(--red)"}}>🗑</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showForm && (
        <div className="overlay" onClick={function(){setShowForm(false);}}>
          <div className="sheet" onClick={function(e){e.stopPropagation();}}>
            <div className="sheet-handle"/>
            <div className="sheet-head">
              <div><div className="sheet-title">{editing?"Edit Expense":"Add Expense"}</div><div className="sheet-sub">All fields marked * are required</div></div>
              <button className="close-btn" onClick={function(){setShowForm(false);}}>✕</button>
            </div>
            <div className="sheet-body">
              <div className="form-group"><label className="form-label">Vendor / Description *</label><input className="form-input" placeholder="e.g. TNEB, CleanPro" value={form.vendor} onChange={function(e){setForm(function(p){return{...p,vendor:e.target.value};});}}/></div>
              <div className="form-group"><label className="form-label">Category *</label>
                <select className="form-input" value={form.category} onChange={function(e){setForm(function(p){return{...p,category:e.target.value};});}}>
                  {CATS.map(function(c){return <option key={c}>{c}</option>;})}
                </select>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div className="form-group"><label className="form-label">Amount (₹) *</label><input className="form-input" type="number" placeholder="0" value={form.amount} onChange={function(e){setForm(function(p){return{...p,amount:e.target.value};});}}/></div>
                <div className="form-group"><label className="form-label">Date *</label><input className="form-input" type="date" value={form.expense_date} onChange={function(e){setForm(function(p){return{...p,expense_date:e.target.value};});}}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div className="form-group"><label className="form-label">Billing Month</label>
                  <select className="form-input" value={form.billing_month} onChange={function(e){setForm(function(p){return{...p,billing_month:e.target.value};});}}>
                    {ALL_MONTHS.slice().reverse().map(function(m){return <option key={m} value={m}>{monthLabel(m)}</option>;})}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Invoice No</label><input className="form-input" placeholder="Optional" value={form.invoice_no} onChange={function(e){setForm(function(p){return{...p,invoice_no:e.target.value};});}}/></div>
              </div>
              <button className="btn btn-success" onClick={saveExpense} disabled={saving}>{saving?<span className="spinner"/>:(editing?"✅ Update Expense":"✅ Save Expense")}</button>
              <button className="btn btn-secondary mt10" onClick={function(){setShowForm(false);}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
