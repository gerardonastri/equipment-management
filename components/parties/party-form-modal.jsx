"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShelfSelector } from "./shelf-selector";
import {
  Star, Package, ChevronDown, ChevronRight, AlertCircle,
  X, UserPlus, Users, ArrowRightLeft, Info, Loader2, AlertTriangle, RefreshCw, Car, UserCheck
} from "lucide-react";
import { syncAnimatoriForParty } from "@/app/admin/parties/actions";

export function PartyFormModal({
  isOpen,
  isEdit,
  party,
  onPartyChange,
  users,
  macroCategories,
  selectedMaterials,
  onMaterialToggle,
  onAddShelf,
  onRemoveShelf,
  onSubmit,
  onCancel,
  allParties,
  usedMacroIds,
  isLoadingMacros = false,
  isSubmitting = false,
  specialItemHierarchy,
  selectedSingleItems,
  onSingleItemToggle,
}) {
  const [isSpecial, setIsSpecial] = useState(false);
  const [expandedMacro, setExpandedMacro] = useState({});
  const [expandedCat, setExpandedCat] = useState({});
  const [showStaffAlert, setShowStaffAlert] = useState(false);
  const [isSyncingAnimatori, setIsSyncingAnimatori] = useState(false);
  const [syncInfo, setSyncInfo] = useState(null);
  const [handoffPartiesFor3Days, setHandoffPartiesFor3Days] = useState([]);

  useEffect(() => {
    if (!isOpen) {
      setIsSpecial(false);
      setExpandedMacro({});
      setExpandedCat({});
      setShowStaffAlert(false);
      setSyncInfo(null);
      setHandoffPartiesFor3Days([]);
    } else if (party?.data) {
      loadHandoffPartiesFor3Days(party.data);
    }
  }, [isOpen, party?.data]);

  if (!isOpen) return null;

  const handleSyncAnimatori = async () => {
    if (!party.id) return;
    setIsSyncingAnimatori(true);
    setSyncInfo(null);
    try {
      const result = await syncAnimatoriForParty(party.id);
      if (result.error) {
        setSyncInfo({ error: result.error });
        return;
      }
      if (result.added > 0) {
        onPartyChange({ ...party, animatori_ids: result.animatori_ids });
      }
      setSyncInfo({ added: result.added, unmatched: result.unmatched });
    } catch {
      setSyncInfo({ error: "Errore durante la sincronizzazione." });
    } finally {
      setIsSyncingAnimatori(false);
    }
  };

  const loadHandoffPartiesFor3Days = (baseDate) => {
    try {
      const dateObj = new Date(baseDate + "T00:00:00");
      const dates = [
        baseDate,
        new Date(dateObj.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        new Date(dateObj.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      ];
      
      const partiesFor3Days = allParties.filter(
        (p) => dates.includes(p.data) && p.id !== party.id && p.stato !== "scaricato_scaffale"
      );
      
      setHandoffPartiesFor3Days(partiesFor3Days);
    } catch (err) {
      console.error("Error loading handoff parties for 3 days:", err);
      setHandoffPartiesFor3Days([]);
    }
  };

  const responsabiliList = users;
  const animatoriList    = users;
  const driversList      = users;
  const magazzinieriList = users;

  const responsabiliIds = Array.isArray(party.responsabili_ids) ? party.responsabili_ids : [];
  const selectedResponsabili = responsabiliIds.map((id) => users.find((u) => u.id === id)).filter(Boolean);
  const availableResponsabili = responsabiliList.filter((u) => !responsabiliIds.includes(u.id));

  const addResponsabile = (id) => {
    if (id && !responsabiliIds.includes(id)) onPartyChange({ ...party, responsabili_ids: [...responsabiliIds, id] });
  };
  const removeResponsabile = (id) => {
    onPartyChange({ ...party, responsabili_ids: responsabiliIds.filter((rid) => rid !== id) });
  };

  const animatoriIds = Array.isArray(party.animatori_ids) ? party.animatori_ids : [];
  const selectedAnimatori = animatoriIds.map((id) => users.find((u) => u.id === id)).filter(Boolean);
  const availableAnimatori = animatoriList.filter((u) => !animatoriIds.includes(u.id));

  const addAnimatore = (id) => {
    if (id && !animatoriIds.includes(id)) onPartyChange({ ...party, animatori_ids: [...animatoriIds, id] });
  };
  const removeAnimatore = (id) => {
    onPartyChange({ ...party, animatori_ids: animatoriIds.filter((aid) => aid !== id) });
  };

  const driversIds = Array.isArray(party.drivers_ids) ? party.drivers_ids : [];
  const selectedDrivers = driversIds.map((id) => users.find((u) => u.id === id)).filter(Boolean);
  const availableDrivers = driversList.filter((u) => !driversIds.includes(u.id));

  const addDriver = (id) => {
    if (id && !driversIds.includes(id)) onPartyChange({ ...party, drivers_ids: [...driversIds, id] });
  };
  const removeDriver = (id) => {
    onPartyChange({ ...party, drivers_ids: driversIds.filter((did) => did !== id) });
  };

  const missingResponsabile = responsabiliIds.length === 0;
  const missingMagazziniere = !party.magazziniere_id;

  const handoffEnabled = !!(party.handoff_to_party_id);
  const handoffMacroIds = Array.isArray(party.handoff_macro_ids) ? party.handoff_macro_ids : [];
  const handoffCandidates = handoffPartiesFor3Days;

  const toggleHandoffMacro = (macroId) => {
    const next = handoffMacroIds.includes(macroId)
      ? handoffMacroIds.filter((id) => id !== macroId)
      : [...handoffMacroIds, macroId];
    onPartyChange({ ...party, handoff_macro_ids: next });
  };

  const handoffableMacros = macroCategories.filter((m) => selectedMaterials.includes(m.id));

  const handleSubmitWithAlert = (e) => {
    if (missingResponsabile || missingMagazziniere) {
      e.preventDefault();
      setShowStaffAlert(true);
      setTimeout(() => {
        document.getElementById("staff-alert-banner")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
    onSubmit(e);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card p-6 rounded-xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <h3 className="text-xl font-semibold text-foreground mb-4">
          {isEdit ? "Modifica Festa" : "Crea Nuova Festa"}
        </h3>

        <form onSubmit={handleSubmitWithAlert} className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Nome Festa</label>
              <input
                type="text"
                value={party.nome}
                onChange={(e) => onPartyChange({ ...party, nome: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Data</label>
              <input
                type="date"
                value={party.data}
                onChange={(e) => onPartyChange({ ...party, data: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Luogo</label>
            <input
              type="text"
              value={party.luogo}
              onChange={(e) => onPartyChange({ ...party, luogo: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
            <label className="block text-sm font-medium text-indigo-900 mb-2">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600" /> Responsabili evento
                {missingResponsabile && (
                  <span className="text-xs text-amber-600 font-normal ml-1">(nessuno assegnato)</span>
                )}
              </span>
            </label>

            {selectedResponsabili.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedResponsabili.map((u) => (
                  <span key={u.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                    {u.nome}
                    <button type="button" onClick={() => removeResponsabile(u.id)} className="hover:text-indigo-900 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <select
                value=""
                onChange={(e) => { if (e.target.value) { addResponsabile(e.target.value); e.target.value = ""; } }}
                className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm ${
                  showStaffAlert && missingResponsabile ? "border-amber-400 bg-amber-50" : "border-indigo-200 bg-white"
                }`}
              >
                <option value="">
                  {availableResponsabili.length === 0
                    ? "Tutti i responsabili assegnati"
                    : responsabiliIds.length === 0 ? "Aggiungi responsabile..." : "Aggiungi un altro responsabile..."}
                </option>
                {availableResponsabili.map((u) => (
                  <option key={u.id} value={u.id}>{u.nome} ({u.ruolo})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 bg-surface border border-border rounded-lg">
            <label className="block text-sm font-medium text-foreground mb-2">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" /> Animatori
              </span>
            </label>

            {selectedAnimatori.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedAnimatori.map((u) => (
                  <span key={u.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    {u.nome}
                    <button type="button" onClick={() => removeAnimatore(u.id)} className="hover:text-primary/60 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <select
              value=""
              onChange={(e) => { if (e.target.value) { addAnimatore(e.target.value); e.target.value = ""; } }}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            >
              <option value="">
                {availableAnimatori.length === 0
                  ? "Tutti gli animatori assegnati"
                  : animatoriIds.length === 0 ? "Aggiungi animatore..." : "Aggiungi un altro animatore..."}
              </option>
              {availableAnimatori.map((u) => (
                <option key={u.id} value={u.id}>{u.nome} ({u.ruolo})</option>
              ))}
            </select>

            {party.id && party.external_id && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={handleSyncAnimatori}
                  disabled={isSyncingAnimatori}
                  className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  {isSyncingAnimatori
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sincronizzando dal gestionale...</>
                    : <><RefreshCw className="w-3.5 h-3.5" />Sincronizza animatori dal gestionale</>
                  }
                </button>
                <AnimatePresence>
                  {syncInfo && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-1.5">
                      {syncInfo.error ? (
                        <p className="text-xs text-red-600">{syncInfo.error}</p>
                      ) : (
                        <div className="text-xs space-y-0.5">
                          {syncInfo.added > 0
                            ? <p className="text-green-600 font-medium">✓ {syncInfo.added} animator{syncInfo.added === 1 ? "e aggiunto" : "i aggiunti"} dal gestionale</p>
                            : <p className="text-muted-foreground">Nessun nuovo animatore da aggiungere</p>
                          }
                          {syncInfo.unmatched?.length > 0 && (
                            <p className="text-amber-600">⚠ Non trovati nel DB: {syncInfo.unmatched.join(", ")}</p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50/50 border border-slate-200 rounded-lg">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <span className="flex items-center gap-1.5">
                <Car className="w-4 h-4 text-slate-500" /> Driver (Autisti)
              </span>
            </label>

            {selectedDrivers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedDrivers.map((u) => (
                  <span key={u.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm font-medium">
                    {u.nome}
                    <button type="button" onClick={() => removeDriver(u.id)} className="hover:text-slate-900 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <select
              value=""
              onChange={(e) => { if (e.target.value) { addDriver(e.target.value); e.target.value = ""; } }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm bg-white"
            >
              <option value="">
                {availableDrivers.length === 0
                  ? "Tutti i driver assegnati"
                  : driversIds.length === 0 ? "Aggiungi driver..." : "Aggiungi un altro driver..."}
              </option>
              {availableDrivers.map((u) => (
                <option key={u.id} value={u.id}>{u.nome} ({u.ruolo})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Magazziniere
              {missingMagazziniere && (
                <span className="text-xs text-amber-600 font-normal ml-1">(non assegnato)</span>
              )}
            </label>
            <select
              value={party.magazziniere_id || ""}
              onChange={(e) => onPartyChange({ ...party, magazziniere_id: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${
                showStaffAlert && missingMagazziniere ? "border-amber-400 bg-amber-50" : "border-input"
              }`}
            >
              <option value="">Seleziona magazziniere...</option>
              {magazzinieriList.map((u) => (
                <option key={u.id} value={u.id}>{u.nome} ({u.ruolo})</option>
              ))}
            </select>
          </div>

          <AnimatePresence>
            {showStaffAlert && (missingResponsabile || missingMagazziniere) && (
              <motion.div
                id="staff-alert-banner"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-800">Staff non completo</p>
                      <ul className="text-xs text-amber-700 mt-1 space-y-0.5">
                        {missingResponsabile && <li>• Nessun <strong>responsabile</strong> assegnato (necessario per firmare i check e il passaggio)</li>}
                        {missingMagazziniere && <li>• Nessun magazziniere assegnato</li>}
                      </ul>
                      <p className="text-xs text-amber-600 mt-2">
                        Puoi comunque salvare e aggiungere lo staff in seguito.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setShowStaffAlert(false)}
                      className="flex-1 py-2 px-3 rounded-lg border border-amber-300 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
                    >
                      Torna al form
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowStaffAlert(false); onSubmit({ preventDefault: () => {} }); }}
                      className="flex-1 py-2 px-3 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors"
                    >
                      Salva comunque
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Stato</label>
            <select
              value={party.stato}
              onChange={(e) => onPartyChange({ ...party, stato: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="iniziale">Iniziale</option>
              <option value="caricato_scaffale">Caricato sullo Scaffale</option>
              <option value="caricato_furgone">Caricato nel Furgone</option>
              <option value="scaricato_furgone">Scaricato dal Furgone</option>
              <option value="scaricato_scaffale">Scaricato dallo Scaffale (completato)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Note</label>
            <textarea
              value={party.note || ""}
              onChange={(e) => onPartyChange({ ...party, note: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              rows="3"
              placeholder="Note aggiuntive..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-foreground flex items-center gap-2">
                Materiale da Assegnare
                {isLoadingMacros && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-normal text-primary">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Calcolo disponibilità...
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={() => setIsSpecial((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  isSpecial ? "bg-amber-500 text-white border-amber-500" : "bg-surface border-border text-muted-foreground hover:border-amber-300 hover:text-amber-600"
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${isSpecial ? "fill-white" : ""}`} />
                Festa Speciale
              </button>
            </div>

            <div className={`border border-border rounded-xl p-4 max-h-48 overflow-y-auto mb-3 relative transition-opacity ${isLoadingMacros ? "opacity-50 pointer-events-none" : ""}`}>
              {macroCategories.length > 0 ? (
                <div className="space-y-1.5">
                  {macroCategories.map((macro) => {
                    const isSelected      = selectedMaterials.includes(macro.id);
                    const isUsedElsewhere = usedMacroIds?.has(macro.id) && !isSelected;
                    return (
                      <label
                        key={macro.id}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isUsedElsewhere ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-surface"}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => !isUsedElsewhere && onMaterialToggle(macro.id)}
                          disabled={isUsedElsewhere}
                          className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-ring"
                        />
                        <span className="text-sm font-medium text-foreground flex-1">{macro.name}</span>
                        {isUsedElsewhere && (
                          <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full font-semibold">In uso oggi</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nessuna macro-categoria disponibile.</p>
              )}
            </div>

            {selectedMaterials.length > 0 && (
              <p className="text-xs text-muted-foreground mb-3">{selectedMaterials.length} macro-categorie selezionate</p>
            )}

            <AnimatePresence>
              {isSpecial && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="border border-amber-200 rounded-xl bg-amber-50/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                      <span className="text-sm font-semibold text-amber-800">Elementi Singoli Aggiuntivi</span>
                      <span className="text-xs text-amber-600 ml-auto">da macro non assegnate</span>
                    </div>
                    {!specialItemHierarchy?.length ? (
                      <div className="text-center py-6 text-amber-700/60">
                        <AlertCircle className="w-6 h-6 mx-auto mb-1 opacity-50" />
                        <p className="text-xs">Seleziona prima le macro — gli elementi disponibili sono quelli delle macro rimanenti.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {specialItemHierarchy.map((macro) => (
                          <div key={macro.id} className="bg-card rounded-lg border border-amber-200 overflow-hidden">
                            <button type="button" onClick={() => setExpandedMacro((p) => ({ ...p, [macro.id]: !p[macro.id] }))} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-amber-50 transition-colors">
                              <div className="flex items-center gap-2">
                                <Package className="w-3.5 h-3.5 text-amber-600" />
                                <span className="text-sm font-medium text-foreground">{macro.name}</span>
                              </div>
                              {expandedMacro[macro.id] ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                            </button>
                            <AnimatePresence>
                              {expandedMacro[macro.id] && (
                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-amber-100 px-3 py-2">
                                  {macro.categories.map((cat) => (
                                    <div key={cat.id} className="mb-1">
                                      <div className="flex items-center gap-2 py-1">
                                        {cat.items.length > 0 && (
                                          <button type="button" onClick={() => setExpandedCat((p) => ({ ...p, [cat.id]: !p[cat.id] }))} className="text-muted-foreground hover:text-foreground shrink-0">
                                            {expandedCat[cat.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                          </button>
                                        )}
                                        <label className={`flex items-center gap-2 flex-1 cursor-pointer ${cat.materiale_mancante ? "opacity-50 cursor-not-allowed" : ""}`}>
                                          <input type="checkbox" checked={selectedSingleItems?.includes(cat.id) || false} onChange={() => !cat.materiale_mancante && onSingleItemToggle?.(cat.id)} disabled={cat.materiale_mancante} className="w-3.5 h-3.5 text-amber-500 border-amber-300 rounded focus:ring-amber-400" />
                                          <span className="text-xs font-medium text-foreground">{cat.name}</span>
                                          {cat.materiale_mancante && <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">mancante</span>}
                                        </label>
                                      </div>
                                      <AnimatePresence>
                                        {expandedCat[cat.id] && cat.items.length > 0 && (
                                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden ml-5">
                                            {cat.items.map((sub) => (
                                              <label key={sub.id} className={`flex items-center gap-2 py-0.5 cursor-pointer ${sub.materiale_mancante ? "opacity-50 cursor-not-allowed" : ""}`}>
                                                <input type="checkbox" checked={selectedSingleItems?.includes(sub.id) || false} onChange={() => !sub.materiale_mancante && onSingleItemToggle?.(sub.id)} disabled={sub.materiale_mancante} className="w-3.5 h-3.5 text-amber-500 border-amber-300 rounded focus:ring-amber-400" />
                                                <span className="text-xs text-muted-foreground">{sub.name}</span>
                                                {sub.materiale_mancante && <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">mancante</span>}
                                              </label>
                                            ))}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    )}
                    {(selectedSingleItems?.length || 0) > 0 && (
                      <p className="text-xs text-amber-700 font-medium mt-2">
                        {selectedSingleItems.length} element{selectedSingleItems.length === 1 ? "o" : "i"} singol{selectedSingleItems.length === 1 ? "o" : "i"} selezionat{selectedSingleItems.length === 1 ? "o" : "i"}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => onPartyChange({
                ...party,
                handoff_to_party_id: handoffEnabled ? null : null,
                _handoffOpen: !handoffEnabled,
              })}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${(handoffEnabled || party._handoffOpen) ? "bg-violet-50 border-b border-violet-100" : "bg-surface hover:bg-muted/40"}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${(handoffEnabled || party._handoffOpen) ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground"}`}>
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left">
                <p className={`text-sm font-semibold ${(handoffEnabled || party._handoffOpen) ? "text-violet-800" : "text-foreground"}`}>
                  Passaggio Materiale a un'altra Festa
                </p>
                <p className="text-xs text-muted-foreground">
                  Il magazziniere salta il controllo finale/iniziale — il responsabile gestisce il passaggio.
                </p>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${(handoffEnabled || party._handoffOpen) ? "bg-violet-500" : "bg-gray-200"}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${(handoffEnabled || party._handoffOpen) ? "translate-x-6" : "translate-x-1"}`} />
              </div>
            </button>

            <AnimatePresence>
              {(handoffEnabled || party._handoffOpen) && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="p-4 space-y-4 bg-violet-50/30">

                    <div>
                      <label className="block text-xs font-semibold text-violet-800 mb-1.5 uppercase tracking-wide">
                        Festa destinazione *
                      </label>
                      {handoffCandidates.length === 0 ? (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-700">
                            Nessuna altra festa attiva trovata per questa data. Crea prima l'altra festa, poi torna qui.
                          </p>
                        </div>
                      ) : (
                        <select
                          value={party.handoff_to_party_id || ""}
                          onChange={(e) => onPartyChange({ ...party, handoff_to_party_id: e.target.value || null, _handoffOpen: true })}
                          className="w-full px-3 py-2 border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm bg-white"
                        >
                          <option value="">Seleziona la festa che riceve il materiale...</option>
                          {handoffCandidates.map((p) => (
                            <option key={p.id} value={p.id}>{p.nome} — {p.luogo}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {handoffableMacros.length > 0 ? (
                      <div>
                        <label className="block text-xs font-semibold text-violet-800 mb-1 uppercase tracking-wide">
                          Quale materiale passa alla festa successiva?
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Il materiale NON selezionato torna normalmente al magazzino con il check standard.
                        </p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {handoffableMacros.map((macro) => (
                            <label key={macro.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-violet-100 cursor-pointer hover:border-violet-300 transition-colors">
                              <input
                                type="checkbox"
                                checked={handoffMacroIds.includes(macro.id)}
                                onChange={() => toggleHandoffMacro(macro.id)}
                                className="w-4 h-4 text-violet-500 border-violet-300 rounded focus:ring-violet-400"
                              />
                              <Package className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                              <span className="text-sm font-medium text-foreground flex-1">{macro.name}</span>
                              {handoffMacroIds.includes(macro.id) && (
                                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold">✈ Passa</span>
                              )}
                            </label>
                          ))}
                        </div>
                        {handoffMacroIds.length > 0 && (
                          <p className="text-xs text-violet-600 font-medium mt-2">
                            {handoffMacroIds.length} macro{handoffMacroIds.length > 1 ? " passano" : " passa"} direttamente — scaffale B: {allParties.find((p) => p.id === party.handoff_to_party_id)?.shelves || "da definire"}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">
                          Assegna prima il materiale alla festa per scegliere cosa passa alla festa successiva.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Scaffali</label>
            <ShelfSelector
              allParties={allParties}
              currentPartyId={party.id}
              currentPartyDate={party.data}
              selectedShelves={party.shelves}
              onAddShelf={onAddShelf}
              onRemoveShelf={onRemoveShelf}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-surface transition-colors">
              Annulla
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSubmitting
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{isEdit ? "Salvataggio..." : "Creazione..."}</>
                : isEdit ? "Salva Modifiche" : "Crea Festa"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}