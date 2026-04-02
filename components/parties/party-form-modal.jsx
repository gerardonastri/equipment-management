"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShelfSelector } from "./shelf-selector";
import {
  Star, Package, ChevronDown, ChevronRight, AlertCircle,
  ArrowRight, Trash2, PlusCircle,
} from "lucide-react";

// ─── Mappa stato → check richiesti ────────────────────────────────────────────
const STATO_TO_CHECKS = {
  iniziale:           [],
  caricato_scaffale:  ["Deposito → Scaffale"],
  caricato_furgone:   ["Deposito → Scaffale", "Scaffale → Furgone"],
  scaricato_furgone:  ["Deposito → Scaffale", "Scaffale → Furgone", "Furgone → Scaffale"],
  scaricato_scaffale: ["Deposito → Scaffale", "Scaffale → Furgone", "Furgone → Scaffale", "Scaffale → Deposito"],
};

const STATO_ORDER = [
  "iniziale",
  "caricato_scaffale",
  "caricato_furgone",
  "scaricato_furgone",
  "scaricato_scaffale",
];

function getStatoIndex(stato) {
  return STATO_ORDER.indexOf(stato ?? "iniziale");
}

/**
 * Banner contestuale che avvisa l'admin di cosa succede ai check
 * quando cambia lo stato della festa in modifica.
 */
function CheckSyncWarning({ originalStato, newStato }) {
  if (!originalStato || originalStato === newStato) return null;

  const origIdx = getStatoIndex(originalStato);
  const newIdx  = getStatoIndex(newStato);
  if (origIdx === newIdx) return null;

  const isAdvance  = newIdx > origIdx;
  const checks     = STATO_TO_CHECKS[newStato] ?? [];

  if (isAdvance) {
    const origChecks = STATO_TO_CHECKS[originalStato] ?? [];
    const toCreate   = checks.filter((c) => !origChecks.includes(c));
    if (!toCreate.length) return null;

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="overflow-hidden"
      >
        <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">
          <PlusCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800">
              Verranno creati {toCreate.length} check automatici
            </p>
            <ul className="mt-1 space-y-0.5">
              {toCreate.map((c) => (
                <li key={c} className="text-blue-700 flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 shrink-0" />{c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    );
  }

  // Arretramento
  const origChecks = STATO_TO_CHECKS[originalStato] ?? [];
  const toDelete   = origChecks.filter((c) => !checks.includes(c));
  if (!toDelete.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
        <Trash2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800">
            Verranno eliminati {toDelete.length} check già completati
          </p>
          <ul className="mt-1 space-y-0.5">
            {toDelete.map((c) => (
              <li key={c} className="text-amber-700 flex items-center gap-1.5">
                <ArrowRight className="w-3 h-3 shrink-0" />{c}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-amber-600 text-xs">
            Le segnalazioni (losses) collegate a questi check verranno rimosse.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

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
  isSubmitting = false,
  specialItemHierarchy,
  selectedSingleItems,
  onSingleItemToggle,
}) {
  const [isSpecial, setIsSpecial] = useState(false);
  const [expandedMacro, setExpandedMacro] = useState({});
  const [expandedCat, setExpandedCat] = useState({});
  // Stato originale al momento dell'apertura del modal (per calcolare il diff check)
  const [originalStato, setOriginalStato] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setIsSpecial(false);
      setExpandedMacro({});
      setExpandedCat({});
      setOriginalStato(null);
    } else if (isEdit && party?.stato) {
      // Memorizza lo stato iniziale solo alla prima apertura in modalità edit
      setOriginalStato((prev) => prev ?? party.stato);
    }
  }, [isOpen, isEdit, party?.stato]);

  if (!isOpen) return null;

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

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Nome + Data */}
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

          {/* Luogo */}
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

          {/* Animatore + Magazziniere */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Animatore</label>
              <select
                value={party.animatore_id || ""}
                onChange={(e) => onPartyChange({ ...party, animatore_id: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Seleziona animatore...</option>
                {users.filter((u) => u.ruolo === "animatore" || u.ruolo === "amministratore").map((u) => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Magazziniere</label>
              <select
                value={party.magazziniere_id || ""}
                onChange={(e) => onPartyChange({ ...party, magazziniere_id: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Seleziona magazziniere...</option>
                {users.filter((u) => u.ruolo === "magazziniere" || u.ruolo === "amministratore").map((u) => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stato */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Stato</label>
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

            {/* Avviso dinamico sui check */}
            <AnimatePresence mode="wait">
              {isEdit && originalStato && party.stato !== originalStato && (
                <CheckSyncWarning
                  key={party.stato}
                  originalStato={originalStato}
                  newStato={party.stato}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Note */}
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

          {/* ── Materiale (Macro-Categorie) ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-foreground">Materiale da Assegnare</label>
              <button
                type="button"
                onClick={() => setIsSpecial((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  isSpecial
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-surface border-border text-muted-foreground hover:border-amber-300 hover:text-amber-600"
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${isSpecial ? "fill-white" : ""}`} />
                Festa Speciale
              </button>
            </div>

            <div className="border border-border rounded-xl p-4 max-h-48 overflow-y-auto mb-3">
              {macroCategories.length > 0 ? (
                <div className="space-y-1.5">
                  {macroCategories.map((macro) => {
                    const isSelected      = selectedMaterials.includes(macro.id);
                    const isUsedElsewhere = usedMacroIds?.has(macro.id) && !isSelected;
                    return (
                      <label
                        key={macro.id}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          isUsedElsewhere
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer hover:bg-surface"
                        }`}
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
                          <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full font-semibold">
                            In uso
                          </span>
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
              <p className="text-xs text-muted-foreground mb-3">
                {selectedMaterials.length} macro-categorie selezionate
              </p>
            )}

            {/* ── Sezione Elementi Singoli (Festa Speciale) ── */}
            <AnimatePresence>
              {isSpecial && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
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
                            <button
                              type="button"
                              onClick={() => setExpandedMacro((p) => ({ ...p, [macro.id]: !p[macro.id] }))}
                              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-amber-50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Package className="w-3.5 h-3.5 text-amber-600" />
                                <span className="text-sm font-medium text-foreground">{macro.name}</span>
                              </div>
                              {expandedMacro[macro.id]
                                ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                            </button>

                            <AnimatePresence>
                              {expandedMacro[macro.id] && (
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: "auto" }}
                                  exit={{ height: 0 }}
                                  className="overflow-hidden border-t border-amber-100 px-3 py-2"
                                >
                                  {macro.categories.map((cat) => (
                                    <div key={cat.id} className="mb-1">
                                      <div className="flex items-center gap-2 py-1">
                                        {cat.items.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => setExpandedCat((p) => ({ ...p, [cat.id]: !p[cat.id] }))}
                                            className="text-muted-foreground hover:text-foreground shrink-0"
                                          >
                                            {expandedCat[cat.id]
                                              ? <ChevronDown className="w-3 h-3" />
                                              : <ChevronRight className="w-3 h-3" />}
                                          </button>
                                        )}
                                        <label className={`flex items-center gap-2 flex-1 cursor-pointer ${cat.materiale_mancante ? "opacity-50 cursor-not-allowed" : ""}`}>
                                          <input
                                            type="checkbox"
                                            checked={selectedSingleItems?.includes(cat.id) || false}
                                            onChange={() => !cat.materiale_mancante && onSingleItemToggle?.(cat.id)}
                                            disabled={cat.materiale_mancante}
                                            className="w-3.5 h-3.5 text-amber-500 border-amber-300 rounded focus:ring-amber-400"
                                          />
                                          <span className="text-xs font-medium text-foreground">{cat.name}</span>
                                          {cat.materiale_mancante && (
                                            <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">mancante</span>
                                          )}
                                        </label>
                                      </div>

                                      <AnimatePresence>
                                        {expandedCat[cat.id] && cat.items.length > 0 && (
                                          <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: "auto" }}
                                            exit={{ height: 0 }}
                                            className="overflow-hidden ml-5"
                                          >
                                            {cat.items.map((sub) => (
                                              <label key={sub.id} className={`flex items-center gap-2 py-0.5 cursor-pointer ${sub.materiale_mancante ? "opacity-50 cursor-not-allowed" : ""}`}>
                                                <input
                                                  type="checkbox"
                                                  checked={selectedSingleItems?.includes(sub.id) || false}
                                                  onChange={() => !sub.materiale_mancante && onSingleItemToggle?.(sub.id)}
                                                  disabled={sub.materiale_mancante}
                                                  className="w-3.5 h-3.5 text-amber-500 border-amber-300 rounded focus:ring-amber-400"
                                                />
                                                <span className="text-xs text-muted-foreground">{sub.name}</span>
                                                {sub.materiale_mancante && (
                                                  <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">mancante</span>
                                                )}
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

          {/* Scaffali */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Scaffali</label>
            <ShelfSelector
              allParties={allParties}
              currentPartyId={party.id}
              selectedShelves={party.shelves}
              onAddShelf={onAddShelf}
              onRemoveShelf={onRemoveShelf}
            />
          </div>

          {/* Azioni */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-surface transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-primary disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{isEdit ? "Salvataggio..." : "Creazione..."}</>
              ) : isEdit ? "Salva Modifiche" : "Crea Festa"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}