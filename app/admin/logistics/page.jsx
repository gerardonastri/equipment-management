"use client";


import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, MapPin, Clock, Users, User, Package,
  RefreshCw, CalendarDays, Check, X, Save,
  RotateCcw, Loader2, CheckCheck, TriangleAlert,
  Info, Printer, ArrowRight, ArrowLeft,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { getLogisticsByDate, getLogisticsUsers, saveLogistics } from "./actions";


// ─── Costanti ─────────────────────────────────────────────────────────────────
const VEICOLI = [
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


// ─── Multi-Veicolo Selector ───────────────────────────────────────────────────
function VeicoloSelector({ selected, onChange, placeholder }) {
  const available = VEICOLI.filter((v) => !selected.includes(v));
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


// ─── Staff Selector ───────────────────────────────────────────────────────────
function StaffSelector({ allUsers, selectedIds, onChange }) {
  const selected = selectedIds.map((id) => allUsers.find((u) => u.id === id)).filter(Boolean);
  const available = allUsers.filter((u) => !selectedIds.includes(u.id));
  return (
    <div className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((u) => (
            <span key={u.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-xs font-medium border border-primary/20">
              {u.nome}
              <button type="button" onClick={() => onChange(selectedIds.filter((id) => id !== u.id))} className="hover:opacity-60">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <select value="" onChange={(e) => { if (e.target.value) onChange([...selectedIds, e.target.value]); }}
        className="w-full px-2 py-1.5 border border-input rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring bg-surface">
        <option value="">{available.length === 0 ? "Tutti assegnati" : selected.length === 0 ? "Aggiungi staff..." : "+"}</option>
        {available.map((u) => <option key={u.id} value={u.id}>{u.nome} ({u.ruolo})</option>)}
      </select>
    </div>
  );
}


// ─── Riga Logistica ───────────────────────────────────────────────────────────
function LogisticRow({ entry, allUsers, index, onSave, onRefresh, toast }) {
  const { party, logistics } = entry;

  const buildForm = (l) => ({
    staff_ids:         l?.staff_ids         || [],
    driver_andata_id:  l?.driver_andata_id  || "",
    veicoli_andata:    l?.veicoli_andata    || [],
    driver_ritorno_id: l?.driver_ritorno_id || "",
    veicoli_ritorno:   l?.veicoli_ritorno   || [],
    start_logistica:   l?.start_logistica   || "",
    note:              l?.note              || "",
  });

  const [form, setForm]       = useState(() => buildForm(logistics));
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [dirty, setDirty]     = useState(false);
  // ── MODIFICA 2: toggle solo andata ──────────────────────────────────────────
  const [soloAndata, setSoloAndata] = useState(
    logistics?.solo_andata !== undefined ? logistics.solo_andata : false
  );

  useEffect(() => { setForm(buildForm(logistics)); setDirty(false); }, [logistics]);

  const update = (key, value) => { setForm((p) => ({ ...p, [key]: value })); setDirty(true); setSaved(false); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        ...form,
        solo_andata: soloAndata,
        ...(soloAndata ? { veicoli_ritorno: [], driver_ritorno_id: "" } : {}),
      };
      const result = await saveLogistics(party.id, dataToSave);
      if (result.error) { toast(result.error, "error"); return; }
      setSaved(true); setDirty(false);
      setTimeout(() => setSaved(false), 2500);
      onSave();
      // ── MODIFICA 1: ricarica dal server dopo salvataggio ───────────────────
      onRefresh();
    } catch { toast("Errore nel salvataggio", "error"); }
    finally { setSaving(false); }
  };

  const isConfigured = form.driver_andata_id || form.veicoli_andata.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className={`bg-card rounded-2xl border overflow-hidden transition-all ${
        dirty ? "border-primary/50 shadow-md shadow-primary/5"
        : isConfigured ? "border-green-200"
        : "border-border"
      }`}>

      {/* Header festa */}
      <div className="px-5 py-3.5 border-b border-border bg-surface/40 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-muted-foreground w-5 text-center">{index + 1}</span>
            <h3 className="font-bold text-foreground text-sm leading-tight">{party.nome}</h3>
            {party.cliente && (
              <span className="text-xs text-muted-foreground bg-surface border border-border px-2 py-0.5 rounded-full">{party.cliente}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground pl-7">
            <span className="flex items-center gap-1 shrink-0"><MapPin className="w-3 h-3" />{party.luogo}</span>
            {party.ora_inizio && (
              <span className="flex items-center gap-1 font-bold text-foreground"><Clock className="w-3 h-3" />{party.ora_inizio}</span>
            )}
            {party.servizi && (
              <span className="opacity-70 truncate max-w-xs">
                {party.servizi.replace(/\\n+/g, " · ").slice(0, 80)}{party.servizi.length > 80 ? "…" : ""}
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
              : dirty ? "btn-primary"
              : "bg-surface text-muted-foreground border border-border cursor-default"
            }`}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCheck className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Salvo…" : saved ? "Salvato" : "Salva"}
          </button>
        </div>
      </div>

      {/* ── MODIFICA 2: Toggle solo andata / andata+ritorno ─────────────────── */}
      <div className="px-5 pt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setSoloAndata(true); setDirty(true); setSaved(false); }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
            soloAndata
              ? "bg-green-50 border-green-300 text-green-700"
              : "bg-surface border-border text-muted-foreground hover:text-foreground"
          }`}>
          <ArrowRight className="w-3 h-3" />Solo andata
        </button>
        <button
          type="button"
          onClick={() => { setSoloAndata(false); setDirty(true); setSaved(false); }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
            !soloAndata
              ? "bg-blue-50 border-blue-300 text-blue-700"
              : "bg-surface border-border text-muted-foreground hover:text-foreground"
          }`}>
          <ArrowLeft className="w-3 h-3" />Andata e ritorno
        </button>
      </div>

      {/* Campi logistica */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Staff */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <Users className="w-3 h-3" />Staff
          </label>
          <StaffSelector allUsers={allUsers} selectedIds={form.staff_ids} onChange={(ids) => update("staff_ids", ids)} />
        </div>

        {/* ANDATA */}
        <div className="rounded-xl border border-green-200 bg-green-50/40 p-3 space-y-2.5">
          <p className="text-xs font-bold text-green-700 flex items-center gap-1.5 mb-0.5">
            <ArrowRight className="w-3.5 h-3.5" />Andata
          </p>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Driver</label>
            <select value={form.driver_andata_id} onChange={(e) => update("driver_andata_id", e.target.value)}
              className="w-full px-2 py-1.5 border border-input rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring bg-white">
              <option value="">— Nessuno —</option>
              {allUsers.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Mezzi</label>
            <VeicoloSelector selected={form.veicoli_andata} onChange={(v) => update("veicoli_andata", v)} placeholder="Aggiungi mezzo andata..." />
          </div>
        </div>

        {/* RITORNO — nascosto se solo andata */}
        {!soloAndata ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-2.5">
            <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5 mb-0.5">
              <ArrowLeft className="w-3.5 h-3.5" />Ritorno
            </p>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Driver</label>
              <select value={form.driver_ritorno_id} onChange={(e) => update("driver_ritorno_id", e.target.value)}
                className="w-full px-2 py-1.5 border border-input rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring bg-white">
                <option value="">— Come andata —</option>
                {allUsers.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Mezzi</label>
              <VeicoloSelector selected={form.veicoli_ritorno} onChange={(v) => update("veicoli_ritorno", v)} placeholder="Aggiungi mezzo ritorno..." />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-green-200 bg-green-50/20 p-3 flex items-center justify-center">
            <span className="text-xs text-green-600 font-medium opacity-60">Solo andata selezionata</span>
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
    </motion.div>
  );
}


// ─── STAMPA ───────────────────────────────────────────────────────────────────
function handlePrint({ entries, allUsers, date }) {
  const dateStr = new Date(date + "T00:00:00").toLocaleDateString("it-IT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const getName = (id) => allUsers.find((u) => u.id === id)?.nome || "—";
  const getStaff = (ids) => (ids || []).map((id) => getName(id)).join(", ") || "—";
  const chipA = (v) => `<span style="display:inline-block;padding:1px 6px;border-radius:99px;background:#dcfce7;border:1px solid #86efac;color:#166534;font-size:9px;font-weight:600;margin:1px">${v.toUpperCase()}</span>`;
  const chipR = (v) => `<span style="display:inline-block;padding:1px 6px;border-radius:99px;background:#dbeafe;border:1px solid #93c5fd;color:#1e40af;font-size:9px;font-weight:600;margin:1px">${v.toUpperCase()}</span>`;

  const rows = entries.map((e, i) => {
    const { party, logistics: l } = e;
    const mezziA = (l?.veicoli_andata || []).map(chipA).join("") || "—";
    const mezziR = l?.solo_andata
      ? `<span style="font-style:italic;color:#9ca3af">Solo andata</span>`
      : (l?.veicoli_ritorno || []).map(chipR).join("") || "—";
    const driverA = l?.driver_andata_id ? getName(l.driver_andata_id) : "—";
    const driverR = l?.solo_andata
      ? "—"
      : l?.driver_ritorno_id ? getName(l.driver_ritorno_id) : (l?.driver_andata_id ? `↑ ${getName(l.driver_andata_id)}` : "—");
    const servizi = (party.servizi || "").replace(/\\n+/g, " · ").slice(0, 90);
    const bg = i % 2 === 0 ? "#ffffff" : "#f9fafb";
    return `<tr style="background:${bg};border-bottom:1px solid #e5e7eb">
      <td style="padding:7px 8px;text-align:center;font-weight:bold;color:#9ca3af">${i + 1}</td>
      <td style="padding:7px 8px;font-weight:600">${party.luogo}<br><span style="font-size:9px;color:#6b7280;font-weight:normal">${party.nome}${party.cliente ? ` · ${party.cliente}` : ""}</span></td>
      <td style="padding:7px 8px;font-weight:bold">${party.ora_inizio || "—"}</td>
      <td style="padding:7px 8px;font-size:9px;color:#6b7280;max-width:150px">${servizi || "—"}</td>
      <td style="padding:7px 8px;font-weight:600">${l?.start_logistica || "—"}</td>
      <td style="padding:7px 8px;font-size:10px">${getStaff(l?.staff_ids)}</td>
      <td style="padding:7px 8px;font-size:10px">${driverA}<br>${mezziA}</td>
      <td style="padding:7px 8px;font-size:10px">${driverR}<br>${mezziR}</td>
      <td style="padding:7px 8px;font-size:10px;color:#6b7280">${l?.note || ""}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<title>Logistica — ${dateStr}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:16px}
h1{font-size:15px;font-weight:bold;margin-bottom:2px}.sub{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:14px}
table{width:100%;border-collapse:collapse}thead tr{background:#111;color:#fff}
thead th{padding:7px 8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
.footer{margin-top:14px;font-size:9px;color:#aaa}@media print{body{padding:8px}@page{margin:10mm}}</style>
</head><body>
<h1>LOGISTICA — ${dateStr.toUpperCase()}</h1>
<div class="sub">Prospetto operativo del giorno · Movida Manager</div>
<table>
<thead><tr>
  <th>#</th><th>Location</th><th>Ora</th><th>Servizi</th>
  <th>Start Log.</th><th>Staff</th><th>Andata</th><th>Ritorno</th><th>Note</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="footer">Stampato il ${new Date().toLocaleString("it-IT")} — Movida Manager</div>
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 500);
}


// ─── PAGINA PRINCIPALE ────────────────────────────────────────────────────────
export default function LogisticsPage() {
  const { toasts, toast, removeToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [entries, setEntries]           = useState([]);
  const [allUsers, setAllUsers]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const loadData = useCallback(async (date, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [entriesData, usersData] = await Promise.all([
        getLogisticsByDate(date),
        getLogisticsUsers(),
      ]);
      setEntries((entriesData || []).filter((e) => e?.party?.id));
      setAllUsers(usersData || []);
    } catch (err) {
      console.error("[logistics] loadData error:", err);
      toast("Errore nel caricamento dei dati", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(selectedDate); }, [selectedDate]);

  const filled  = entries.filter((e) => e.logistics?.driver_andata_id || e.logistics?.veicoli_andata?.length).length;
  const missing = entries.length - filled;

  return (
    <div className="min-h-screen bg-surface">
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
                  : `${entries.length} fest${entries.length === 1 ? "a" : "e"} · ${filled} configurate · ${missing} da completare`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!loading && entries.length > 0 && (
                <button
                  onClick={() => handlePrint({ entries, allUsers, date: selectedDate })}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-surface text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <Printer className="w-4 h-4" />Stampa prospetto
                </button>
              )}
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm bg-card" />
              </div>
              <button onClick={() => loadData(selectedDate, true)} disabled={refreshing}
                className="p-2.5 rounded-xl border border-border bg-card hover:bg-surface text-muted-foreground transition-colors disabled:opacity-40">
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
                  <div className="px-5 py-4 border-b border-border bg-surface/40">
                    <div className="h-4 bg-surface rounded-lg w-1/3 mb-2" />
                    <div className="h-3 bg-surface rounded-lg w-1/2" />
                  </div>
                  <div className="p-4 grid grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, j) => <div key={j} className="h-20 bg-surface rounded-xl" />)}
                  </div>
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
          ) : (
            <div className="space-y-4">
              {entries.map((entry, i) => (
                <LogisticRow
                  key={entry.party.id}
                  entry={entry}
                  allUsers={allUsers}
                  index={i}
                  onSave={() => toast(`Logistica "${entry.party.nome}" salvata`, "success")}
                  onRefresh={() => loadData(selectedDate, true)}
                  toast={toast}
                />
              ))}
            </div>
          )}

        </motion.div>
      </main>
    </div>
  );
}