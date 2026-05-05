"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, MapPin, Clock, Users, User, Package,
  RefreshCw, CalendarDays, ChevronDown, Check,
  X, Save, RotateCcw, ArrowLeftRight, AlertCircle,
  Loader2, CheckCheck, TriangleAlert, Info,
} from "lucide-react";
import Navbar from "@/components/navbar";
import {
  getLogisticsByDate,
  getLogisticsUsers,
  saveLogistics,
} from "./actions";

// ─── Costanti ─────────────────────────────────────────────────────────────────
const VEICOLI = ["cubo", "blu", "granata", "grigio"];
const VEICOLO_COLORS = {
  cubo:    "bg-slate-100 text-slate-700 border-slate-300",
  blu:     "bg-blue-100 text-blue-700 border-blue-300",
  granata: "bg-red-100 text-red-700 border-red-300",
  grigio:  "bg-gray-100 text-gray-700 border-gray-300",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

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
  const cfg = { success: { icon: <CheckCheck className="w-4 h-4" />, cls: "bg-green-600 text-white" }, error: { icon: <TriangleAlert className="w-4 h-4" />, cls: "bg-red-600 text-white" }, info: { icon: <Info className="w-4 h-4" />, cls: "bg-foreground text-background" } };
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => { const c = cfg[t.type] || cfg.info; return (
          <motion.div key={t.id} initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-sm ${c.cls}`}>
            {c.icon}<span className="flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        ); })}
      </AnimatePresence>
    </div>
  );
}

// ─── Staff Multi-select ───────────────────────────────────────────────────────
function StaffSelector({ allUsers, selectedIds, onChange }) {
  const selected = selectedIds.map((id) => allUsers.find((u) => u.id === id)).filter(Boolean);
  const available = allUsers.filter((u) => !selectedIds.includes(u.id));

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((u) => (
            <span key={u.id} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium border border-primary/20">
              {u.nome}
              <button type="button" onClick={() => onChange(selectedIds.filter((id) => id !== u.id))}
                className="hover:text-primary/60 ml-0.5"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
      )}
      <select value="" onChange={(e) => { if (e.target.value) { onChange([...selectedIds, e.target.value]); e.target.value = ""; } }}
        className="w-full px-2.5 py-2 border border-input rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring bg-surface">
        <option value="">{available.length === 0 ? "Tutti assegnati" : selected.length === 0 ? "Aggiungi staff..." : "Aggiungi..."}</option>
        {available.map((u) => <option key={u.id} value={u.id}>{u.nome} ({u.ruolo})</option>)}
      </select>
    </div>
  );
}

// ─── Riga Logistica ───────────────────────────────────────────────────────────
function LogisticRow({ entry, allUsers, index, onSave, toast }) {
  const { party, logistics } = entry;

  const [form, setForm] = useState({
    staff_ids:       logistics?.staff_ids       || [],
    driver_id:       logistics?.driver_id       || "",
    veicolo:         logistics?.veicolo         || "",
    start_logistica: logistics?.start_logistica || "",
    andata_ritorno:  logistics?.andata_ritorno  ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Reset when logistics change externally
  useEffect(() => {
    setForm({
      staff_ids:       logistics?.staff_ids       || [],
      driver_id:       logistics?.driver_id       || "",
      veicolo:         logistics?.veicolo         || "",
      start_logistica: logistics?.start_logistica || "",
      andata_ritorno:  logistics?.andata_ritorno  ?? true,
    });
    setDirty(false);
  }, [logistics]);

  const update = (key, value) => { setForm((p) => ({ ...p, [key]: value })); setDirty(true); setSaved(false); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveLogistics(party.id, form);
      if (result.error) { toast(result.error, "error"); return; }
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2500);
      onSave();
    } catch { toast("Errore nel salvataggio", "error"); }
    finally { setSaving(false); }
  };

  const handleReset = () => {
    setForm({ staff_ids: logistics?.staff_ids || [], driver_id: logistics?.driver_id || "", veicolo: logistics?.veicolo || "", start_logistica: logistics?.start_logistica || "", andata_ritorno: logistics?.andata_ritorno ?? true });
    setDirty(false);
  };

  const veicCls = form.veicolo ? VEICOLO_COLORS[form.veicolo] || "bg-surface text-muted-foreground border-border" : "";

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className={`bg-card rounded-2xl border overflow-hidden transition-all ${dirty ? "border-primary/40 shadow-primary/5 shadow-md" : "border-border"}`}>

      {/* Header festa */}
      <div className="px-5 py-4 border-b border-border bg-surface/40 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">#{index + 1}</span>
            <h3 className="font-bold text-foreground text-base leading-tight truncate">{party.nome}</h3>
            {party.cliente && (
              <span className="text-xs font-medium text-muted-foreground bg-surface border border-border px-2 py-0.5 rounded-full truncate max-w-[160px]">
                {party.cliente}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{party.luogo}</span>
            {party.ora_inizio && <span className="flex items-center gap-1 font-semibold text-foreground"><Clock className="w-3 h-3" />{party.ora_inizio}</span>}
            {party.servizi && (
              <span className="flex items-center gap-1 max-w-xs truncate">
                <Package className="w-3 h-3 shrink-0" />
                {party.servizi.replace(/\n/g, " · ").slice(0, 80)}{party.servizi.length > 80 ? "…" : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dirty && (
            <button onClick={handleReset} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors" title="Annulla modifiche">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={handleSave} disabled={saving || !dirty}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              saved ? "bg-green-500 text-white" : dirty ? "btn-primary" : "bg-surface text-muted-foreground border border-border cursor-default"
            }`}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCheck className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Salvo..." : saved ? "Salvato" : "Salva"}
          </button>
        </div>
      </div>

      {/* Grid campi logistica */}
      <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">

        {/* Staff */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-2">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            <Users className="w-3 h-3 inline mr-1" />Staff
          </label>
          <StaffSelector allUsers={allUsers} selectedIds={form.staff_ids} onChange={(ids) => update("staff_ids", ids)} />
        </div>

        {/* Driver */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            <User className="w-3 h-3 inline mr-1" />Driver
          </label>
          <select value={form.driver_id} onChange={(e) => update("driver_id", e.target.value)}
            className="w-full px-2.5 py-2 border border-input rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring bg-surface">
            <option value="">— Nessuno —</option>
            {allUsers.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>

        {/* Veicolo */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            <Truck className="w-3 h-3 inline mr-1" />Mezzo
          </label>
          <select value={form.veicolo} onChange={(e) => update("veicolo", e.target.value)}
            className={`w-full px-2.5 py-2 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${form.veicolo ? veicCls : "border-input bg-surface text-muted-foreground"}`}>
            <option value="">— Scegli —</option>
            {VEICOLI.map((v) => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
          </select>
        </div>

        {/* Start logistica */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            <Clock className="w-3 h-3 inline mr-1" />Start Log.
          </label>
          <input type="time" value={form.start_logistica} onChange={(e) => update("start_logistica", e.target.value)}
            className="w-full px-2.5 py-2 border border-input rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring bg-surface" />
        </div>

        {/* A/R */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            <ArrowLeftRight className="w-3 h-3 inline mr-1" />A/R
          </label>
          <button type="button" onClick={() => update("andata_ritorno", !form.andata_ritorno)}
            className={`w-full px-3 py-2 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              form.andata_ritorno
                ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                : "bg-surface text-muted-foreground border-border hover:bg-muted/40"
            }`}>
            {form.andata_ritorno ? <><Check className="w-3.5 h-3.5" />A/R</> : <><X className="w-3.5 h-3.5" />Solo A</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
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
      setEntries(entriesData);
      setAllUsers(usersData);
    } catch {
      toast("Errore nel caricamento dei dati", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(selectedDate); }, [selectedDate]);

  const handleDateChange = (date) => { setSelectedDate(date); };

  // Stats rapide
  const filled    = entries.filter((e) => e.logistics?.driver_id || e.logistics?.veicolo).length;
  const missing   = entries.length - filled;
  const veicByType = VEICOLI.reduce((acc, v) => { acc[v] = entries.filter((e) => e.logistics?.veicolo === v).length; return acc; }, {});

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
                {loading ? "Caricamento..." : `${entries.length} fest${entries.length === 1 ? "a" : "e"} · ${filled} configurate · ${missing} mancanti`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input type="date" value={selectedDate} onChange={(e) => handleDateChange(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm bg-card" />
              </div>
              <button onClick={() => loadData(selectedDate, true)} disabled={refreshing}
                className="p-2.5 rounded-xl border border-border bg-card hover:bg-surface text-muted-foreground transition-colors disabled:opacity-40">
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Stat pills */}
          {!loading && entries.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2">
              {VEICOLI.map((v) => veicByType[v] > 0 && (
                <span key={v} className={`px-3 py-1.5 rounded-full border text-xs font-bold ${VEICOLO_COLORS[v]}`}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}: {veicByType[v]}
                </span>
              ))}
              {missing > 0 && (
                <span className="px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold">
                  ⚠ {missing} senza logistica
                </span>
              )}
            </motion.div>
          )}

          {/* Lista */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
                  <div className="px-5 py-4 border-b border-border bg-surface/40 flex gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-surface rounded-lg w-1/3" />
                      <div className="h-3 bg-surface rounded-lg w-1/2" />
                    </div>
                  </div>
                  <div className="p-5 grid grid-cols-3 lg:grid-cols-6 gap-4">
                    {Array.from({ length: 6 }).map((_, j) => <div key={j} className="h-9 bg-surface rounded-lg" />)}
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
              <p className="text-sm text-muted-foreground mt-1">Prova un giorno diverso o sincronizza le feste</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry, i) => (
                <LogisticRow key={entry.party.id} entry={entry} allUsers={allUsers} index={i}
                  onSave={() => toast(`Logistica "${entry.party.nome}" salvata`, "success")}
                  toast={toast} />
              ))}
            </div>
          )}

        </motion.div>
      </main>
    </div>
  );
}