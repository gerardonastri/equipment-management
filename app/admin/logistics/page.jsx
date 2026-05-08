"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, MapPin, Clock, Users, Package,
  RefreshCw, CalendarDays, Check, X, Save,
  RotateCcw, Loader2, CheckCheck, TriangleAlert,
  Info, Printer, ArrowRight, ArrowLeft, Plus, ChevronDown,
  Pencil, Trash2
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
  const { party, logistics } = entry;

  // 1. AUTO-MATCHING SILENZIOSO: Incrocia animatori Movida col nostro DB utenti
  const matchedStaffIds = useMemo(() => {
    if (!movidaAnimatori || !allUsers) return [];
    const movidaNames = movidaAnimatori.map(a => normalizeId(a.denominazione));
    return allUsers
      .filter(u => movidaNames.includes(normalizeId(u.nome)))
      .map(u => String(u.id));
  }, [movidaAnimatori, allUsers]);

  const buildForm = useCallback((l) => {
    // Unisci gli ID salvati nel DB con quelli trovati dal matching automatico in background
    const savedStaff = (l?.staff_ids || []).map(String);
    const mergedStaff = Array.from(new Set([...savedStaff, ...matchedStaffIds]));

    return {
      staff_ids:           mergedStaff,
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

      {/* Header festa - Ora pulito senza la sezione animatori separata */}
      <div className="px-5 py-3.5 border-b border-border bg-surface/40">
        <div className="flex items-start justify-between gap-3">
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
        {/* Staff (Ora funge da hub unico per Animatori+Staff Extra) */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <Users className="w-3 h-3" />Staff
          </label>
          <UserSelector allUsers={allUsers} selectedIds={form.staff_ids} onChange={(ids) => update("staff_ids", ids)} />
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
    </motion.div>
  );
}

// ─── Motore di Stampa ─────────────────────────────────────────────────────────
function generateHtmlReport(title, dateStr, contentHtml) {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<title>${title} — ${dateStr}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:11px;color:#111;padding:24px}
  h1{font-size:16px;font-weight:800;margin-bottom:2px}.sub{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:20px}
  h2{font-size:13px;font-weight:700;margin-top:24px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #eaeaea;color:#333}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  thead tr{background:#111;color:#fff}
  thead th{padding:8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
  tbody tr{border-bottom:1px solid #eaeaea}
  tbody tr:nth-child(even){background:#fafafa}
  td{padding:8px;vertical-align:top}
  .chip{display:inline-block;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;margin:1px}
  .footer{margin-top:24px;font-size:9px;color:#999;text-align:center}
  @media print{body{padding:0}@page{margin:10mm}}
</style>
</head><body>
<h1>${title.toUpperCase()} — ${dateStr.toUpperCase()}</h1>
<div class="sub">Prospetto operativo · Movida Manager</div>
${contentHtml}
<div class="footer">Stampato il ${new Date().toLocaleString("it-IT")}</div>
</body></html>`;
}

function handlePrint({ entries, allUsers, allVeicoli, date, type }) {
  const dateStr = new Date(date + "T00:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const getName  = (id) => allUsers.find((u) => String(u.id) === String(id))?.nome || "—";
  const getNames = (ids) => (ids || []).map(getName).join(", ") || "—";

  const buildRow = (e, i) => {
    const { party, logistics: l } = e;
    
    return `<tr>
      <td style="font-weight:bold;color:#888;text-align:center">${i + 1}</td>
      <td><strong>${party.luogo}</strong><br><span style="font-size:9px;color:#666">${party.nome}</span></td>
      <td><strong>${party.ora_inizio || "—"}</strong></td>
      <td>${l?.start_logistica || "—"}</td>
      <td>${getNames(l?.staff_ids)}</td>
      <td><strong style="color:#166534">A:</strong> ${getNames(l?.drivers_andata_ids)}<br><span style="font-size:9px">${(l?.veicoli_andata||[]).join(", ")}</span></td>
      <td><strong style="color:#1e40af">R:</strong> ${l?.solo_andata ? '<i>Solo andata</i>' : getNames(l?.drivers_ritorno_ids)}<br><span style="font-size:9px">${l?.solo_andata ? '' : (l?.veicoli_ritorno||[]).join(", ")}</span></td>
      <td style="font-size:9px;color:#666">${l?.note || ""}</td>
    </tr>`;
  };

  const tableHeader = `<table><thead><tr><th>#</th><th>Location / Festa</th><th>Ora Festa</th><th>Start Log.</th><th>Staff</th><th>Andata</th><th>Ritorno</th><th>Note</th></tr></thead><tbody>`;

  let contentHtml = "";
  let title = "Logistica Giornaliera";

  if (type === "daily") {
    contentHtml = tableHeader + entries.map((e, i) => buildRow(e, i)).join("") + `</tbody></table>`;
  } 
  else if (type === "driver") {
    title = "Logistica per Driver";
    const driverIds = new Set();
    entries.forEach(e => {
      (e.logistics?.drivers_andata_ids || []).forEach(id => driverIds.add(String(id)));
      (e.logistics?.drivers_ritorno_ids || []).forEach(id => driverIds.add(String(id)));
    });

    Array.from(driverIds).forEach(id => {
      const driverName = getName(id);
      const driverEntries = entries.filter(e => 
        (e.logistics?.drivers_andata_ids || []).includes(String(id)) || 
        (e.logistics?.drivers_ritorno_ids || []).includes(String(id))
      );
      contentHtml += `<h2>Driver: ${driverName.toUpperCase()}</h2>${tableHeader}${driverEntries.map((e, i) => buildRow(e, i)).join("")}</tbody></table>`;
    });
  } 
  else if (type === "vehicle") {
    title = "Logistica per Furgone";
    const activeVehicles = new Set();
    entries.forEach(e => {
      (e.logistics?.veicoli_andata || []).forEach(v => activeVehicles.add(v));
      (e.logistics?.veicoli_ritorno || []).forEach(v => activeVehicles.add(v));
    });

    Array.from(activeVehicles).forEach(v => {
      const vehicleEntries = entries.filter(e => 
        (e.logistics?.veicoli_andata || []).includes(v) || 
        (e.logistics?.veicoli_ritorno || []).includes(v)
      );
      contentHtml += `<h2>Mezzo: ${v.toUpperCase()}</h2>${tableHeader}${vehicleEntries.map((e, i) => buildRow(e, i)).join("")}</tbody></table>`;
    });
  }

  const html = generateHtmlReport(title, dateStr, contentHtml);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
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
  const [movidaMap, setMovidaMap]       = useState({});
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  
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
                        <button onClick={() => { handlePrint({ entries, allUsers, allVeicoli, date: selectedDate, type: "daily" }); setPrintMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface transition-colors border-b border-border">Intera Giornata</button>
                        <button onClick={() => { handlePrint({ entries, allUsers, allVeicoli, date: selectedDate, type: "driver" }); setPrintMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface transition-colors border-b border-border">Raggruppa per Driver</button>
                        <button onClick={() => { handlePrint({ entries, allUsers, allVeicoli, date: selectedDate, type: "vehicle" }); setPrintMenuOpen(false); }}
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
          ) : (
            <div className="space-y-4">
              {entries.map((entry, i) => {
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