import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

// ── Helpers ───────────────────────────────────────────────────
function fmt(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
function catIcon(c) {
  return {Cleaning:"🧹",Security:"🛡️",Electricity:"⚡",Repairs:"🔧",Maintenance:"🏗️",Admin:"📁",Salary:"👷",Sewage:"🚿","Staff Welfare":"🎁",Other:"📌"}[c]||"📋";
}
function monthLabel(bm) {
  if (!bm) return "";
  const [y,m] = bm.split("-");
  const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m)]} ${y}`;
}

// All months in the system
const ALL_MONTHS = [
  "2022-06","2022-07","2022-08","2022-09","2022-10","2022-11","2022-12",
  "2023-01","2023-02","2023-03","2023-04","2023-05","2023-06","2023-07","2023-08","2023-09","2023-10","2023-11","2023-12",
  "2024-01","2024-02","2024-03","2024-04","2024-05","2024-06","2024-07","2024-08","2024-09","2024-10","2024-11","2024-12",
  "2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12",
  "2026-01","2026-02","2026-03","2026-04","2026-05"
];

// PIN credentials
const TEMP_USERS = {
  admin: { pin:"2024", role:"admin", name:"Committee Admin", flat_id:null },
  staff: { pin:"1234", role:"staff", name:"Staff User",      flat_id:null },
};

// ── CSS ───────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#F5F0EA;--card:#FFF;--text:#1A1410;--muted:#8A7E74;--gold:#B8860B;--gold-lt:#D4A853;--green:#2D7A4F;--red:#C0392B;--orange:#D4691E;--border:#E8E0D5;--nav-h:64px;--tab-h:68px;--r:16px}
html,body,#root{height:100%}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}
.app{max-width:430px;margin:0 auto;min-height:100%;display:flex;flex-direction:column;background:var(--bg)}
.header{background:linear-gradient(135deg,#1A1410 0%,#2C2018 60%,#3D2D1A 100%);padding:0 20px;height:var(--nav-h);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 2px 20px rgba(0,0,0,.3)}
.hdr-logo{display:flex;align-items:center;gap:10px}
.hdr-icon{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,var(--gold),var(--gold-lt));display:flex;align-items:center;justify-content:center;font-size:20px}
.hdr-name{color:#FFF;font-family:'Playfair Display',serif;font-size:16px;font-weight:700;line-height:1.2}
.hdr-sub{color:rgba(255,255,255,.45);font-size:9.5px;letter-spacing:1.2px;text-transform:uppercase}
.hdr-btns{display:flex;gap:8px}
.icon-btn{width:36px;height:36px;border-radius:9px;border:none;cursor:pointer;background:rgba(255,255,255,.1);color:#FFF;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .2s}
.icon-btn:hover{background:rgba(255,255,255,.2)}
.content{flex:1;overflow-y:auto;padding-bottom:calc(var(--tab-h) + 8px)}
.tabbar{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;height:var(--tab-h);background:var(--card);border-top:1px solid var(--border);display:flex;align-items:stretch;justify-content:space-around;padding:0 4px 8px;box-shadow:0 -4px 24px rgba(0,0,0,.08);z-index:100}
.tab-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;border:none;background:none;padding:8px 2px 4px;color:var(--muted);font-size:10px;font-family:'DM Sans',sans-serif;font-weight:500;letter-spacing:.3px;transition:color .2s}
.tab-item.active{color:var(--gold)}
.tab-icon{font-size:20px;line-height:1}
.card{background:var(--card);border-radius:var(--r);border:1px solid var(--border);overflow:hidden}
.section{padding:16px 16px 8px}
.sec-title{font-size:11px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:var(--muted);margin-bottom:12px}
.hero{background:linear-gradient(135deg,#1A1410 0%,#2C2018 100%);padding:20px 18px;margin:14px 16px;border-radius:20px;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;top:-40px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(184,134,11,.12)}
.hero-greeting{color:rgba(255,255,255,.55);font-size:12px}
.hero-name{color:#FFF;font-family:'Playfair Display',serif;font-size:22px;font-weight:700;margin:4px 0}
.hero-month{color:var(--gold-lt);font-size:12px}
.hero-divider{height:1px;background:rgba(255,255,255,.1);margin:14px 0}
.hero-stats{display:flex;gap:20px;position:relative;z-index:1;flex-wrap:wrap}
.hs-val{color:#FFF;font-size:17px;font-weight:700}
.hs-val.orange{color:#E8893E}
.hs-label{color:rgba(255,255,255,.45);font-size:10px;margin-top:2px}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 16px 12px}
.stat-card{background:var(--card);border-radius:14px;padding:14px;border:1px solid var(--border);position:relative;overflow:hidden}
.stat-card::after{content:'';position:absolute;top:-18px;right:-18px;width:56px;height:56px;border-radius:50%;background:var(--sc-accent,rgba(184,134,11,.08))}
.stat-card .sc-label{font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.stat-card .sc-value{font-size:19px;font-weight:700;color:var(--sc-color,var(--text));line-height:1}
.stat-card .sc-sub{font-size:11px;color:var(--muted);margin-top:4px}
.stat-card.green{--sc-color:var(--green);--sc-accent:rgba(45,122,79,.1)}
.stat-card.red{--sc-color:var(--red);--sc-accent:rgba(192,57,43,.1)}
.stat-card.gold{--sc-color:var(--gold);--sc-accent:rgba(184,134,11,.1)}
.month-selector{padding:12px 16px;display:flex;gap:8px;align-items:center}
.month-select{flex:1;padding:9px 12px;border-radius:10px;border:1.5px solid var(--border);background:var(--card);font-size:13px;font-family:'DM Sans',sans-serif;color:var(--text);outline:none;cursor:pointer}
.month-select:focus{border-color:var(--gold)}
.month-nav{width:36px;height:36px;border-radius:9px;border:1.5px solid var(--border);background:var(--card);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;color:var(--text)}
.month-nav:disabled{opacity:.3;cursor:not-allowed}
.multi-bar{height:9px;border-radius:99px;background:var(--border);overflow:hidden;display:flex}
.bar-paid{background:var(--green)}.bar-overdue{background:var(--red)}.bar-partial{background:var(--orange)}
.bar-legend{display:flex;gap:14px;margin-top:10px}
.bar-dot{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)}
.dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.flat-item{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s}
.flat-item:last-child{border-bottom:none}
.flat-item:hover{background:#FAF7F2}
.fi-left{display:flex;align-items:center;gap:12px}
.fi-avatar{width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#FFF;flex-shrink:0}
.fi-avatar.paid{background:linear-gradient(135deg,#2D7A4F,#3D9A62)}
.fi-avatar.overdue{background:linear-gradient(135deg,#C0392B,#E05B4E)}
.fi-avatar.unpaid{background:linear-gradient(135deg,#C0392B,#E05B4E)}
.fi-avatar.vacant{background:linear-gradient(135deg,#8A7E74,#B0A498)}
.fi-name{font-size:14px;font-weight:600}
.fi-meta{font-size:11px;color:var(--muted);margin-top:2px}
.fi-right{text-align:right}
.fi-amount{font-size:14px;font-weight:700}
.fi-amount.paid{color:var(--green)}.fi-amount.overdue,.fi-amount.unpaid{color:var(--red)}.fi-amount.vacant{color:var(--muted)}
.chip{font-size:9.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;padding:2px 8px;border-radius:99px;display:inline-block;margin-top:3px}
.chip.paid{background:#E8F5EE;color:var(--green)}.chip.overdue,.chip.unpaid{background:#FDEDEC;color:var(--red)}.chip.vacant{background:#F0EDE9;color:var(--muted)}
.filter-bar{display:flex;gap:8px;padding:8px 16px 6px;overflow-x:auto;scrollbar-width:none}
.filter-bar::-webkit-scrollbar{display:none}
.pill{flex-shrink:0;padding:5px 14px;border-radius:99px;border:1.5px solid var(--border);font-size:12px;font-weight:600;background:var(--card);color:var(--muted);cursor:pointer;transition:all .15s;white-space:nowrap}
.pill.active{background:var(--gold);border-color:var(--gold);color:#FFF}
.search-wrap{padding:10px 16px 4px;position:relative}
.search-icon{position:absolute;left:28px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--muted)}
.search-input{width:100%;padding:10px 14px 10px 38px;border-radius:11px;border:1.5px solid var(--border);background:var(--card);font-size:13px;font-family:'DM Sans',sans-serif;color:var(--text);outline:none}
.search-input:focus{border-color:var(--gold)}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:200;animation:fadeIn .2s ease}
.sheet{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:var(--card);border-radius:20px 20px 0 0;z-index:201;max-height:88vh;overflow-y:auto;animation:slideUp .28s cubic-bezier(.32,1,.64,1)}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}}
.sheet-handle{width:38px;height:4px;background:var(--border);border-radius:99px;margin:14px auto 0}
.sheet-head{padding:14px 20px 12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start}
.sheet-title{font-family:'Playfair Display',serif;font-size:19px;font-weight:700}
.sheet-sub{font-size:12px;color:var(--muted);margin-top:2px}
.sheet-body{padding:16px 20px 28px}
.close-btn{border:none;background:var(--border);border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.amt-block{background:linear-gradient(135deg,#1A1410,#2C2018);border-radius:14px;padding:16px;margin-bottom:14px}
.amt-block .ab-label{color:rgba(255,255,255,.5);font-size:10px;letter-spacing:1px;text-transform:uppercase}
.amt-block .ab-value{color:#FFF;font-size:28px;font-weight:700;font-family:'Playfair Display',serif;margin-top:3px}
.amt-block .ab-detail{color:var(--gold-lt);font-size:11px;margin-top:4px}
.info-row{display:flex;justify-content:space-between;align-items:center;padding:9px 16px;border-bottom:1px solid var(--border)}
.info-row:last-child{border-bottom:none}
.ir-label{font-size:12px;color:var(--muted)}
.ir-value{font-size:12px;font-weight:600;text-align:right;max-width:60%}
.btn{width:100%;padding:12px;border-radius:11px;border:none;cursor:pointer;font-size:14px;font-weight:600;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:7px;transition:transform .12s}
.btn:active{transform:scale(.97)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-primary{background:linear-gradient(135deg,#B8860B,#D4A853);color:#FFF}
.btn-success{background:linear-gradient(135deg,#2D7A4F,#3D9A62);color:#FFF}
.btn-secondary{background:var(--bg);color:var(--text);border:1.5px solid var(--border)}
.btn-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.form-group{margin-bottom:14px}
.form-label{display:block;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);margin-bottom:5px}
.form-input{width:100%;padding:10px 12px;border-radius:9px;border:1.5px solid var(--border);font-size:13px;font-family:'DM Sans',sans-serif;color:var(--text);background:#FFF;outline:none}
.form-input:focus{border-color:var(--gold)}
select.form-input{-webkit-appearance:none;appearance:none;cursor:pointer}
.notice-item{padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s}
.notice-item:last-child{border-bottom:none}
.notice-item:hover{background:#FAF7F2}
.ni-date{font-size:10px;color:var(--muted);margin-bottom:3px}
.ni-title{font-size:13.5px;font-weight:600;margin-bottom:3px;line-height:1.3}
.ni-body{font-size:11.5px;color:var(--muted);line-height:1.5}
.exp-item{display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border)}
.exp-item:last-child{border-bottom:none}
.exp-icon{width:38px;height:38px;border-radius:10px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.exp-info{flex:1;padding:0 11px}
.exp-vendor{font-size:13px;font-weight:600}
.exp-cat{font-size:11px;color:var(--muted);margin-top:2px}
.exp-right{text-align:right}
.exp-amount{font-size:14px;font-weight:700;color:var(--red)}
.exp-date{font-size:10.5px;color:var(--muted);margin-top:2px}
.rep-item{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s}
.rep-item:last-child{border-bottom:none}
.rep-item:hover{background:#FAF7F2}
.rep-left{display:flex;align-items:center;gap:11px}
.rep-icon{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#1A1410,#2C2018);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.rep-name{font-size:13px;font-weight:600}
.rep-desc{font-size:11px;color:var(--muted);margin-top:2px}
.rep-export{font-size:10px;color:var(--gold);font-weight:700;margin-bottom:2px}
.toast{position:fixed;bottom:82px;left:50%;transform:translateX(-50%);background:#1A1410;color:#FFF;padding:10px 20px;border-radius:12px;font-size:13px;font-weight:500;z-index:400;white-space:nowrap;animation:toastIn .25s ease;pointer-events:none;box-shadow:0 4px 20px rgba(0,0,0,.35)}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.empty{padding:40px 24px;text-align:center;color:var(--muted)}
.empty-icon{font-size:40px;margin-bottom:12px}
.px16{padding:0 16px}
.mt10{margin-top:10px}.mt14{margin-top:14px}.mb14{margin-bottom:14px}
.row-between{display:flex;justify-content:space-between;align-items:center}
.add-btn{border:none;background:var(--gold);color:#FFF;border-radius:8px;padding:5px 13px;font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif}
.spinner{display:inline-block;width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:#FFF;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.login-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;background:linear-gradient(160deg,#1A1410 0%,#2C2018 50%,#3D2D1A 100%)}
.login-logo{width:68px;height:68px;border-radius:18px;background:linear-gradient(135deg,var(--gold),var(--gold-lt));display:flex;align-items:center;justify-content:center;font-size:34px;margin-bottom:14px}
.login-title{color:#FFF;font-family:'Playfair Display',serif;font-size:24px;font-weight:700;text-align:center;margin-bottom:4px}
.login-sub{color:rgba(255,255,255,.5);font-size:13px;text-align:center;margin-bottom:32px}
.login-card{background:var(--card);border-radius:20px;padding:24px;width:100%;max-width:360px}
.overdue-month-row{display:flex;align-items:center;justify-content:space-between;padding:7px 12px;background:var(--bg);border-radius:8px;margin-bottom:6px;font-size:12px}
.overdue-month-row:last-child{margin-bottom:0}
.loading-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1A1410,#2C2018);flex-direction:column;gap:12px}
`;

// ── PIN Login ─────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [pin,      setPin]      = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPin,  setShowPin]  = useState(false);

  function handleLogin() {
    setError("");
    const u = username.trim().toLowerCase();
    const user = TEMP_USERS[u];
    if (!user) { setError("Username not found"); return; }
    if (pin !== user.pin) { setError("Incorrect PIN"); return; }
    setLoading(true);
    setTimeout(() => {
      onLogin({ user:{id:"temp-"+u}, temp:true, profile:{...user, id:"temp-"+u} });
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
          <input className="form-input" type="text" placeholder="e.g. admin" value={username}
            onChange={e=>{setUsername(e.target.value);setError("");}}
            onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoCapitalize="none"/>
        </div>
        <div className="form-group">
          <label className="form-label">PIN</label>
          <div style={{position:"relative"}}>
            <input className="form-input" type={showPin?"text":"password"} placeholder="Enter PIN"
              maxLength={6} value={pin}
              onChange={e=>{setPin(e.target.value.replace(/\D/g,""));setError("");}}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={{paddingRight:42}}/>
            <button onClick={()=>setShowPin(p=>!p)}
              style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"var(--muted)"}}>
              {showPin?"🙈":"👁"}
            </button>
          </div>
        </div>
        {error && <div style={{background:"#FDEDEC",color:"var(--red)",fontSize:12,padding:"8px 12px",borderRadius:8,marginBottom:12,fontWeight:500}}>⚠️ {error}</div>}
        <button className="btn btn-primary" onClick={handleLogin} disabled={loading}>
          {loading?<span className="spinner"/>:"🔓 Login"}
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

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [session,       setSession]       = useState(null);
  const [userProfile,   setUserProfile]   = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState("home");
  const [flats,         setFlats]         = useState([]);
  const [allBills,      setAllBills]      = useState([]);
  const [allPayments,   setAllPayments]   = useState([]);
  const [allExpenses,   setAllExpenses]   = useState([]);
  const [notices,       setNotices]       = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("2026-05");
  const [selectedFlat,  setSelectedFlat]  = useState(null);
  const [filter,        setFilter]        = useState("all");
  const [search,        setSearch]        = useState("");
  const [toast,         setToast]         = useState(null);
  const [payModal,      setPayModal]      = useState(false);
  const [noticePanel,   setNoticePanel]   = useState(null);
  const [payForm,       setPayForm]       = useState({amount:"",mode:"Cash",ref:""});

  useEffect(() => {
    const saved = localStorage.getItem("pallazo_temp_session");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setSession(p); setUserProfile(p.profile); setLoading(false); return;
      } catch(e) { localStorage.removeItem("pallazo_temp_session"); }
    }
    supabase.auth.getSession().then(({data:{session}})=>{
      setSession(session);
      if(session) loadUserProfile(session.user.id);
      else setLoading(false);
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,session)=>{
      setSession(session);
      if(session) loadUserProfile(session.user.id);
      else { setLoading(false); setUserProfile(null); }
    });
    return ()=>subscription.unsubscribe();
  }, []);

  async function loadUserProfile(uid) {
    const {data} = await supabase.from("users").select("*").eq("id",uid).single();
    setUserProfile(data); setLoading(false);
  }

  const loadData = useCallback(async () => {
    const [{ data:f },{ data:b },{ data:p },{ data:e },{ data:n }] = await Promise.all([
      supabase.from("flats").select("*").order("block").order("flat_no"),
      supabase.from("bills").select("*"),
      supabase.from("payments").select("*"),
      supabase.from("expenses").select("*").order("expense_date",{ascending:false}),
      supabase.from("notices").select("*").order("posted_at",{ascending:false}),
    ]);
    if(f) setFlats(f);
    if(b) setAllBills(b);
    if(p) setAllPayments(p);
    if(e) setAllExpenses(e);
    if(n) setNotices(n);
  }, []);

  useEffect(()=>{ if(session) loadData(); },[session,loadData]);

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),2800); }

  async function handleLogout() {
    localStorage.removeItem("pallazo_temp_session");
    if(session&&!session.temp) await supabase.auth.signOut();
    setSession(null); setUserProfile(null); showToast("Logged out");
  }

  async function handlePayment() {
    const amt = parseInt(payForm.amount,10);
    if(!amt||amt<=0) { showToast("⚠️ Enter a valid amount"); return; }
    const flat = selectedFlat;
    const {error} = await supabase.from("payments").insert({
      flat_id:flat.id, billing_month:selectedMonth,
      amount_paid:amt, mode:payForm.mode,
      reference:payForm.ref,
      payment_date:new Date().toISOString().split("T")[0]
    });
    if(error) { showToast("❌ "+error.message); return; }
    await supabase.from("bills").update({status:"paid"})
      .eq("flat_id",flat.id).eq("billing_month",selectedMonth);
    await loadData();
    setPayModal(false);
    setPayForm({amount:"",mode:"Cash",ref:""});
    showToast("✅ Payment saved!");
  }

  // ── Derived data for selected month
  const monthBills    = allBills.filter(b=>b.billing_month===selectedMonth);
  const monthExpenses = allExpenses.filter(e=>e.billing_month===selectedMonth);
  const flatBill      = (flatId) => monthBills.find(b=>b.flat_id===flatId);
  const flatStatus    = (flatId) => {
    const f = flats.find(x=>x.id===flatId);
    if(!f||f.status==="vacant") return "vacant";
    const b = flatBill(flatId);
    return b ? b.status : "overdue";
  };

  // ── All-time overdue: flats with any unpaid month
  const overdueByFlat = {};
  allBills.filter(b=>b.status==="overdue"||b.status==="unpaid").forEach(b=>{
    if(!overdueByFlat[b.flat_id]) overdueByFlat[b.flat_id]=[];
    overdueByFlat[b.flat_id].push({month:b.billing_month, amount:b.arrears||b.total_amount});
  });

  const totalOverdueAmount = Object.values(overdueByFlat)
    .flat().reduce((s,x)=>s+(x.amount||0),0);

  // ── Monthly stats
  const collected  = monthBills.filter(b=>b.status==="paid").reduce((s,b)=>s+b.total_amount,0);
  const totalDues  = monthBills.filter(b=>b.status==="overdue"||b.status==="unpaid").reduce((s,b)=>s+(b.arrears||b.total_amount||0),0);
  const expected   = flats.filter(f=>f.status!=="vacant").reduce((s,f)=>s+f.monthly_charge,0);
  const paidCnt    = monthBills.filter(b=>b.status==="paid").length;
  const overdCnt   = monthBills.filter(b=>b.status==="overdue"||b.status==="unpaid").length;
  const monthlyExp = monthExpenses.reduce((s,e)=>s+e.amount,0);
  const totalExp   = allExpenses.reduce((s,e)=>s+e.amount,0);
  const collPct    = expected>0?Math.round((collected/expected)*100):0;

  const filteredFlats = flats.filter(f=>{
    const s = flatStatus(f.id);
    const okF = filter==="all"||filter===s
      ||(filter==="3bhk"&&f.bhk_type==="3BHK")
      ||(filter==="2bhk"&&f.bhk_type==="2BHK")
      ||(filter==="1bhk"&&f.bhk_type==="1BHK");
    const okS = !search||f.flat_no.toLowerCase().includes(search.toLowerCase())||f.block.toLowerCase().includes(search.toLowerCase());
    return okF&&okS;
  });

  if(loading) return (
    <>
      <style>{CSS}</style>
      <div className="loading-wrap">
        <div style={{fontSize:44}}>🏛</div>
        <div style={{color:"rgba(255,255,255,.5)",fontSize:13}}>Loading Antony Pallazo…</div>
      </div>
    </>
  );

  if(!session) return (
    <>
      <style>{CSS}</style>
      <LoginScreen onLogin={s=>{
        if(s.temp){ localStorage.setItem("pallazo_temp_session",JSON.stringify(s)); setUserProfile(s.profile); }
        else loadUserProfile(s.user.id);
        setSession(s);
      }}/>
    </>
  );

  const sharedProps = {
    flats, allBills, allPayments, allExpenses, notices, showToast, setTab,
    userProfile, selectedMonth, setSelectedMonth,
    flatBill, flatStatus, monthBills, monthExpenses,
    collected, totalDues, expected, paidCnt, overdCnt,
    monthlyExp, totalExp, collPct,
    overdueByFlat, totalOverdueAmount
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <header className="header">
          <div className="hdr-logo">
            <div className="hdr-icon">🏛</div>
            <div>
              <div className="hdr-name">Antony Pallazo</div>
              <div className="hdr-sub">{userProfile?.role==="admin"?"Admin":userProfile?.name} · {monthLabel(selectedMonth)}</div>
            </div>
          </div>
          <div className="hdr-btns">
            <button className="icon-btn" onClick={()=>showToast("🔔 Notifications coming soon")}>🔔</button>
            <button className="icon-btn" onClick={handleLogout} title="Logout">🚪</button>
          </div>
        </header>

        <div className="content">
          {tab==="home"     && <HomeTab     {...sharedProps} setSelectedFlat={setSelectedFlat}/>}
          {tab==="flats"    && <FlatsTab    {...sharedProps} filteredFlats={filteredFlats} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} setSelectedFlat={setSelectedFlat}/>}
          {tab==="overdue"  && <OverdueTab  {...sharedProps} setSelectedFlat={setSelectedFlat}/>}
          {tab==="reports"  && <ReportsTab  {...sharedProps}/>}
          {tab==="expenses" && <ExpensesTab {...sharedProps}/>}
        </div>

        <nav className="tabbar">
          {[
            {id:"home",    icon:"🏠",label:"Home"},
            {id:"flats",   icon:"🏢",label:"Flats"},
            {id:"overdue", icon:"🚨",label:"Overdue"},
            {id:"reports", icon:"📊",label:"Reports"},
            {id:"expenses",icon:"💳",label:"Expenses"},
          ].map(t=>(
            <button key={t.id} className={`tab-item${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>
              <span className="tab-icon">{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>

        {selectedFlat&&(
          <FlatSheet flat={selectedFlat} bill={flatBill(selectedFlat.id)}
            status={flatStatus(selectedFlat.id)}
            overdueMonths={overdueByFlat[selectedFlat.id]||[]}
            selectedMonth={selectedMonth}
            onClose={()=>setSelectedFlat(null)}
            onPay={()=>setPayModal(true)} showToast={showToast}/>
        )}
        {payModal&&selectedFlat&&(
          <PaySheet flat={selectedFlat} form={payForm} setForm={setPayForm}
            onClose={()=>{setPayModal(false);setPayForm({amount:"",mode:"Cash",ref:""}); }}
            onSubmit={handlePayment}/>
        )}
        {noticePanel&&(
          <div className="overlay" onClick={()=>setNoticePanel(null)}>
            <div className="sheet" onClick={e=>e.stopPropagation()}>
              <div className="sheet-handle"/>
              <div className="sheet-head">
                <div style={{flex:1,paddingRight:12}}>
                  <div className="sheet-title">{noticePanel.title}</div>
                  <div className="sheet-sub">{noticePanel.target}</div>
                </div>
                <button className="close-btn" onClick={()=>setNoticePanel(null)}>✕</button>
              </div>
              <div className="sheet-body">
                <p style={{fontSize:14,lineHeight:1.75}}>{noticePanel.body}</p>
                <div className="btn-grid mt14">
                  <button className="btn btn-primary" onClick={()=>{showToast("📤 Resent via WhatsApp");setNoticePanel(null);}}>📤 Resend</button>
                  <button className="btn btn-secondary" onClick={()=>setNoticePanel(null)}>✕ Close</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {toast&&<div className="toast">{toast}</div>}
      </div>
    </>
  );
}

// ── Month Selector Component ───────────────────────────────────
function MonthSelector({selectedMonth, setSelectedMonth}) {
  const idx = ALL_MONTHS.indexOf(selectedMonth);
  return (
    <div className="month-selector">
      <button className="month-nav" onClick={()=>setSelectedMonth(ALL_MONTHS[idx-1])} disabled={idx<=0}>‹</button>
      <select className="month-select" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}>
        {[...ALL_MONTHS].reverse().map(m=>(
          <option key={m} value={m}>{monthLabel(m)}</option>
        ))}
      </select>
      <button className="month-nav" onClick={()=>setSelectedMonth(ALL_MONTHS[idx+1])} disabled={idx>=ALL_MONTHS.length-1}>›</button>
    </div>
  );
}

// ── Home Tab ──────────────────────────────────────────────────
function HomeTab({flats,selectedMonth,setSelectedMonth,collected,totalDues,expected,paidCnt,overdCnt,monthlyExp,collPct,monthBills,overdueByFlat,totalOverdueAmount,setSelectedFlat,setTab,showToast,loadData}) {
  const activeFlats = flats.filter(f=>f.status!=="vacant").length;
  const partCnt = monthBills.filter(b=>b.status==="partial").length;
  return (
    <>
      <div className="hero">
        <div className="hero-greeting">Committee Admin</div>
        <div className="hero-name">Antony Pallazo</div>
        <div className="hero-month">{monthLabel(selectedMonth)} · 30 Flats · {activeFlats} Active</div>
        <div className="hero-divider"/>
        <div className="hero-stats">
          <div><div className="hs-val">{fmt(collected)}</div><div className="hs-label">Collected</div></div>
          <div><div className="hs-val orange">{fmt(totalDues)}</div><div className="hs-label">Month Dues</div></div>
          <div><div className="hs-val" style={{color:"#E05B4E"}}>{fmt(totalOverdueAmount)}</div><div className="hs-label">All-time Dues</div></div>
        </div>
      </div>

      <MonthSelector selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}/>

      <div style={{padding:"0 16px 12px"}}>
        <div className="card">
          <div style={{padding:"13px 16px 11px"}}>
            <div className="coll-row" style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--muted)",marginBottom:8}}>
              <span>{monthLabel(selectedMonth)} Collection</span>
              <b style={{color:"var(--text)"}}>{fmt(collected)} / {fmt(expected)}</b>
            </div>
            <div className="multi-bar">
              <div className="bar-paid"    style={{width:`${activeFlats>0?(paidCnt/activeFlats)*100:0}%`}}/>
              <div className="bar-partial" style={{width:`${activeFlats>0?(partCnt/activeFlats)*100:0}%`}}/>
              <div className="bar-overdue" style={{width:`${activeFlats>0?(overdCnt/activeFlats)*100:0}%`}}/>
            </div>
            <div className="bar-legend">
              {[["#2D7A4F",`${paidCnt} Paid`],["#D4691E",`${partCnt} Partial`],["#C0392B",`${overdCnt} Overdue`]].map(([c,l])=>(
                <div className="bar-dot" key={l}><div className="dot" style={{background:c}}/>{l}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card green"><div className="sc-label">Collected</div><div className="sc-value">{fmt(collected)}</div><div className="sc-sub">{paidCnt} flats paid</div></div>
        <div className="stat-card red"><div className="sc-label">Month Dues</div><div className="sc-value">{fmt(totalDues)}</div><div className="sc-sub">{overdCnt} overdue flats</div></div>
        <div className="stat-card gold"><div className="sc-label">Expected</div><div className="sc-value">{fmt(expected)}</div><div className="sc-sub">{activeFlats} active flats</div></div>
        <div className="stat-card"><div className="sc-label">Expenses</div><div className="sc-value">{fmt(monthlyExp)}</div><div className="sc-sub">{monthLabel(selectedMonth)}</div></div>
      </div>

      {/* Quick actions */}
      <div className="section"><div className="sec-title">Quick Actions</div></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,padding:"0 16px 12px"}}>
        {[
          {icon:"🏢",label:"All Flats",  action:()=>setTab("flats")},
          {icon:"🚨",label:"Overdue",    action:()=>setTab("overdue")},
          {icon:"📊",label:"Reports",    action:()=>setTab("reports")},
          {icon:"📤",label:"Reminders",  action:()=>showToast("📤 Reminders sent to "+overdCnt+" defaulters")},
        ].map(q=>(
          <button key={q.label} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:"pointer",background:"none",border:"none"}} onClick={q.action}>
            <div style={{width:52,height:52,borderRadius:13,background:"var(--card)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:21}}>{q.icon}</div>
            <div style={{fontSize:10.5,fontWeight:600,color:"var(--muted)",textAlign:"center"}}>{q.label}</div>
          </button>
        ))}
      </div>

      {/* This month defaulters */}
      {overdCnt > 0 && (
        <>
          <div className="section"><div className="sec-title">Not Paid – {monthLabel(selectedMonth)}</div></div>
          <div className="px16 mb14">
            <div className="card">
              {monthBills.filter(b=>b.status==="overdue"||b.status==="unpaid").map(b=>{
                const f = flats.find(x=>x.id===b.flat_id);
                if(!f) return null;
                return (
                  <div key={b.id||b.flat_id} className="flat-item" onClick={()=>setSelectedFlat(f)}>
                    <div className="fi-left">
                      <div className="fi-avatar overdue">{f.flat_no}</div>
                      <div><div className="fi-name">Flat {f.flat_no}</div><div className="fi-meta">{f.bhk_type} · Block {f.block}</div></div>
                    </div>
                    <div className="fi-right">
                      <div className="fi-amount overdue">{fmt(b.arrears||b.total_amount)}</div>
                      <div className="chip overdue">Overdue</div>
                    </div>
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

// ── Flats Tab ─────────────────────────────────────────────────
function FlatsTab({flats,selectedMonth,setSelectedMonth,filteredFlats,flatBill,flatStatus,filter,setFilter,search,setSearch,setSelectedFlat}) {
  return (
    <>
      <MonthSelector selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}/>
      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input className="search-input" placeholder="Search flat or block…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      <div className="filter-bar">
        {[["all","All"],["paid","Paid"],["overdue","Overdue"],["vacant","Vacant"],["3bhk","3BHK"],["2bhk","2BHK"],["1bhk","1BHK"]].map(([v,l])=>(
          <button key={v} className={`pill${filter===v?" active":""}`} onClick={()=>setFilter(v)}>{l}</button>
        ))}
      </div>
      <div className="px16 mb14">
        <div className="card">
          {filteredFlats.length===0&&<div className="empty"><div className="empty-icon">🏢</div><div>No flats match</div></div>}
          {filteredFlats.map(f=>{
            const s = flatStatus(f.id);
            const b = flatBill(f.id);
            return (
              <div key={f.id} className="flat-item" onClick={()=>setSelectedFlat(f)}>
                <div className="fi-left">
                  <div className={`fi-avatar ${s}`}>{f.flat_no}</div>
                  <div>
                    <div className="fi-name">Flat {f.flat_no} <span style={{fontSize:11,color:"var(--muted)",fontWeight:400}}>· {f.bhk_type}</span></div>
                    <div className="fi-meta">Block {f.block} · {f.occupancy==="vacant"?"Vacant":f.occupancy==="owner"?"Owner":"Rented"}</div>
                  </div>
                </div>
                <div className="fi-right">
                  {s==="vacant"?<div className="fi-amount vacant">Vacant</div>
                    :s==="paid"?<div className="fi-amount paid">{fmt(f.monthly_charge)}</div>
                    :<div className="fi-amount overdue">{fmt(b?.arrears||b?.total_amount||0)}</div>}
                  <div className={`chip ${s}`}>{s==="paid"?"Paid":s==="overdue"?"Overdue":s==="vacant"?"Vacant":"Unpaid"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Overdue Tab — ALL-TIME ─────────────────────────────────────
function OverdueTab({flats,overdueByFlat,totalOverdueAmount,setSelectedFlat,showToast}) {
  const overdueFlats = flats.filter(f=>overdueByFlat[f.id]&&overdueByFlat[f.id].length>0)
    .sort((a,b)=>(overdueByFlat[b.id]?.reduce((s,x)=>s+x.amount,0)||0)-(overdueByFlat[a.id]?.reduce((s,x)=>s+x.amount,0)||0));

  return (
    <>
      {/* Summary */}
      <div style={{padding:"14px 16px 8px"}}>
        <div className="card">
          <div style={{padding:"14px 16px",background:"linear-gradient(135deg,#C0392B,#E05B4E)",borderRadius:"var(--r)"}}>
            <div style={{color:"rgba(255,255,255,.6)",fontSize:10,letterSpacing:"1px",textTransform:"uppercase",marginBottom:4}}>Total All-Time Outstanding Dues</div>
            <div style={{color:"#FFF",fontSize:28,fontWeight:700,fontFamily:"'Playfair Display',serif"}}>{fmt(totalOverdueAmount)}</div>
            <div style={{color:"rgba(255,255,255,.7)",fontSize:12,marginTop:4}}>{overdueFlats.length} flats have pending dues across multiple months</div>
          </div>
        </div>
      </div>

      <div className="section row-between">
        <div className="sec-title" style={{marginBottom:0}}>Flat-wise Outstanding Dues</div>
        <button className="add-btn" onClick={()=>showToast("📤 Reminders sent to all defaulters")}>📤 Remind All</button>
      </div>

      <div className="px16 mb14 mt10">
        <div className="card">
          {overdueFlats.length===0&&<div className="empty"><div className="empty-icon">✅</div><div>No outstanding dues!</div></div>}
          {overdueFlats.map(f=>{
            const months = overdueByFlat[f.id]||[];
            const totalAmt = months.reduce((s,x)=>s+x.amount,0);
            return (
              <div key={f.id} style={{borderBottom:"1px solid var(--border)"}}>
                <div className="flat-item" onClick={()=>setSelectedFlat(f)} style={{borderBottom:"none"}}>
                  <div className="fi-left">
                    <div className="fi-avatar overdue">{f.flat_no}</div>
                    <div>
                      <div className="fi-name">Flat {f.flat_no} <span style={{fontSize:11,color:"var(--muted)",fontWeight:400}}>· {f.bhk_type}</span></div>
                      <div className="fi-meta">{months.length} month{months.length>1?"s":""} unpaid · Block {f.block}</div>
                    </div>
                  </div>
                  <div className="fi-right">
                    <div className="fi-amount overdue">{fmt(totalAmt)}</div>
                    <div className="chip overdue">{months.length} Month{months.length>1?"s":""}</div>
                  </div>
                </div>
                {/* Show each overdue month */}
                <div style={{padding:"0 16px 10px"}}>
                  {months.sort((a,b)=>a.month.localeCompare(b.month)).map(m=>(
                    <div key={m.month} className="overdue-month-row">
                      <span style={{color:"var(--muted)"}}>{monthLabel(m.month)}</span>
                      <span style={{fontWeight:600,color:"var(--red)"}}>{fmt(m.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Flat Sheet ─────────────────────────────────────────────────
function FlatSheet({flat,bill,status,overdueMonths,selectedMonth,onClose,onPay,showToast}) {
  const totalOverdue = overdueMonths.reduce((s,x)=>s+x.amount,0);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-head">
          <div>
            <div className="sheet-title">Flat {flat.flat_no}</div>
            <div className="sheet-sub">{flat.bhk_type} · Block {flat.block} · {flat.occupancy==="owner"?"Owner":flat.occupancy==="rented"?"Rented":"Vacant"}</div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sheet-body">
          {flat.status!=="vacant"&&(
            <div className="amt-block">
              <div className="ab-label">Total Outstanding (All Time)</div>
              <div className="ab-value">{fmt(totalOverdue||bill?.arrears||0)}</div>
              <div className="ab-detail">{monthLabel(selectedMonth)} charge: {fmt(flat.monthly_charge)} · Status: {status}</div>
            </div>
          )}
          <div className="card mb14">
            {[
              ["Flat",flat.flat_no],["Type",flat.bhk_type],["Block",flat.block],
              ["Monthly Charge",fmt(flat.monthly_charge)],
              [monthLabel(selectedMonth)+" Status",<span className={`chip ${status}`}>{status==="paid"?"Paid":"Overdue"}</span>],
              ["Total Overdue",<span style={{color:"var(--red)",fontWeight:700}}>{fmt(totalOverdue)}</span>],
              ["Overdue Months",overdueMonths.length>0?`${overdueMonths.length} month(s)`:"None"],
            ].map(([l,v])=>(
              <div key={l} className="info-row"><span className="ir-label">{l}</span><span className="ir-value">{v}</span></div>
            ))}
          </div>
          {overdueMonths.length>0&&(
            <>
              <div className="sec-title" style={{marginBottom:8}}>Overdue Breakdown</div>
              <div className="card mb14">
                {overdueMonths.sort((a,b)=>a.month.localeCompare(b.month)).map(m=>(
                  <div key={m.month} className="info-row">
                    <span className="ir-label">{monthLabel(m.month)}</span>
                    <span className="ir-value" style={{color:"var(--red)"}}>{fmt(m.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {flat.status!=="vacant"&&(
            <div className="btn-grid">
              <button className="btn btn-primary" onClick={onPay}>💸 Record Payment</button>
              <button className="btn btn-secondary" onClick={()=>showToast("💬 Reminder sent to Flat "+flat.flat_no)}>💬 Remind</button>
              <button className="btn btn-secondary" onClick={()=>showToast("📄 Receipt for Flat "+flat.flat_no)}>📄 Receipt</button>
              <button className="btn btn-secondary" onClick={()=>showToast("📤 Bill sent to Flat "+flat.flat_no)}>📤 Send Bill</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pay Sheet ──────────────────────────────────────────────────
function PaySheet({flat,form,setForm,onClose,onSubmit}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-head">
          <div><div className="sheet-title">Record Payment</div><div className="sheet-sub">Flat {flat.flat_no} · {fmt(flat.monthly_charge)}/month</div></div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sheet-body">
          <div className="form-group">
            <label className="form-label">Amount Received (₹)</label>
            <input className="form-input" type="number" placeholder="e.g. 2000" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/>
          </div>
          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <select className="form-input" value={form.mode} onChange={e=>setForm(p=>({...p,mode:e.target.value}))}>
              <option>Cash</option><option>UPI</option><option>NEFT</option><option>IMPS</option><option>Cheque</option><option>Bank Transfer</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Reference ID</label>
            <input className="form-input" placeholder="Optional" value={form.ref} onChange={e=>setForm(p=>({...p,ref:e.target.value}))}/>
          </div>
          <button className="btn btn-success mt10" onClick={onSubmit}>✅ Confirm & Save</button>
          <button className="btn btn-secondary mt10" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Reports Tab ────────────────────────────────────────────────
function ReportsTab({selectedMonth,setSelectedMonth,collected,totalDues,monthlyExp,allBills,allPayments,allExpenses,showToast}) {
  const surplus = collected - monthlyExp;
  const totalAllCollected = allPayments.reduce((s,p)=>s+(p.amount_paid||0),0);
  const totalAllExpenses  = allExpenses.reduce((s,e)=>s+(e.amount||0),0);

  const REPORTS = [
    {icon:"📅",name:"Monthly Collection Summary",    desc:"Billed vs collected vs outstanding",export:"PDF + Excel"},
    {icon:"📒",name:"Flat-wise Ledger",              desc:"Complete billing & payment history",  export:"PDF"},
    {icon:"🚨",name:"Defaulter / Dues Report",       desc:"All flats with outstanding dues",     export:"PDF + Excel"},
    {icon:"📈",name:"Annual Income & Expenditure",   desc:"Collections vs expenses for FY",      export:"PDF + Excel"},
    {icon:"💳",name:"Payment Mode Summary",          desc:"Cash / UPI / Cheque / NEFT / Bank",   export:"Excel"},
    {icon:"⏳",name:"Arrear Ageing Report",          desc:"0–30 / 31–60 / 61–90 / 90+ days",   export:"PDF + Excel"},
    {icon:"🏦",name:"Advance Credit Report",         desc:"Flats with advance balance",          export:"Excel"},
    {icon:"⚖️",name:"Penalty Collection Report",     desc:"Penalties levied & collected",        export:"PDF + Excel"},
  ];

  return (
    <>
      <MonthSelector selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}/>
      <div className="section"><div className="sec-title">Financial Summary – {monthLabel(selectedMonth)}</div></div>
      <div className="stat-grid" style={{paddingTop:0}}>
        <div className="stat-card green"><div className="sc-label">Collected</div><div className="sc-value">{fmt(collected)}</div><div className="sc-sub">This month</div></div>
        <div className="stat-card red"><div className="sc-label">Month Dues</div><div className="sc-value">{fmt(totalDues)}</div><div className="sc-sub">Outstanding</div></div>
        <div className="stat-card gold"><div className="sc-label">Expenses</div><div className="sc-value">{fmt(monthlyExp)}</div><div className="sc-sub">This month</div></div>
        <div className="stat-card"><div className="sc-label">Surplus</div><div className="sc-value" style={{color:surplus>=0?"var(--green)":"var(--red)"}}>{fmt(surplus)}</div><div className="sc-sub">Net</div></div>
      </div>

      <div className="section"><div className="sec-title">All-Time Summary (Jun 2022 – May 2026)</div></div>
      <div className="stat-grid" style={{paddingTop:0}}>
        <div className="stat-card green"><div className="sc-label">Total Collected</div><div className="sc-value">{fmt(totalAllCollected)}</div><div className="sc-sub">48 months</div></div>
        <div className="stat-card red"><div className="sc-label">Total Expenses</div><div className="sc-value">{fmt(totalAllExpenses)}</div><div className="sc-sub">48 months</div></div>
      </div>

      <div className="section"><div className="sec-title">Available Reports</div></div>
      <div className="px16 mb14">
        <div className="card">
          {REPORTS.map(r=>(
            <div key={r.name} className="rep-item" onClick={()=>showToast("📥 Exporting: "+r.name)}>
              <div className="rep-left">
                <div className="rep-icon">{r.icon}</div>
                <div><div className="rep-name">{r.name}</div><div className="rep-desc">{r.desc}</div></div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div className="rep-export">{r.export}</div>
                <div style={{fontSize:18,color:"var(--muted)"}}>›</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Expenses Tab ───────────────────────────────────────────────
function ExpensesTab({selectedMonth,setSelectedMonth,allExpenses,monthExpenses,totalExp,showToast}) {
  const [viewAll, setViewAll] = useState(false);
  const displayExpenses = viewAll ? allExpenses : monthExpenses;
  const monthTotal = monthExpenses.reduce((s,e)=>s+e.amount,0);
  const bycat = displayExpenses.reduce((acc,e)=>{acc[e.category]=(acc[e.category]||0)+e.amount;return acc;},{});

  return (
    <>
      {!viewAll&&<MonthSelector selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}/>}
      <div style={{padding:"0 16px 10px"}}>
        <div className="card">
          <div style={{padding:"14px 16px 12px"}}>
            <div style={{fontSize:10,letterSpacing:"1.2px",textTransform:"uppercase",color:"var(--muted)",marginBottom:6,fontWeight:700}}>
              {viewAll?"All-Time Expenses":"Expenses – "+monthLabel(selectedMonth)}
            </div>
            <div style={{fontSize:26,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"var(--red)"}}>
              {fmt(viewAll?totalExp:monthTotal)}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:10}}>
              {Object.entries(bycat).sort((a,b)=>b[1]-a[1]).map(([c,a])=>(
                <div key={c} style={{background:"var(--bg)",borderRadius:7,padding:"4px 10px",fontSize:11,fontWeight:600}}>{catIcon(c)} {c}: {fmt(a)}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section row-between">
        <div className="sec-title" style={{marginBottom:0}}>
          {viewAll?`All Expenses (${allExpenses.length})`:`${monthLabel(selectedMonth)} Expenses (${monthExpenses.length})`}
        </div>
        <button className="add-btn" style={{background:viewAll?"var(--muted)":"var(--gold)"}} onClick={()=>setViewAll(v=>!v)}>
          {viewAll?"📅 Month View":"📋 All Time"}
        </button>
      </div>

      <div className="px16 mb14 mt10">
        <div className="card">
          {displayExpenses.length===0&&<div className="empty"><div className="empty-icon">💳</div><div>No expenses for this month</div></div>}
          {displayExpenses.map((e,i)=>(
            <div key={e.id||i} className="exp-item">
              <div className="exp-icon">{catIcon(e.category)}</div>
              <div className="exp-info">
                <div className="exp-vendor">{e.vendor}</div>
                <div className="exp-cat">{e.category}{e.billing_month?` · ${monthLabel(e.billing_month)}`:""}</div>
              </div>
              <div className="exp-right">
                <div className="exp-amount">{fmt(e.amount)}</div>
                <div className="exp-date">{e.expense_date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
