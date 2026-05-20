"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, MapPin, Clock, Users, Package,
  RefreshCw, CalendarDays, Check, X, Save,
  RotateCcw, Loader2, CheckCheck, TriangleAlert,
  Info, Printer, ArrowRight, ArrowLeft, Plus, ChevronDown,
  Pencil, Trash2, ClipboardCheck, Search
} from "lucide-react";
import Navbar from "@/components/navbar";
import { getLogisticsByDate, getLogisticsUsers, saveLogistics, getMovidaAnimatoriForDate } from "./actions";

// ─── Costanti & Helper ────────────────────────────────────────────────────────
const DEFAULT_VEICOLI = [
  "cubo", "blu", "granata", "grigio",
  "scudo", "noleggio 1", "noleggio 2", "auto propria",
];

const VEICOLO_COLORS = {
  "cubo":        "bg-slate-100 text-slate-700 border-slate-300",
  "blu":         "bg-blue-100 text-blue-700 border-blue-300",
  "granata":     "bg-red-100 text-red-700 border-red-300",
  "grigio":      "bg-gray-100 text-gray-700 border-gray-300",
  "scudo":       "bg-indigo-100 text-indigo-700 border-indigo-300",
  "noleggio 1":  "bg-teal-100 text-teal-700 border-teal-300",
  "noleggio 2":  "bg-cyan-100 text-cyan-700 border-cyan-300",
  "auto propria":"bg-amber-100 text-amber-700 border-amber-300",
};

const vLabel = (v) =>
  ({ "noleggio 1": "Noleggio 1", "noleggio 2": "Noleggio 2", "auto propria": "Auto Propria" }[v] ||
  v.charAt(0).toUpperCase() + v.slice(1));

function todayISO() { return new Date().toISOString().slice(0, 10); }

const normalizeId = (id) => String(id || "").toLowerCase().replace(/\s+/g, "");

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), duration);
  }, []);
  const remove = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), []);
  return { toasts, toast: add, removeToast: remove };
}

function ToastContainer({ toasts, removeToast }) {
  const cfg = {
    success: { icon: <CheckCheck className="w-4 h-4" />, cls: "bg-green-600 text-white" },
    error:   { icon: <TriangleAlert className="w-4 h-4" />, cls: "bg-red-600 text-white" },
    info:    { icon: <Info className="w-4 h-4" />, cls: "bg-foreground text-background" },
  };
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const c = cfg[t.type] || cfg.info;
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-sm ${c.cls}`}>
              {c.icon}<span className="flex-1">{t.message}</span>
              <button onClick={() => removeToast(t.id)} className="opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ─── Componenti UI (Selector) ────────────────────────────────────────────────
function VeicoloSelector({ selected, onChange, placeholder, allVeicoli }) {
  const available = allVeicoli.filter((v) => !selected.includes(v));
  return (
    <div className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((v) => (
            <span key={v} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-semibold ${VEICOLO_COLORS[v] || "bg-surface text-muted-foreground border-border"}`}>
              {vLabel(v)}
              <button type="button" onClick={() => onChange(selected.filter((s) => s !== v))} className="hover:opacity-60 ml-0.5">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <select value="" onChange={(e) => { if (e.target.value) onChange([...selected, e.target.value]); }}
        className="w-full px-2 py-1.5 border border-input rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring bg-white">
        <option value="">{available.length === 0 ? "Tutti selezionati" : placeholder}</option>
        {available.map((v) => <option key={v} value={v}>{vLabel(v)}</option>)}
      </select>
    </div>
  );
}

function UserSelector({ allUsers, selectedIds, onChange, placeholder = "Aggiungi...", emptyText = "Tutti assegnati", colorClass = "bg-primary/10 text-primary border-primary/20" }) {
  const selected  = selectedIds.map((id) => allUsers.find((u) => String(u.id) === String(id))).filter(Boolean);
  const available = allUsers.filter((u) => !selectedIds.includes(String(u.id)));
  return (
    <div className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((u) => (
            <span key={u.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border ${colorClass}`}>
              {u.nome}
              <button type="button" onClick={() => onChange(selectedIds.filter((id) => String(id) !== String(u.id)))} className="hover:opacity-60">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <select value="" onChange={(e) => { if (e.target.value) onChange([...selectedIds, e.target.value]); }}
        className="w-full px-2 py-1.5 border border-input rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring bg-surface">
        <option value="">{available.length === 0 ? emptyText : selected.length === 0 ? placeholder : "+"}</option>
        {available.map((u) => <option key={u.id} value={u.id}>{u.nome} ({u.ruolo})</option>)}
      </select>
    </div>
  );
}

// ─── Riga Logistica ───────────────────────────────────────────────────────────
function LogisticRow({ entry, allUsers, index, onSave, onRefresh, toast, movidaAnimatori, allVeicoli }) {
  const { party, logistics, macros = [] } = entry;

  // 1. AUTO-MATCHING SILENZIOSO: Incrocia animatori Movida col nostro DB utenti
  const matchedStaffIds = useMemo(() => {
    if (!movidaAnimatori || !allUsers) return [];
    const movidaNames = movidaAnimatori.map(a => normalizeId(a.denominazione));
    return allUsers
      .filter(u => movidaNames.includes(normalizeId(u.nome)))
      .map(u => String(u.id));
  }, [movidaAnimatori, allUsers]);

  const buildForm = useCallback((l) => {
    const savedStaff = (l?.staff_ids || []).map(String);
    const mergedStaff = Array.from(new Set([...savedStaff, ...matchedStaffIds]));

    return {
      staff_ids:           mergedStaff,
      responsabili_ids:    (l?.responsabili_ids || []).map(String),
      drivers_andata_ids:  l?.drivers_andata_ids  || (l?.driver_andata_id ? [l.driver_andata_id] : []),
      veicoli_andata:      l?.veicoli_andata      || [],
      drivers_ritorno_ids: l?.drivers_ritorno_ids || (l?.driver_ritorno_id ? [l.driver_ritorno_id] : []),
      veicoli_ritorno:     l?.veicoli_ritorno     || [],
      start_logistica:     l?.start_logistica     || "",
      note:                l?.note                || "",
    };
  }, [matchedStaffIds]);

  const [form, setForm]     = useState(() => buildForm(logistics));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [dirty, setDirty]   = useState(false);
  const [soloAndata, setSoloAndata] = useState(
    logistics?.solo_andata !== undefined ? logistics.solo_andata : false
  );

  useEffect(() => { setForm(buildForm(logistics)); setDirty(false); }, [logistics, buildForm]);

  const update = (key, value) => { setForm((p) => ({ ...p, [key]: value })); setDirty(true); setSaved(false); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        ...form,
        solo_andata: soloAndata,
        ...(soloAndata ? { veicoli_ritorno: [], drivers_ritorno_ids: [] } : {}),
      };
      const result = await saveLogistics(party.id, dataToSave);
      if (result.error) { toast(result.error, "error"); return; }
      setSaved(true); setDirty(false);
      setTimeout(() => setSaved(false), 2500);
      onSave();
      onRefresh();
    } catch { toast("Errore nel salvataggio", "error"); }
    finally { setSaving(false); }
  };

  const isConfigured = form.drivers_andata_ids.length > 0 || form.veicoli_andata.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className={`bg-card rounded-2xl border overflow-hidden transition-all ${
        dirty ? "border-primary/50 shadow-md shadow-primary/5"
        : isConfigured ? "border-green-200"
        : "border-border"
      }`}>

      {/* Header festa */}
      <div className="px-5 py-3.5 border-b border-border bg-surface/40">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-muted-foreground w-5 text-center">{index + 1}</span>
              <h3 className="font-bold text-foreground text-sm leading-tight">{party.nome}</h3>
              {party.cliente && (
                <span className="text-xs text-muted-foreground bg-surface border border-border px-2 py-0.5 rounded-full">{party.cliente}</span>
              )}
              {party.stato === "scaricato_scaffale" && (
                <span className="text-[10px] uppercase tracking-wider font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" /> Completata
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground pl-7">
              <span className="flex items-center gap-1 shrink-0"><MapPin className="w-3 h-3" />{party.luogo}</span>
              {party.ora_inizio && (
                <span className="flex items-center gap-1 font-bold text-foreground"><Clock className="w-3 h-3" />{party.ora_inizio}</span>
              )}
              {party.responsabili_ids && party.responsabili_ids.length > 0 && (
                <span className="flex items-center gap-1 text-purple-600 font-medium">
                  <Users className="w-3 h-3" />
                  {party.responsabili_ids.map(id => allUsers.find(u => String(u.id) === String(id))?.nome).filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {dirty && (
              <button onClick={() => { setForm(buildForm(logistics)); setDirty(false); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors" title="Annulla modifiche">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={handleSave} disabled={saving || !dirty}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                saved ? "bg-green-500 text-white"
                : dirty ? "bg-foreground text-background hover:opacity-90"
                : "bg-surface text-muted-foreground border border-border cursor-default"
              }`}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCheck className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Salvo…" : saved ? "Salvato" : "Salva"}
            </button>
          </div>
        </div>
      </div>

      {/* Toggle andata/ritorno */}
      <div className="px-5 pt-3 flex items-center gap-2">
        <button type="button" onClick={() => { setSoloAndata(true); setDirty(true); setSaved(false); }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
            soloAndata ? "bg-green-50 border-green-300 text-green-700" : "bg-surface border-border text-muted-foreground hover:text-foreground"
          }`}>
          <ArrowRight className="w-3 h-3" />Solo andata
        </button>
        <button type="button" onClick={() => { setSoloAndata(false); setDirty(true); setSaved(false); }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
            !soloAndata ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-surface border-border text-muted-foreground hover:text-foreground"
          }`}>
          <ArrowLeft className="w-3 h-3" />Andata e ritorno
        </button>
      </div>

      {/* Campi logistica */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Staff & Responsabili */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Users className="w-3 h-3" />Staff Generico
            </label>
            <UserSelector allUsers={allUsers} selectedIds={form.staff_ids} onChange={(ids) => update("staff_ids", ids)} />
          </div>
          
          <div className="pt-3 border-t border-border/50">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1 text-purple-700">
              <ClipboardCheck className="w-3 h-3" />Responsabili Check
            </label>
            <UserSelector 
              allUsers={allUsers} 
              selectedIds={form.responsabili_ids} 
              onChange={(ids) => update("responsabili_ids", ids)} 
              placeholder="Seleziona animatori..." 
              colorClass="bg-purple-100 text-purple-700 border-purple-300" 
            />
          </div>
        </div>

        {/* Andata */}
        <div className="rounded-xl border border-green-200 bg-green-50/40 p-3 space-y-2.5">
          <p className="text-xs font-bold text-green-700 flex items-center gap-1.5 mb-0.5">
            <ArrowRight className="w-3.5 h-3.5" />Andata
          </p>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Driver</label>
            <UserSelector allUsers={allUsers} selectedIds={form.drivers_andata_ids} onChange={(ids) => update("drivers_andata_ids", ids)} placeholder="Aggiungi driver..." colorClass="bg-green-100 text-green-800 border-green-300" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Mezzi</label>
            <VeicoloSelector allVeicoli={allVeicoli} selected={form.veicoli_andata} onChange={(v) => update("veicoli_andata", v)} placeholder="Aggiungi mezzo..." />
          </div>
        </div>

        {/* Ritorno */}
        {!soloAndata ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-2.5">
            <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5 mb-0.5">
              <ArrowLeft className="w-3.5 h-3.5" />Ritorno
            </p>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Driver</label>
              <UserSelector allUsers={allUsers} selectedIds={form.drivers_ritorno_ids} onChange={(ids) => update("drivers_ritorno_ids", ids)} placeholder="Aggiungi driver..." colorClass="bg-blue-100 text-blue-800 border-blue-300" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Mezzi</label>
              <VeicoloSelector allVeicoli={allVeicoli} selected={form.veicoli_ritorno} onChange={(v) => update("veicoli_ritorno", v)} placeholder="Aggiungi mezzo..." />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-green-200 bg-green-50/20 p-3 flex items-center justify-center">
            <span className="text-xs text-green-600 font-medium opacity-60">Solo andata</span>
          </div>
        )}

        {/* Start + Note */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />Start Log.
            </label>
            <input type="time" value={form.start_logistica} onChange={(e) => update("start_logistica", e.target.value)}
              className="w-full px-2.5 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-surface" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Note</label>
            <textarea value={form.note} onChange={(e) => update("note", e.target.value)} rows={2}
              placeholder="Note logistica..."
              className="w-full px-2.5 py-2 border border-input rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring bg-surface resize-none" />
          </div>
        </div>
      </div>

      {/* Materiale assegnato */}
      {macros.length > 0 && (
        <MacroSection macros={macros} />
      )}
    </motion.div>
  );
}

// ─── Sezione Materiale (collassabile) ─────────────────────────────────────────
function MacroSection({ macros }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-2.5 hover:bg-surface/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Package className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Materiale assegnato
          </span>
          <span className="text-xs text-muted-foreground bg-surface border border-border px-1.5 py-0.5 rounded-md font-medium">
            {macros.length}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-3 flex flex-wrap gap-1.5">
              {macros.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/5 text-primary text-xs font-medium"
                >
                  <Package className="w-3 h-3 shrink-0" />
                  {m.name}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Motore di Stampa ─────────────────────────────────────────────────────────

const VEICOLO_ACCENT = {
  "cubo":         "#64748b",
  "blu":          "#2563eb",
  "granata":      "#dc2626",
  "grigio":       "#9ca3af",
  "scudo":        "#4f46e5",
  "noleggio 1":   "#0d9488",
  "noleggio 2":   "#0891b2",
  "auto propria": "#d97706",
};
const defaultAccent = "#94a3b8";

const vLabelPrint = (v) =>
  ({ "noleggio 1": "Noleggio 1", "noleggio 2": "Noleggio 2", "auto propria": "Auto Propria" }[v] ||
  v.charAt(0).toUpperCase() + v.slice(1));

function vChip(v) {
  const color = VEICOLO_ACCENT[v] || defaultAccent;
  return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:9.5px;color:#111;margin:0 10px 3px 0;white-space:nowrap">` +
    `<span style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block"></span>` +
    `${vLabelPrint(v)}</span>`;
}

function nameTag(name, dotColor = "#9ca3af") {
  return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:9.5px;color:#111;margin:0 10px 3px 0;white-space:nowrap">` +
    `<span style="width:5px;height:5px;border-radius:50%;background:${dotColor};flex-shrink:0;display:inline-block"></span>` +
    `${name}</span>`;
}

function colLabel(text, color = "#9ca3af") {
  return `<div style="font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${color};margin-bottom:5px">${text}</div>`;
}

const EMPTY = `<span style="color:#d1d5db;font-size:9px">—</span>`;

function buildPartyCard(entry, index, getName) {
  const { party, logistics: l, macros = [] } = entry;
  const staffNames = (l?.staff_ids || []).map(getName).filter(n => n !== "—");
  const respNames  = (l?.responsabili_ids || []).map(getName).filter(n => n !== "—");
  const driversA   = (l?.drivers_andata_ids || []).map(getName).filter(n => n !== "—");
  const driversR   = l?.solo_andata ? [] : (l?.drivers_ritorno_ids || []).map(getName).filter(n => n !== "—");
  const mezziA     = l?.veicoli_andata || [];
  const mezziR     = l?.solo_andata ? [] : (l?.veicoli_ritorno || []);
  const configured = driversA.length > 0 || mezziA.length > 0;
  const soloA      = !!l?.solo_andata;
  const barColor   = configured ? "#111" : "#e5e7eb";

  const macroRow = macros.length > 0
    ? `<div style="padding:6px 12px 8px 28px;border-top:1px solid #f3f4f6;display:flex;flex-wrap:wrap;gap:4px;align-items:center">
        <span style="font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;margin-right:6px;white-space:nowrap">Materiale (Macro)</span>
        ${macros.map(m =>
          `<span style="display:inline-flex;align-items:center;gap:3px;font-size:8.5px;color:#4f46e5;background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;padding:1px 7px;font-weight:500">${m.name}</span>`
        ).join("")}
      </div>`
    : "";

  return `
<div style="display:flex;margin-bottom:9px;page-break-inside:avoid;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
  <div style="width:3px;background:${barColor};flex-shrink:0"></div>
  <div style="flex:1;min-width:0">
    <div style="padding:8px 12px;border-bottom:1px solid #f3f4f6;display:flex;align-items:baseline;justify-content:space-between;gap:12px">
      <div style="display:flex;align-items:baseline;gap:9px;min-width:0">
        <span style="font-size:9px;font-weight:700;color:#d1d5db;flex-shrink:0;width:16px;text-align:right">${index + 1}</span>
        <div style="min-width:0">
          <span style="font-size:12px;font-weight:700;color:#111">${party.nome}</span>
          <span style="font-size:9.5px;color:#9ca3af;margin-left:8px">${party.luogo}${party.cliente ? ` · ${party.cliente}` : ""}</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:14px;flex-shrink:0;font-size:9.5px;color:#6b7280">
        ${party.ora_inizio   ? `<span><strong style="color:#111;font-weight:700">${party.ora_inizio}</strong> festa</span>` : ""}
        ${l?.start_logistica ? `<span><strong style="color:#111;font-weight:700">${l.start_logistica}</strong> start</span>` : ""}
        ${soloA              ? `<span style="color:#9ca3af;font-size:8.5px;font-weight:600">Solo andata</span>` : ""}
        ${!configured        ? `<span style="color:#d1d5db;font-size:8.5px;font-weight:600">Da configurare</span>` : ""}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0;padding:8px 12px 8px 28px">
      <div style="padding-right:12px;border-right:1px solid #f3f4f6">
        ${colLabel("Staff")}
        <div style="line-height:1.9">${staffNames.length ? staffNames.map(n => nameTag(n)).join("") : EMPTY}</div>
        ${respNames.length ? `<div style="margin-top:7px">${colLabel("Responsabili", "#7c3aed")}<div style="line-height:1.9">${respNames.map(n => nameTag(n, "#7c3aed")).join("")}</div></div>` : ""}
      </div>
      <div style="padding:0 12px;border-right:1px solid #f3f4f6">
        <div style="font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#111;margin-bottom:5px">→ Andata</div>
        ${colLabel("Driver")}
        <div style="line-height:1.9;margin-bottom:6px">${driversA.length ? driversA.map(n => nameTag(n, "#111")).join("") : EMPTY}</div>
        ${colLabel("Mezzi")}
        <div style="line-height:1.9">${mezziA.length ? mezziA.map(vChip).join("") : EMPTY}</div>
      </div>
      <div style="padding:0 12px;border-right:1px solid #f3f4f6">
        <div style="font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${soloA ? "#d1d5db" : "#111"};margin-bottom:5px">← Ritorno</div>
        ${soloA
          ? `<div style="font-size:9px;color:#d1d5db;margin-top:2px">Solo andata</div>`
          : `${colLabel("Driver")}<div style="line-height:1.9;margin-bottom:6px">${driversR.length ? driversR.map(n => nameTag(n, "#111")).join("") : EMPTY}</div>${colLabel("Mezzi")}<div style="line-height:1.9">${mezziR.length ? mezziR.map(vChip).join("") : EMPTY}</div>`
        }
      </div>
      <div style="padding-left:12px">
        ${colLabel("Note")}
        ${l?.note ? `<div style="font-size:9.5px;color:#374151;line-height:1.6">${l.note}</div>` : EMPTY}
      </div>
    </div>
    ${macroRow}
  </div>
</div>`;
}

function generateHtmlReport(title, dateStr, contentHtml) {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<title>${title} — ${dateStr}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,sans-serif;font-size:11px;color:#111;background:#fff;padding:28px 32px}
  .ph{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #111}
  .ph h1{font-size:17px;font-weight:800;color:#111;letter-spacing:-.4px}
  .ph .sub{font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;margin-top:3px;font-weight:500}
  .ph .meta{font-size:9px;color:#9ca3af;text-align:right;line-height:1.7}
  .sd{display:flex;align-items:center;gap:10px;margin:16px 0 8px}
  .sd .lbl{font-size:10px;font-weight:700;color:#111;white-space:nowrap;display:flex;align-items:center;gap:6px}
  .sd .ln{flex:1;height:1px;background:#e5e7eb}
  .sd .ct{font-size:8.5px;color:#9ca3af;white-space:nowrap}
  .ft{margin-top:22px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:8.5px;color:#9ca3af;display:flex;justify-content:space-between}
  @media print{body{padding:10mm 12mm}@page{margin:0;size:A4}}
</style>
</head><body>
<div class="ph">
  <div><h1>${title}</h1><div class="sub">${dateStr}</div></div>
  <div class="meta">Movida Manager<br>${new Date().toLocaleString("it-IT",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
</div>
${contentHtml}
<div class="ft"><span>Movida Manager — Prospetto Operativo</span><span>Stampato il ${new Date().toLocaleString("it-IT")}</span></div>
</body></html>`;
}

function handlePrint({ entries, allUsers, allVeicoli, movidaMap, date, type }) {
  const dateStr = new Date(date + "T00:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const getName = (id) => allUsers.find((u) => String(u.id) === String(id))?.nome || "—";

  // Ricostruisce il merge Movida+DB esattamente come fa buildForm nel LogisticRow,
  // così lo staff auto-matched appare anche se non ancora salvato.
  const enrichedEntries = entries.map((entry) => {
    const { party, logistics: l, macros = [] } = entry;
    const extId = normalizeId(party.external_id);
    const movidaAnimatori = movidaMap?.[extId] || [];
    const movidaNames = movidaAnimatori.map(a => normalizeId(a.denominazione));
    const matchedIds  = allUsers
      .filter(u => movidaNames.includes(normalizeId(u.nome)))
      .map(u => String(u.id));
    const savedStaff  = (l?.staff_ids || []).map(String);
    const mergedStaff = Array.from(new Set([...savedStaff, ...matchedIds]));
    return {
      ...entry,
      macros,
      logistics: l ? { ...l, staff_ids: mergedStaff } : { staff_ids: mergedStaff },
    };
  });

  let contentHtml = "";
  let title = "Logistica Giornaliera";

  if (type === "daily") {
    contentHtml = enrichedEntries.map((e, i) => buildPartyCard(e, i, getName)).join("");
  }
  else if (type === "driver") {
    title = "Logistica per Driver";
    const driverIds = new Set();
    enrichedEntries.forEach(e => {
      (e.logistics?.drivers_andata_ids  || []).forEach(id => driverIds.add(String(id)));
      (e.logistics?.drivers_ritorno_ids || []).forEach(id => driverIds.add(String(id)));
    });
    Array.from(driverIds).forEach(id => {
      const name = getName(id);
      const sub  = enrichedEntries.filter(e =>
        (e.logistics?.drivers_andata_ids  || []).map(String).includes(id) ||
        (e.logistics?.drivers_ritorno_ids || []).map(String).includes(id)
      );
      contentHtml +=
        `<div class="sd"><span class="lbl">${name}</span><div class="ln"></div><span class="ct">${sub.length} fest${sub.length === 1 ? "a" : "e"}</span></div>` +
        sub.map((e, i) => buildPartyCard(e, i, getName)).join("");
    });
  }
  else if (type === "vehicle") {
    title = "Logistica per Furgone";
    const vehicles = new Set();
    enrichedEntries.forEach(e => {
      (e.logistics?.veicoli_andata  || []).forEach(v => vehicles.add(v));
      (e.logistics?.veicoli_ritorno || []).forEach(v => vehicles.add(v));
    });
    Array.from(vehicles).forEach(v => {
      const sub = enrichedEntries.filter(e =>
        (e.logistics?.veicoli_andata  || []).includes(v) ||
        (e.logistics?.veicoli_ritorno || []).includes(v)
      );
      const dot     = VEICOLO_ACCENT[v] || defaultAccent;
      const dotHtml = `<span style="width:8px;height:8px;border-radius:50%;background:${dot};display:inline-block;flex-shrink:0"></span>`;
      contentHtml +=
        `<div class="sd"><span class="lbl">${dotHtml}${vLabelPrint(v)}</span><div class="ln"></div><span class="ct">${sub.length} fest${sub.length === 1 ? "a" : "e"}</span></div>` +
        sub.map((e, i) => buildPartyCard(e, i, getName)).join("");
    });
  }

  const html = generateHtmlReport(title, dateStr, contentHtml);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (win) setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 600);
}

// ─── PAGINA PRINCIPALE ────────────────────────────────────────────────────────
export default function LogisticsPage() {
  const { toasts, toast, removeToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [entries, setEntries]           = useState([]);
  const [allUsers, setAllUsers]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [movidaMap, setMovidaMap]       = useState({});
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm]       = useState("");
  
  // Custom Vehicles State
  const [customVehicles, setCustomVehicles] = useState([]);
  const [newVehicleName, setNewVehicleName] = useState("");
  const [editingVehicleIdx, setEditingVehicleIdx] = useState(null);
  const [editVehicleValue, setEditVehicleValue]   = useState("");

  const printMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (printMenuRef.current && !printMenuRef.current.contains(event.target)) {
        setPrintMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("customVehicles");
    if (stored) {
      try { setCustomVehicles(JSON.parse(stored)); } catch (e) {}
    }
  }, []);

  const saveCustomVehiclesToLocal = (updated) => {
    setCustomVehicles(updated);
    localStorage.setItem("customVehicles", JSON.stringify(updated));
  };

  const addCustomVehicle = () => {
    const val = newVehicleName.trim().toLowerCase();
    if (!val || DEFAULT_VEICOLI.includes(val) || customVehicles.includes(val)) return;
    saveCustomVehiclesToLocal([...customVehicles, val]);
    setNewVehicleName("");
    toast(`Mezzo "${val}" aggiunto alla lista`, "success");
  };

  const deleteCustomVehicle = (index) => {
    const updated = customVehicles.filter((_, i) => i !== index);
    saveCustomVehiclesToLocal(updated);
    toast("Mezzo eliminato", "info");
  };

  const startEditingVehicle = (index) => {
    setEditingVehicleIdx(index);
    setEditVehicleValue(customVehicles[index]);
  };

  const saveEditedVehicle = () => {
    const val = editVehicleValue.trim().toLowerCase();
    if (!val || (val !== customVehicles[editingVehicleIdx] && customVehicles.includes(val))) {
      setEditingVehicleIdx(null);
      return; // Nome non valido o duplicato
    }
    const updated = [...customVehicles];
    updated[editingVehicleIdx] = val;
    saveCustomVehiclesToLocal(updated);
    setEditingVehicleIdx(null);
    toast("Mezzo aggiornato", "success");
  };

  const allVeicoli = [...new Set([...DEFAULT_VEICOLI, ...customVehicles])];

  const loadData = useCallback(async (date, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [entriesData, usersData, movidaData] = await Promise.all([
        getLogisticsByDate(date),
        getLogisticsUsers(),
        getMovidaAnimatoriForDate(date),
      ]);
      setEntries((entriesData || []).filter((e) => e?.party?.id));
      setAllUsers(usersData || []);
      setMovidaMap(movidaData || {});
    } catch (err) {
      console.error("[logistics] loadData error:", err);
      toast("Errore nel caricamento dei dati", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => { loadData(selectedDate); }, [selectedDate, loadData]);

  const filled  = entries.filter((e) => (e.logistics?.drivers_andata_ids?.length > 0) || (e.logistics?.veicoli_andata?.length > 0)).length;
  const missing = entries.length - filled;

  // ── Ricerca ──────────────────────────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const { party, logistics: l } = e;
      if (party.nome?.toLowerCase().includes(q))    return true;
      if (party.luogo?.toLowerCase().includes(q))   return true;
      if (party.cliente?.toLowerCase().includes(q)) return true;
      if (party.animatore?.nome?.toLowerCase().includes(q))    return true;
      if (party.magazziniere?.nome?.toLowerCase().includes(q)) return true;
      const userIds = [
        ...(l?.staff_ids || []),
        ...(l?.responsabili_ids || []),
        ...(l?.drivers_andata_ids || []),
        ...(l?.drivers_ritorno_ids || []),
      ];
      if (userIds.some((id) => {
        const u = allUsers.find((u) => String(u.id) === String(id));
        return u?.nome?.toLowerCase().includes(q);
      })) return true;
      const mezzi = [...(l?.veicoli_andata || []), ...(l?.veicoli_ritorno || [])];
      if (mezzi.some((v) => v.toLowerCase().includes(q))) return true;
      // Macro assegnate
      if ((e.macros || []).some((m) => m.name.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [entries, searchTerm, allUsers]);

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Navbar />
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <main className="containerMod py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Pianificazione</p>
              <h1 className="text-3xl font-black text-foreground">Logistica</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {loading ? "Caricamento…"
                  : searchTerm
                    ? `${filteredEntries.length} di ${entries.length} fest${entries.length === 1 ? "a" : "e"}`
                    : `${entries.length} fest${entries.length === 1 ? "a" : "e"} · ${filled} configurate · ${missing} da completare`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              
              {/* Dropdown Stampa */}
              {!loading && entries.length > 0 && (
                <div className="relative" ref={printMenuRef}>
                  <button
                    onClick={() => setPrintMenuOpen(!printMenuOpen)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-surface text-sm font-medium text-foreground transition-colors shadow-sm">
                    <Printer className="w-4 h-4" />Stampa <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </button>
                  <AnimatePresence>
                    {printMenuOpen && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                        className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
                        <button onClick={() => { handlePrint({ entries, allUsers, allVeicoli, movidaMap, date: selectedDate, type: "daily" }); setPrintMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface transition-colors border-b border-border">Intera Giornata</button>
                        <button onClick={() => { handlePrint({ entries, allUsers, allVeicoli, movidaMap, date: selectedDate, type: "driver" }); setPrintMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface transition-colors border-b border-border">Raggruppa per Driver</button>
                        <button onClick={() => { handlePrint({ entries, allUsers, allVeicoli, movidaMap, date: selectedDate, type: "vehicle" }); setPrintMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface transition-colors">Raggruppa per Furgone</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm bg-card shadow-sm" />
              </div>
              <button onClick={() => loadData(selectedDate, true)} disabled={refreshing}
                className="p-2.5 rounded-xl border border-border bg-card hover:bg-surface text-muted-foreground transition-colors disabled:opacity-40 shadow-sm">
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Ricerca */}
          {!loading && entries.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Cerca per festa, location, animatore, driver, mezzo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm bg-card shadow-sm"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Lista Feste */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
                  <div className="px-5 py-4 border-b border-border bg-surface/40"><div className="h-4 bg-surface rounded-lg w-1/3 mb-2" /><div className="h-3 bg-surface rounded-lg w-1/2" /></div>
                  <div className="p-4 grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, j) => <div key={j} className="h-20 bg-surface rounded-xl" />)}</div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-muted-foreground opacity-30" />
              </div>
              <p className="font-medium text-foreground">Nessuna festa per questa data</p>
              <p className="text-sm text-muted-foreground mt-1">Prova un giorno diverso o sincronizza dalla pagina Feste</p>
            </motion.div>
          ) : filteredEntries.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-3">
                <Search className="w-7 h-7 text-muted-foreground opacity-30" />
              </div>
              <p className="font-medium text-foreground">Nessun risultato per "{searchTerm}"</p>
              <p className="text-sm text-muted-foreground mt-1">Prova a cercare per nome festa, luogo, animatore, driver o mezzo</p>
              <button onClick={() => setSearchTerm("")} className="mt-4 px-4 py-2 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-surface transition-colors">
                Rimuovi filtro
              </button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry, i) => {
                const extId = normalizeId(entry.party.external_id);
                return (
                  <LogisticRow
                    key={entry.party.id}
                    entry={entry}
                    allUsers={allUsers}
                    allVeicoli={allVeicoli}
                    index={i}
                    onSave={() => toast(`Logistica salvata`, "success")}
                    onRefresh={() => loadData(selectedDate, true)}
                    toast={toast}
                    movidaAnimatori={movidaMap[extId] || []}
                  />
                )
              })}
            </div>
          )}

          {/* GESTORE CRUD MEZZI CUSTOM */}
          <div className="mt-8 pt-6 border-t border-border bg-card p-5 rounded-2xl shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground"><Truck className="w-4 h-4 text-primary"/> Gestione Mezzi Extra</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Veicoli aggiunti salvati nel browser locale.</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input type="text" value={newVehicleName} onChange={e => setNewVehicleName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomVehicle()} placeholder="Es. Ducato Bianco" className="px-3 py-2 border border-input rounded-xl text-sm w-full sm:w-48 bg-surface focus:outline-none focus:ring-2 focus:ring-primary"/>
                <button onClick={addCustomVehicle} disabled={!newVehicleName.trim()} className="p-2 bg-foreground text-background rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {customVehicles.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {customVehicles.map((v, i) => (
                  <div key={i} className="group flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface text-sm transition-all hover:border-primary/30">
                    {editingVehicleIdx === i ? (
                      <input type="text" autoFocus value={editVehicleValue} onChange={(e) => setEditVehicleValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEditedVehicle()} onBlur={saveEditedVehicle} className="bg-transparent border-none p-0 focus:ring-0 text-sm w-24 outline-none font-medium" />
                    ) : (
                      <span className="font-medium text-foreground">{vLabel(v)}</span>
                    )}
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditingVehicle(i)} className="p-1 text-muted-foreground hover:text-primary transition-colors rounded-md" title="Modifica">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteCustomVehicle(i)} className="p-1 text-muted-foreground hover:text-red-500 transition-colors rounded-md" title="Elimina">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground/60 italic mt-2">Nessun veicolo extra aggiunto. Usa il form qui sopra.</div>
            )}
          </div>

        </motion.div>
      </main>
    </div>
  );
}