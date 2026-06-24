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

// Dynamic month list — always includes current month + 1 future month
function getCurrentMonth() {
  var now = new Date();
  return now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0");
}
function getNextMonth(bm) {
  var y = parseInt(bm.slice(0,4)), m = parseInt(bm.slice(5,7));
  if (m === 12) return (y+1) + "-01";
  return y + "-" + String(m+1).padStart(2,"0");
}
function buildMonthList() {
  var months = [];
  var y = 2022, m = 6;
  // Always go up to next month from today (so current month is always included)
  var now = new Date();
  var endY = now.getFullYear(), endM = now.getMonth() + 2; // +2 = next month
  if (endM > 12) { endM = 1; endY++; }
  while (true) {
    var bm = y + "-" + String(m).padStart(2,"0");
    months.push(bm);
    if (y > endY || (y === endY && m >= endM)) break;
    m++; if (m > 12) { m = 1; y++; }
    if (months.length > 120) break;
  }
  return months;
}
var ALL_MONTHS = buildMonthList();

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
  var [secs, setSecs] = useState(0);
  useEffect(function(){
    var t = setInterval(function(){ setSecs(function(s){return s+1;}); },1000);
    return function(){ clearInterval(t); };
  },[]);
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
      {secs >= 6 && props.retry && (
        <div style={{marginTop:20,textAlign:"center"}}>
          <div style={{color:"rgba(255,255,255,.3)",fontSize:12,marginBottom:8}}>Taking longer than usual…</div>
          <button onClick={props.retry} style={{background:"var(--gold)",color:"#FFF",border:"none",borderRadius:10,padding:"10px 24px",fontSize:14,fontWeight:600,cursor:"pointer"}}>
            🔄 Retry
          </button>
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
  var [liveBalance,      setLiveBalance]      = useState(null);
  var [maintenanceSlabs, setMaintenanceSlabs] = useState([]);
  var [ebDetails,        setEbDetails]        = useState([]);
  var [employeeDetails,  setEmployeeDetails]  = useState([]);
  var [aptInfo,          setAptInfo]          = useState({});
  var [selMonth, setSelMonth] = useState(getCurrentMonth());
  var [selFlat, setSelFlat] = useState(null);
  var [filter, setFilter] = useState("all");
  var [search, setSearch] = useState("");
  var [toast, setToast] = useState(null);
  var [payModal, setPayModal] = useState(false);
  var [noticePanel, setNoticePanel] = useState(null);
  var [payForm, setPayForm] = useState({amount:"",mode:"Cash",ref:"",payType:"current",months:[]});

  // Auto-generate bills for a new month when it doesn't exist yet
  var autoGenBills = useCallback(async function(month, summary) {
    if (summary) return; // bills already exist for this month
    var FLAT_BHK = {
      "A1":"3BHK","A2":"3BHK","A3":"3BHK","A4":"3BHK","A5":"3BHK","A6":"3BHK",
      "B1":"2BHK","B2":"2BHK","B3":"2BHK","B4":"1BHK","B5":"2BHK","B6":"2BHK",
      "C1":"2BHK","C2":"2BHK","C3":"2BHK","C4":"1BHK","C5":"2BHK","C6":"2BHK",
      "D1D2":"3BHK","D3":"2BHK","D4":"1BHK","D5":"1BHK",
      "E1":"2BHK","E2":"3BHK","E3":"1BHK","E4":"2BHK",
      "F1":"2BHK","F2":"2BHK","F3":"2BHK","F4":"2BHK"
    };
    var CHARGES = {"3BHK":2000,"2BHK":1800,"1BHK":1600};
    var y = parseInt(month.slice(0,4)), m = parseInt(month.slice(5,7));
    var dueM = m===12?"01":String(m+1).padStart(2,"0");
    var dueY = m===12?y+1:y;
    var dueDate = dueY+"-"+dueM+"-10";
    var rows = Object.entries(FLAT_BHK).map(function(e){
      var charge = CHARGES[e[1]];
      return {flat_id:e[0],billing_month:month,total_amount:charge,arrears:charge,due_date:dueDate,status:"overdue"};
    });
    await supabase.from("bills").upsert(rows, {onConflict:"flat_id,billing_month",ignoreDuplicates:true});
    console.log("Auto-generated bills for "+month);
  }, []);

  // loadMonthData: fetch bills only for the selected month (30 rows max)
  var loadMonthData = useCallback(async function(month) {
    var result = await supabase
      .from("flat_month_status")
      .select("*")
      .eq("billing_month", month);
    if (result.data && result.data.length > 0) {
      setMonthBillsData(result.data);
    } else {
      // No bills for this month — auto-generate them
      await autoGenBills(month, null);
      var result2 = await supabase.from("flat_month_status").select("*").eq("billing_month", month);
      if (result2.data) setMonthBillsData(result2.data);
      // Refresh summaries too
      var s = await supabase.from("monthly_summary").select("*").order("billing_month",{ascending:false});
      if (s.data) setMonthlySummaries(s.data);
    }
  }, [autoGenBills]);

  var loadData = useCallback(async function() {
    setDataLoading(true);
    try {
      var results = await Promise.all([
        supabase.from("flats").select("*").order("block").order("flat_no"),
        supabase.from("monthly_summary").select("*").order("billing_month",{ascending:false}),
        supabase.from("overdue_summary").select("*").order("flat_id").order("billing_month"),
        supabase.from("expenses").select("*").order("expense_date",{ascending:false}).limit(500),
        supabase.from("notices").select("*").order("posted_at",{ascending:false}),
        supabase.from("other_income").select("*").order("received_date",{ascending:false}),
        supabase.from("corpus_payments").select("*").order("paid_date",{ascending:false}),
        supabase.from("fixed_deposits").select("*").order("invested_date",{ascending:false}),
        supabase.from("account_settings").select("*"),
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
        results[8].data.forEach(function(row){ settings[row.key]=row.value; });
        setAcctSettings(settings);
      }
      if (results[9].data) setAllPayments(results[9].data);

      // Info tables
      var [slabs, ebs, emps, info] = await Promise.all([
        supabase.from("maintenance_slabs").select("*").order("start_month"),
        supabase.from("eb_details").select("*").order("block_name"),
        supabase.from("employee_details").select("*").order("name"),
        supabase.from("apartment_info").select("*"),
      ]);
      if (slabs.data) setMaintenanceSlabs(slabs.data);
      if (ebs.data)   setEbDetails(ebs.data);
      if (emps.data)  setEmployeeDetails(emps.data);
      if (info.data)  { var ai={}; info.data.forEach(function(r){ai[r.key]=r.value;}); setAptInfo(ai); }

      // Live balance — separate so failure doesn't block everything
      try {
        var lb = await supabase.from("live_bank_balance").select("*").single();
        if (lb.data) setLiveBalance(lb.data);
      } catch(e2) { console.log("live_bank_balance not ready"); }

    } catch(e) { console.error("loadData error:",e); }
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
    if (session && !session.temp) loadData();
  }, [session, loadData]);

  // When selMonth changes, load that month's flat bills (30 rows)
  useEffect(function() {
    if (session && flats.length > 0) loadMonthData(selMonth);
  }, [selMonth, session, flats.length, loadMonthData]);

  // Safety timeout — if data doesn't load in 8 seconds, retry once
  useEffect(function() {
    if (!session) return;
    var timer = setTimeout(function() {
      if (flats.length === 0 && !appLoading) {
        console.log("Data load timeout — retrying...");
        loadData();
      }
    }, 8000);
    return function() { clearTimeout(timer); };
  }, [session, flats.length, appLoading, loadData]);

  function showToast(msg) { setToast(msg); setTimeout(function(){ setToast(null); }, 2800); }

  async function handleLogout() {
    localStorage.removeItem("pallazo_temp_session");
    if (session && !session.temp) await supabase.auth.signOut();
    setSession(null); setUserProfile(null);
    showToast("Logged out");
  }

  async function handlePayment() {
    var flat = selFlat;
    var today = new Date().toISOString().split("T")[0];
    var charge = flat.monthly_charge;

    if (payForm.payType === "current") {
      var amt = parseInt(payForm.amount, 10);
      if (!amt || amt <= 0) { showToast("⚠️ Enter a valid amount"); return; }
      var r = await supabase.from("payments").insert({
        flat_id:flat.id, billing_month:selMonth, amount_paid:amt,
        mode:payForm.mode, reference:payForm.ref||null, payment_date:today
      });
      if (r.error) { showToast("❌ "+r.error.message); return; }
      await supabase.from("bills").update({status:"paid",arrears:0})
        .eq("flat_id",flat.id).eq("billing_month",selMonth);
      showToast("✅ Payment saved for "+monthLabel(selMonth));

    } else {
      // Advance payment — multiple months
      if (!payForm.months || payForm.months.length === 0) {
        showToast("⚠️ Select at least one month"); return;
      }
      var inserts = payForm.months.map(function(bm) {
        return { flat_id:flat.id, billing_month:bm, amount_paid:charge,
                 mode:payForm.mode, reference:payForm.ref||null, payment_date:today };
      });
      var r2 = await supabase.from("payments").insert(inserts);
      if (r2.error) { showToast("❌ "+r2.error.message); return; }
      // Mark each month as paid (create bill if missing)
      for (var i = 0; i < payForm.months.length; i++) {
        var bm = payForm.months[i];
        var y = parseInt(bm.slice(0,4)), m = parseInt(bm.slice(5,7));
        var dueM = m===12?"01":String(m+1).padStart(2,"0");
        var dueY = m===12?y+1:y;
        await supabase.from("bills").upsert(
          { flat_id:flat.id, billing_month:bm, total_amount:charge, arrears:0,
            due_date:dueY+"-"+dueM+"-10", status:"paid" },
          { onConflict:"flat_id,billing_month" }
        );
        await supabase.from("bills").update({status:"paid",arrears:0})
          .eq("flat_id",flat.id).eq("billing_month",bm);
      }
      showToast("✅ Advance payment saved for "+payForm.months.length+" month(s)!");
    }

    await loadData();
    await loadMonthData(selMonth);
    setPayModal(false);
    setPayForm({amount:"",mode:"Cash",ref:"",payType:"current",months:[]});
  }

  // Render guards
  if (appLoading) return <LoadingScreen msg="Loading Antony Pallazo…"/>;
  if (!session) return <LoginScreen onLogin={function(s) {
    if (s.temp) { localStorage.setItem("pallazo_temp_session", JSON.stringify(s)); setUserProfile(s.profile); }
    else loadUserProfile(s.user.id);
    setSession(s);
  }}/>;
  if (dataLoading || flats.length === 0) return <LoadingScreen msg="Loading apartment data…" dots retry={function(){ loadData(); }}/>;

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

  // Use live calculated balance (updates instantly when payments/expenses added)
  var lb = liveBalance || {};
  var bankBal    = parseFloat(lb.net_bank_balance   || acctSettings.net_bank_balance   || 0);
  var activeFD   = parseFloat(lb.active_fd_amount   || acctSettings.active_fd_amount   || 0);
  var totalMaint = parseFloat(lb.total_maintenance  || acctSettings.total_maintenance  || 0);
  var totalCorpus= parseFloat(lb.total_corpus       || acctSettings.total_corpus       || 0);
  var totalOtherInc=parseFloat(lb.total_other_income|| acctSettings.total_other_income || 0);
  var fdMatured  = parseFloat(lb.total_fd_matured   || acctSettings.total_fd_matured   || 0);
  var totalExpAmt= parseFloat(lb.total_expenses     || acctSettings.total_expenses     || 0);
  var openingBal = parseFloat(lb.opening_balance    || acctSettings.opening_balance    || 0);
  var totalIncome= openingBal + totalMaint + totalCorpus + totalOtherInc + fdMatured;

  var sharedProps = {
    flats, monthlySummaries, monthBillsData, overdueBills, allPayments, allExpenses,
    notices, showToast, setTab, userProfile, selMonth, setSelMonth,
    getBillForFlat, getStatusForFlat,
    monthBills, monthExp, collected, totalDues, expected, paidCnt, overdCnt, partCnt,
    monthlyExp, totalExp, collPct, overdueByFlat, overdueByYear, totalOverdueAmt,
    otherIncome, corpusData, fdData, acctSettings,
    bankBal, activeFD, totalMaint, totalCorpus, totalOtherInc, fdMatured,
    totalExpAmt, totalIncome, filteredFlats, filter, setFilter, search, setSearch,
    selFlat: selFlat, setSelFlat: setSelFlat,
    loadMonthData: loadMonthData, setMonthlySummaries: setMonthlySummaries,
    maintenanceSlabs, ebDetails, employeeDetails, aptInfo,
    setMaintenanceSlabs, setEbDetails, setEmployeeDetails, setAptInfo
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
        {tab==="info"     && <InfoTab     {...sharedProps} reload={loadData}/>}
      </div>

      <nav className="tabbar">
        {[{id:"home",icon:"🏠",label:"Home"},{id:"flats",icon:"🏢",label:"Flats"},{id:"overdue",icon:"🚨",label:"Overdue"},{id:"income",icon:"💰",label:"Income"},{id:"expenses",icon:"💳",label:"Expenses"},{id:"info",icon:"ℹ️",label:"Info"}].map(function(t){
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
                <button className="btn btn-success" onClick={async function(){
                  var bill = getBillForFlat(selFlat.id);
                  if (!bill) { showToast("⚠️ No bill found for "+monthLabel(selMonth)); return; }
                  await supabase.from("bills").update({status:"paid",arrears:0}).eq("flat_id",selFlat.id).eq("billing_month",selMonth);
                  await supabase.from("payments").insert({flat_id:selFlat.id,billing_month:selMonth,amount_paid:selFlat.monthly_charge,mode:"Cash",payment_date:new Date().toISOString().split("T")[0]});
                  showToast("✅ Flat "+selFlat.flat_no+" marked as paid for "+monthLabel(selMonth));
                  setSelFlat(null);
                  await loadMonthData(selMonth);
                  var s = await supabase.from("monthly_summary").select("*").order("billing_month",{ascending:false});
                  if (s.data) setMonthlySummaries(s.data);
                }}>✓ Mark Paid</button>
                <button className="btn btn-secondary" onClick={function(){showToast("💬 Reminder sent to Flat "+selFlat.flat_no);}}>💬 Remind</button>
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
              <div>
                <div className="sheet-title">Record Payment</div>
                <div className="sheet-sub">Flat {selFlat.flat_no} · {fmtRupee(selFlat.monthly_charge)}/month</div>
              </div>
              <button className="close-btn" onClick={function(){setPayModal(false);}}>✕</button>
            </div>
            <div className="sheet-body">

              {/* Payment type toggle */}
              <div style={{display:"flex",gap:0,marginBottom:16,borderRadius:10,overflow:"hidden",border:"1.5px solid var(--border)"}}>
                {[["current","📅 Current Month"],["advance","⏩ Advance"]].map(function(x){
                  return (
                    <button key={x[0]} onClick={function(){
                      setPayForm(function(p){return Object.assign({},p,{payType:x[0],months:[],
                        amount:x[0]==="current"?String(selFlat.monthly_charge):"" });});
                    }} style={{flex:1,padding:"10px 6px",border:"none",cursor:"pointer",
                      fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",
                      background:payForm.payType===x[0]?"var(--gold)":"var(--card)",
                      color:payForm.payType===x[0]?"#FFF":"var(--muted)"}}>
                      {x[1]}
                    </button>
                  );
                })}
              </div>

              {/* Current month */}
              {payForm.payType==="current" && (
                <>
                  <div style={{background:"var(--bg)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13}}>
                    <span style={{color:"var(--muted)"}}>Month: </span><span style={{fontWeight:600}}>{monthLabel(selMonth)}</span>
                    <span style={{color:"var(--muted)",marginLeft:12}}>Expected: </span><span style={{fontWeight:600,color:"var(--gold)"}}>{fmtRupee(selFlat.monthly_charge)}</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount Received (₹)</label>
                    <input className="form-input" type="number" placeholder={"e.g. "+selFlat.monthly_charge}
                      value={payForm.amount} onChange={function(e){setPayForm(function(p){return Object.assign({},p,{amount:e.target.value});});}}/>
                  </div>
                </>
              )}

              {/* Advance payment */}
              {payForm.payType==="advance" && (
                <>
                  <div style={{background:"#E8F5EE",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"var(--green)",fontWeight:500}}>
                    ✅ Select months to pay in advance · {fmtRupee(selFlat.monthly_charge)} per month
                  </div>
                  <div className="form-group">
                    <label className="form-label">Select Months (current + next 18)</label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:6}}>
                      {(function(){
                        var shown = [];
                        var now = new Date();
                        var y = now.getFullYear(), m = now.getMonth()+1;
                        for(var i=0;i<19;i++){
                          shown.push(y+"-"+String(m).padStart(2,"0"));
                          m++; if(m>12){m=1;y++;}
                        }
                        return shown;
                      })().map(function(bm){
                        var isSel = payForm.months.indexOf(bm)!==-1;
                        return (
                          <button key={bm} onClick={function(){
                            setPayForm(function(p){
                              var nm = isSel ? p.months.filter(function(x){return x!==bm;}) : p.months.concat([bm]);
                              return Object.assign({},p,{months:nm, amount:String(selFlat.monthly_charge*nm.length)});
                            });
                          }} style={{padding:"6px 12px",borderRadius:99,border:"1.5px solid",cursor:"pointer",
                            fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",
                            borderColor:isSel?"var(--green)":"var(--border)",
                            background:isSel?"#E8F5EE":"var(--card)",
                            color:isSel?"var(--green)":"var(--muted)"}}>
                            {isSel?"✓ ":""}{monthLabel(bm)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {payForm.months.length>0 && (
                    <div style={{background:"var(--bg)",borderRadius:10,padding:"10px 14px",marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
                        <span style={{color:"var(--muted)"}}>{payForm.months.length} month(s)</span>
                        <span style={{fontWeight:700,color:"var(--green)"}}>{fmtRupee(selFlat.monthly_charge*payForm.months.length)}</span>
                      </div>
                      <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>
                        {payForm.months.slice().sort().map(monthLabel).join(", ")}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Common fields */}
              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <select className="form-input" value={payForm.mode}
                  onChange={function(e){setPayForm(function(p){return Object.assign({},p,{mode:e.target.value});});}}>
                  <option>Cash</option><option>UPI</option><option>NEFT</option>
                  <option>IMPS</option><option>Cheque</option><option>Bank Transfer</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reference / Transaction ID</label>
                <input className="form-input" placeholder="Optional"
                  value={payForm.ref} onChange={function(e){setPayForm(function(p){return Object.assign({},p,{ref:e.target.value});});}}/>
              </div>

              <button className="btn btn-success" onClick={handlePayment}>
                {payForm.payType==="advance" && payForm.months.length>0
                  ? "✅ Save Advance · "+fmtRupee(selFlat.monthly_charge*payForm.months.length)
                  : "✅ Save Payment · "+fmtRupee(parseInt(payForm.amount)||selFlat.monthly_charge)}
              </button>
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

  // Natural sort: A1, A2...A6, B1...F4
  var FLAT_ORDER = ["A1","A2","A3","A4","A5","A6","B1","B2","B3","B4","B5","B6",
    "C1","C2","C3","C4","C5","C6","D1D2","D3","D4","D5","E1","E2","E3","E4","F1","F2","F3","F4"];

  var overdueFlats = props.flats
    .filter(function(f){ return props.overdueByFlat[f.id] && props.overdueByFlat[f.id].length > 0; })
    .sort(function(a,b){
      return FLAT_ORDER.indexOf(a.id) - FLAT_ORDER.indexOf(b.id);
    });

  var totalMonths = Object.values(props.overdueByFlat).reduce(function(s,arr){return s+arr.length;},0);

  return (
    <>
      <div style={{padding:"14px 16px 8px"}}>
        <div style={{background:"linear-gradient(135deg,#C0392B,#E05B4E)",borderRadius:14,padding:"14px 16px"}}>
          <div style={{color:"rgba(255,255,255,.6)",fontSize:10,letterSpacing:"1px",textTransform:"uppercase",marginBottom:4}}>Total All-Time Outstanding Dues</div>
          <div style={{color:"#FFF",fontSize:28,fontWeight:700,fontFamily:"'Playfair Display',serif"}}>{fmtRupee(props.totalOverdueAmt)}</div>
          <div style={{color:"rgba(255,255,255,.7)",fontSize:12,marginTop:4}}>{overdueFlats.length} flats · {totalMonths} months unpaid</div>
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
                    <div className="fi-left">
                      <div className="fi-avatar overdue">{f.flat_no}</div>
                      <div>
                        <div className="fi-name">Flat {f.flat_no} <span style={{fontSize:11,color:"var(--muted)",fontWeight:400}}>· {f.bhk_type}</span></div>
                        <div className="fi-meta">{months.length} month{months.length>1?"s":""} unpaid · Block {f.block}</div>
                      </div>
                    </div>
                    <div className="fi-right">
                      <div className="fi-amount overdue">{fmtRupee(tot)}</div>
                      <div className="chip overdue">{months.length} Month{months.length>1?"s":""}</div>
                    </div>
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
                    <div><div style={{fontSize:15,fontWeight:700}}>Year {yr}</div><div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{Object.keys(yd.flats).length} flats overdue</div></div>
                    <div style={{fontSize:16,fontWeight:700,color:"var(--red)"}}>{fmtRupee(yd.total)}</div>
                  </div>
                  <div style={{padding:"0 16px 10px"}}>
                    {Object.keys(yd.flats).sort(function(a,b){ return FLAT_ORDER.indexOf(a)-FLAT_ORDER.indexOf(b); }).map(function(flat){
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

// ── InfoTab ────────────────────────────────────────────────────
function InfoTab(props) {
  var [sec, setSec] = useState("slabs");
  var [showForm, setShowForm] = useState(false);
  var [formType, setFormType] = useState("slab");
  var [editing, setEditing] = useState(null);
  var [saving, setSaving] = useState(false);
  var [form, setForm] = useState({});
  var [recalcResult, setRecalcResult] = useState(null);
  var [recalcRunning, setRecalcRunning] = useState(false);

  function openAdd(type) { setFormType(type); setEditing(null); setForm({}); setShowForm(true); setRecalcResult(null); }
  function openEdit(type, item) { setFormType(type); setEditing(item); setForm(Object.assign({},item)); setShowForm(true); setRecalcResult(null); }

  async function saveForm() {
    setSaving(true);
    var result;
    if (formType==="slab") {
      if (!form.start_month||!form.charge_1bhk||!form.charge_2bhk||!form.charge_3bhk) {
        props.showToast("⚠️ Fill all fields"); setSaving(false); return;
      }
      var data = { start_month:form.start_month, end_month:form.end_month||null,
        charge_1bhk:parseInt(form.charge_1bhk), charge_2bhk:parseInt(form.charge_2bhk), charge_3bhk:parseInt(form.charge_3bhk) };
      result = editing
        ? await supabase.from("maintenance_slabs").update(data).eq("id",editing.id)
        : await supabase.from("maintenance_slabs").insert(data);
    } else if (formType==="eb") {
      var data = { block_name:form.block_name, service_no:form.service_no, notes:form.notes||null };
      result = editing
        ? await supabase.from("eb_details").update(data).eq("id",editing.id)
        : await supabase.from("eb_details").insert(data);
    } else if (formType==="employee") {
      var data = { name:form.name, role:form.role||null, salary:parseInt(form.salary),
        joined_date:form.joined_date||null, active:form.active!==false };
      result = editing
        ? await supabase.from("employee_details").update(data).eq("id",editing.id)
        : await supabase.from("employee_details").insert(data);
    } else if (formType==="aptinfo") {
      var keys = Object.keys(form);
      for (var i=0;i<keys.length;i++) {
        await supabase.from("apartment_info").upsert({key:keys[i],value:String(form[keys[i]])},{onConflict:"key"});
      }
      props.showToast("✅ Info saved!"); setSaving(false); setShowForm(false); await props.reload(); return;
    }
    setSaving(false);
    if (result&&result.error) { props.showToast("❌ "+result.error.message); return; }
    props.showToast(editing?"✅ Updated!":"✅ Added!");
    setShowForm(false);
    await props.reload();
  }

  async function deleteItem(table, id) {
    if (!window.confirm("Delete this entry?")) return;
    await supabase.from(table).delete().eq("id",id);
    props.showToast("🗑 Deleted");
    await props.reload();
  }

  // Recalculate bills when slab changes
  async function recalculateBills(slab) {
    setRecalcRunning(true);
    setRecalcResult(null);
    var endM = slab.end_month || new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0");
    // Find all bills in this slab's period
    var {data:bills} = await supabase.from("bills").select("*,flats(bhk_type)")
      .gte("billing_month", slab.start_month).lte("billing_month", endM);
    if (!bills) { setRecalcRunning(false); return; }
    var changes = [];
    for (var i=0;i<bills.length;i++) {
      var b = bills[i];
      var bhk = b.flats?.bhk_type;
      if (!bhk) continue;
      var newCharge = bhk==="1BHK"?slab.charge_1bhk:bhk==="2BHK"?slab.charge_2bhk:slab.charge_3bhk;
      if (newCharge !== b.total_amount) {
        var diff = newCharge - b.total_amount;
        var newArrears = b.status==="paid" ? Math.max(0,diff) : newCharge; // if paid and price went up, diff is owed
        changes.push({flat_id:b.flat_id,billing_month:b.billing_month,old:b.total_amount,newAmt:newCharge,diff,status:b.status,newArrears});
      }
    }
    setRecalcResult(changes);
    setRecalcRunning(false);
  }

  async function applyRecalc(slab) {
    if (!recalcResult||recalcResult.length===0) return;
    setRecalcRunning(true);
    var endM = slab.end_month || new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0");
    for (var i=0;i<recalcResult.length;i++) {
      var c = recalcResult[i];
      // Update bill amount
      var update = { total_amount: c.newAmt };
      if (c.status==="paid" && c.diff>0) {
        // Was paid but price went up — show difference as arrears/overdue
        update.arrears = c.diff;
        update.status = "overdue";
      } else if (c.status==="overdue") {
        update.arrears = c.newAmt;
      }
      await supabase.from("bills").update(update)
        .eq("flat_id",c.flat_id).eq("billing_month",c.billing_month);
    }
    props.showToast("✅ Bills recalculated — "+recalcResult.length+" bills updated");
    setRecalcResult(null);
    setRecalcRunning(false);
    await props.reload();
  }

  var G = { padding:"10px 16px 24px" };

  return (
    <>
      <div style={{background:"linear-gradient(135deg,#1A1410,#2C2018)",margin:"14px 16px 0",borderRadius:16,padding:"16px 18px"}}>
        <div style={{color:"rgba(255,255,255,.5)",fontSize:10,letterSpacing:"1px",textTransform:"uppercase",marginBottom:8}}>Apartment Information</div>
        <div style={{color:"#FFF",fontSize:20,fontWeight:700,fontFamily:"'Playfair Display',serif"}}>{props.aptInfo.name||"Antony Pallazo"}</div>
        <div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginTop:4}}>{props.aptInfo.address||""} · {props.aptInfo.total_flats||30} Flats</div>
        <div style={{display:"flex",gap:16,marginTop:10}}>
          {[["Corpus/Flat","₹"+(props.aptInfo.corpus_per_flat||5000)],["Due Day",props.aptInfo.due_day||"10"],["Total Flats",props.aptInfo.total_flats||30]].map(function(x){
            return <div key={x[0]}><div style={{color:"rgba(255,255,255,.4)",fontSize:10}}>{x[0]}</div><div style={{color:"#FFF",fontWeight:700,fontSize:14,marginTop:2}}>{x[1]}</div></div>;
          })}
        </div>
        <button onClick={function(){openAdd("aptinfo");setForm(Object.assign({},props.aptInfo));}}
          style={{marginTop:12,background:"rgba(255,255,255,.15)",color:"#FFF",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
          ✏️ Edit Info
        </button>
      </div>

      <div className="income-tabs">
        {[["slabs","🏠 Maintenance"],["eb","⚡ EB Details"],["employees","👷 Employees"]].map(function(x){
          return <button key={x[0]} className={"income-tab"+(sec===x[0]?" active":"")} onClick={function(){setSec(x[0]);}}>{x[1]}</button>;
        })}
      </div>

      {/* ── Maintenance Slabs ── */}
      {sec==="slabs" && (
        <div style={G}>
          <div style={{background:"#FFF9E6",border:"1.5px solid #D4A853",borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:12,color:"#7A5C00",lineHeight:1.7}}>
            <b>⚠️ Important:</b> When changing maintenance amount, set the <b>End Month</b> on the old slab, then add a new slab with the new amount and <b>Start Month</b>. Then use <b>Recalculate Bills</b> to update all affected bills — flats that paid advance will show the difference as overdue.
          </div>
          <div className="row-between" style={{marginBottom:10}}>
            <div style={{fontSize:12,color:"var(--muted)"}}>{props.maintenanceSlabs.length} slabs</div>
            <button className="add-btn" onClick={function(){openAdd("slab");}}>＋ Add Slab</button>
          </div>
          <div className="card">
            {props.maintenanceSlabs.map(function(s,i){
              return (
                <div key={s.id||i} style={{borderBottom:"1px solid var(--border)"}}>
                  <div style={{padding:"12px 16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:14}}>{monthLabel(s.start_month)} → {s.end_month?monthLabel(s.end_month):<span style={{color:"var(--green)",fontWeight:700}}>Present</span>}</div>
                        <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Active slab</div>
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={function(){openEdit("slab",s);}} style={{border:"none",background:"var(--bg)",borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer",color:"var(--gold)"}}>✏️</button>
                        <button onClick={function(){deleteItem("maintenance_slabs",s.id);}} style={{border:"none",background:"var(--bg)",borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer",color:"var(--red)"}}>🗑</button>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      {[["1 BHK","₹"+s.charge_1bhk],["2 BHK","₹"+s.charge_2bhk],["3 BHK","₹"+s.charge_3bhk]].map(function(x){
                        return <div key={x[0]} style={{background:"var(--bg)",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                          <div style={{fontSize:10,color:"var(--muted)"}}>{x[0]}</div>
                          <div style={{fontWeight:700,fontSize:15,color:"var(--gold)",marginTop:2}}>{x[1]}</div>
                        </div>;
                      })}
                    </div>
                    <button onClick={function(){recalculateBills(s);}}
                      disabled={recalcRunning}
                      style={{marginTop:10,width:"100%",border:"1.5px solid var(--gold)",background:"#FFF9E6",color:"var(--gold)",borderRadius:8,padding:"8px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                      {recalcRunning?"⏳ Checking...":"🔄 Preview Bill Recalculation"}
                    </button>
                    {recalcResult && recalcResult.length===0 && (
                      <div style={{marginTop:8,padding:"8px 10px",background:"#E8F5EE",borderRadius:8,fontSize:12,color:"var(--green)"}}>✅ All bills already correct for this slab</div>
                    )}
                    {recalcResult && recalcResult.length>0 && (
                      <div style={{marginTop:8}}>
                        <div style={{fontSize:12,fontWeight:600,marginBottom:6,color:"var(--red)"}}>{recalcResult.length} bills need updating:</div>
                        <div style={{maxHeight:160,overflowY:"auto",borderRadius:8,border:"1px solid var(--border)"}}>
                          {recalcResult.map(function(c){
                            return <div key={c.flat_id+c.billing_month} style={{display:"flex",justifyContent:"space-between",padding:"6px 10px",borderBottom:"1px solid var(--border)",fontSize:12}}>
                              <span>Flat {c.flat_id} · {monthLabel(c.billing_month)}</span>
                              <span style={{color:c.diff>0?"var(--red)":"var(--green)",fontWeight:600}}>
                                ₹{c.old} → ₹{c.newAmt} ({c.diff>0?"+":""}{c.diff})
                                {c.status==="paid"&&c.diff>0?" ⚠️ overdue":""}
                              </span>
                            </div>;
                          })}
                        </div>
                        <button onClick={function(){applyRecalc(s);}}
                          style={{marginTop:8,width:"100%",border:"none",background:"var(--red)",color:"#FFF",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                          ⚡ Apply — Update {recalcResult.length} Bills
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── EB Details ── */}
      {sec==="eb" && (
        <div style={G}>
          <div className="row-between" style={{marginBottom:10}}>
            <div style={{fontSize:12,color:"var(--muted)"}}>{props.ebDetails.length} blocks</div>
            <button className="add-btn" onClick={function(){openAdd("eb");}}>＋ Add Block</button>
          </div>
          <div className="card">
            {props.ebDetails.map(function(e,i){
              return (
                <div key={e.id||i} className="info-row">
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>{e.block_name}</div>
                    <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{e.notes||"EB Service Number"}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:700,fontSize:14,fontFamily:"monospace"}}>{e.service_no}</div>
                    <div style={{display:"flex",gap:4,marginTop:4,justifyContent:"flex-end"}}>
                      <button onClick={function(){openEdit("eb",e);}} style={{border:"none",background:"var(--bg)",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer",color:"var(--gold)"}}>✏️</button>
                      <button onClick={function(){deleteItem("eb_details",e.id);}} style={{border:"none",background:"var(--bg)",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer",color:"var(--red)"}}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Employees ── */}
      {sec==="employees" && (
        <div style={G}>
          <div style={{background:"var(--card)",borderRadius:12,padding:"14px 16px",border:"1px solid var(--border)",marginBottom:14}}>
            <div style={{fontSize:10,color:"var(--muted)",letterSpacing:"1px",textTransform:"uppercase",marginBottom:6}}>Monthly Salary Total</div>
            <div style={{fontSize:24,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"var(--red)"}}>
              {fmtRupee(props.employeeDetails.filter(function(e){return e.active;}).reduce(function(s,e){return s+e.salary;},0))}
            </div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>{props.employeeDetails.filter(function(e){return e.active;}).length} active employees</div>
          </div>
          <div className="row-between" style={{marginBottom:10}}>
            <div style={{fontSize:12,color:"var(--muted)"}}>{props.employeeDetails.length} employees</div>
            <button className="add-btn" onClick={function(){openAdd("employee");}}>＋ Add Employee</button>
          </div>
          <div className="card">
            {props.employeeDetails.map(function(e,i){
              return (
                <div key={e.id||i} className="info-row">
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>{e.name}</div>
                    <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{e.role||"—"} {!e.active?"· Inactive":""}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:700,fontSize:14,color:"var(--red)"}}>{fmtRupee(e.salary)}/mo</div>
                    <div style={{display:"flex",gap:4,marginTop:4,justifyContent:"flex-end"}}>
                      <button onClick={function(){openEdit("employee",e);}} style={{border:"none",background:"var(--bg)",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer",color:"var(--gold)"}}>✏️</button>
                      <button onClick={function(){deleteItem("employee_details",e.id);}} style={{border:"none",background:"var(--bg)",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer",color:"var(--red)"}}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Add/Edit Sheet ── */}
      {showForm && (
        <div className="overlay" onClick={function(){setShowForm(false);}}>
          <div className="sheet" onClick={function(e){e.stopPropagation();}}>
            <div className="sheet-handle"/>
            <div className="sheet-head">
              <div><div className="sheet-title">{editing?"Edit":"Add"} {formType==="slab"?"Maintenance Slab":formType==="eb"?"EB Details":formType==="employee"?"Employee":"Apartment Info"}</div></div>
              <button className="close-btn" onClick={function(){setShowForm(false);}}>✕</button>
            </div>
            <div className="sheet-body">
              {formType==="slab" && <>
                <div style={{background:"#FFF9E6",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:12,color:"#7A5C00"}}>
                  To change rates mid-year: set <b>End Month</b> on this slab, then add a new slab with the new rates and correct Start Month.
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div className="form-group"><label className="form-label">Start Month *</label><input className="form-input" type="month" value={form.start_month||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{start_month:e.target.value});})}}/></div>
                  <div className="form-group"><label className="form-label">End Month (blank = present)</label><input className="form-input" type="month" value={form.end_month||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{end_month:e.target.value||null});})}}/></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  <div className="form-group"><label className="form-label">1 BHK (₹) *</label><input className="form-input" type="number" value={form.charge_1bhk||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{charge_1bhk:e.target.value});})}}/></div>
                  <div className="form-group"><label className="form-label">2 BHK (₹) *</label><input className="form-input" type="number" value={form.charge_2bhk||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{charge_2bhk:e.target.value});})}}/></div>
                  <div className="form-group"><label className="form-label">3 BHK (₹) *</label><input className="form-input" type="number" value={form.charge_3bhk||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{charge_3bhk:e.target.value});})}}/></div>
                </div>
              </>}
              {formType==="eb" && <>
                <div className="form-group"><label className="form-label">Block Name *</label><input className="form-input" placeholder="e.g. A Block" value={form.block_name||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{block_name:e.target.value});})}}/></div>
                <div className="form-group"><label className="form-label">EB Service Number *</label><input className="form-input" placeholder="e.g. 9331118361" value={form.service_no||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{service_no:e.target.value});})}}/></div>
                <div className="form-group"><label className="form-label">Notes</label><input className="form-input" placeholder="Optional" value={form.notes||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{notes:e.target.value});})}}/></div>
              </>}
              {formType==="employee" && <>
                <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{name:e.target.value});})}}/></div>
                <div className="form-group"><label className="form-label">Role</label><input className="form-input" placeholder="e.g. Security, Housekeeping" value={form.role||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{role:e.target.value});})}}/></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div className="form-group"><label className="form-label">Monthly Salary (₹) *</label><input className="form-input" type="number" value={form.salary||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{salary:e.target.value});})}}/></div>
                  <div className="form-group"><label className="form-label">Joined Date</label><input className="form-input" type="date" value={form.joined_date||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{joined_date:e.target.value});})}}/></div>
                </div>
                <div className="form-group">
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13}}>
                    <input type="checkbox" checked={form.active!==false} onChange={function(e){setForm(function(p){return Object.assign({},p,{active:e.target.checked});});}}/> Active Employee
                  </label>
                </div>
              </>}
              {formType==="aptinfo" && <>
                <div className="form-group"><label className="form-label">Apartment Name</label><input className="form-input" value={form.name||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{name:e.target.value});})}}/></div>
                <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{address:e.target.value});})}}/></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div className="form-group"><label className="form-label">Total Flats</label><input className="form-input" type="number" value={form.total_flats||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{total_flats:e.target.value});})}}/></div>
                  <div className="form-group"><label className="form-label">Corpus per Flat (₹)</label><input className="form-input" type="number" value={form.corpus_per_flat||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{corpus_per_flat:e.target.value});})}}/></div>
                  <div className="form-group"><label className="form-label">Due Day of Month</label><input className="form-input" type="number" min="1" max="31" value={form.due_day||""} onChange={function(e){setForm(function(p){return Object.assign({},p,{due_day:e.target.value});})}}/></div>
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
