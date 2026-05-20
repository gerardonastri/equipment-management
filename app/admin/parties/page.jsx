"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Package, Clock, Truck, Home, Warehouse,
  RefreshCw, CalendarDays, CheckCircle2, XCircle, WifiOff,
  CheckCheck, TriangleAlert, Info, X as XIcon,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { PartyCard } from "@/components/parties/party-card";
import { PartyFormModal } from "@/components/parties/party-form-modal";
import { MaterialModal } from "@/components/parties/material-modal";
import { PartyHistoryModal } from "@/components/parties/party-history-modal";
import {
  getPartiesData,
  getPartyMaterials,
  createParty,
  deleteParty,
  assignMaterial,
  removeMaterial,
  updateParty,
  getPartyHistory,
  syncPartiesByDate,
  getPartiesByDate,
  getUsedMacroIds,
  getAvailableItemsForSpecialParty,
  getPartyMacroIds,
} from "./actions";
import { cacheManager } from "@/lib/cache/db";

// ─── Toast system ─────────────────────────────────────────────────────────────
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const configs = {
            success: { icon: <CheckCheck className="w-4 h-4" />, cls: "bg-green-600 text-white" },
            error:   { icon: <TriangleAlert className="w-4 h-4" />, cls: "bg-red-600 text-white" },
            info:    { icon: <Info className="w-4 h-4" />, cls: "bg-foreground text-background" },
          };
          const cfg = configs[t.type] || configs.info;
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-sm ${cfg.cls}`}>
              {cfg.icon}
              <span className="flex-1">{t.message}</span>
              <button onClick={() => removeToast(t.id)} className="opacity-70 hover:opacity-100 ml-1"><XIcon className="w-3.5 h-3.5" /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);
  const remove = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  return { toasts, toast: add, removeToast: remove };
}

const fetcher = () => getPartiesData();

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function SyncStatusBar({ status, rowsFetched, rowsUpserted, errorMsg, onRetry }) {
  if (!status) return null;
  const configs = {
    syncing: { icon: <RefreshCw className="w-4 h-4 animate-spin" />, text: "Sincronizzazione in corso...", cls: "bg-blue-50 border-blue-200 text-blue-700" },
    fresh:   { icon: <CheckCircle2 className="w-4 h-4" />, text: "Dati già aggiornati (< 10 min)", cls: "bg-green-50 border-green-200 text-green-700" },
    success: { icon: <CheckCircle2 className="w-4 h-4" />, text: `Sincronizzati ${rowsUpserted} eventi (${rowsFetched} trovati)`, cls: "bg-green-50 border-green-200 text-green-700" },
    empty:   { icon: <CalendarDays className="w-4 h-4" />, text: "Nessun evento nell'API per questa data", cls: "bg-yellow-50 border-yellow-200 text-yellow-700" },
    error:   { icon: <XCircle className="w-4 h-4" />, text: `Errore sync: ${errorMsg}`, cls: "bg-red-50 border-red-200 text-red-700" },
  };
  const cfg = configs[status];
  if (!cfg) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${cfg.cls}`}>
      {cfg.icon}
      <span>{cfg.text}</span>
      {status === "error" && <button onClick={onRetry} className="ml-auto underline text-xs hover:no-underline">Riprova</button>}
    </motion.div>
  );
}

// ── Incolla questa funzione qui ──
const mapHandoffRelations = (partiesList) => {
  if (!partiesList) return [];
  return partiesList.map((party) => {
    // 1. Cerca la festa di destinazione a cui passa la merce
    const targetParty = partiesList.find((p) => p.id === party.handoff_to_party_id);
    // 2. Cerca se un'altra festa sta passando materiale a questa
    const sourceParty = partiesList.find((p) => p.handoff_to_party_id === party.id);

    return {
      ...party,
      _handoffTargetParty: targetParty || null,
      _isHandoffDestination: !!sourceParty,
      _handoffSourceParty: sourceParty || null,
    };
  });
};
// ───────────────────────────────────

export default function PartiesPage() {
  // ── Toast ──
  const { toasts, toast, removeToast } = useToast();

  // ── Sync / date ──
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncMeta, setSyncMeta] = useState({ rowsFetched: 0, rowsUpserted: 0, errorMsg: "" });
  const [syncedParties, setSyncedParties] = useState(null);
  const [loadingSynced, setLoadingSynced] = useState(false);
  const debounceRef = useRef(null);

  // ── Disponibilità macro ──
  const [usedMacroIds, setUsedMacroIds] = useState(new Set());
  const [isLoadingMacros, setIsLoadingMacros] = useState(false);

  // ── Form party ──
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editParty, setEditParty] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedParty, setSelectedParty] = useState(null);
  const [partyMaterials, setPartyMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [newParty, setNewParty] = useState({
    nome: "", data: "", luogo: "", animatore_id: "", magazziniere_id: "", animatori_ids: [], responsabili_ids: [], drivers_ids: [], stato: "iniziale", note: "", shelves: [],
    handoff_to_party_id: null, handoff_macro_ids: [],
  });
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [selectedSingleItems, setSelectedSingleItems] = useState([]);
  const [specialItemHierarchy, setSpecialItemHierarchy] = useState([]);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyParty, setHistoryParty] = useState(null);
  const [partyAlerts, setPartyAlerts] = useState({});
  const [partiesFor3Days, setPartiesFor3Days] = useState([]);

  const { data, error, isLoading, mutate } = useSWR("parties-data", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const users = data?.users || [];
  const macroCategories = data?.macroCategories || [];
  
  // ── Carica feste dei 3 giorni successivi per l'handoff nel form ──
  useEffect(() => {
    if (!selectedDate) return;
    const loadPartiesFor3Days = async () => {
      try {
        const dateObj = new Date(selectedDate + "T00:00:00");
        const dates = [
          selectedDate,
          new Date(dateObj.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          new Date(dateObj.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        ];
        
        // Carica tutte le feste dei 3 giorni
        const allPartiesFor3Days = await Promise.all(dates.map((d) => getPartiesByDate(d)));
        const combined = allPartiesFor3Days.flat();
        setPartiesFor3Days(combined);
        console.log("[v0] Feste caricate per 3 giorni:", { dates, count: combined.length, parties: combined });
      } catch (err) {
        console.error("[v0] Errore caricamento feste 3 giorni:", err);
        setPartiesFor3Days([]);
      }
    };
    
    loadPartiesFor3Days();
  }, [selectedDate]);
  
  // ── Modifica qui: passiamo l'array nella nostra funzione ──
  const rawParties = syncedParties ?? [];
  const parties = mapHandoffRelations(rawParties);

  // ── Sync ──
  const runSyncForDate = useCallback(async (date) => {
    setLoadingSynced(true);
    setSyncStatus("syncing");
    setSyncedParties(null);
    try {
      const result = await syncPartiesByDate(date);
      if (result.error) {
        setSyncStatus("error");
        setSyncMeta((m) => ({ ...m, errorMsg: result.error }));
        const fallback = await getPartiesByDate(date);
        setSyncedParties(fallback);
        loadAlertsForParties(fallback);
        return;
      }
      if (result.alreadyFresh) setSyncStatus("fresh");
      else if (result.skipped && !result.alreadyFresh) setSyncStatus("empty");
      else { setSyncStatus("success"); setSyncMeta({ rowsFetched: result.rowsFetched, rowsUpserted: result.rowsUpserted, errorMsg: "" }); }
      const fetched = await getPartiesByDate(date);
      setSyncedParties(fetched);
      loadAlertsForParties(fetched);
    } catch (err) {
      setSyncStatus("error");
      setSyncMeta((m) => ({ ...m, errorMsg: err?.message || "Errore sconosciuto" }));
      const fallback = await getPartiesByDate(date);
      setSyncedParties(fallback);
      loadAlertsForParties(fallback);
    } finally {
      setLoadingSynced(false);
    }
  }, []);

  const handleDateChange = useCallback((date) => {
    setSelectedDate(date);
    setSyncedParties(null);
    setSyncStatus(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSyncForDate(date), 400);
  }, [runSyncForDate]);

  useEffect(() => { runSyncForDate(todayISO()); }, []);

  useEffect(() => {
    if (data?.users) cacheManager.cacheUsers(data.users).catch(console.error);
    if (data?.macroCategories) cacheManager.cacheMacros(data.macroCategories).catch(console.error);
  }, [data]);

  // Ricarica macro usate quando cambia la lista feste
  useEffect(() => {
    getUsedMacroIds(editParty?.id || null, editParty?.data || selectedDate).then((ids) => setUsedMacroIds(ids));
  }, [syncedParties]);

  // Gerarchia speciale per la creazione — si aggiorna quando cambiano le macro selezionate
  useEffect(() => {
    if (!showFormModal || editParty) return;
    getAvailableItemsForSpecialParty("__new__")
      .then((items) => {
        const filtered = items.filter((m) => !selectedMaterials.includes(m.id));
        setSpecialItemHierarchy(filtered);
      })
      .catch(() => setSpecialItemHierarchy([]));
  }, [showFormModal, selectedMaterials, editParty]);

  // ── Alerts perdite ──
  const loadAlertsForParties = async (partiesList) => {
    if (!partiesList?.length) return;
    const results = await Promise.allSettled(
      partiesList.map(async (party) => {
        const history = await getPartyHistory(party.id);
        // activeLosses = solo quelle non resolved → usate per gli alert
        // losses = tutte (anche resolved) → usate per lo storico nel modal
        const active = history.activeLosses || [];
        return {
          id: party.id,
          lossCount: active.length,
          hasMissingMaterial: active.some((l) => l.tipo === "mancante"),
          losses: active,           // card mostra solo attive
          allLosses: history.losses || [], // storico completo per il modal
        };
      })
    );
    const alertMap = {};
    results.forEach((res, idx) => { if (res.status === "fulfilled") alertMap[partiesList[idx].id] = res.value; });
    setPartyAlerts(alertMap);
  };

  const loadPartyMaterialsData = async (partyId) => {
    setLoadingMaterials(true);
    try { setPartyMaterials(await getPartyMaterials(partyId)); }
    catch (err) { console.error("Error loading party materials:", err); }
    finally { setLoadingMaterials(false); }
  };

  // ── Status helpers ──
  const getStatusColor = (stato) => ({
    iniziale: "bg-yellow-100 text-yellow-800 border-yellow-200",
    caricato_scaffale: "bg-red-100 text-red-800 border-red-200",
    caricato_furgone: "bg-blue-100 text-blue-800 border-blue-200",
    scaricato_furgone: "bg-purple-100 text-purple-800 border-purple-200",
    scaricato_scaffale: "bg-green-100 text-green-800 border-green-200",
  })[stato] || "bg-gray-100 text-gray-800 border-gray-200";

  const getStatusText = (stato) => ({
    iniziale: "Iniziale",
    caricato_scaffale: "Caricato sullo scaffale",
    caricato_furgone: "Caricato nel Furgone",
    scaricato_furgone: "Scaricato dal Furgone",
    scaricato_scaffale: "Ritornato al deposito",
  })[stato] || "Sconosciuto";

  const getStatusIcon = (stato) => ({
    iniziale: <Clock className="w-4 h-4" />,
    caricato_scaffale: <Warehouse className="w-4 h-4" />,
    caricato_furgone: <Truck className="w-4 h-4" />,
    scaricato_furgone: <Package className="w-4 h-4" />,
    scaricato_scaffale: <Home className="w-4 h-4" />,
  })[stato] || <Clock className="w-4 h-4" />;

  // ── CRUD ──
  const handleAddParty = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createParty({ ...newParty, selectedMaterials, selectedSingleItems, animatori_ids: newParty.animatori_ids || [], responsabili_ids: newParty.responsabili_ids || [], drivers_ids: newParty.drivers_ids || [] });
      // Chiudi subito il form per feedback immediato
      setShowFormModal(false);
      setNewParty({ nome: "", data: "", luogo: "", animatore_id: "", magazziniere_id: "", animatori_ids: [], responsabili_ids: [], drivers_ids: [], stato: "iniziale", note: "", shelves: [], handoff_to_party_id: null, handoff_macro_ids: [] });
      setSelectedMaterials([]);
      setSelectedSingleItems([]);
      toast("Festa creata con successo!", "success");
      // Ricarica in background
      runSyncForDate(selectedDate);
    } catch (err) {
      console.error("Error creating party:", err);
      toast("Errore nella creazione della festa", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditParty = async (party) => {
    setEditParty({
      ...party,
      shelves:             party.shelves ? party.shelves.split(",").filter(Boolean).map((s) => s.trim()) : [],
      animatori_ids:       Array.isArray(party.animatori_ids) ? party.animatori_ids : [],
      responsabili_ids:    Array.isArray(party.responsabili_ids) ? party.responsabili_ids : [],
      drivers_ids:         Array.isArray(party.drivers_ids) ? party.drivers_ids : [],
      handoff_to_party_id: party.handoff_to_party_id || null,
      handoff_macro_ids:   Array.isArray(party.handoff_macro_ids) ? party.handoff_macro_ids : [],
    });
    // Carica in parallelo: macro usate (per disabilitare) + macro già assegnate (per pre-selezionare)
    const [usedIds, assignedMacroIds] = await Promise.all([
      getUsedMacroIds(party.id, party.data),
      getPartyMacroIds(party.id),
    ]);
    setUsedMacroIds(usedIds);
    setSelectedMaterials(assignedMacroIds);  // pre-seleziona le macro già assegnate
    setShowFormModal(true);
  };

  const handleUpdateParty = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateParty(editParty.id, { ...editParty, selectedMaterials, animatori_ids: editParty.animatori_ids || [], responsabili_ids: editParty.responsabili_ids || [], drivers_ids: editParty.drivers_ids || [], handoff_to_party_id: editParty.handoff_to_party_id || null, handoff_macro_ids: editParty.handoff_macro_ids || [] });
      setShowFormModal(false);
      setEditParty(null);
      setSelectedMaterials([]);
      toast("Festa aggiornata con successo!", "success");
      runSyncForDate(selectedDate);
    } catch (err) {
      console.error("Error updating party:", err);
      toast("Errore nell'aggiornamento della festa", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignMaterial = async (macroId) => {
    try {
      await assignMaterial(selectedParty.id, macroId);
      await loadPartyMaterialsData(selectedParty.id);
      await runSyncForDate(selectedDate);
      setUsedMacroIds(await getUsedMacroIds(selectedParty.id, selectedParty.data));
    } catch (err) { console.error("Error assigning material:", err); alert("Errore nell'assegnazione del materiale"); }
  };

  const handleRemoveMaterial = async (macroId) => {
    try {
      await removeMaterial(selectedParty.id, macroId);
      await loadPartyMaterialsData(selectedParty.id);
      await runSyncForDate(selectedDate);
      setUsedMacroIds(await getUsedMacroIds(selectedParty.id, selectedParty.data));
    } catch (err) { console.error("Error removing material:", err); alert("Errore nella rimozione del materiale"); }
  };

  const handleDeleteParty = async (partyId) => {
    if (!confirm("Sei sicuro di voler eliminare questa festa?")) return;
    try {
      // Rimuovi subito dalla lista locale per feedback immediato
      setSyncedParties((prev) => (prev || []).filter((p) => p.id !== partyId));
      await deleteParty(partyId);
      await cacheManager.deletePartyFromCache(partyId);
      toast("Festa eliminata", "success");
      // Ricarica in background per aggiornare scaffali liberi ecc.
      runSyncForDate(selectedDate);
    } catch (err) {
      console.error("Error deleting party:", err);
      toast("Errore nell'eliminazione della festa", "error");
      // Ripristina la lista in caso di errore
      runSyncForDate(selectedDate);
    }
  };

  const openMaterialModal = async (party) => {
    setSelectedParty(party);
    setShowMaterialModal(true);
    await loadPartyMaterialsData(party.id);
    setUsedMacroIds(await getUsedMacroIds(party.id, party.data));
  };

  const openHistoryModal = (party) => { setHistoryParty(party); setShowHistoryModal(true); };
  const toggleMaterialSelection = (id) => setSelectedMaterials((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleSingleItemSelection = (id) => setSelectedSingleItems((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleStatusFilter = (status) => setSelectedStatuses((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]);

  const filteredParties = parties.filter((party) => {
    const matchesSearch =
      (party.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (party.luogo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (party.animatore?.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (party.magazziniere?.nome || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (selectedStatuses.length === 0 || selectedStatuses.includes(party.stato));
  });

  const isOfflineWithData = error && !isLoading && parties.length > 0;

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="containerMod py-8">
        {isOfflineWithData && (
          <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800 flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />Modalità offline — visualizzando dati salvati.
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gestione Feste</h1>
              <p className="text-muted-foreground">
                Sincronizzate dal gestionale · {filteredParties.length} fest{filteredParties.length === 1 ? "a" : "e"} per il{" "}
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <button
              onClick={() => {
                setEditParty(null);
                setNewParty({ nome: "", data: selectedDate, luogo: "", animatore_id: "", magazziniere_id: "", animatori_ids: [], responsabili_ids: [], drivers_ids: [], stato: "iniziale", note: "", shelves: [], handoff_to_party_id: null, handoff_macro_ids: [] });
                setSelectedMaterials([]);
                setSelectedSingleItems([]);
                setShowFormModal(true);
              }}
              className="btn-primary flex items-center space-x-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /><span>Nuova Festa</span>
            </button>
          </div>

          {/* Date Picker + Sync */}
          <div className="bg-card p-5 rounded-xl border border-border">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Data eventi</label>
                  <input type="date" value={selectedDate} onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm bg-surface" />
                </div>
              </div>
              <button onClick={() => runSyncForDate(selectedDate)} disabled={syncStatus === "syncing"}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                <RefreshCw className={`w-4 h-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                {syncStatus === "syncing" ? "Sincronizzando..." : "Sincronizza"}
              </button>
            </div>
            <AnimatePresence mode="wait">
              {syncStatus && (
                <div className="mt-3">
                  <SyncStatusBar status={syncStatus} rowsFetched={syncMeta.rowsFetched} rowsUpserted={syncMeta.rowsUpserted} errorMsg={syncMeta.errorMsg} onRetry={() => runSyncForDate(selectedDate)} />
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Ricerca + filtri */}
          <div className="bg-card p-6 rounded-xl border border-border space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Cerca feste..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground pt-2">Filtra per stato:</span>
              {[
                { value: "iniziale", label: "Iniziale" },
                { value: "caricato_furgone", label: "Caricato nel Furgone" },
                { value: "scaricato_furgone", label: "Scaricato dal Furgone" },
                { value: "scaricato_scaffale", label: "Ritornato al deposito" },
              ].map((s) => (
                <button key={s.value} onClick={() => toggleStatusFilter(s.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedStatuses.includes(s.value) ? "bg-primary text-white" : "bg-surface text-muted-foreground border border-border hover:bg-surface/80"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista feste */}
          <div className="grid gap-6">
            {loadingSynced ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-6 animate-pulse">
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-surface rounded-lg w-1/3" />
                    <div className="h-4 bg-surface rounded-lg w-1/2" />
                    <div className="grid grid-cols-4 gap-3 mt-4">{Array.from({ length: 4 }).map((_, j) => <div key={j} className="h-4 bg-surface rounded-lg" />)}</div>
                  </div>
                </div>
              ))
            ) : filteredParties.length > 0 ? (
              filteredParties.map((party) => {
                const alerts = partyAlerts[party.id];
                return (
                  <PartyCard
                    key={party.id}
                    party={{ ...party, _lossCount: alerts?.lossCount || 0, _hasMissingMaterial: alerts?.hasMissingMaterial || false, _losses: alerts?.losses || [] }}
                    onEdit={handleEditParty}
                    onDelete={handleDeleteParty}
                    onMaterial={openMaterialModal}
                    onHistory={openHistoryModal}
                    getStatusColor={getStatusColor}
                    getStatusText={getStatusText}
                    getStatusIcon={getStatusIcon}
                    allUsers={users}
                    partyAlerts={partyAlerts}
                  />
                );
              })
            ) : (
              <div className="text-center py-16">
                <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                <p className="text-muted-foreground font-medium">
                  {!syncStatus || syncStatus === "syncing" ? "Caricamento in corso..." : "Nessuna festa per questa data"}
                </p>
                {syncStatus !== "syncing" && <p className="text-sm text-muted-foreground mt-1 opacity-60">Prova a cambiare data o crea una festa manualmente</p>}
              </div>
            )}
          </div>

          {/* Modali */}
          <PartyFormModal
            isOpen={showFormModal}
            isEdit={editParty !== null}
            party={editParty || newParty}
            onPartyChange={(p) => {
              if (editParty) setEditParty(p); else setNewParty(p);
              // Se la data cambia, ricalcola le macro in uso per quel giorno
              const currentParty = editParty || newParty;
              if (p.data && p.data !== currentParty.data) {
                setIsLoadingMacros(true);
                getUsedMacroIds(p.id || null, p.data).then((ids) => {
                  setUsedMacroIds(ids);
                  setIsLoadingMacros(false);
                });
              }
            }}
            users={users}
            macroCategories={macroCategories}
            selectedMaterials={selectedMaterials}
            onMaterialToggle={toggleMaterialSelection}
            onAddShelf={(shelf) => {
              const setter = editParty ? setEditParty : setNewParty;
              setter((prev) => ({ ...prev, shelves: [...prev.shelves, shelf].sort((a, b) => a - b) }));
            }}
            onRemoveShelf={(shelf) => {
              const setter = editParty ? setEditParty : setNewParty;
              setter((prev) => ({ ...prev, shelves: prev.shelves.filter((s) => s !== shelf) }));
            }}
            isSubmitting={isSubmitting}
            onSubmit={editParty ? handleUpdateParty : handleAddParty}
            onCancel={() => { setShowFormModal(false); setEditParty(null); setSelectedMaterials([]); setSelectedSingleItems([]); }}
            allParties={partiesFor3Days}
            usedMacroIds={usedMacroIds}
            isLoadingMacros={isLoadingMacros}
            specialItemHierarchy={specialItemHierarchy}
            selectedSingleItems={selectedSingleItems}
            onSingleItemToggle={toggleSingleItemSelection}
          />

          <MaterialModal
            isOpen={showMaterialModal}
            party={selectedParty}
            materials={partyMaterials}
            loading={loadingMaterials}
            macroCategories={macroCategories}
            usedMacroIds={usedMacroIds}
            isLoadingMacros={isLoadingMacros}
            onAssignMaterial={handleAssignMaterial}
            onRemoveMaterial={handleRemoveMaterial}
            onClose={() => setShowMaterialModal(false)}
            onRefresh={async () => { if (selectedParty) await loadPartyMaterialsData(selectedParty.id); }}
          />

          <ToastContainer toasts={toasts} removeToast={removeToast} />

          <PartyHistoryModal
            isOpen={showHistoryModal}
            party={historyParty}
            onClose={() => { setShowHistoryModal(false); setHistoryParty(null); }}
          />
        </motion.div>
      </main>
    </div>
  );
}
