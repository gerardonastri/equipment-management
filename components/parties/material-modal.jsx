"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Star, ChevronDown, ChevronRight, Package, AlertCircle, Plus, Check, Loader2, Search, X } from "lucide-react";
import {
  getAvailableItemsForSpecialParty,
  assignSingleItem,
  removeSingleItem,
} from "@/app/admin/parties/actions";

export function MaterialModal({
  isOpen,
  party,
  materials,
  loading,
  macroCategories,
  usedMacroIds,          // Set<string> — macro già usate in altre feste attive
  onAssignMaterial,
  onRemoveMaterial,
  onClose,
  onRefresh,             // callback per ricaricare i materiali dopo operazioni singole
}) {
  const [isSpecial, setIsSpecial] = useState(false);
  const [specialItems, setSpecialItems] = useState([]);     // gerarchia macro→cat→sotto disponibili
  const [loadingSpecial, setLoadingSpecial] = useState(false);
  const [expandedMacro, setExpandedMacro] = useState({});   // { [macroId]: bool }
  const [expandedCat, setExpandedCat] = useState({});       // { [catId]: bool }
  const [assigningId, setAssigningId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  // Ricerca materiale (macro-categorie disponibili + aggiunte speciali)
  const [searchQuery, setSearchQuery] = useState("");
  const [specialSearchQuery, setSpecialSearchQuery] = useState("");

  // ID elementi singoli già assegnati alla festa (cat/sotto nella party_inventory)
  const assignedSingleIds = new Set(
    materials
      .flatMap((m) => m._singleItems || [])
      .map((i) => i.id)
  );

  useEffect(() => {
    if (!isOpen) {
      setIsSpecial(false);
      setSpecialItems([]);
      setExpandedMacro({});
      setExpandedCat({});
      setSearchQuery("");
      setSpecialSearchQuery("");
    }
  }, [isOpen]);

  // Normalizza una stringa per il confronto (case/accenti-insensitive)
  const normalize = (s) =>
    (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  // Macro-categorie disponibili filtrate per la ricerca
  const filteredMacroCategories = macroCategories.filter((macro) =>
    normalize(macro.name).includes(normalize(searchQuery))
  );

  // Aggiunte speciali filtrate: mostra la macro se il nome macro, di una categoria
  // o di un sotto-elemento combacia con la ricerca (mantenendo la gerarchia intera)
  const filteredSpecialItems = specialItems
    .map((macro) => {
      const q = normalize(specialSearchQuery);
      if (!q) return macro;

      const macroMatches = normalize(macro.name).includes(q);
      if (macroMatches) return macro;

      const filteredCategories = macro.categories
        .map((cat) => {
          const catMatches = normalize(cat.name).includes(q);
          const matchingItems = cat.items.filter((sub) => normalize(sub.name).includes(q));
          if (catMatches) return cat;
          if (matchingItems.length > 0) return { ...cat, items: matchingItems };
          return null;
        })
        .filter(Boolean);

      if (filteredCategories.length === 0) return null;
      return { ...macro, categories: filteredCategories };
    })
    .filter(Boolean);

  const loadSpecialItems = async () => {
    if (!party?.id) return;
    setLoadingSpecial(true);
    try {
      const items = await getAvailableItemsForSpecialParty(party.id);
      setSpecialItems(items);
    } catch (err) {
      console.error("[v0] Error loading special items:", err);
    } finally {
      setLoadingSpecial(false);
    }
  };

  const handleToggleSpecial = () => {
    const next = !isSpecial;
    setIsSpecial(next);
    if (next && specialItems.length === 0) loadSpecialItems();
  };

  const handleAssignSingle = async (itemId) => {
    if (!party?.id) return;
    setAssigningId(itemId);
    try {
      await assignSingleItem(party.id, itemId);
      onRefresh?.();
      // Ricarica anche la lista speciale per aggiornare lo stato
      await loadSpecialItems();
    } catch (err) {
      console.error("[v0] Error assigning single item:", err);
      alert("Errore nell'assegnazione dell'elemento");
    } finally {
      setAssigningId(null);
    }
  };

  const handleRemoveSingle = async (itemId) => {
    if (!party?.id) return;
    setRemovingId(itemId);
    try {
      await removeSingleItem(party.id, itemId);
      onRefresh?.();
    } catch (err) {
      console.error("[v0] Error removing single item:", err);
      alert("Errore nella rimozione dell'elemento");
    } finally {
      setRemovingId(null);
    }
  };

  if (!isOpen || !party) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-xl border border-border max-w-5xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              Materiale per: <span className="text-primary">{party.nome}</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gestisci macro-categorie e aggiunte speciali
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle Festa Speciale */}
            <button
              onClick={handleToggleSpecial}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                isSpecial
                  ? "bg-amber-500 text-white border-amber-500 shadow-md"
                  : "bg-surface border-border text-muted-foreground hover:border-amber-300 hover:text-amber-600"
              }`}
            >
              <Star className={`w-4 h-4 ${isSpecial ? "fill-white" : ""}`} />
              Festa Speciale
            </button>
            <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="p-6 space-y-6">

            {/* ── Sezione Macro-Categorie ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Colonna sinistra: disponibili */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                  Macro-Categorie Disponibili
                </h4>
                {/* Barra di ricerca materiale */}
                <div className="relative mb-3">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cerca materiale..."
                    className="w-full pl-9 pr-8 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {filteredMacroCategories.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <AlertCircle className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                      <p className="text-xs">Nessun materiale trovato per "{searchQuery}"</p>
                    </div>
                  )}
                  {filteredMacroCategories.map((macro) => {
                    const isAssigned = materials.some((m) => m.id === macro.id && m._isMacro);
                    const isUsedElsewhere = usedMacroIds?.has(macro.id) && !isAssigned;

                    return (
                      <div
                        key={macro.id}
                        className={`flex items-center justify-between p-3 border rounded-xl transition-all ${
                          isUsedElsewhere
                            ? "border-border bg-surface/50 opacity-60"
                            : isAssigned
                            ? "border-green-200 bg-green-50"
                            : "border-border bg-surface hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm truncate">{macro.name}</span>
                          {isUsedElsewhere && (
                            <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                              In uso
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => !isAssigned && !isUsedElsewhere && onAssignMaterial(macro.id)}
                          disabled={isAssigned || isUsedElsewhere}
                          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                            isAssigned
                              ? "bg-green-100 text-green-700 border-green-200 cursor-default"
                              : isUsedElsewhere
                              ? "bg-surface text-muted-foreground border-border cursor-not-allowed"
                              : "btn-primary"
                          }`}
                        >
                          {isAssigned ? "✓ Assegnato" : isUsedElsewhere ? "Non disponibile" : "Assegna"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Colonna destra: assegnato */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                  Materiale Assegnato
                </h4>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {materials.filter((m) => m._isMacro).map((macro) => (
                    <div key={macro.id} className="border border-border rounded-xl p-4 bg-surface">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-primary flex items-center gap-1.5">
                          <Package className="w-4 h-4" />
                          {macro.name}
                        </h5>
                        <button
                          onClick={() => onRemoveMaterial(macro.id)}
                          className="text-muted-foreground hover:text-danger hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                          title="Rimuovi macro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {macro.categories?.map((cat) => (
                        <div key={cat.id} className="ml-3 mb-1">
                          <div className="text-sm text-foreground font-medium">• {cat.name}</div>
                          {cat.subcategories?.map((sub) => (
                            <div key={sub.id} className="ml-4 text-xs text-muted-foreground">– {sub.name}</div>
                          ))}
                        </div>
                      ))}
                      {/* Elementi singoli extra sotto questa macro */}
                      {macro._singleItems?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <p className="text-xs text-amber-700 font-semibold mb-1 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Extra speciali
                          </p>
                          {macro._singleItems.map((si) => (
                            <div key={si.id} className="flex items-center justify-between ml-2 py-0.5">
                              <span className="text-xs text-muted-foreground">◦ {si.name} <span className="opacity-50">({si.type})</span></span>
                              <button
                                onClick={() => handleRemoveSingle(si.id)}
                                disabled={removingId === si.id}
                                className="p-1 text-muted-foreground hover:text-danger rounded transition-colors"
                              >
                                {removingId === si.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Macro padre con solo elementi singoli (no macro completa) */}
                  {materials.filter((m) => !m._isMacro && m._singleItems?.length).map((macro) => (
                    <div key={macro.id} className="border border-amber-200 rounded-xl p-4 bg-amber-50">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                        <h5 className="font-semibold text-amber-800 text-sm">{macro.name} <span className="font-normal opacity-70">(elementi speciali)</span></h5>
                      </div>
                      {macro._singleItems?.map((si) => (
                        <div key={si.id} className="flex items-center justify-between ml-2 py-0.5">
                          <span className="text-xs text-amber-700">◦ {si.name} <span className="opacity-50">({si.type})</span></span>
                          <button
                            onClick={() => handleRemoveSingle(si.id)}
                            disabled={removingId === si.id}
                            className="p-1 text-amber-700 hover:text-danger rounded transition-colors"
                          >
                            {removingId === si.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}

                  {materials.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nessun materiale assegnato</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Sezione Festa Speciale ── */}
            <AnimatePresence>
              {isSpecial && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border border-amber-200 rounded-xl bg-amber-50/50 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                      <h4 className="font-semibold text-amber-800">Aggiunte Speciali</h4>
                      <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                        Elementi singoli da macro non assegnate
                      </span>
                    </div>

                    {!loadingSpecial && specialItems.length > 0 && (
                      <div className="relative mb-3">
                        <Search className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={specialSearchQuery}
                          onChange={(e) => setSpecialSearchQuery(e.target.value)}
                          placeholder="Cerca tra le aggiunte speciali..."
                          className="w-full pl-9 pr-8 py-2 border border-amber-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                        />
                        {specialSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setSpecialSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-700"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    {loadingSpecial ? (
                      <div className="flex items-center justify-center py-8 gap-2 text-amber-700">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Caricamento elementi disponibili...</span>
                      </div>
                    ) : specialItems.length === 0 ? (
                      <div className="text-center py-8 text-amber-700/70">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nessun elemento disponibile — tutte le macro sono già assegnate.</p>
                      </div>
                    ) : filteredSpecialItems.length === 0 ? (
                      <div className="text-center py-8 text-amber-700/70">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nessun elemento trovato per "{specialSearchQuery}".</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {filteredSpecialItems.map((macro) => (
                          <div key={macro.id} className="bg-card rounded-xl border border-amber-200 overflow-hidden">
                            {/* Header macro */}
                            <button
                              onClick={() => setExpandedMacro((p) => ({ ...p, [macro.id]: !p[macro.id] }))}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-amber-600" />
                                <span className="font-semibold text-sm text-foreground">{macro.name}</span>
                                <span className="text-xs text-muted-foreground">({macro.categories.length} categorie)</span>
                              </div>
                              {expandedMacro[macro.id]
                                ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              }
                            </button>

                            {/* Categorie e sotto */}
                            <AnimatePresence>
                              {expandedMacro[macro.id] && (
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: "auto" }}
                                  exit={{ height: 0 }}
                                  className="overflow-hidden border-t border-amber-100"
                                >
                                  {macro.categories.map((cat) => (
                                    <div key={cat.id} className="px-4 py-2">
                                      {/* Riga categoria */}
                                      <div className="flex items-center justify-between py-1.5">
                                        <div className="flex items-center gap-2">
                                          {cat.items.length > 0 && (
                                            <button
                                              onClick={() => setExpandedCat((p) => ({ ...p, [cat.id]: !p[cat.id] }))}
                                              className="text-muted-foreground hover:text-foreground"
                                            >
                                              {expandedCat[cat.id]
                                                ? <ChevronDown className="w-3.5 h-3.5" />
                                                : <ChevronRight className="w-3.5 h-3.5" />
                                              }
                                            </button>
                                          )}
                                          <span className={`text-sm font-medium ${cat.materiale_mancante ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                            {cat.name}
                                          </span>
                                          {cat.materiale_mancante && (
                                            <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full">Mancante</span>
                                          )}
                                        </div>
                                        {/* Bottone assegna categoria */}
                                        {!cat.materiale_mancante && (
                                          <button
                                            onClick={() => handleAssignSingle(cat.id)}
                                            disabled={assigningId === cat.id || assignedSingleIds.has(cat.id)}
                                            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                                              assignedSingleIds.has(cat.id)
                                                ? "bg-green-100 text-green-700 border-green-200 cursor-default"
                                                : "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200"
                                            } disabled:opacity-50`}
                                          >
                                            {assigningId === cat.id
                                              ? <Loader2 className="w-3 h-3 animate-spin" />
                                              : assignedSingleIds.has(cat.id)
                                              ? <><Check className="w-3 h-3" /> Aggiunto</>
                                              : <><Plus className="w-3 h-3" /> Aggiungi</>
                                            }
                                          </button>
                                        )}
                                      </div>

                                      {/* Sotto-elementi */}
                                      <AnimatePresence>
                                        {expandedCat[cat.id] && cat.items.length > 0 && (
                                          <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: "auto" }}
                                            exit={{ height: 0 }}
                                            className="overflow-hidden ml-5"
                                          >
                                            {cat.items.map((sub) => (
                                              <div key={sub.id} className="flex items-center justify-between py-1">
                                                <span className={`text-xs ${sub.materiale_mancante ? "text-muted-foreground line-through" : "text-muted-foreground"}`}>
                                                  – {sub.name}
                                                  {sub.materiale_mancante && (
                                                    <span className="ml-1 bg-orange-100 text-orange-600 px-1 rounded text-xs">mancante</span>
                                                  )}
                                                </span>
                                                {!sub.materiale_mancante && (
                                                  <button
                                                    onClick={() => handleAssignSingle(sub.id)}
                                                    disabled={assigningId === sub.id || assignedSingleIds.has(sub.id)}
                                                    className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg border transition-all ${
                                                      assignedSingleIds.has(sub.id)
                                                        ? "bg-green-100 text-green-700 border-green-200 cursor-default"
                                                        : "bg-surface text-muted-foreground border-border hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                                                    } disabled:opacity-50`}
                                                  >
                                                    {assigningId === sub.id
                                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                                      : assignedSingleIds.has(sub.id)
                                                      ? <><Check className="w-3 h-3" /> Aggiunto</>
                                                      : <><Plus className="w-3 h-3" /> Aggiungi</>
                                                    }
                                                  </button>
                                                )}
                                              </div>
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}
      </motion.div>
    </motion.div>
  );
}