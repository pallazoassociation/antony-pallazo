import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

// ── Helpers ───────────────────────────────────────────────────
function fmt(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
function catIcon(c) {
  return { Cleaning:"🧹", Security:"🛡️", Electricity:"⚡", Repairs:"🔧", Maintenance:"🏗️", Admin:"📁" }[c] || "📋";
}
function getStatus(bill) {
  if (!bill) return "vacant";
  return bill.status || "unpaid";
}

// ── CSS ───────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F5F0EA;--card:#FFF;--text:#1A1410;--muted:#8A7E74;
  --gold:#B8860B;--gold-lt:#D4A853;--green:#2D7A4F;--red:#C0392B;
  --orange:#D4691E;--border:#E8E0D5;--nav-h:64px;--tab-h:68px;--r:16px;
}
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
.hero-greeting{color:rgba(255,255,255,.55);font-size:12px;letter-spacing:.4px}
.hero-name{color:#FFF;font-family:'Playfair Display',serif;font-size:22px;font-weight:700;margin:4px 0}
.hero-month{color:var(--gold-lt);font-size:12px}
.hero-divider{height:1px;background:rgba(255,255,255,.1);margin:14px 0}
.hero-stats{display:flex;gap:24px;position:relative;z-index:1}
.hs-val{color:#FFF;font-size:18px;font-weight:700}
.hs-val.orange{color:#E8893E}
.hs-label{color:rgba(255,255,255,.45);font-size:11px;margin-top:2px}
.qa-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:4px 16px 12px}
.qa-btn{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;background:none;border:none}
.qa-icon{width:54px;height:54px;border-radius:14px;background:var(--card);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:22px;transition:transform .15s}
.qa-btn:hover .qa-icon{transform:scale(1.06)}
.qa-label{font-size:10.5px;font-weight:600;color:var(--muted);text-align:center}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 16px 12px}
.stat-card{background:var(--card);border-radius:14px;padding:16px 14px;border:1px solid var(--border);position:relative;overflow:hidden}
.stat-card::after{content:'';position:absolute;top:-18px;right:-18px;width:56px;height:56px;border-radius:50%;background:var(--sc-accent,rgba(184,134,11,.08))}
.stat-card .sc-label{font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.stat-card .sc-value{font-size:21px;font-weight:700;color:var(--sc-color,var(--text));line-height:1}
.stat-card .sc-sub{font-size:11px;color:var(--muted);margin-top:4px}
.stat-card.green{--sc-color:var(--green);--sc-accent:rgba(45,122,79,.1)}
.stat-card.red{--sc-color:var(--red);--sc-accent:rgba(192,57,43,.1)}
.stat-card.gold{--sc-color:var(--gold);--sc-accent:rgba(184,134,11,.1)}
.coll-wrap{padding:0 16px 14px}
.coll-row{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:8px}
.coll-row b{color:var(--text);font-weight:600}
.multi-bar{height:9px;border-radius:99px;background:var(--border);overflow:hidden;display:flex}
.bar-paid{background:var(--green)}
.bar-partial{background:var(--orange)}
.bar-overdue{background:var(--red)}
.bar-legend{display:flex;gap:14px;margin-top:10px}
.bar-dot{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)}
.dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.flat-item{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s}
.flat-item:last-child{border-bottom:none}
.flat-item:hover{background:#FAF7F2}
.fi-left{display:flex;align-items:center;gap:12px}
.fi-avatar{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;color:#FFF;flex-shrink:0}
.fi-avatar.paid{background:linear-gradient(135deg,#2D7A4F,#3D9A62)}
.fi-avatar.partial{background:linear-gradient(135deg,#D4691E,#E8893E)}
.fi-avatar.overdue,.fi-avatar.unpaid{background:linear-gradient(135deg,#C0392B,#E05B4E)}
.fi-avatar.vacant{background:linear-gradient(135deg,#8A7E74,#B0A498)}
.fi-name{font-size:14.5px;font-weight:600}
.fi-meta{font-size:11.5px;color:var(--muted);margin-top:2px}
.fi-right{text-align:right}
.fi-amount{font-size:14.5px;font-weight:700}
.fi-amount.paid{color:var(--green)}
.fi-amount.partial,.fi-amount.unpaid{color:var(--orange)}
.fi-amount.overdue{color:var(--red)}
.fi-amount.vacant{color:var(--muted)}
.chip{font-size:9.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;padding:2px 8px;border-radius:99px;display:inline-block;margin-top:4px}
.chip.paid{background:#E8F5EE;color:var(--green)}
.chip.partial,.chip.unpaid{background:#FEF0E7;color:var(--orange)}
.chip.overdue{background:#FDEDEC;color:var(--red)}
.chip.vacant{background:#F0EDE9;color:var(--muted)}
.filter-bar{display:flex;gap:8px;padding:10px 16px 6px;overflow-x:auto;scrollbar-width:none}
.filter-bar::-webkit-scrollbar{display:none}
.pill{flex-shrink:0;padding:6px 16px;border-radius:99px;border:1.5px solid var(--border);font-size:12px;font-weight:600;background:var(--card);color:var(--muted);cursor:pointer;transition:all .15s;white-space:nowrap}
.pill.active{background:var(--gold);border-color:var(--gold);color:#FFF}
.search-wrap{padding:12px 16px 4px;position:relative}
.search-icon{position:absolute;left:28px;top:50%;transform:translateY(-50%);font-size:15px;color:var(--muted)}
.search-input{width:100%;padding:11px 14px 11px 40px;border-radius:12px;border:1.5px solid var(--border);background:var(--card);font-size:14px;font-family:'DM Sans',sans-serif;color:var(--text);outline:none}
.search-input:focus{border-color:var(--gold)}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:200;animation:fadeIn .2s ease}
.sheet{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:var(--card);border-radius:20px 20px 0 0;z-index:201;max-height:88vh;overflow-y:auto;animation:slideUp .28s cubic-bezier(.32,1,.64,1)}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}}
.sheet-handle{width:38px;height:4px;background:var(--border);border-radius:99px;margin:14px auto 0}
.sheet-head{padding:14px 20px 12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start}
.sheet-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700}
.sheet-sub{font-size:12.5px;color:var(--muted);margin-top:2px}
.sheet-body{padding:18px 20px 28px}
.close-btn{border:none;background:var(--border);border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.amt-block{background:linear-gradient(135deg,#1A1410,#2C2018);border-radius:16px;padding:18px 18px 16px;margin-bottom:16px}
.amt-block .ab-label{color:rgba(255,255,255,.5);font-size:10px;letter-spacing:1px;text-transform:uppercase}
.amt-block .ab-value{color:#FFF;font-size:30px;font-weight:700;font-family:'Playfair Display',serif;margin-top:4px}
.amt-block .ab-detail{color:var(--gold-lt);font-size:11.5px;margin-top:5px}
.info-row{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid var(--border)}
.info-row:last-child{border-bottom:none}
.ir-label{font-size:12.5px;color:var(--muted)}
.ir-value{font-size:12.5px;font-weight:600;text-align:right}
.btn{width:100%;padding:13px;border-radius:12px;border:none;cursor:pointer;font-size:14.5px;font-weight:600;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:7px;transition:transform .12s,opacity .2s}
.btn:active{transform:scale(.97)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-primary{background:linear-gradient(135deg,#B8860B,#D4A853);color:#FFF}
.btn-success{background:linear-gradient(135deg,#2D7A4F,#3D9A62);color:#FFF}
.btn-secondary{background:var(--bg);color:var(--text);border:1.5px solid var(--border)}
.btn-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.form-group{margin-bottom:15px}
.form-label{display:block;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.form-input{width:100%;padding:11px 13px;border-radius:10px;border:1.5px solid var(--border);font-size:14px;font-family:'DM Sans',sans-serif;color:var(--text);background:#FFF;outline:none}
.form-input:focus{border-color:var(--gold)}
select.form-input{-webkit-appearance:none;appearance:none;cursor:pointer}
.notice-item{padding:15px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s}
.notice-item:last-child{border-bottom:none}
.notice-item:hover{background:#FAF7F2}
.ni-date{font-size:10.5px;color:var(--muted);margin-bottom:4px}
.ni-title{font-size:14px;font-weight:600;margin-bottom:4px;line-height:1.3}
.ni-body{font-size:12px;color:var(--muted);line-height:1.55}
.ni-meta{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11px;color:var(--muted)}
.exp-item{display:flex;align-items:center;padding:13px 16px;border-bottom:1px solid var(--border)}
.exp-item:last-child{border-bottom:none}
.exp-icon{width:40px;height:40px;border-radius:10px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.exp-info{flex:1;padding:0 12px}
.exp-vendor{font-size:13.5px;font-weight:600}
.exp-cat{font-size:11.5px;color:var(--muted);margin-top:2px}
.exp-right{text-align:right}
.exp-amount{font-size:14.5px;font-weight:700;color:var(--red)}
.exp-date{font-size:11px;color:var(--muted);margin-top:2px}
.rep-item{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s}
.rep-item:last-child{border-bottom:none}
.rep-item:hover{background:#FAF7F2}
.rep-left{display:flex;align-items:center;gap:12px}
.rep-icon{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#1A1410,#2C2018);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.rep-name{font-size:13.5px;font-weight:600}
.rep-desc{font-size:11.5px;color:var(--muted);margin-top:2px}
.rep-export{font-size:10.5px;color:var(--gold);font-weight:700;margin-bottom:2px}
.tag-owner{display:inline-block;padding:2px 8px;border-radius:99px;background:#EEF2FF;color:#4F46E5;font-size:10.5px;font-weight:700}
.tag-tenant{display:inline-block;padding:2px 8px;border-radius:99px;background:#FFF3E0;color:#E65100;font-size:10.5px;font-weight:700}
.toast{position:fixed;bottom:82px;left:50%;transform:translateX(-50%);background:#1A1410;color:#FFF;padding:11px 20px;border-radius:12px;font-size:13px;font-weight:500;z-index:400;white-space:nowrap;animation:toastIn .25s ease;pointer-events:none;box-shadow:0 4px 20px rgba(0,0,0,.35)}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.empty{padding:48px 24px;text-align:center;color:var(--muted)}
.empty-icon{font-size:44px;margin-bottom:12px}
.px16{padding:0 16px}
.mt10{margin-top:10px}
.mt14{margin-top:14px}
.mb14{margin-bottom:14px}
.row-between{display:flex;justify-content:space-between;align-items:center}
.add-btn{border:none;background:var(--gold);color:#FFF;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif}
.spinner{display:inline-block;width:20px;height:20px;border:2px solid rgba(255,255,255,.3);border-top-color:#FFF;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── LOGIN ── */
.login-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;background:linear-gradient(160deg,#1A1410 0%,#2C2018 50%,#3D2D1A 100%)}
.login-logo{width:72px;height:72px;border-radius:20px;background:linear-gradient(135deg,var(--gold),var(--gold-lt));display:flex;align-items:center;justify-content:center;font-size:36px;margin-bottom:16px}
.login-title{color:#FFF;font-family:'Playfair Display',serif;font-size:26px;font-weight:700;text-align:center;margin-bottom:4px}
.login-sub{color:rgba(255,255,255,.5);font-size:13px;text-align:center;margin-bottom:36px}
.login-card{background:var(--card);border-radius:20px;padding:24px;width:100%;max-width:360px}
.login-step-title{font-size:16px;font-weight:700;margin-bottom:6px}
.login-step-sub{font-size:13px;color:var(--muted);margin-bottom:20px;line-height:1.5}
.otp-row{display:flex;gap:8px}
.otp-input{flex:1;padding:14px 10px;border-radius:10px;border:1.5px solid var(--border);font-size:18px;font-weight:700;text-align:center;letter-spacing:4px;font-family:'DM Sans',sans-serif;color:var(--text);background:#FFF;outline:none}
.otp-input:focus{border-color:var(--gold)}
.phone-prefix{padding:11px 13px;background:var(--bg);border:1.5px solid var(--border);border-radius:10px 0 0 10px;font-size:14px;font-weight:600;color:var(--muted);display:flex;align-items:center}
.phone-input-row{display:flex}
.phone-field{flex:1;padding:11px 13px;border-radius:0 10px 10px 0;border:1.5px solid var(--border);border-left:none;font-size:15px;font-family:'DM Sans',sans-serif;color:var(--text);background:#FFF;outline:none}
.phone-field:focus{border-color:var(--gold)}
.resend-row{text-align:center;margin-top:12px;font-size:12px;color:var(--muted)}
.resend-link{color:var(--gold);font-weight:600;cursor:pointer;background:none;border:none;font-family:'DM Sans',sans-serif;font-size:12px}
`;

// ── Login Screen ───────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [step, setStep]       = useState("phone"); // phone | otp
  const [phone, setPhone]     = useState("");
  const [otp, setOtp]         = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [countdown, setCount] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCount(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  async function sendOtp() {
    if (phone.length < 10) { setError("Enter a valid 10-digit mobile number"); return; }
    setLoading(true); setError("");
    const fullPhone = "+91" + phone.replace(/\D/g, "");
    const { error: err } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setStep("otp");
    setCount(30);
  }

  async function verifyOtp() {
    if (otp.length < 6) { setError("Enter the 6-digit OTP"); return; }
    setLoading(true); setError("");
    const fullPhone = "+91" + phone.replace(/\D/g, "");
    const { data, error: err } = await supabase.auth.verifyOtp({
      phone: fullPhone, token: otp, type: "sms"
    });
    setLoading(false);
    if (err) { setError("Invalid OTP. Please try again."); return; }
    onLogin(data.session);
  }

  return (
    <div className="login-wrap">
      <div className="login-logo">🏛</div>
      <div className="login-title">Antony Pallazo</div>
      <div className="login-sub">Apartment Management</div>
      <div className="login-card">
        {step === "phone" ? (
          <>
            <div className="login-step-title">Welcome back</div>
            <div className="login-step-sub">Enter your registered mobile number to receive a one-time password</div>
            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <div className="phone-input-row">
                <div className="phone-prefix">🇮🇳 +91</div>
                <input
                  className="phone-field"
                  type="tel" maxLength={10} placeholder="98XXXXXXXX"
                  value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g,"")); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && sendOtp()}
                />
              </div>
            </div>
            {error && <div style={{color:"var(--red)",fontSize:12,marginBottom:12}}>{error}</div>}
            <button className="btn btn-primary" onClick={sendOtp} disabled={loading}>
              {loading ? <span className="spinner"/> : "Send OTP →"}
            </button>
          </>
        ) : (
          <>
            <div className="login-step-title">Enter OTP</div>
            <div className="login-step-sub">A 6-digit code was sent to +91 {phone}</div>
            <div className="form-group">
              <label className="form-label">One-Time Password</label>
              <input
                className="otp-input" type="tel" maxLength={6} placeholder="······"
                value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g,"")); setError(""); }}
                onKeyDown={e => e.key === "Enter" && verifyOtp()}
              />
            </div>
            {error && <div style={{color:"var(--red)",fontSize:12,marginBottom:12}}>{error}</div>}
            <button className="btn btn-success" onClick={verifyOtp} disabled={loading}>
              {loading ? <span className="spinner"/> : "✓ Verify & Login"}
            </button>
            <div className="resend-row">
              {countdown > 0
                ? `Resend OTP in ${countdown}s`
                : <><button className="resend-link" onClick={() => { setStep("phone"); setOtp(""); }}>← Change number</button> &nbsp;·&nbsp; <button className="resend-link" onClick={sendOtp}>Resend OTP</button></>
              }
            </div>
            <button className="btn btn-secondary mt10" onClick={() => { setStep("phone"); setOtp(""); setError(""); }}>
              ← Back
            </button>
          </>
        )}
      </div>
      <div style={{color:"rgba(255,255,255,.25)",fontSize:11,marginTop:24,textAlign:"center"}}>
        Secured by Supabase · Data stored in PostgreSQL
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────
export default function App() {
  const [session,      setSession]      = useState(null);
  const [userProfile,  setUserProfile]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState("home");
  const [flats,        setFlats]        = useState([]);
  const [bills,        setBills]        = useState([]);
  const [expenses,     setExpenses]     = useState([]);
  const [notices,      setNotices]      = useState([]);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [filter,       setFilter]       = useState("all");
  const [search,       setSearch]       = useState("");
  const [toast,        setToast]        = useState(null);
  const [payModal,     setPayModal]     = useState(false);
  const [noticePanel,  setNoticePanel]  = useState(null);
  const [payForm,      setPayForm]      = useState({ amount:"", mode:"Cash", ref:"" });

  // ── Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadUserProfile(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session) loadUserProfile(session.user.id);
      else { setLoading(false); setUserProfile(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadUserProfile(uid) {
    const { data } = await supabase.from("users").select("*").eq("id", uid).single();
    setUserProfile(data);
    setLoading(false);
  }

  // ── Load data from Supabase
  const loadData = useCallback(async () => {
    const [{ data: f }, { data: b }, { data: e }, { data: n }] = await Promise.all([
      supabase.from("flats").select("*").order("block").order("flat_no"),
      supabase.from("bills").select("*").order("billing_month", { ascending: false }),
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      supabase.from("notices").select("*").order("posted_at", { ascending: false }),
    ]);
    if (f) setFlats(f);
    if (b) setBills(b);
    if (e) setExpenses(e);
    if (n) setNotices(n);
  }, []);

  useEffect(() => { if (session) loadData(); }, [session, loadData]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    showToast("Logged out successfully");
  }

  // ── Payment recording
  async function handlePayment() {
    const amt = parseInt(payForm.amount, 10);
    if (!amt || amt <= 0) { showToast("⚠️ Enter a valid amount"); return; }
    const flat = selectedFlat;
    const bill = bills.find(b => b.flat_id === flat.id && b.billing_month === "2026-05");
    if (!bill) { showToast("⚠️ No bill found for this flat"); return; }

    // Insert payment
    const { data: payment, error: pErr } = await supabase.from("payments").insert({
      bill_id: bill.id, flat_id: flat.id, amount_paid: amt,
      mode: payForm.mode, reference: payForm.ref,
      payment_date: new Date().toISOString().split("T")[0],
      recorded_by: userProfile?.id
    }).select().single();

    if (pErr) { showToast("❌ Error: " + pErr.message); return; }

    // Insert receipt
    await supabase.from("receipts").insert({
      payment_id: payment.id, flat_id: flat.id,
      amount: amt, billing_month: "2026-05"
    });

    // Update bill status
    const newPaid   = (bill.total_amount - (bill.arrears || 0)) <= amt ? "paid" : "partial";
    await supabase.from("bills").update({ status: newPaid }).eq("id", bill.id);

    // Audit log
    await supabase.from("audit_log").insert({
      user_id: userProfile?.id, action: "PAYMENT_RECORDED",
      table_name: "payments", record_id: payment.id,
      new_value: { flat: flat.flat_no, amount: amt, mode: payForm.mode }
    });

    await loadData();
    setPayModal(false);
    setPayForm({ amount: "", mode: "Cash", ref: "" });
    showToast("✅ Payment saved — receipt generated!");
  }

  // ── Generate bills for all flats
  async function generateBills() {
    const month = "2026-06";
    const dueDate = "2026-07-10";
    const toInsert = flats
      .filter(f => f.status !== "vacant")
      .map(f => ({
        flat_id: f.id, billing_month: month,
        total_amount: f.monthly_charge, arrears: 0,
        due_date: dueDate, status: "unpaid",
        generated_by: userProfile?.id
      }));
    const { error } = await supabase.from("bills").upsert(toInsert, { onConflict: "flat_id,billing_month" });
    if (error) { showToast("❌ " + error.message); return; }
    await loadData();
    showToast(`⚡ ${toInsert.length} bills generated for June 2026!`);
  }

  // ── Derived stats
  const currentMonth = "2026-05";
  const monthBills   = bills.filter(b => b.billing_month === currentMonth);
  const flatBill     = (flatId) => monthBills.find(b => b.flat_id === flatId);
  const flatStatus   = (flatId) => {
    const f = flats.find(x => x.id === flatId);
    if (!f || f.status === "vacant") return "vacant";
    return getStatus(flatBill(flatId));
  };
  const collected  = monthBills.filter(b => b.status === "paid").reduce((s, b) => s + b.total_amount, 0);
  const totalDues  = monthBills.reduce((s, b) => s + (b.arrears || 0), 0);
  const expected   = flats.filter(f => f.status !== "vacant").reduce((s, f) => s + f.monthly_charge, 0);
  const paidCnt    = monthBills.filter(b => b.status === "paid").length;
  const overdCnt   = monthBills.filter(b => b.status === "overdue").length;
  const partCnt    = monthBills.filter(b => b.status === "partial").length;
  const collPct    = expected > 0 ? Math.round((collected / expected) * 100) : 0;
  const totalExp   = expenses.reduce((s, e) => s + e.amount, 0);

  const filteredFlats = flats.filter(f => {
    const s = flatStatus(f.id);
    const okFilter = filter === "all" || filter === s
      || (filter === "3bhk" && f.bhk_type === "3BHK")
      || (filter === "2bhk" && f.bhk_type === "2BHK")
      || (filter === "1bhk" && f.bhk_type === "1BHK");
    const okSearch = !search
      || f.flat_no.toLowerCase().includes(search.toLowerCase())
      || f.block.toLowerCase().includes(search.toLowerCase());
    return okFilter && okSearch;
  });

  // ── Loading / Auth gate
  if (loading) return (
    <>
      <style>{CSS}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#1A1410,#2C2018)"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:16}}>🏛</div>
          <div style={{color:"rgba(255,255,255,.6)",fontSize:14}}>Loading Antony Pallazo…</div>
        </div>
      </div>
    </>
  );

  if (!session) return (
    <>
      <style>{CSS}</style>
      <LoginScreen onLogin={s => { setSession(s); loadUserProfile(s.user.id); }} />
    </>
  );

  const sharedProps = { flats, bills: monthBills, flatBill, flatStatus, expenses, notices, showToast, setTab, userProfile };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <header className="header">
          <div className="hdr-logo">
            <div className="hdr-icon">🏛</div>
            <div>
              <div className="hdr-name">Antony Pallazo</div>
              <div className="hdr-sub">{userProfile?.role === "admin" ? "Admin" : `Flat ${userProfile?.flat_id}`} · May 2026</div>
            </div>
          </div>
          <div className="hdr-btns">
            <button className="icon-btn" onClick={() => showToast("🔔 Notifications coming soon")}>🔔</button>
            <button className="icon-btn" onClick={handleLogout} title="Logout">🚪</button>
          </div>
        </header>

        <div className="content">
          {tab === "home"     && <HomeTab     {...sharedProps} collected={collected} totalDues={totalDues} expected={expected} paidCnt={paidCnt} overdCnt={overdCnt} partCnt={partCnt} collPct={collPct} totalExp={totalExp} setSelectedFlat={setSelectedFlat} generateBills={generateBills} />}
          {tab === "flats"    && <FlatsTab    {...sharedProps} filteredFlats={filteredFlats} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} setSelectedFlat={setSelectedFlat} />}
          {tab === "reports"  && <ReportsTab  {...sharedProps} collected={collected} totalDues={totalDues} totalExp={totalExp} />}
          {tab === "notices"  && <NoticesTab  notices={notices} noticePanel={noticePanel} setNoticePanel={setNoticePanel} showToast={showToast} />}
          {tab === "expenses" && <ExpensesTab expenses={expenses} totalExp={totalExp} showToast={showToast} />}
        </div>

        <nav className="tabbar">
          {[
            { id:"home",icon:"🏠",label:"Home" },
            { id:"flats",icon:"🏢",label:"Flats" },
            { id:"reports",icon:"📊",label:"Reports" },
            { id:"notices",icon:"📋",label:"Notices" },
            { id:"expenses",icon:"💳",label:"Expenses" },
          ].map(t => (
            <button key={t.id} className={`tab-item${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
              <span className="tab-icon">{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>

        {selectedFlat && (
          <FlatSheet
            flat={selectedFlat} bill={flatBill(selectedFlat.id)}
            status={flatStatus(selectedFlat.id)}
            onClose={() => setSelectedFlat(null)}
            onPay={() => setPayModal(true)} showToast={showToast}
          />
        )}

        {payModal && selectedFlat && (
          <PaySheet
            flat={selectedFlat} form={payForm} setForm={setPayForm}
            onClose={() => { setPayModal(false); setPayForm({ amount:"",mode:"Cash",ref:"" }); }}
            onSubmit={handlePayment}
          />
        )}

        {noticePanel && (
          <NoticeSheet notice={noticePanel} onClose={() => setNoticePanel(null)} showToast={showToast} />
        )}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );
}

// ── Home Tab ──────────────────────────────────────────────────
function HomeTab({ flats, bills, flatStatus, collected, totalDues, expected, paidCnt, overdCnt, partCnt, collPct, totalExp, setSelectedFlat, setTab, generateBills, showToast }) {
  const defaulters = flats.filter(f => f.status !== "vacant" && flatStatus(f.id) === "overdue");
  return (
    <>
      <div className="hero">
        <div className="hero-greeting">Good morning, Committee Admin</div>
        <div className="hero-name">Antony Pallazo</div>
        <div className="hero-month">May 2026 · Blocks A–F · {flats.length} Flats</div>
        <div className="hero-divider" />
        <div className="hero-stats">
          <div><div className="hs-val">{fmt(collected)}</div><div className="hs-label">Collected</div></div>
          <div><div className="hs-val orange">{fmt(totalDues)}</div><div className="hs-label">Outstanding</div></div>
          <div><div className="hs-val">{collPct}%</div><div className="hs-label">Collection</div></div>
        </div>
      </div>

      <div className="section"><div className="sec-title">Quick Actions</div></div>
      <div className="qa-grid">
        <button className="qa-btn" onClick={generateBills}><div className="qa-icon">⚡</div><div className="qa-label">Gen Bills</div></button>
        <button className="qa-btn" onClick={() => setTab("flats")}><div className="qa-icon">💸</div><div className="qa-label">Record Payment</div></button>
        <button className="qa-btn" onClick={() => showToast("📤 Reminders sent to " + overdCnt + " defaulters")}><div className="qa-icon">📤</div><div className="qa-label">Send Reminders</div></button>
        <button className="qa-btn" onClick={() => setTab("reports")}><div className="qa-icon">📊</div><div className="qa-label">Reports</div></button>
      </div>

      <div className="coll-wrap">
        <div className="card">
          <div style={{padding:"14px 16px 12px"}}>
            <div className="coll-row"><span>May 2026 Collection</span><b>{fmt(collected)} / {fmt(expected)}</b></div>
            <div className="multi-bar">
              <div className="bar-paid"    style={{width:`${expected>0?(paidCnt/flats.filter(f=>f.status!=="vacant").length)*100:0}%`}} />
              <div className="bar-partial" style={{width:`${expected>0?(partCnt/flats.filter(f=>f.status!=="vacant").length)*100:0}%`}} />
              <div className="bar-overdue" style={{width:`${expected>0?(overdCnt/flats.filter(f=>f.status!=="vacant").length)*100:0}%`}} />
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
        <div className="stat-card red"><div className="sc-label">Total Dues</div><div className="sc-value">{fmt(totalDues)}</div><div className="sc-sub">{overdCnt} overdue</div></div>
        <div className="stat-card gold"><div className="sc-label">Expected</div><div className="sc-value">{fmt(expected)}</div><div className="sc-sub">{flats.filter(f=>f.status!=="vacant").length} active flats</div></div>
        <div className="stat-card"><div className="sc-label">Expenses</div><div className="sc-value">{fmt(totalExp)}</div><div className="sc-sub">May 2026</div></div>
      </div>

      {defaulters.length > 0 && (
        <>
          <div className="section"><div className="sec-title">Immediate Action Required</div></div>
          <div className="px16 mb14">
            <div className="card">
              {defaulters.slice(0,5).map(f => (
                <div key={f.id} className="flat-item" onClick={() => { setSelectedFlat(f); }}>
                  <div className="fi-left">
                    <div className="fi-avatar overdue">{f.flat_no}</div>
                    <div><div className="fi-name">Flat {f.flat_no}</div><div className="fi-meta">{f.bhk_type} · Block {f.block}</div></div>
                  </div>
                  <div className="fi-right">
                    <div className="fi-amount overdue">{fmt(bills.find(b=>b.flat_id===f.id)?.arrears||0)}</div>
                    <div className="chip overdue">Overdue</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Flats Tab ──────────────────────────────────────────────────
function FlatsTab({ filteredFlats, bills, flatBill, flatStatus, filter, setFilter, search, setSearch, setSelectedFlat }) {
  return (
    <>
      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input className="search-input" placeholder="Search flat or block…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="filter-bar">
        {[["all","All"],["paid","Paid"],["partial","Partial"],["overdue","Overdue"],["vacant","Vacant"],["3bhk","3BHK"],["2bhk","2BHK"],["1bhk","1BHK"]].map(([v,l]) => (
          <button key={v} className={`pill${filter===v?" active":""}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>
      <div className="px16 mb14">
        <div className="card">
          {filteredFlats.length === 0 && <div className="empty"><div className="empty-icon">🏢</div><div>No flats match</div></div>}
          {filteredFlats.map(f => {
            const s = flatStatus(f.id);
            const b = flatBill(f.id);
            return (
              <div key={f.id} className="flat-item" onClick={() => setSelectedFlat(f)}>
                <div className="fi-left">
                  <div className={`fi-avatar ${s}`}>{f.flat_no}</div>
                  <div>
                    <div className="fi-name">Flat {f.flat_no} <span style={{fontSize:11,color:"var(--muted)",fontWeight:400}}>· {f.bhk_type}</span></div>
                    <div className="fi-meta">Block {f.block} · {f.occupancy==="vacant"?"Vacant":f.occupancy==="owner"?"Owner Occupied":"Rented"}</div>
                  </div>
                </div>
                <div className="fi-right">
                  {s==="vacant" ? <div className="fi-amount vacant">—</div>
                    : s==="paid" ? <div className="fi-amount paid">{fmt(f.monthly_charge)}</div>
                    : <div className={`fi-amount ${s}`}>{fmt(b?.arrears||0)} due</div>}
                  <div className={`chip ${s}`}>{s.charAt(0).toUpperCase()+s.slice(1)}</div>
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
function FlatSheet({ flat, bill, status, onClose, onPay, showToast }) {
  const outstanding = (bill?.arrears || 0) + (status === "partial" ? Math.max(0, (bill?.total_amount||0) - ((bill?.total_amount||0) - (bill?.arrears||0))) : 0);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-head">
          <div><div className="sheet-title">Flat {flat.flat_no}</div><div className="sheet-sub">{flat.bhk_type} · Block {flat.block} · {flat.occupancy==="owner"?"Owner Occupied":flat.occupancy==="rented"?"Rented":"Vacant"}</div></div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sheet-body">
          {flat.status !== "vacant" && (
            <div className="amt-block">
              <div className="ab-label">Outstanding Balance</div>
              <div className="ab-value">{fmt(bill?.arrears || 0)}</div>
              <div className="ab-detail">Monthly: {fmt(flat.monthly_charge)} · Status: {status} · Due: {bill?.due_date || "—"}</div>
            </div>
          )}
          <div className="card mb14">
            {[
              ["Flat No", flat.flat_no], ["Type", flat.bhk_type], ["Block", flat.block],
              ["Monthly Charge", fmt(flat.monthly_charge)], ["Arrears", fmt(bill?.arrears||0)],
              ["Bill Status", <span className={`chip ${status}`}>{status.charAt(0).toUpperCase()+status.slice(1)}</span>],
            ].map(([l,v]) => (
              <div key={l} className="info-row"><span className="ir-label">{l}</span><span className="ir-value">{v}</span></div>
            ))}
          </div>
          {flat.status !== "vacant" && (
            <div className="btn-grid">
              <button className="btn btn-primary" onClick={onPay}>💸 Record Payment</button>
              <button className="btn btn-secondary" onClick={() => showToast("📤 Bill sent to Flat "+flat.flat_no)}>📤 Send Bill</button>
              <button className="btn btn-secondary" onClick={() => showToast("📄 Receipt downloaded")}>📄 Receipt</button>
              <button className="btn btn-secondary" onClick={() => showToast("💬 Reminder sent to Flat "+flat.flat_no)}>💬 Remind</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pay Sheet ──────────────────────────────────────────────────
function PaySheet({ flat, form, setForm, onClose, onSubmit }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-head">
          <div><div className="sheet-title">Record Payment</div><div className="sheet-sub">Flat {flat.flat_no} · {fmt(flat.monthly_charge)}/month</div></div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sheet-body">
          <div className="form-group">
            <label className="form-label">Amount Received (₹)</label>
            <input className="form-input" type="number" placeholder="e.g. 2000" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <select className="form-input" value={form.mode} onChange={e => setForm(p=>({...p,mode:e.target.value}))}>
              <option>Cash</option><option>UPI</option><option>NEFT</option><option>IMPS</option><option>Cheque</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Reference / Transaction ID</label>
            <input className="form-input" placeholder="Optional" value={form.ref} onChange={e => setForm(p=>({...p,ref:e.target.value}))} />
          </div>
          <button className="btn btn-success mt10" onClick={onSubmit}>✅ Confirm & Save to Database</button>
          <button className="btn btn-secondary mt10" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Reports Tab ────────────────────────────────────────────────
function ReportsTab({ collected, totalDues, totalExp, showToast }) {
  const surplus = collected - totalExp;
  const REPORTS = [
    {icon:"📅",name:"Monthly Collection Summary",desc:"Billed vs collected vs outstanding",export:"PDF + Excel"},
    {icon:"📒",name:"Flat-wise Ledger",desc:"Complete billing & payment history",export:"PDF"},
    {icon:"🚨",name:"Defaulter / Dues Report",desc:"All flats with outstanding dues",export:"PDF + Excel"},
    {icon:"📈",name:"Annual Income & Expenditure",desc:"Collections vs expenses for FY",export:"PDF + Excel"},
    {icon:"💳",name:"Payment Mode Summary",desc:"Cash / UPI / Cheque / NEFT",export:"Excel"},
    {icon:"⏳",name:"Arrear Ageing Report",desc:"0–30 / 31–60 / 61–90 / 90+ days",export:"PDF + Excel"},
    {icon:"🏦",name:"Advance Credit Report",desc:"Flats with advance balance",export:"Excel"},
    {icon:"⚖️",name:"Penalty Collection Report",desc:"Penalties levied & collected",export:"PDF + Excel"},
  ];
  return (
    <>
      <div className="section"><div className="sec-title">Financial Summary – May 2026</div></div>
      <div className="stat-grid" style={{paddingTop:0}}>
        <div className="stat-card green"><div className="sc-label">Collected</div><div className="sc-value">{fmt(collected)}</div><div className="sc-sub">This month</div></div>
        <div className="stat-card red"><div className="sc-label">Dues</div><div className="sc-value">{fmt(totalDues)}</div><div className="sc-sub">Outstanding</div></div>
        <div className="stat-card gold"><div className="sc-label">Expenses</div><div className="sc-value">{fmt(totalExp)}</div><div className="sc-sub">May 2026</div></div>
        <div className="stat-card"><div className="sc-label">Surplus</div><div className="sc-value" style={{color:surplus>=0?"var(--green)":"var(--red)"}}>{fmt(surplus)}</div><div className="sc-sub">Net</div></div>
      </div>
      <div className="section"><div className="sec-title">Available Reports</div></div>
      <div className="px16 mb14">
        <div className="card">
          {REPORTS.map(r => (
            <div key={r.name} className="rep-item" onClick={() => showToast("📥 Exporting: "+r.name)}>
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

// ── Notices Tab ────────────────────────────────────────────────
function NoticesTab({ notices, noticePanel, setNoticePanel, showToast }) {
  return (
    <>
      <div className="section row-between">
        <div className="sec-title" style={{marginBottom:0}}>Notice Board</div>
        <button className="add-btn" onClick={() => showToast("📝 Post notice — coming soon")}>＋ Post</button>
      </div>
      <div className="px16 mb14 mt10">
        <div className="card">
          {notices.length === 0 && <div className="empty"><div className="empty-icon">📋</div><div>No notices yet</div></div>}
          {notices.map(n => (
            <div key={n.id} className="notice-item" onClick={() => setNoticePanel(n)}>
              <div className="ni-date">{new Date(n.posted_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})} · {n.target}</div>
              <div className="ni-title">{n.title}</div>
              <div className="ni-body">{n.body.substring(0,90)}…</div>
            </div>
          ))}
        </div>
      </div>
      {noticePanel && (
        <div className="overlay" onClick={() => setNoticePanel(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle"/>
            <div className="sheet-head">
              <div style={{flex:1,paddingRight:12}}><div className="sheet-title">{noticePanel.title}</div><div className="sheet-sub">{noticePanel.target}</div></div>
              <button className="close-btn" onClick={() => setNoticePanel(null)}>✕</button>
            </div>
            <div className="sheet-body">
              <p style={{fontSize:14,lineHeight:1.75}}>{noticePanel.body}</p>
              <div className="btn-grid mt14">
                <button className="btn btn-primary" onClick={() => { showToast("📤 Resent via WhatsApp"); setNoticePanel(null); }}>📤 Resend</button>
                <button className="btn btn-secondary" onClick={() => setNoticePanel(null)}>✕ Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Expenses Tab ───────────────────────────────────────────────
function ExpensesTab({ expenses, totalExp, showToast }) {
  const bycat = expenses.reduce((acc,e) => { acc[e.category]=(acc[e.category]||0)+e.amount; return acc; }, {});
  return (
    <>
      <div className="px16 mt14">
        <div className="card">
          <div style={{padding:"16px 16px 14px"}}>
            <div style={{fontSize:10,letterSpacing:"1.2px",textTransform:"uppercase",color:"var(--muted)",marginBottom:6,fontWeight:700}}>Total Expenses – May 2026</div>
            <div style={{fontSize:28,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"var(--red)"}}>{fmt(totalExp)}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12}}>
              {Object.entries(bycat).map(([c,a]) => (
                <div key={c} style={{background:"var(--bg)",borderRadius:8,padding:"5px 11px",fontSize:12,fontWeight:600}}>{catIcon(c)} {c}: {fmt(a)}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="section row-between mt10">
        <div className="sec-title" style={{marginBottom:0}}>All Expenses</div>
        <button className="add-btn" onClick={() => showToast("＋ Add expense — coming soon")}>＋ Add</button>
      </div>
      <div className="px16 mb14 mt10">
        <div className="card">
          {expenses.length === 0 && <div className="empty"><div className="empty-icon">💳</div><div>No expenses recorded</div></div>}
          {expenses.map(e => (
            <div key={e.id} className="exp-item">
              <div className="exp-icon">{catIcon(e.category)}</div>
              <div className="exp-info"><div className="exp-vendor">{e.vendor}</div><div className="exp-cat">{e.category} · {e.invoice_no}</div></div>
              <div className="exp-right"><div className="exp-amount">{fmt(e.amount)}</div><div className="exp-date">{e.expense_date}</div></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
