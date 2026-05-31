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
  authUser: "cvo_auth_user",
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

  /* FULL PAGE (template/profile) */
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

  /* KANBAN */
  .applied-page { flex: 1; display: flex; flex-direction: column; min-height: 0; }
  .applied-toolbar { display: flex; align-items: center; justify-content: space-between;
    padding: 16px 24px 0; gap: 12px; }
  .applied-toolbar-left { display: flex; align-items: baseline; gap: 12px; }
  .view-toggle { display: flex; gap: 4px; background: var(--surface);
    border: 1px solid var(--border2); border-radius: var(--r); padding: 3px; }
  .view-btn { background: none; border: none; color: var(--text3); padding: 5px 10px;
    border-radius: 4px; font-family: var(--mono); font-size: 11px; cursor: pointer;
    transition: background 0.15s, color 0.15s; }
  .view-btn.active { background: var(--surface2); color: var(--text); }

  .kanban-wrap { flex: 1; overflow-x: auto; padding: 20px 24px 24px;
    display: flex; gap: 14px; align-items: flex-start; min-height: 0; }
  .kanban-col { flex-shrink: 0; width: 240px; display: flex; flex-direction: column; gap: 8px; }
  .kanban-col-header { display: flex; align-items: center; justify-content: space-between;
    padding: 8px 4px; }
  .kanban-col-title-wrap { display: flex; align-items: center; gap: 7px; }
  .kanban-col-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .kanban-col-title { font-size: 12px; font-weight: 500; letter-spacing: 0.04em; }
  .kanban-col-count { font-family: var(--mono); font-size: 10px; color: var(--text3); }
  .kanban-col-edit { background: none; border: none; color: var(--text3);
    font-size: 13px; cursor: pointer; padding: 2px 4px; transition: color 0.15s; }
  .kanban-col-edit:hover { color: var(--text); }
  .kanban-col-body { display: flex; flex-direction: column; gap: 6px;
    min-height: 60px; transition: background 0.15s; border-radius: var(--r2);
    padding: 2px; }
  .kanban-col-body.drag-over { background: var(--accent-dim2); }
  .kanban-card { background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r2); padding: 12px 14px; cursor: pointer;
    transition: border-color 0.15s, transform 0.1s; }
  .kanban-card:hover { border-color: var(--border2); }
  .kanban-card.dragging { opacity: 0.5; transform: rotate(1deg); }
  .kanban-card-company { font-size: 13px; font-weight: 500; margin-bottom: 2px; }
  .kanban-card-role { font-size: 11px; color: var(--text2); margin-bottom: 6px; }
  .kanban-card-meta { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
  .kanban-card-date { font-family: var(--mono); font-size: 10px; color: var(--text3); }
  .kanban-card-next { font-family: var(--mono); font-size: 10px;
    color: var(--accent); display: flex; align-items: center; gap: 3px; }
  .kanban-card-del { background: none; border: none; color: var(--text3);
    font-size: 14px; cursor: pointer; padding: 0 2px; transition: color 0.15s;
    line-height: 1; }
  .kanban-card-del:hover { color: var(--red); }
  .kanban-add-col { flex-shrink: 0; width: 180px; }
  .kanban-add-col-btn { width: 100%; background: none; border: 1px dashed var(--border2);
    color: var(--text3); padding: 10px 14px; border-radius: var(--r2);
    font-family: var(--mono); font-size: 11px; cursor: pointer;
    transition: border-color 0.15s, color 0.15s; text-align: left; }
  .kanban-add-col-btn:hover { border-color: var(--accent); color: var(--accent); }

  /* col edit inline */
  .col-edit-input { background: var(--surface2); border: 1px solid var(--accent);
    border-radius: 4px; padding: 3px 8px; font-family: var(--mono); font-size: 12px;
    color: var(--text); outline: none; width: 120px; }

  /* GANTT */
  .gantt-wrap { flex: 1; overflow-x: auto; padding: 20px 24px 24px; }
  .gantt-table { width: 100%; min-width: 700px; border-collapse: collapse; }
  .gantt-head-label { font-family: var(--mono); font-size: 10px; color: var(--text3);
    text-align: left; padding: 0 8px 10px; font-weight: 400; }
  .gantt-head-date { font-family: var(--mono); font-size: 10px; color: var(--text3);
    text-align: center; padding: 0 4px 10px; font-weight: 400; }
  .gantt-row-company { font-size: 13px; font-weight: 500; padding: 7px 8px; white-space: nowrap; }
  .gantt-row-role { font-size: 11px; color: var(--text2); padding: 0 8px 7px; white-space: nowrap; }
  .gantt-row td { border-bottom: 1px solid var(--border); }
  .gantt-bar-cell { position: relative; }
  .gantt-bar { height: 8px; border-radius: 4px; position: absolute;
    top: 50%; transform: translateY(-50%); min-width: 8px; }
  .gantt-today-line { position: absolute; top: 0; bottom: 0; width: 1px;
    background: var(--accent); opacity: 0.4; pointer-events: none; }

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

  /* stage selector */
  .stage-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .stage-btn { padding: 5px 12px; border-radius: 100px; font-family: var(--mono);
    font-size: 11px; cursor: pointer; border: 1px solid transparent;
    transition: opacity 0.15s, transform 0.1s; }
  .stage-btn:hover { opacity: 0.8; }
  .stage-btn.active { opacity: 1; font-weight: 600; }
  .stage-btn:not(.active) { background: var(--surface2) !important;
    color: var(--text2) !important; border-color: var(--border2) !important; }
  .next-date-wrap { display: flex; align-items: center; gap: 8px; }
  .next-date-label { font-family: var(--mono); font-size: 11px; color: var(--text3); }
  .next-date-input { background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r); padding: 5px 10px; font-family: var(--mono);
    font-size: 12px; color: var(--text); outline: none; transition: border-color 0.15s; }
  .next-date-input:focus { border-color: var(--accent); }

  /* cv edit mode */
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

  /* learning badge */
  .learn-badge { display: inline-flex; align-items: center; gap: 5px;
    background: var(--accent-dim); border: 1px solid rgba(200,255,0,0.2);
    border-radius: 100px; padding: 3px 10px; font-family: var(--mono);
    font-size: 10px; color: var(--accent); letter-spacing: 0.06em; }

  /* cover letter */
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
  .integration-card { background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r2); padding: 20px 24px; display: flex;
    align-items: center; gap: 20px; transition: border-color 0.2s; }
  .integration-card.connected { border-color: rgba(200,255,0,0.25); }
  .integration-logo { width: 40px; height: 40px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    background: #0077b5; color: white; font-weight: 700; font-family: var(--mono);
    font-size: 13px; letter-spacing: -0.02em; }
  .integration-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
  .integration-name { font-size: 14px; font-weight: 500; }
  .integration-desc { font-size: 12px; color: var(--text2); line-height: 1.4; }
  .integration-status { display: flex; align-items: center; gap: 6px;
    font-size: 11px; font-family: var(--mono); margin-top: 4px; }
  .integration-status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .integration-status-dot.on { background: var(--accent); }
  .integration-status-dot.off { background: var(--text3); }
  .integration-status.on { color: var(--accent); }
  .integration-status.off { color: var(--text3); }
  .integration-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; flex-shrink: 0; }
  .account-pill { display: flex; align-items: center; gap: 8px; background: var(--surface2);
    border: 1px solid var(--border2); border-radius: 100px; padding: 5px 12px 5px 8px;
    font-size: 12px; margin-bottom: 4px; }
  .account-avatar { width: 22px; height: 22px; border-radius: 50%; background: #0077b5;
    color: white; display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 600; flex-shrink: 0; }
  .account-name { font-size: 12px; color: var(--text); }
  .account-email { font-size: 10px; color: var(--text3); font-family: var(--mono); }
  .danger-card { background: var(--surface); border: 1px solid rgba(255,68,68,0.2);
    border-radius: var(--r2); padding: 20px 24px; display: flex;
    align-items: center; justify-content: space-between; gap: 16px; }
  .danger-info { display: flex; flex-direction: column; gap: 4px; }
  .danger-title { font-size: 13px; font-weight: 500; color: var(--text); }
  .danger-desc { font-size: 12px; color: var(--text2); }
  .info-row { display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); }
  .info-row-label { font-size: 12px; color: var(--text2); }
  .info-row-value { font-family: var(--mono); font-size: 12px; color: var(--text); }

  /* instructions */
  .instructions-block { display: flex; flex-direction: column; gap: 10px; }
  .instructions-label-row { display: flex; align-items: center; justify-content: space-between; }
  .instructions-tag { font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em;
    padding: 2px 8px; border-radius: 100px; }
  .instructions-tag.cv { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.25); }
  .instructions-tag.cover { background: rgba(236,72,153,0.12); color: #f472b6; border: 1px solid rgba(236,72,153,0.25); }
  .instructions-textarea { background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r2); padding: 14px 16px; font-family: var(--mono);
    font-size: 12px; line-height: 1.7; color: var(--text); outline: none;
    resize: vertical; min-height: 100px; width: 100%;
    transition: border-color 0.15s; }
  .instructions-textarea:focus { border-color: var(--accent); }
  .instructions-textarea::placeholder { color: var(--text3); }
  .instructions-active-pill { display: inline-flex; align-items: center; gap: 5px;
    font-family: var(--mono); font-size: 10px; color: var(--accent);
    background: var(--accent-dim); border: 1px solid rgba(200,255,0,0.2);
    border-radius: 100px; padding: 2px 9px; }

  /* instructions section save row */
  .instructions-save-row { display: flex; align-items: center; gap: 10px; padding-top: 2px; }


  .memory-panel { background: var(--surface2); border: 1px solid var(--border2);
    border-radius: var(--r2); padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
  .memory-item { display: flex; flex-direction: column; gap: 3px;
    padding: 10px 12px; background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r); }
  .memory-item-meta { font-family: var(--mono); font-size: 10px; color: var(--text3);
    display: flex; gap: 8px; }
  .memory-item-text { font-size: 12px; color: var(--text2); font-family: var(--mono);
    white-space: pre-wrap; line-height: 1.5; }
  .memory-empty { font-family: var(--mono); font-size: 12px; color: var(--text3); text-align: center; padding: 20px; }

  /* MODALS */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; backdrop-filter: blur(4px); }
  .modal-box { background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r2); padding: 32px 40px; display: flex;
    flex-direction: column; align-items: center; gap: 16px;
    max-width: 360px; text-align: center; }
  .modal-title { font-size: 15px; font-weight: 500; }
  .modal-sub { font-size: 12px; color: var(--text2); font-family: var(--mono); line-height: 1.5; }
  .confirm-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; backdrop-filter: blur(4px); animation: fadein 0.15s ease; }
  .confirm-box { background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r2); padding: 28px 32px; max-width: 380px; width: 90%;
    display: flex; flex-direction: column; gap: 20px; }
  .confirm-title { font-size: 15px; font-weight: 600; }
  .confirm-body { font-size: 13px; color: var(--text2); line-height: 1.55; }
  .confirm-actions { display: flex; gap: 10px; justify-content: flex-end; }
  .oauth-window { position: fixed; inset: 0; background: rgba(0,0,0,0.75);
    display: flex; align-items: center; justify-content: center;
    z-index: 250; backdrop-filter: blur(8px); animation: fadein 0.15s ease; }
  .oauth-card { background: #fff; border-radius: 14px; width: 420px;
    overflow: hidden; box-shadow: 0 32px 64px rgba(0,0,0,0.5); }
  .oauth-header { background: #0077b5; padding: 24px 28px; display: flex; align-items: center; gap: 12px; }
  .oauth-body { padding: 28px; display: flex; flex-direction: column; gap: 16px; }
  .oauth-input { width: 100%; padding: 10px 14px; border: 1px solid #ddd;
    border-radius: 6px; font-size: 14px; font-family: sans-serif; outline: none; }
  .oauth-input:focus { border-color: #0077b5; }
  .oauth-btn { width: 100%; padding: 12px; background: #0077b5; color: white;
    border: none; border-radius: 6px; font-size: 14px; font-weight: 600;
    font-family: sans-serif; cursor: pointer; }
  .oauth-btn:disabled { background: #ccc; cursor: not-allowed; }
  .oauth-note { font-size: 11px; color: #999; font-family: sans-serif; text-align: center; }
  .oauth-close { float: right; background: none; border: none;
    color: rgba(255,255,255,0.7); font-size: 20px; cursor: pointer; line-height: 1; }

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

  /* LOGIN PAGE */
  .login-screen {
    min-height: 100vh; display: flex; background: var(--bg);
    animation: fadein 0.3s ease;
  }
  .login-left {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 48px 40px; max-width: 480px; margin: 0 auto;
    width: 100%;
  }
  .login-logo {
    font-family: var(--mono); font-size: 18px; letter-spacing: 0.08em;
    color: var(--accent); margin-bottom: 40px; align-self: flex-start;
  }
  .login-logo span { color: var(--text3); }
  .login-headline {
    font-size: clamp(24px, 4vw, 36px); font-weight: 600;
    letter-spacing: -0.03em; line-height: 1.2;
    margin-bottom: 10px; align-self: flex-start;
  }
  .login-sub {
    font-size: 14px; color: var(--text2); margin-bottom: 40px;
    align-self: flex-start; line-height: 1.5;
  }
  .login-card {
    width: 100%; display: flex; flex-direction: column; gap: 12px;
  }
  .login-divider {
    display: flex; align-items: center; gap: 12px;
    font-family: var(--mono); font-size: 11px; color: var(--text3);
    margin: 4px 0;
  }
  .login-divider::before, .login-divider::after {
    content: ""; flex: 1; height: 1px; background: var(--border2);
  }
  .btn-oauth {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 12px;
    padding: 13px 20px; border-radius: var(--r2); font-size: 14px;
    font-family: var(--sans); font-weight: 500; cursor: pointer;
    transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
    border: none;
  }
  .btn-oauth:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
  .btn-oauth:active { transform: translateY(0); }
  .btn-oauth.google {
    background: #fff; color: #1f1f1f;
  }
  .btn-oauth.linkedin {
    background: #0077b5; color: #fff;
  }
  .btn-oauth-icon { width: 20px; height: 20px; flex-shrink: 0; }
  .login-email-form { display: flex; flex-direction: column; gap: 10px; }
  .login-input {
    width: 100%; background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r); padding: 12px 16px; font-family: var(--sans);
    font-size: 14px; color: var(--text); outline: none; transition: border-color 0.15s;
  }
  .login-input::placeholder { color: var(--text3); }
  .login-input:focus { border-color: var(--accent); }
  .btn-email-login {
    width: 100%; padding: 13px; background: var(--accent); color: #000;
    border: none; border-radius: var(--r); font-family: var(--sans);
    font-size: 14px; font-weight: 600; cursor: pointer;
    transition: opacity 0.15s; letter-spacing: 0.01em;
  }
  .btn-email-login:hover { opacity: 0.88; }
  .btn-email-login:disabled { opacity: 0.4; cursor: not-allowed; }
  .login-toggle {
    text-align: center; font-size: 13px; color: var(--text2); margin-top: 4px;
  }
  .login-toggle-link {
    color: var(--accent); cursor: pointer; font-weight: 500;
    background: none; border: none; font-size: 13px; font-family: var(--sans);
  }
  .login-toggle-link:hover { text-decoration: underline; }
  .login-terms {
    font-size: 11px; color: var(--text3); text-align: center;
    font-family: var(--mono); line-height: 1.5; margin-top: 8px;
  }
  .login-right {
    flex: 1; background: var(--surface);
    border-left: 1px solid var(--border);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 48px; position: relative; overflow: hidden;
  }
  @media (max-width: 768px) { .login-right { display: none; } }
  .login-preview-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
    width: 100%; max-width: 380px;
  }
  .login-preview-card {
    background: var(--surface2); border: 1px solid var(--border2);
    border-radius: var(--r2); padding: 14px 16px;
  }
  .login-preview-card-co { font-size: 12px; font-weight: 500; margin-bottom: 2px; }
  .login-preview-card-role { font-size: 11px; color: var(--text2); margin-bottom: 8px; }
  .login-preview-bar { height: 4px; border-radius: 2px; margin-bottom: 4px; }
  .login-tagline {
    font-size: 20px; font-weight: 600; letter-spacing: -0.02em;
    text-align: center; margin-bottom: 10px; margin-top: 32px;
  }
  .login-tagline span { color: var(--accent); }
  .login-tagline-sub { font-size: 13px; color: var(--text2); text-align: center; }
  .login-error {
    background: rgba(255,68,68,0.08); border: 1px solid rgba(255,68,68,0.25);
    border-radius: var(--r); padding: 10px 14px;
    font-size: 12px; color: var(--red); font-family: var(--mono);
  }

  /* SETTINGS TABS */
  .settings-tabs { display: flex; gap: 2px; background: var(--surface);
    border: 1px solid var(--border2); border-radius: var(--r); padding: 3px; width: fit-content; }
  .settings-tab { background: none; border: none; color: var(--text2);
    padding: 6px 16px; border-radius: 4px; font-family: var(--mono);
    font-size: 11px; letter-spacing: 0.06em; cursor: pointer;
    transition: background 0.15s, color 0.15s; }
  .settings-tab.active { background: var(--surface2); color: var(--text); }

  /* PROFILE TAB */
  .profile-tab-grid { display: flex; flex-direction: column; gap: 16px; }
  .profile-avatar-row { display: flex; align-items: center; gap: 20px; }
  .profile-avatar-big {
    width: 64px; height: 64px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; font-weight: 600; flex-shrink: 0; color: #000;
    background: var(--accent); font-family: var(--mono);
  }
  .profile-avatar-info { display: flex; flex-direction: column; gap: 4px; }
  .profile-avatar-name { font-size: 16px; font-weight: 600; }
  .profile-avatar-email { font-size: 12px; color: var(--text2); font-family: var(--mono); }
  .profile-avatar-provider {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 10px; font-family: var(--mono); letter-spacing: 0.05em;
    padding: 2px 8px; border-radius: 100px; margin-top: 2px;
  }
  .profile-avatar-provider.google { background: rgba(255,255,255,0.08); color: var(--text2); border: 1px solid var(--border2); }
  .profile-avatar-provider.linkedin { background: rgba(0,119,181,0.15); color: #5fb3d4; border: 1px solid rgba(0,119,181,0.3); }
  .profile-avatar-provider.email { background: var(--accent-dim2); color: var(--accent); border: 1px solid rgba(200,255,0,0.15); }
  .profile-field { display: flex; flex-direction: column; gap: 6px; }
  .profile-field-label { font-size: 11px; letter-spacing: 0.08em; color: var(--text3); font-family: var(--mono); }
  .profile-field-input {
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: var(--r); padding: 10px 14px; font-size: 14px;
    font-family: var(--sans); color: var(--text); outline: none;
    transition: border-color 0.15s;
  }
  .profile-field-input:focus { border-color: var(--accent); }
  .profile-field-input::placeholder { color: var(--text3); }
  .profile-field-input:disabled {
    opacity: 0.5; cursor: not-allowed; background: var(--surface2);
  }
  .signout-row { display: flex; align-items: center; justify-content: space-between;
    padding: 14px 0; border-top: 1px solid var(--border); margin-top: 8px; }
  .signout-info { font-size: 12px; color: var(--text2); }
  .btn-signout {
    background: none; border: 1px solid var(--border2); color: var(--text2);
    padding: 7px 16px; border-radius: var(--r); font-family: var(--mono);
    font-size: 11px; cursor: pointer; transition: border-color 0.15s, color 0.15s;
  }
  .btn-signout:hover { border-color: var(--red); color: var(--red); }
`;

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [onDone]);
  return <div className="toast">{msg}</div>;
}

// ─── Login Page ───────────────────────────────────────────────────────────────
const PREVIEW_CARDS = [
  { co: "Stripe", role: "Sr. Product Designer", color: "#6366f1", w: "70%" },
  { co: "Linear", role: "Product Designer", color: "#10b981", w: "55%" },
  { co: "Vercel", role: "Design Engineer", color: "#f59e0b", w: "80%" },
  { co: "Notion", role: "UX Designer", color: "#ec4899", w: "45%" },
];

function LoginPage({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(null); // null | 'google' | 'linkedin' | 'email'
  const [error, setError] = useState("");

  const simulateOAuth = (provider) => {
    setLoading(provider); setError("");
    setTimeout(() => {
      const mockUsers = {
        google: { name: "Alex Johnson", email: "alex.johnson@gmail.com", avatar: "A", provider: "google" },
        linkedin: { name: "Alex Johnson", email: "alex.johnson@linkedin.com", avatar: "A", provider: "linkedin" },
      };
      onAuth(mockUsers[provider]);
      setLoading(null);
    }, 1600);
  };

  const handleEmailSubmit = () => {
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    if (mode === "signup" && !name.trim()) { setError("Please enter your name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading("email"); setError("");
    setTimeout(() => {
      const displayName = mode === "signup" ? name.trim() : email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      onAuth({ name: displayName, email: email.trim(), avatar: displayName.charAt(0).toUpperCase(), provider: "email" });
      setLoading(null);
    }, 1000);
  };

  return (
    <div className="login-screen">
      {/* Left – form */}
      <div className="login-left">
        <div className="login-logo">CV<span>/</span>OPT</div>
        <h1 className="login-headline">{mode === "login" ? "Welcome back." : "Create your account."}</h1>
        <p className="login-sub">{mode === "login" ? "Sign in to continue building smarter applications." : "Start optimizing your job applications with AI."}</p>

        <div className="login-card">
          {error && <div className="login-error">{error}</div>}

          {/* OAuth buttons */}
          <button className="btn-oauth google" onClick={() => simulateOAuth("google")} disabled={!!loading}>
            {loading === "google" ? <div className="spinner" style={{ borderTopColor: "#4285f4", borderColor: "#ddd" }} /> : (
              <svg className="btn-oauth-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading === "google" ? "Signing in…" : `${mode === "login" ? "Sign in" : "Sign up"} with Google`}
          </button>

          <button className="btn-oauth linkedin" onClick={() => simulateOAuth("linkedin")} disabled={!!loading}>
            {loading === "linkedin" ? <div className="spinner" style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }} /> : (
              <svg className="btn-oauth-icon" viewBox="0 0 24 24" fill="white">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            )}
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

          <div className="login-terms">By continuing, you agree to our Terms of Service<br />and Privacy Policy.</div>
        </div>
      </div>

      {/* Right – preview */}
      <div className="login-right">
        <div className="login-preview-grid">
          {PREVIEW_CARDS.map((c, i) => (
            <div key={i} className="login-preview-card">
              <div className="login-preview-card-co">{c.co}</div>
              <div className="login-preview-card-role">{c.role}</div>
              <div className="login-preview-bar" style={{ background: c.color, width: c.w, opacity: 0.8 }} />
              <div className="login-preview-bar" style={{ background: "var(--border2)", width: "90%" }} />
            </div>
          ))}
        </div>
        <div className="login-tagline">Your CV, <span>optimized</span><br />for every application.</div>
        <div className="login-tagline-sub">AI-tailored CVs and cover letters<br />that match each job description.</div>
      </div>
    </div>
  );
}

// ─── Settings Profile Tab ─────────────────────────────────────────────────────
function ProfileTab({ authUser, onSignOut, onUpdateUser }) {
  const [displayName, setDisplayName] = useState(authUser?.name || "");
  const [jobTitle, setJobTitle] = useState(authUser?.jobTitle || "");
  const [location, setLocation] = useState(authUser?.location || "");
  const [website, setWebsite] = useState(authUser?.website || "");
  const [saved, setSaved] = useState(false);

  const isOAuth = authUser?.provider === "google" || authUser?.provider === "linkedin";

  const handleSave = () => {
    onUpdateUser({ ...authUser, name: displayName, jobTitle, location, website });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const providerLabel = { google: "Google", linkedin: "LinkedIn", email: "Email" }[authUser?.provider] || "Email";

  return (
    <div className="profile-tab-grid">
      {/* Avatar + identity */}
      <div className="profile-avatar-row">
        <div className="profile-avatar-big">{authUser?.avatar || "?"}</div>
        <div className="profile-avatar-info">
          <div className="profile-avatar-name">{authUser?.name}</div>
          <div className="profile-avatar-email">{authUser?.email}</div>
          <span className={`profile-avatar-provider ${authUser?.provider || "email"}`}>
            {authUser?.provider === "google" && "G "}
            {authUser?.provider === "linkedin" && "in "}
            {providerLabel} account
          </span>
        </div>
      </div>

      {/* Editable fields */}
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

      <div className="profile-field">
        <div className="profile-field-label">Current Job Title</div>
        <input className="profile-field-input" value={jobTitle}
          onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Senior Product Designer" />
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div className="profile-field" style={{ flex: 1 }}>
          <div className="profile-field-label">Location</div>
          <input className="profile-field-input" value={location}
            onChange={e => setLocation(e.target.value)} placeholder="e.g. Lisbon, PT" />
        </div>
        <div className="profile-field" style={{ flex: 1 }}>
          <div className="profile-field-label">Website / Portfolio</div>
          <input className="profile-field-input" value={website}
            onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com" />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
        <button className="btn-primary" style={{ padding: "9px 18px" }} onClick={handleSave}>
          SAVE PROFILE
        </button>
        <span className={`save-status${saved ? " saved" : ""}`}>
          {saved ? "✓ saved" : ""}
        </span>
      </div>

      <div className="signout-row">
        <div className="signout-info">Signed in via {providerLabel}</div>
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

function Nav({ page, setPage, linkedin, authUser }) {
  return (
    <nav className="nav">
      <div className="nav-logo" onClick={() => setPage("home")}>CV<span>/</span>OPT</div>
      {NAV_ITEMS.map(n => (
        <button key={n.id}
          className={`nav-link${page === n.id || (page === "detail" && n.id === "applications") ? " active" : ""}`}
          onClick={() => setPage(n.id)}>
          {n.label}
          {n.id === "settings" && linkedin && <span className="nav-dot" />}
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

// ─── Template ─────────────────────────────────────────────────────────────────
function Template({ template, setTemplate }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="full-page">
      <div className="page-header">
        <h2 className="page-title">CV Template</h2>
        <span className="page-subtitle">// Define your base CV structure</span>
      </div>
      <textarea className="textarea-full"
        placeholder="Paste your CV template here. The AI will use this structure.\n\n[NAME]\n[CONTACT]\n\n## SUMMARY\n...\n## EXPERIENCE\n...\n## EDUCATION\n..."
        value={template} onChange={e => setTemplate(e.target.value)} />
      <div className="save-row">
        <button className="btn-primary" onClick={() => { save(STORAGE_KEYS.template, template); setSaved(true); setTimeout(() => setSaved(false), 2000); }}>SAVE TEMPLATE</button>
        <span className={`save-status${saved ? " saved" : ""}`}>{saved ? "✓ saved" : "unsaved changes"}</span>
      </div>
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────
function BadgeSection({ label, items, onAdd, onRemove }) {
  const [input, setInput] = useState("");
  const add = () => { const v = input.trim(); if (!v || items.includes(v)) return; onAdd(v); setInput(""); };
  return (
    <div>
      <div className="section-label">{label}</div>
      <div className="badge-input-row">
        <input className="input-badge" placeholder={`Add ${label.toLowerCase()}...`}
          value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        <button className="btn-add" onClick={add}>+ ADD</button>
      </div>
      <div className="badges-wrap">
        {items.map(item => (
          <div key={item} className="badge">{item}
            <button className="badge-del" onClick={() => onRemove(item)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Profile({ profile, setProfile }) {
  const [saved, setSaved] = useState(false);
  const upd = (f, v) => setProfile(p => ({ ...p, [f]: v }));
  const addB = f => item => setProfile(p => ({ ...p, [f]: [...(p[f] || []), item] }));
  const remB = f => item => setProfile(p => ({ ...p, [f]: (p[f] || []).filter(x => x !== item) }));
  return (
    <div className="full-page">
      <div className="page-header">
        <h2 className="page-title">Profile</h2>
        <span className="page-subtitle">// Your experience & skills</span>
      </div>
      <div className="profile-grid">
        <div>
          <div className="section-label">Experience & Background</div>
          <textarea className="textarea-full" style={{ minHeight: 280 }}
            placeholder="Describe your professional experience in free-form text. The AI references this when building CVs."
            value={profile.experience || ""} onChange={e => upd("experience", e.target.value)} />
        </div>
        <BadgeSection label="Skills" items={profile.skills || []} onAdd={addB("skills")} onRemove={remB("skills")} />
        <BadgeSection label="Tools" items={profile.tools || []} onAdd={addB("tools")} onRemove={remB("tools")} />
      </div>
      <div className="save-row" style={{ marginTop: 8 }}>
        <button className="btn-primary" onClick={() => { save(STORAGE_KEYS.profile, profile); setSaved(true); setTimeout(() => setSaved(false), 2000); }}>SAVE PROFILE</button>
        <span className={`save-status${saved ? " saved" : ""}`}>{saved ? "✓ saved" : "unsaved changes"}</span>
      </div>
    </div>
  );
}

// ─── Applications (Kanban + Gantt) ────────────────────────────────────────────
function Applications({ applications, onOpen, onDelete, onUpdateApp, kanbanCols, setKanbanCols }) {
  const [view, setView] = useState("kanban");
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [editingCol, setEditingCol] = useState(null);
  const [editColVal, setEditColVal] = useState("");
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState("");

  const palette = ["#3b82f6","#8b5cf6","#f59e0b","#10b981","#ef4444","#ec4899","#06b6d4","#f97316"];

  const appsByCol = col => applications.filter(a => (a.stage || "applied") === col.id);

  const handleDrop = (colId) => {
    if (!dragId || dragId === colId) return;
    const app = applications.find(a => a.id === dragId);
    if (app) onUpdateApp({ ...app, stage: colId });
    setDragId(null); setDragOver(null);
  };

  const startEditCol = col => { setEditingCol(col.id); setEditColVal(col.label); };
  const saveEditCol = () => {
    if (editColVal.trim()) setKanbanCols(cols => cols.map(c => c.id === editingCol ? { ...c, label: editColVal.trim() } : c));
    setEditingCol(null);
  };
  const deleteCol = colId => {
    setKanbanCols(cols => cols.filter(c => c.id !== colId));
    applications.forEach(a => { if (a.stage === colId) onUpdateApp({ ...a, stage: "applied" }); });
  };
  const addCol = () => {
    if (!newColName.trim()) return;
    const id = newColName.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    setKanbanCols(cols => [...cols, { id, label: newColName.trim(), color: palette[cols.length % palette.length] }]);
    setNewColName(""); setAddingCol(false);
  };

  // ── Gantt helpers ────────────────────────────────────────────────────────
  const ganttApps = [...applications].sort((a, b) => new Date(a.dateRaw || a.date) - new Date(b.dateRaw || b.date));
  const today = new Date();
  const ganttStart = ganttApps.length ? new Date(Math.min(...ganttApps.map(a => new Date(a.dateRaw || Date.now() - 86400000 * 14)))) : new Date(today.getTime() - 86400000 * 14);
  const ganttEnd = new Date(today.getTime() + 86400000 * 30);
  const totalDays = Math.max(1, (ganttEnd - ganttStart) / 86400000);
  const pct = d => Math.max(0, Math.min(100, ((new Date(d) - ganttStart) / 86400000 / totalDays) * 100));
  const todayPct = pct(today);

  // generate week labels
  const weekLabels = [];
  let cur = new Date(ganttStart);
  while (cur < ganttEnd) {
    weekLabels.push(new Date(cur));
    cur = new Date(cur.getTime() + 86400000 * 7);
  }

  const stageColor = stage => (kanbanCols.find(c => c.id === stage) || kanbanCols[0] || {}).color || "#3b82f6";

  return (
    <div className="applied-page">
      <div className="applied-toolbar">
        <div className="applied-toolbar-left">
          <h2 className="page-title">Applied</h2>
          <span className="page-subtitle">// {applications.length} application{applications.length !== 1 ? "s" : ""}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="view-toggle">
            <button className={`view-btn${view === "kanban" ? " active" : ""}`} onClick={() => setView("kanban")}>⊞ BOARD</button>
            <button className={`view-btn${view === "gantt" ? " active" : ""}`} onClick={() => setView("gantt")}>▤ GANTT</button>
          </div>
        </div>
      </div>

      {view === "kanban" && (
        <div className="kanban-wrap">
          {kanbanCols.map(col => (
            <div key={col.id} className="kanban-col">
              <div className="kanban-col-header">
                <div className="kanban-col-title-wrap">
                  <div className="kanban-col-dot" style={{ background: col.color }} />
                  {editingCol === col.id ? (
                    <input className="col-edit-input" value={editColVal}
                      onChange={e => setEditColVal(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveEditCol(); if (e.key === "Escape") setEditingCol(null); }}
                      onBlur={saveEditCol} autoFocus />
                  ) : (
                    <span className="kanban-col-title">{col.label}</span>
                  )}
                  <span className="kanban-col-count">{appsByCol(col).length}</span>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  <button className="kanban-col-edit" title="Rename" onClick={() => startEditCol(col)}>✎</button>
                  {kanbanCols.length > 1 && (
                    <button className="kanban-col-edit" title="Delete column" onClick={() => deleteCol(col.id)} style={{ color: "var(--text3)" }}>×</button>
                  )}
                </div>
              </div>
              <div className={`kanban-col-body${dragOver === col.id ? " drag-over" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(col.id)}>
                {appsByCol(col).map(app => (
                  <div key={app.id} className={`kanban-card${dragId === app.id ? " dragging" : ""}`}
                    draggable
                    onDragStart={() => setDragId(app.id)}
                    onDragEnd={() => { setDragId(null); setDragOver(null); }}
                    onClick={() => onOpen(app)}>
                    <div className="kanban-card-company">{app.company || "Company"}</div>
                    <div className="kanban-card-role">{app.role || "Role"}</div>
                    <div className="kanban-card-meta">
                      <span className="kanban-card-date">{app.date}</span>
                      {app.nextDate && (
                        <span className="kanban-card-next">⏰ {app.nextDate}</span>
                      )}
                      <button className="kanban-card-del" onClick={e => { e.stopPropagation(); onDelete(app.id); }}>×</button>
                    </div>
                  </div>
                ))}
                {appsByCol(col).length === 0 && (
                  <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)", padding: "10px 6px" }}>drop here</div>
                )}
              </div>
            </div>
          ))}

          {/* Add column */}
          <div className="kanban-add-col">
            {addingCol ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input className="input-badge" placeholder="Column name" value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addCol(); if (e.key === "Escape") setAddingCol(false); }}
                  autoFocus />
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 11 }} onClick={addCol}>ADD</button>
                  <button className="btn-secondary" style={{ padding: "6px 12px" }} onClick={() => setAddingCol(false)}>×</button>
                </div>
              </div>
            ) : (
              <button className="kanban-add-col-btn" onClick={() => setAddingCol(true)}>+ Add column</button>
            )}
          </div>
        </div>
      )}

      {view === "gantt" && (
        <div className="gantt-wrap">
          {applications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 13 }}>No applications yet.</div>
          ) : (
            <table className="gantt-table">
              <thead>
                <tr>
                  <th className="gantt-head-label" style={{ width: 200 }}>Application</th>
                  <th className="gantt-head-label" style={{ width: 90 }}>Stage</th>
                  <th className="gantt-head-date" style={{ position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 4 }}>
                      {weekLabels.map((d, i) => (
                        <span key={i} style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>
                          {d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </span>
                      ))}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ganttApps.map(app => {
                  const appliedPct = pct(app.dateRaw || (Date.now() - Math.random() * 86400000 * 10));
                  const nextPct = app.nextDate ? pct(new Date(app.nextDate)) : null;
                  const barWidth = nextPct != null ? Math.max(2, nextPct - appliedPct) : 12;
                  const col = stageColor(app.stage);
                  return (
                    <tr key={app.id} className="gantt-row" style={{ cursor: "pointer" }} onClick={() => onOpen(app)}>
                      <td style={{ padding: "8px 8px 0" }}>
                        <div className="gantt-row-company">{app.company || "Company"}</div>
                      </td>
                      <td style={{ padding: "8px 8px 0", verticalAlign: "top" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 10,
                          color: col, background: col + "22",
                          padding: "2px 7px", borderRadius: 100 }}>
                          {(kanbanCols.find(c => c.id === app.stage) || { label: "Applied" }).label}
                        </span>
                      </td>
                      <td className="gantt-bar-cell" style={{ position: "relative", height: 36 }}>
                        {/* today line */}
                        <div className="gantt-today-line" style={{ left: `${todayPct}%` }} />
                        {/* bar */}
                        <div className="gantt-bar" style={{
                          left: `${appliedPct}%`,
                          width: `${barWidth}%`,
                          background: col,
                          opacity: 0.85,
                        }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: 12, fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 1, height: 12, background: "var(--accent)", opacity: 0.5 }} />
            today · bar starts on applied date, ends on next-stage date
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Detail Page ──────────────────────────────────────────────────────────────
function Detail({ app, onUpdate, onBack, kanbanCols, editMemory, onSaveMemory }) {
  const [cvText, setCvText] = useState(app.cv || "");
  const [cvEditing, setCvEditing] = useState(false);
  const [coverLetter, setCoverLetter] = useState(app.coverLetter || "");
  const [coverSaved, setCoverSaved] = useState(false);
  const [stage, setStage] = useState(app.stage || kanbanCols[0]?.id || "applied");
  const [nextDate, setNextDate] = useState(app.nextDate || "");
  const cvOrigRef = useRef(app.cv || "");

  useEffect(() => {
    setCvText(app.cv || ""); cvOrigRef.current = app.cv || "";
    setCoverLetter(app.coverLetter || "");
    setStage(app.stage || kanbanCols[0]?.id || "applied");
    setNextDate(app.nextDate || "");
  }, [app.id]);

  const saveCV = () => {
    const orig = cvOrigRef.current;
    const edited = cvText;
    if (orig !== edited && edited.trim()) {
      // store edit delta for AI learning
      onSaveMemory({ type: "cv_edit", company: app.company, role: app.role,
        original: orig.slice(0, 600), edited: edited.slice(0, 600), ts: Date.now() });
    }
    onUpdate({ ...app, cv: edited, coverLetter, stage, nextDate });
    cvOrigRef.current = edited;
    setCvEditing(false);
  };

  const saveCover = () => {
    const orig = app.coverLetter || "";
    if (orig !== coverLetter && coverLetter.trim()) {
      onSaveMemory({ type: "cover_edit", company: app.company, role: app.role,
        original: orig.slice(0, 400), edited: coverLetter.slice(0, 400), ts: Date.now() });
    }
    onUpdate({ ...app, cv: cvText, coverLetter, stage, nextDate });
    setCoverSaved(true);
    setTimeout(() => setCoverSaved(false), 2000);
  };

  const saveStage = (s, nd) => {
    onUpdate({ ...app, cv: cvText, coverLetter, stage: s, nextDate: nd });
  };

  const stageCol = id => kanbanCols.find(c => c.id === id);

  return (
    <div className="detail-page">
      {/* Header */}
      <div className="detail-header">
        <div className="detail-title-block">
          <span className="detail-company">{app.company || "Company"}</span>
          <span className="detail-role">{app.role || "Role"}</span>
          <a className="detail-url" href={app.url} target="_blank" rel="noreferrer">{app.url}</a>
        </div>
        <div className="detail-actions no-print">
          <button className="btn-secondary" onClick={onBack}>← BACK</button>
          <button className="btn-primary" onClick={() => window.print()}>↓ PDF</button>
        </div>
      </div>

      {/* Stage selector */}
      <div className="section-block no-print">
        <div className="section-block-header">
          <div className="section-label">Stage</div>
        </div>
        <div className="stage-row">
          {kanbanCols.map(col => {
            const active = stage === col.id;
            return (
              <button key={col.id} className={`stage-btn${active ? " active" : ""}`}
                style={active ? { background: col.color + "22", color: col.color, borderColor: col.color } : {}}
                onClick={() => { setStage(col.id); saveStage(col.id, nextDate); }}>
                {col.label}
              </button>
            );
          })}
          <div className="next-date-wrap">
            <span className="next-date-label">⏰ next:</span>
            <input type="date" className="next-date-input" value={nextDate}
              onChange={e => { setNextDate(e.target.value); saveStage(stage, e.target.value); }} />
          </div>
        </div>
      </div>

      {/* CV */}
      <div className="section-block">
        <div className="section-block-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="section-label" style={{ margin: 0 }}>Optimized CV</div>
            {editMemory.length > 0 && (
              <span className="learn-badge">✦ AI learned from {editMemory.length} edit{editMemory.length !== 1 ? "s" : ""}</span>
            )}
          </div>
          {app.cv && !cvEditing && (
            <button className="btn-secondary" style={{ padding: "5px 12px" }} onClick={() => setCvEditing(true)}>EDIT</button>
          )}
          {cvEditing && (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-secondary" style={{ padding: "5px 12px" }} onClick={() => { setCvText(app.cv || ""); setCvEditing(false); }}>CANCEL</button>
              <button className="btn-primary" style={{ padding: "5px 14px", fontSize: 11 }} onClick={saveCV}>SAVE EDITS</button>
            </div>
          )}
        </div>
        {!app.cv ? (
          <div className="cv-box generating"><div className="spinner" />Generating optimized CV…</div>
        ) : cvEditing ? (
          <textarea className="cv-edit-textarea" value={cvText} onChange={e => setCvText(e.target.value)} />
        ) : (
          <div className="cv-box">{cvText}</div>
        )}
      </div>

      {/* Cover Letter */}
      <div className="section-block no-print">
        <div className="section-block-header">
          <div className="section-label">Cover Letter</div>
        </div>
        {app.coverLetter === undefined && !app.cv ? (
          <div className="cv-box generating"><div className="spinner" />Generating cover letter…</div>
        ) : (
          <>
            <textarea className="cover-textarea" value={coverLetter}
              onChange={e => setCoverLetter(e.target.value)}
              placeholder="Cover letter will appear here once generated…" />
            <div className="cover-toolbar">
              <button className="btn-primary" onClick={saveCover}>SAVE</button>
              <span className={`save-status${coverSaved ? " saved" : ""}`}>{coverSaved ? "✓ saved" : ""}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ title, body, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }) {
  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div className="confirm-box" onClick={e => e.stopPropagation()}>
        <div className="confirm-title">{title}</div>
        <div className="confirm-body">{body}</div>
        <div className="confirm-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={danger ? "btn-danger" : "btn-primary"}
            style={danger ? {} : { padding: "8px 16px", fontSize: 12 }} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LinkedIn OAuth Mock ──────────────────────────────────────────────────────
function LinkedInOAuth({ onSuccess, onClose }) {
  const [step, setStep] = useState("credentials");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const handleSignIn = () => {
    if (!email || !password) return;
    setStep("authorizing");
    setTimeout(() => {
      const name = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      onSuccess({ name, email, connectedAt: new Date().toISOString(), avatar: name.charAt(0).toUpperCase() });
    }, 1800);
  };
  return (
    <div className="oauth-window" onClick={onClose}>
      <div className="oauth-card" onClick={e => e.stopPropagation()}>
        <div className="oauth-header">
          <div style={{ color: "white", fontWeight: 700, fontSize: 18, fontFamily: "sans-serif" }}>in</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "white", fontWeight: 600, fontSize: 15, fontFamily: "sans-serif" }}>LinkedIn</div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "sans-serif" }}>CV/OPT is requesting access</div>
          </div>
          <button className="oauth-close" onClick={onClose}>×</button>
        </div>
        {step === "credentials" ? (
          <div className="oauth-body">
            <div style={{ fontWeight: 600, color: "#111", fontSize: 15, fontFamily: "sans-serif" }}>Sign in to LinkedIn</div>
            <input className="oauth-input" type="email" placeholder="Email or phone" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="oauth-input" type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSignIn()} />
            <button className="oauth-btn" onClick={handleSignIn} disabled={!email || !password}>Sign in</button>
            <div className="oauth-note">CV/OPT will read your public profile and job listings. We never post on your behalf.</div>
          </div>
        ) : (
          <div className="oauth-body" style={{ alignItems: "center", padding: "40px 28px" }}>
            <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3, borderTopColor: "#0077b5", borderColor: "#eee" }} />
            <div style={{ fontSize: 13, color: "#555", fontFamily: "sans-serif", marginTop: 12 }}>Authorizing…</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function Settings({ linkedin, onLinkedInConnect, onLinkedInDisconnect, applications, onClearData, editMemory, onClearMemory, instructions, onSaveInstructions, authUser, onSignOut, onUpdateUser }) {
  const [activeTab, setActiveTab] = useState("account");
  const [showOAuth, setShowOAuth] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmClearMem, setConfirmClearMem] = useState(false);
  const [toast, setToast] = useState(null);

  // local instruction state
  const [cvInstr, setCvInstr] = useState(instructions.cv || "");
  const [coverInstr, setCoverInstr] = useState(instructions.cover || "");
  const [instrSaved, setInstrSaved] = useState(false);

  const saveInstructions = () => {
    onSaveInstructions({ cv: cvInstr.trim(), cover: coverInstr.trim() });
    setInstrSaved(true);
    setTimeout(() => setInstrSaved(false), 2000);
  };

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2400); };
  const fmtDate = iso => { try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return iso; } };
  const fmtTs = ts => { try { return new Date(ts).toLocaleString(); } catch { return ""; } };

  const TABS = [
    { id: "account", label: "PROFILE" },
    { id: "instructions", label: "INSTRUCTIONS" },
    { id: "integrations", label: "INTEGRATIONS" },
    { id: "data", label: "DATA" },
  ];

  return (
    <div className="settings-page">
      <div className="page-header" style={{ marginBottom: 8 }}>
        <h2 className="page-title">Settings</h2>
      </div>

      {/* Tab bar */}
      <div className="settings-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`settings-tab${activeTab === t.id ? " active" : ""}`}
            onClick={() => setActiveTab(t.id)}>{t.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === "account" && (
        <ProfileTab authUser={authUser} onSignOut={onSignOut} onUpdateUser={onUpdateUser} />
      )}

      {/* ── INSTRUCTIONS TAB ── */}
      {activeTab === "instructions" && (
        <>
          <div className="settings-section">
            <div className="settings-section-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Generation Instructions</span>
              {(instructions.cv || instructions.cover) && (
                <span className="instructions-active-pill">✦ active</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55 }}>
              Strict rules the AI must follow every time it generates a CV or cover letter. These override default behaviour — be precise and direct.
            </div>

            <div className="instructions-block">
              <div className="instructions-label-row">
                <div className="section-label" style={{ margin: 0 }}>CV Instructions</div>
                <span className="instructions-tag cv">CV</span>
              </div>
              <textarea className="instructions-textarea"
                placeholder={"e.g.\n— Always use bullet points, never paragraphs\n— Keep total length under 1 page\n— Lead every bullet with a strong action verb\n— Never mention salary expectations\n— Use UK English spelling throughout"}
                value={cvInstr} onChange={e => setCvInstr(e.target.value)} />
            </div>

            <div className="instructions-block">
              <div className="instructions-label-row">
                <div className="section-label" style={{ margin: 0 }}>Cover Letter Instructions</div>
                <span className="instructions-tag cover">COVER</span>
              </div>
              <textarea className="instructions-textarea"
                placeholder={"e.g.\n— Write exactly 3 paragraphs, no more\n— First paragraph must reference the company's mission\n— Tone: confident but not arrogant\n— Never use the word \"passionate\"\n— End with a specific call to action"}
                value={coverInstr} onChange={e => setCoverInstr(e.target.value)} />
            </div>

            <div className="instructions-save-row">
              <button className="btn-primary" style={{ padding: "9px 18px" }} onClick={saveInstructions}>SAVE INSTRUCTIONS</button>
              <span className={`save-status${instrSaved ? " saved" : ""}`}>
                {instrSaved ? "✓ saved — applied to next generation" : (cvInstr !== (instructions.cv || "") || coverInstr !== (instructions.cover || "")) ? "unsaved changes" : ""}
              </span>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">AI Edit Memory ({editMemory.length} entries)</div>
            <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>
              Every time you edit a generated CV or cover letter, the system stores the diff and uses it to improve future generations.
            </div>
            {editMemory.length === 0 ? (
              <div className="memory-empty">No edits recorded yet. Edit a CV or cover letter to start training the system.</div>
            ) : (
              <div className="memory-panel">
                {editMemory.slice(0, 8).map((m, i) => (
                  <div key={i} className="memory-item">
                    <div className="memory-item-meta">
                      <span>{m.type === "cv_edit" ? "CV" : "Cover"}</span>
                      <span>{m.company} · {m.role}</span>
                      <span>{fmtTs(m.ts)}</span>
                    </div>
                    <div className="memory-item-text">
                      <span style={{ color: "var(--red)", opacity: 0.7 }}>− {(m.original || "").slice(0, 120).replace(/\n/g, " ")}</span>{"\n"}
                      <span style={{ color: "var(--accent)", opacity: 0.8 }}>+ {(m.edited || "").slice(0, 120).replace(/\n/g, " ")}</span>
                    </div>
                  </div>
                ))}
                {editMemory.length > 8 && <div className="memory-empty">…and {editMemory.length - 8} more</div>}
              </div>
            )}
            {editMemory.length > 0 && (
              <button className="btn-danger" style={{ alignSelf: "flex-start" }} onClick={() => setConfirmClearMem(true)}>CLEAR MEMORY</button>
            )}
          </div>
        </>
      )}

      {/* ── INTEGRATIONS TAB ── */}
      {activeTab === "integrations" && (
        <div className="settings-section">
          <div className="settings-section-title">Integrations</div>
          <div className={`integration-card${linkedin ? " connected" : ""}`}>
            <div className="integration-logo">in</div>
            <div className="integration-info">
              <div className="integration-name">LinkedIn</div>
              <div className="integration-desc">Connect to auto-fetch job details, import your profile, and sync application status.</div>
              {linkedin ? (
                <>
                  <div className="account-pill" style={{ marginTop: 8, display: "inline-flex", width: "fit-content" }}>
                    <div className="account-avatar">{linkedin.avatar}</div>
                    <div><div className="account-name">{linkedin.name}</div><div className="account-email">{linkedin.email}</div></div>
                  </div>
                  <div className="integration-status on">
                    <div className="integration-status-dot on" />Connected · since {fmtDate(linkedin.connectedAt)}
                  </div>
                </>
              ) : (
                <div className="integration-status off"><div className="integration-status-dot off" />Not connected</div>
              )}
            </div>
            <div className="integration-actions">
              {linkedin
                ? <button className="btn-danger" onClick={() => setConfirmDisconnect(true)}>DISCONNECT</button>
                : <button className="btn-primary" style={{ padding: "9px 16px", fontSize: 11 }} onClick={() => setShowOAuth(true)}>CONNECT →</button>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── DATA TAB ── */}
      {activeTab === "data" && (
        <>
          <div className="settings-section">
            <div className="settings-section-title">Data</div>
            <div className="info-row"><span className="info-row-label">Saved applications</span><span className="info-row-value">{applications.length}</span></div>
            <div className="info-row"><span className="info-row-label">Edit memory entries</span><span className="info-row-value">{editMemory.length}</span></div>
            <div className="info-row"><span className="info-row-label">CV instructions</span><span className="info-row-value" style={{ color: instructions.cv ? "var(--accent)" : "var(--text3)" }}>{instructions.cv ? `${instructions.cv.length} chars` : "none"}</span></div>
            <div className="info-row"><span className="info-row-label">Cover letter instructions</span><span className="info-row-value" style={{ color: instructions.cover ? "var(--accent)" : "var(--text3)" }}>{instructions.cover ? `${instructions.cover.length} chars` : "none"}</span></div>
            <div className="info-row"><span className="info-row-label">Storage</span><span className="info-row-value">localStorage (browser)</span></div>
            <div className="info-row"><span className="info-row-label">LinkedIn</span><span className="info-row-value" style={{ color: linkedin ? "var(--accent)" : "var(--text3)" }}>{linkedin ? "connected" : "not connected"}</span></div>
          </div>
          <div className="settings-section">
            <div className="settings-section-title" style={{ borderColor: "rgba(255,68,68,0.2)" }}>Danger zone</div>
            <div className="danger-card">
              <div className="danger-info">
                <div className="danger-title">Delete all data</div>
                <div className="danger-desc">Permanently removes all applications, profile, template, and edit memory.</div>
              </div>
              <button className="btn-danger" onClick={() => setConfirmClear(true)}>CLEAR ALL DATA</button>
            </div>
          </div>
        </>
      )}

      {showOAuth && <LinkedInOAuth onSuccess={acc => { setShowOAuth(false); onLinkedInConnect(acc); showToast("LinkedIn connected"); }} onClose={() => setShowOAuth(false)} />}
      {confirmDisconnect && <ConfirmDialog title="Disconnect LinkedIn?" body="Your stored OAuth token will be removed. Applications are not affected." confirmLabel="DISCONNECT" danger onConfirm={() => { setConfirmDisconnect(false); onLinkedInDisconnect(); showToast("LinkedIn disconnected"); }} onCancel={() => setConfirmDisconnect(false)} />}
      {confirmClear && <ConfirmDialog title="Delete all data?" body={`This will permanently delete ${applications.length} application${applications.length !== 1 ? "s" : ""}, your profile, template, and edit memory.`} confirmLabel="DELETE EVERYTHING" danger onConfirm={() => { setConfirmClear(false); onClearData(); showToast("All data cleared"); }} onCancel={() => setConfirmClear(false)} />}
      {confirmClearMem && <ConfirmDialog title="Clear edit memory?" body="The AI will stop learning from your past edits. Future CV generations will use only your profile and template." confirmLabel="CLEAR MEMORY" danger onConfirm={() => { setConfirmClearMem(false); onClearMemory(); showToast("Edit memory cleared"); }} onCancel={() => setConfirmClearMem(false)} />}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

// ─── Generating Modal ─────────────────────────────────────────────────────────
function GeneratingModal({ url }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
        <div className="modal-title">Generating your application</div>
        <div className="modal-sub">Analyzing job posting, matching your profile, and building an optimized CV + cover letter…</div>
        <div className="modal-sub" style={{ color: "var(--text3)", fontSize: 10 }}>{url}</div>
      </div>
    </div>
  );
}

// ─── AI generation ────────────────────────────────────────────────────────────
async function generateApplication({ url, profile, template, editMemory, instructions }) {
  const profileText = `EXPERIENCE:\n${profile.experience || "(none)"}\n\nSKILLS: ${(profile.skills || []).join(", ") || "(none)"}\nTOOLS: ${(profile.tools || []).join(", ") || "(none)"}`;
  const templateText = template || "(no template — use standard CV format)";

  const memSummary = editMemory.length > 0
    ? `\n\nLEARNED FROM ${editMemory.length} PAST EDITS — mirror these user preferences:\n` +
      editMemory.slice(-8).map(m =>
        `[${m.type === "cv_edit" ? "CV" : "Cover"}] changed: "${(m.original || "").slice(0, 80).replace(/\n/g, " ")}" → "${(m.edited || "").slice(0, 80).replace(/\n/g, " ")}"`
      ).join("\n")
    : "";

  const cvRules = instructions?.cv
    ? `\n\nSTRICT CV RULES — follow exactly, no exceptions:\n${instructions.cv}`
    : "";

  const coverRules = instructions?.cover
    ? `\n\nSTRICT COVER LETTER RULES — follow exactly, no exceptions:\n${instructions.cover}`
    : "";

  const prompt = `You are a professional CV writer and career coach.${memSummary}${cvRules}${coverRules}

LinkedIn Job URL: ${url}

Candidate profile:
${profileText}

CV Template:
${templateText}

Write an optimized CV and cover letter tailored to this job. Apply all strict rules and learned preferences above without deviation.

Respond ONLY with valid JSON, no markdown, no backticks:
{"company":"Company name","role":"Job title","cv":"Full CV text...","coverLetter":"Cover letter text..."}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000,
      messages: [{ role: "user", content: prompt }] }),
  });

  const data = await response.json();
  const text = data.content?.map(b => b.text || "").join("") || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [template, setTemplate] = useState(() => load(STORAGE_KEYS.template, ""));
  const [profile, setProfile] = useState(() => load(STORAGE_KEYS.profile, { experience: "", skills: [], tools: [] }));
  const [applications, setApplications] = useState(() => load(STORAGE_KEYS.applications, []));
  const [currentApp, setCurrentApp] = useState(null);
  const [linkedin, setLinkedin] = useState(() => load(STORAGE_KEYS.linkedin, null));
  const [editMemory, setEditMemory] = useState(() => load(STORAGE_KEYS.editMemory, []));
  const [kanbanCols, setKanbanCols] = useState(() => load(STORAGE_KEYS.kanbanCols, DEFAULT_COLS));
  const [instructions, setInstructions] = useState(() => load(STORAGE_KEYS.instructions, { cv: "", cover: "" }));
  const [generating, setGenerating] = useState(false);
  const [generatingUrl, setGeneratingUrl] = useState("");
  const [toast, setToast] = useState(null);

  const mapUser = (user) => ({
    id: user.id,
    name: user.user_metadata?.full_name || user.email.split("@")[0],
    email: user.email,
    avatar: (user.user_metadata?.full_name || user.email)[0].toUpperCase(),
    provider: user.app_metadata?.provider || "email",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAuthUser(mapUser(session.user));
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session ? mapUser(session.user) : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => save(STORAGE_KEYS.template, template), [template]);
  useEffect(() => save(STORAGE_KEYS.profile, profile), [profile]);
  useEffect(() => save(STORAGE_KEYS.applications, applications), [applications]);
  useEffect(() => save(STORAGE_KEYS.linkedin, linkedin), [linkedin]);
  useEffect(() => save(STORAGE_KEYS.editMemory, editMemory), [editMemory]);
  useEffect(() => save(STORAGE_KEYS.kanbanCols, kanbanCols), [kanbanCols]);
  useEffect(() => save(STORAGE_KEYS.instructions, instructions), [instructions]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setPage("home");
  }, []);
  const handleUpdateUser = useCallback(user => setAuthUser(user), []);

  const handleSaveMemory = useCallback(entry => {
    setEditMemory(prev => [...prev.slice(-49), entry]); // keep last 50
  }, []);

  const handleClearMemory = useCallback(() => {
    setEditMemory([]);
    localStorage.removeItem(STORAGE_KEYS.editMemory);
  }, []);

  const handleNewApplication = useCallback(async (url) => {
    setGeneratingUrl(url); setGenerating(true);
    try {
      const result = await generateApplication({ url, profile, template, editMemory, instructions });
      const newApp = {
        id: Date.now().toString(), url,
        company: result.company, role: result.role,
        cv: result.cv, coverLetter: result.coverLetter,
        stage: kanbanCols[0]?.id || "applied",
        nextDate: "",
        dateRaw: new Date().toISOString(),
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      };
      setApplications(prev => [newApp, ...prev]);
      setCurrentApp(newApp); setPage("detail");
    } catch (err) {
      const newApp = {
        id: Date.now().toString(), url, company: "Unknown", role: "Unknown",
        cv: `Error: ${err.message}\n\nFill in Profile and Template, then try again.`,
        coverLetter: "", stage: kanbanCols[0]?.id || "applied", nextDate: "",
        dateRaw: new Date().toISOString(),
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      };
      setApplications(prev => [newApp, ...prev]);
      setCurrentApp(newApp); setPage("detail");
      setToast("Generation failed");
    } finally { setGenerating(false); }
  }, [profile, template, editMemory, kanbanCols]);

  const updateApp = useCallback(updated => {
    setApplications(prev => prev.map(a => a.id === updated.id ? updated : a));
    setCurrentApp(updated);
  }, []);

  const deleteApp = useCallback(id => setApplications(prev => prev.filter(a => a.id !== id)), []);

  const handleClearData = useCallback(() => {
    setApplications([]); setProfile({ experience: "", skills: [], tools: [] });
    setTemplate(""); setLinkedin(null); setEditMemory([]); setKanbanCols(DEFAULT_COLS);
    setInstructions({ cv: "", cover: "" });
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  }, []);

  const handleSaveInstructions = useCallback(instr => {
    setInstructions(instr);
  }, []);

  // Show blank screen while checking auth
  if (authLoading) {
    return <><style>{styles}</style><div style={{ background: "var(--bg)", height: "100vh" }} /></>;
  }

  // Show login page if not authenticated
  if (!authUser) {
    return (
      <>
        <style>{styles}</style>
        <LoginPage onAuth={() => {}} />
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <Nav page={page} setPage={setPage} linkedin={linkedin} authUser={authUser} />
        <div className="page">
          {page === "home" && <Home applications={applications} onSubmit={handleNewApplication} setPage={setPage} setCurrentApp={setCurrentApp} />}
          {page === "template" && <Template template={template} setTemplate={setTemplate} />}
          {page === "profile" && <Profile profile={profile} setProfile={setProfile} />}
          {page === "applications" && (
            <Applications applications={applications} onOpen={app => { setCurrentApp(app); setPage("detail"); }}
              onDelete={deleteApp} onUpdateApp={updateApp}
              kanbanCols={kanbanCols} setKanbanCols={setKanbanCols} />
          )}
          {page === "detail" && currentApp && (
            <Detail app={currentApp} onUpdate={updateApp} onBack={() => setPage("applications")}
              kanbanCols={kanbanCols} editMemory={editMemory} onSaveMemory={handleSaveMemory} />
          )}
          {page === "settings" && (
            <Settings linkedin={linkedin} onLinkedInConnect={setLinkedin} onLinkedInDisconnect={() => setLinkedin(null)}
              applications={applications} onClearData={handleClearData}
              editMemory={editMemory} onClearMemory={handleClearMemory}
              instructions={instructions} onSaveInstructions={handleSaveInstructions}
              authUser={authUser} onSignOut={handleSignOut} onUpdateUser={handleUpdateUser} />
          )}
        </div>
      </div>
      {generating && <GeneratingModal url={generatingUrl} />}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </>
  );
}// force redeploy
