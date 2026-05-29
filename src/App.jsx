cd..
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";
 
// ─── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  profile: "cvo_profile",
  template: "cvo_template",
  applications: "cvo_applications",
  linkedin: "cvo_linkedin",
  editMemory: "cvo_edit_memory",
  kanbanCols: "cvo_kanban_cols",
  instructions: "cvo_instructions",
};
 
const load = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};
 
// ─── Default Kanban columns ───────────────────────────────────────────────────
const DEFAULT_COLS = [
  { id: "applied",    label: "Applied",      color: "#3b82f6" },
  { id: "screening",  label: "Screening",    color: "#8b5cf6" },
  { id: "interview",  label: "Interview",    color: "#f59e0b" },
  { id: "offer",      label: "Offer",        color: "#10b981" },
  { id: "rejected",   label: "Rejected",     color: "#ef4444" },
];
 
// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a0a; --surface: #111111; --surface2: #1a1a1a;
    --border: #252525; --border2: #333; --text: #e8e8e8;
    --text2: #888; --text3: #555; --accent: #c8ff00;
    --accent-dim: rgba(200,255,0,0.12); --accent-dim2: rgba(200,255,0,0.06);
    --red: #ff4444; --mono: 'DM Mono', monospace; --sans: 'DM Sans', sans-serif;
    --r: 6px; --r2: 10px;
  }
  html, body, #root { height: 100%; background: var(--bg); color: var(--text); font-family: var(--sans); }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
  .app { display: flex; flex-direction: column; min-height: 100vh; }
 
  /* NAV */
  .nav { display: flex; align-items: center; padding: 0 24px; height: 52px;
    border-bottom: 1px solid var(--border); background: var(--bg);
    position: sticky; top: 0; z-index: 100; gap: 0; }
  .nav-logo { font-family: var(--mono); font-size: 13px; letter-spacing: 0.08em;
    color: var(--accent); margin-right: 32px; cursor: pointer; }
  .nav-logo span { color: var(--text3); }
  .nav-link { font-size: 12px; font-weight: 500; letter-spacing: 0.05em; color: var(--text2);
    padding: 4px 12px; border-radius: var(--r); cursor: pointer;
    transition: color 0.15s, background 0.15s; background: none; border: none;
    font-family: var(--sans); position: relative; }
  .nav-link:hover { color: var(--text); background: var(--surface); }
  .nav-link.active { color: var(--accent); background: var(--accent-dim2); }
  .nav-dot { position: absolute; top: 2px; right: 4px; width: 5px; height: 5px;
    border-radius: 50%; background: var(--accent); display: block; }
 
  /* PAGE */
  .page { flex: 1; display: flex; flex-direction: column; animation: fadein 0.2s ease; }
  @keyframes fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; } }
 
  /* HOME */
  .home { flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 40px 24px; gap: 32px; }
  .home-eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: 0.15em;
    color: var(--text3); text-transform: uppercase; }
  .home-title { font-size: clamp(28px,5vw,48px); font-weight: 300; line-height: 1.15;
    text-align: center; letter-spacing: -0.02em; }
  .home-title strong { font-weight: 600; color: var(--accent); }
  .home-input-wrap { width: 100%; max-width: 560px; display: flex; flex-direction: column; gap: 10px; }
  .home-label { font-size: 11px; letter-spacing: 0.08em; color: var(--text3); font-family: var(--mono); }
  .home-input-row { display: flex; gap: 8px; }
  .input-url { flex: 1; background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r); padding: 12px 16px; font-family: var(--mono);
    font-size: 13px; color: var(--text); outline: none; transition: border-color 0.15s; }
  .input-url::placeholder { color: var(--text3); }
  .input-url:focus { border-color: var(--accent); }
  .home-recent { width: 100%; max-width: 560px; }
  .home-recent-title { font-size: 11px; letter-spacing: 0.08em; color: var(--text3);
    font-family: var(--mono); margin-bottom: 10px; }
  .recent-item { display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r); cursor: pointer; margin-bottom: 6px; transition: border-color 0.15s; }
  .recent-item:hover { border-color: var(--border2); }
  .recent-item-left { display: flex; flex-direction: column; gap: 2px; }
  .recent-item-company { font-size: 13px; font-weight: 500; }
  .recent-item-role { font-size: 12px; color: var(--text2); }
  .recent-item-date { font-family: var(--mono); font-size: 10px; color: var(--text3); }
  .status-dot { width: 6px; height: 6px; border-radius: 50%;
    background: var(--accent); opacity: 0.7; flex-shrink: 0; }
 
  /* BUTTONS */
  .btn-primary { background: var(--accent); color: #000; border: none;
    padding: 12px 20px; border-radius: var(--r); font-family: var(--mono);
    font-size: 12px; font-weight: 500; letter-spacing: 0.06em; cursor: pointer;
    transition: opacity 0.15s, transform 0.1s; white-space: nowrap; }
  .btn-primary:hover { opacity: 0.88; } .btn-primary:active { transform: scale(0.98); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-secondary { background: var(--surface); border: 1px solid var(--border2);
    color: var(--text); padding: 8px 14px; border-radius: var(--r);
    font-family: var(--mono); font-size: 11px; cursor: pointer;
    transition: border-color 0.15s, color 0.15s; white-space: nowrap; }
  .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
  .btn-danger { background: none; border: 1px solid rgba(255,68,68,0.4);
    color: var(--red); padding: 8px 16px; border-radius: var(--r);
    font-family: var(--mono); font-size: 11px; cursor: pointer;
    transition: background 0.15s, border-color 0.15s; white-space: nowrap; flex-shrink: 0; }
  .btn-danger:hover { background: rgba(255,68,68,0.08); border-color: var(--red); }
  .btn-add { background: var(--surface2); border: 1px solid var(--border2);
    color: var(--text); padding: 9px 14px; border-radius: var(--r);
    font-family: var(--mono); font-size: 12px; cursor: pointer;
    transition: border-color 0.15s, color 0.15s; }
  .btn-add:hover { border-color: var(--accent); color: var(--accent); }
  .btn-icon { background: none; border: 1px solid var(--border); color: var(--text3);
    width: 28px; height: 28px; border-radius: var(--r); cursor: pointer; font-size: 13px;
    display: flex; align-items: center; justify-content: center;
    transition: border-color 0.15s, color 0.15s; }
  .btn-icon:hover { border-color: var(--red); color: var(--red); }
 
  /* FULL PAGE */
  .full-page { flex: 1; display: flex; flex-direction: column;
    padding: 24px; gap: 16px; max-width: 900px; width: 100%; margin: 0 auto; }
  .page-header { display: flex; align-items: baseline; gap: 12px; }
  .page-title { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; }
  .page-subtitle { font-size: 12px; color: var(--text3); font-family: var(--mono); }
  .textarea-full { flex: 1; min-height: 400px; background: var(--surface);
    border: 1px solid var(--border2); border-radius: var(--r2); padding: 20px;
    font-family: var(--mono); font-size: 13px; line-height: 1.7; color: var(--text);
    outline: none; resize: none; transition: border-color 0.15s; }
  .textarea-full:focus { border-color: var(--accent); }
  .save-row { display: flex; align-items: center; gap: 10px; }
  .save-status { font-size: 11px; color: var(--text3); font-family: var(--mono); }
  .save-status.saved { color: var(--accent); }
 
  /* PROFILE */
  .profile-grid { display: flex; flex-direction: column; gap: 24px; }
  .section-label { font-size: 11px; letter-spacing: 0.1em; color: var(--text3);
    font-family: var(--mono); margin-bottom: 8px; text-transform: uppercase; }
  .badge-input-row { display: flex; gap: 8px; margin-bottom: 10px; }
  .input-badge { flex: 1; background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r); padding: 9px 14px; font-family: var(--mono);
    font-size: 12px; color: var(--text); outline: none; transition: border-color 0.15s; }
  .input-badge::placeholder { color: var(--text3); }
  .input-badge:focus { border-color: var(--accent); }
  .badges-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
  .badge { display: flex; align-items: center; gap: 6px; background: var(--surface2);
    border: 1px solid var(--border2); border-radius: 100px; padding: 4px 10px 4px 12px;
    font-size: 12px; font-family: var(--mono); }
  .badge-del { background: none; border: none; color: var(--text3); cursor: pointer;
    font-size: 14px; line-height: 1; padding: 0 2px; transition: color 0.15s; }
  .badge-del:hover { color: var(--red); }
 
  /* DETAIL */
  .detail-page { flex: 1; padding: 24px; max-width: 900px; width: 100%;
    margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
  .detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .detail-title-block { display: flex; flex-direction: column; gap: 4px; }
  .detail-company { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
  .detail-role { font-size: 14px; color: var(--text2); }
  .detail-url { font-family: var(--mono); font-size: 11px; color: var(--text3); }
  .detail-actions { display: flex; gap: 8px; flex-shrink: 0; }
  .section-block { display: flex; flex-direction: column; gap: 8px; }
  .section-block-header { display: flex; align-items: center; justify-content: space-between; }
  .cv-box { background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r2); padding: 20px; font-family: var(--mono);
    font-size: 13px; line-height: 1.75; color: var(--text);
    white-space: pre-wrap; min-height: 200px; }
  .cv-edit-textarea { background: var(--surface); border: 1px solid var(--accent);
    border-radius: var(--r2); padding: 20px; font-family: var(--mono);
    font-size: 13px; line-height: 1.75; color: var(--text);
    min-height: 300px; width: 100%; resize: none; outline: none; }
  .generating { display: flex; align-items: center; gap: 10px; color: var(--text2);
    font-family: var(--mono); font-size: 12px; padding: 32px 20px; }
  .spinner { width: 14px; height: 14px; border: 2px solid var(--border2);
    border-top-color: var(--accent); border-radius: 50%;
    animation: spin 0.7s linear infinite; flex-shrink: 0; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .learn-badge { display: inline-flex; align-items: center; gap: 5px;
    background: var(--accent-dim); border: 1px solid rgba(200,255,0,0.2);
    border-radius: 100px; padding: 3px 10px; font-family: var(--mono);
    font-size: 10px; color: var(--accent); letter-spacing: 0.06em; }
  .cover-textarea { background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r2); padding: 20px; font-family: var(--mono);
    font-size: 13px; line-height: 1.75; color: var(--text);
    outline: none; resize: none; min-height: 260px; width: 100%;
    transition: border-color 0.15s; }
  .cover-textarea:focus { border-color: var(--accent); }
  .cover-toolbar { display: flex; align-items: center; gap: 10px; }
 
  /* SETTINGS */
  .settings-page { flex: 1; padding: 32px 24px; max-width: 700px; width: 100%;
    margin: 0 auto; display: flex; flex-direction: column; gap: 32px; }
  .settings-section { display: flex; flex-direction: column; gap: 16px; }
  .settings-section-title { font-size: 11px; letter-spacing: 0.12em; color: var(--text3);
    font-family: var(--mono); text-transform: uppercase; padding-bottom: 12px;
    border-bottom: 1px solid var(--border); }
  .info-row { display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); }
  .info-row-label { font-size: 12px; color: var(--text2); }
  .info-row-value { font-family: var(--mono); font-size: 12px; color: var(--text); }
  .danger-card { background: var(--surface); border: 1px solid rgba(255,68,68,0.2);
    border-radius: var(--r2); padding: 20px 24px; display: flex;
    align-items: center; justify-content: space-between; gap: 16px; }
  .danger-info { display: flex; flex-direction: column; gap: 4px; }
  .danger-title { font-size: 13px; font-weight: 500; color: var(--text); }
  .danger-desc { font-size: 12px; color: var(--text2); }
 
  /* PROFILE TAB */
  .profile-avatar-row { display: flex; align-items: center; gap: 20px; }
  .profile-avatar-big { width: 64px; height: 64px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; font-weight: 600; flex-shrink: 0; color: #000;
    background: var(--accent); font-family: var(--mono); }
  .profile-avatar-info { display: flex; flex-direction: column; gap: 4px; }
  .profile-avatar-name { font-size: 16px; font-weight: 600; }
  .profile-avatar-email { font-size: 12px; color: var(--text2); font-family: var(--mono); }
  .profile-avatar-provider { display: inline-flex; align-items: center; gap: 5px;
    font-size: 10px; font-family: var(--mono); letter-spacing: 0.05em;
    padding: 2px 8px; border-radius: 100px; margin-top: 2px; }
  .profile-avatar-provider.google { background: rgba(255,255,255,0.08); color: var(--text2); border: 1px solid var(--border2); }
  .profile-avatar-provider.linkedin { background: rgba(0,119,181,0.15); color: #5fb3d4; border: 1px solid rgba(0,119,181,0.3); }
  .profile-avatar-provider.email { background: var(--accent-dim2); color: var(--accent); border: 1px solid rgba(200,255,0,0.15); }
  .profile-field { display: flex; flex-direction: column; gap: 6px; }
  .profile-field-label { font-size: 11px; letter-spacing: 0.08em; color: var(--text3); font-family: var(--mono); }
  .profile-field-input { background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r); padding: 10px 14px; font-size: 14px;
    font-family: var(--sans); color: var(--text); outline: none;
    transition: border-color 0.15s; }
  .profile-field-input:focus { border-color: var(--accent); }
  .profile-field-input::placeholder { color: var(--text3); }
  .profile-field-input:disabled { opacity: 0.5; cursor: not-allowed; background: var(--surface2); }
  .signout-row { display: flex; align-items: center; justify-content: space-between;
    padding: 14px 0; border-top: 1px solid var(--border); margin-top: 8px; }
  .signout-info { font-size: 12px; color: var(--text2); }
  .btn-signout { background: none; border: 1px solid var(--border2); color: var(--text2);
    padding: 7px 16px; border-radius: var(--r); font-family: var(--mono);
    font-size: 11px; cursor: pointer; transition: border-color 0.15s, color 0.15s; }
  .btn-signout:hover { border-color: var(--red); color: var(--red); }
 
  /* LOGIN PAGE */
  .login-screen { min-height: 100vh; display: flex; background: var(--bg); animation: fadein 0.3s ease; }
  .login-left { flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 48px 40px; max-width: 480px; margin: 0 auto; width: 100%; }
  .login-logo { font-family: var(--mono); font-size: 18px; letter-spacing: 0.08em;
    color: var(--accent); margin-bottom: 40px; align-self: flex-start; }
  .login-logo span { color: var(--text3); }
  .login-headline { font-size: clamp(24px, 4vw, 36px); font-weight: 600;
    letter-spacing: -0.03em; line-height: 1.2;
    margin-bottom: 10px; align-self: flex-start; }
  .login-sub { font-size: 14px; color: var(--text2); margin-bottom: 40px;
    align-self: flex-start; line-height: 1.5; }
  .login-card { width: 100%; display: flex; flex-direction: column; gap: 12px; }
  .login-divider { display: flex; align-items: center; gap: 12px;
    font-family: var(--mono); font-size: 11px; color: var(--text3);
    margin: 4px 0; }
  .login-divider::before, .login-divider::after {
    content: ""; flex: 1; height: 1px; background: var(--border2);
  }
  .btn-oauth { width: 100%; display: flex; align-items: center; justify-content: center; gap: 12px;
    padding: 13px 20px; border-radius: var(--r2); font-size: 14px;
    font-family: var(--sans); font-weight: 500; cursor: pointer;
    transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s; border: none; }
  .btn-oauth:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
  .btn-oauth:active { transform: translateY(0); }
  .btn-oauth.google { background: #fff; color: #1f1f1f; }
  .btn-oauth.linkedin { background: #0077b5; color: #fff; }
  .btn-oauth-icon { width: 20px; height: 20px; flex-shrink: 0; }
  .login-email-form { display: flex; flex-direction: column; gap: 10px; }
  .login-input { width: 100%; background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r); padding: 12px 16px; font-family: var(--sans);
    font-size: 14px; color: var(--text); outline: none; transition: border-color 0.15s; }
  .login-input::placeholder { color: var(--text3); }
  .login-input:focus { border-color: var(--accent); }
  .btn-email-login { width: 100%; padding: 13px; background: var(--accent); color: #000;
    border: none; border-radius: var(--r); font-family: var(--sans);
    font-size: 14px; font-weight: 600; cursor: pointer;
    transition: opacity 0.15s; letter-spacing: 0.01em; }
  .btn-email-login:hover { opacity: 0.88; }
  .btn-email-login:disabled { opacity: 0.4; cursor: not-allowed; }
  .login-toggle { text-align: center; font-size: 13px; color: var(--text2); margin-top: 4px; }
  .login-toggle-link { color: var(--accent); cursor: pointer; font-weight: 500;
    background: none; border: none; font-size: 13px; font-family: var(--sans); }
  .login-toggle-link:hover { text-decoration: underline; }
  .login-terms { font-size: 11px; color: var(--text3); text-align: center;
    font-family: var(--mono); line-height: 1.5; margin-top: 8px; }
  .login-error { background: rgba(255,68,68,0.08); border: 1px solid rgba(255,68,68,0.25);
    border-radius: var(--r); padding: 10px 14px;
    font-size: 12px; color: var(--red); font-family: var(--mono); }
 
  /* TOAST */
  .toast { position: fixed; bottom: 24px; right: 24px;
    background: var(--surface2); border: 1px solid var(--accent);
    color: var(--accent); padding: 10px 16px; border-radius: var(--r);
    font-family: var(--mono); font-size: 12px; z-index: 300;
    animation: toastin 0.2s ease; }
  @keyframes toastin { from { opacity: 0; transform: translateY(8px); } }
 
  /* PRINT */
  @media print {
    .nav, .detail-actions, .section-block-header .btn-secondary,
    .cover-toolbar, .no-print { display: none !important; }
    body { background: white; color: black; }
    .cv-box { border: none; padding: 0; background: white; color: black; font-size: 11pt; }
  }
`;
 
// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [onDone]);
  return <div className="toast">{msg}</div>;
}
 
// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");
 
  const handleGoogle = async () => {
    setLoading("google");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };
 
  const handleLinkedIn = async () => {
    setLoading("linkedin");
    await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: { redirectTo: window.location.origin },
    });
  };
 
  const handleEmailSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    if (mode === "signup" && !name.trim()) { setError("Please enter your name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading("email");
    setError("");
    try {
      const { error: err } = mode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };
 
  return (
    <div className="login-screen">
      <div className="login-left">
        <div className="login-logo">CV<span>/</span>OPT</div>
        <h1 className="login-headline">{mode === "login" ? "Welcome back." : "Create your account."}</h1>
        <p className="login-sub">{mode === "login" ? "Sign in to continue building smarter applications." : "Start optimizing your job applications with AI."}</p>
        <div className="login-card">
          {error && <div className="login-error">{error}</div>}
          <button className="btn-oauth google" onClick={handleGoogle} disabled={!!loading}>
            {loading === "google" ? <div className="spinner" style={{ borderTopColor: "#4285f4", borderColor: "#ddd" }} /> : "G"}
            {loading === "google" ? "Signing in…" : `${mode === "login" ? "Sign in" : "Sign up"} with Google`}
          </button>
          <button className="btn-oauth linkedin" onClick={handleLinkedIn} disabled={!!loading}>
            {loading === "linkedin" ? <div className="spinner" style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }} /> : "in"}
            {loading === "linkedin" ? "Signing in…" : `${mode === "login" ? "Sign in" : "Sign up"} with LinkedIn`}
          </button>
          <div className="login-divider">or continue with email</div>
          <div className="login-email-form">
            {mode === "signup" && (
              <input className="login-input" type="text" placeholder="Full name"
                value={name} onChange={e => setName(e.target.value)} disabled={!!loading} />
            )}
            <input className="login-input" type="email" placeholder="Email address"
              value={email} onChange={e => setEmail(e.target.value)} disabled={!!loading} />
            <input className="login-input" type="password" placeholder="Password"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleEmailSubmit()} disabled={!!loading} />
            <button className="btn-email-login" onClick={handleEmailSubmit} disabled={!!loading}>
              {loading === "email" ? "Signing in…" : (mode === "login" ? "Sign in →" : "Create account →")}
            </button>
          </div>
          <div className="login-toggle">
            {mode === "login" ? (
              <>Don't have an account?{" "}<button className="login-toggle-link" onClick={() => { setMode("signup"); setError(""); }}>Sign up</button></>
            ) : (
              <>Already have an account?{" "}<button className="login-toggle-link" onClick={() => { setMode("login"); setError(""); }}>Sign in</button></>
            )}
          </div>
          <div className="login-terms">By continuing, you agree to our Terms of Service and Privacy Policy.</div>
        </div>
      </div>
    </div>
  );
}
 
// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ authUser, onSignOut, onUpdateUser }) {
  const [displayName, setDisplayName] = useState(authUser?.name || "");
  const [saved, setSaved] = useState(false);
 
  const handleSave = () => {
    onUpdateUser({ ...authUser, name: displayName });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
 
  return (
    <div className="profile-grid">
      <div className="profile-avatar-row">
        <div className="profile-avatar-big">{authUser?.avatar || "?"}</div>
        <div className="profile-avatar-info">
          <div className="profile-avatar-name">{authUser?.name}</div>
          <div className="profile-avatar-email">{authUser?.email}</div>
          <span className={`profile-avatar-provider ${authUser?.provider || "email"}`}>
            {authUser?.provider === "google" && "G "}
            {authUser?.provider === "linkedin_oidc" && "in "}
            {authUser?.provider === "google" ? "Google" : authUser?.provider === "linkedin_oidc" ? "LinkedIn" : "Email"} account
          </span>
        </div>
      </div>
      <div className="profile-field">
        <div className="profile-field-label">Display Name</div>
        <input className="profile-field-input" value={displayName}
          onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
      </div>
      <div className="profile-field">
        <div className="profile-field-label">Email</div>
        <input className="profile-field-input" value={authUser?.email || ""}
          disabled placeholder="email@example.com" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
        <button className="btn-primary" style={{ padding: "9px 18px" }} onClick={handleSave}>SAVE PROFILE</button>
        <span className={`save-status${saved ? " saved" : ""}`}>{saved ? "✓ saved" : ""}</span>
      </div>
      <div className="signout-row">
        <div className="signout-info">Signed in via {authUser?.provider === "google" ? "Google" : authUser?.provider === "linkedin_oidc" ? "LinkedIn" : "Email"}</div>
        <button className="btn-signout" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}
 
// ─── Nav ──────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "home", label: "HOME" },
  { id: "template", label: "TEMPLATE" },
  { id: "profile", label: "PROFILE" },
  { id: "applications", label: "APPLIED" },
  { id: "settings", label: "SETTINGS" },
];
 
function Nav({ page, setPage, authUser }) {
  return (
    <nav className="nav">
      <div className="nav-logo" onClick={() => setPage("home")}>CV<span>/</span>OPT</div>
      {NAV_ITEMS.map(n => (
        <button key={n.id}
          className={`nav-link${page === n.id ? " active" : ""}`}
          onClick={() => setPage(n.id)}>{n.label}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      {authUser && (
        <button onClick={() => setPage("settings")} style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "none", border: "none", cursor: "pointer", padding: "4px 8px",
          borderRadius: "var(--r)", transition: "background 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "var(--accent)", color: "#000",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, fontFamily: "var(--mono)", flexShrink: 0,
          }}>
            {authUser.avatar}
          </div>
          <span style={{ fontSize: 12, color: "var(--text2)", fontFamily: "var(--mono)" }}>
            {authUser.name.split(" ")[0]}
          </span>
        </button>
      )}
    </nav>
  );
}
 
// ─── Home ─────────────────────────────────────────────────────────────────────
function Home({ applications, onSubmit, setPage, setCurrentApp }) {
  const [url, setUrl] = useState("");
  const handle = () => { if (!url.trim()) return; onSubmit(url.trim()); setUrl(""); };
  return (
    <div className="home">
      <div className="home-eyebrow">AI-powered job application tool</div>
      <h1 className="home-title">Paste a <strong>LinkedIn</strong> job URL.<br />Get an optimized CV.</h1>
      <div className="home-input-wrap">
        <div className="home-label">// LINKEDIN JOB URL</div>
        <div className="home-input-row">
          <input className="input-url" placeholder="https://www.linkedin.com/jobs/view/..."
            value={url} onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handle()} />
          <button className="btn-primary" onClick={handle}>GENERATE →</button>
        </div>
      </div>
      {applications.length > 0 && (
        <div className="home-recent">
          <div className="home-recent-title">// RECENT APPLICATIONS</div>
          {applications.slice(0, 4).map(app => (
            <div key={app.id} className="recent-item" onClick={() => { setCurrentApp(app); setPage("detail"); }}>
              <div className="recent-item-left">
                <span className="recent-item-company">{app.company || "Company"}</span>
                <span className="recent-item-role">{app.role || "Role"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="recent-item-date">{app.date}</span>
                <div className="status-dot" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
 
// ─── Settings ─────────────────────────────────────────────────────────────────
function Settings({ authUser, onSignOut, onUpdateUser }) {
  return (
    <div className="settings-page">
      <div className="page-header" style={{ marginBottom: 8 }}>
        <h2 className="page-title">Settings</h2>
      </div>
      <ProfileTab authUser={authUser} onSignOut={onSignOut} onUpdateUser={onUpdateUser} />
    </div>
  );
}
 
// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [currentApp, setCurrentApp] = useState(null);
  const [toast, setToast] = useState(null);
 
  // Check auth state on mount and listen for changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAuthUser(mapUser(session.user));
      setLoading(false);
    });
 
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session ? mapUser(session.user) : null);
    });
 
    return () => subscription.unsubscribe();
  }, []);
 
  const mapUser = (user) => ({
    id: user.id,
    name: user.user_metadata?.full_name || user.email.split("@")[0],
    email: user.email,
    avatar: (user.user_metadata?.full_name || user.email)[0].toUpperCase(),
    provider: user.app_metadata?.provider === "google" ? "google" : user.app_metadata?.provider === "linkedin" ? "linkedin_oidc" : "email",
  });
 
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setPage("home");
  };
 
  const handleUpdateUser = (updatedUser) => {
    setAuthUser(updatedUser);
  };
 
  const handleNewApplication = async (url) => {
    // Placeholder for full implementation
    const newApp = {
      id: Date.now().toString(),
      url,
      company: "Company",
      role: "Role",
      cv: "CV will be generated here",
      stage: "applied",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    };
    setApplications(prev => [newApp, ...prev]);
    setCurrentApp(newApp);
    setPage("detail");
  };
 
  if (loading) {
    return <div style={{ background: "var(--bg)", height: "100vh" }} />;
  }
 
  if (!authUser) {
    return (
      <>
        <style>{styles}</style>
        <LoginPage onAuth={setAuthUser} />
      </>
    );
  }
 
  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <Nav page={page} setPage={setPage} authUser={authUser} />
        <div className="page">
          {page === "home" && <Home applications={applications} onSubmit={handleNewApplication} setPage={setPage} setCurrentApp={setCurrentApp} />}
          {page === "settings" && <Settings authUser={authUser} onSignOut={handleSignOut} onUpdateUser={handleUpdateUser} />}
          {!["home", "settings"].includes(page) && <div style={{ padding: "20px", textAlign: "center", color: "var(--text2)" }}>Page coming soon</div>}
        </div>
      </div>
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </>
  );
}
