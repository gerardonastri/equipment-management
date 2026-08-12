"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, Package, Send } from "lucide-react";
import { LOSS_TYPES } from "./constants";

export default function LossReportingScreen({
  checkedItemsSnapshot,
  itemDamageState,
  damagedCount,
  isSubmittingLosses,
  onToggleItemDamage,
  onUpdateItemDamageField,
  onSubmitLosses,
}) {
  const groupedByMacro = {};
  checkedItemsSnapshot.forEach((item) => {
    if (!groupedByMacro[item.macroName]) groupedByMacro[item.macroName] = [];
    groupedByMacro[item.macroName].push(item);
  });

  return (
    <div className="min-h-screen bg-surface pb-28">
      <div className="containerMod py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-card p-6 rounded-xl border border-border mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Segnala Problemi
                </h1>
                <p className="text-sm text-muted-foreground">
                  Check completato ✓ — Spunta gli elementi con problemi e
                  specifica il tipo.
                </p>
              </div>
            </div>
            {damagedCount > 0 && (
              <div className="mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
                {damagedCount} element
                {damagedCount === 1 ? "o segnalato" : "i segnalati"}
              </div>
            )}
          </div>

          <div className="space-y-6 mb-6">
            {Object.entries(groupedByMacro).map(([macroName, items]) => (
              <div
                key={macroName}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                <div className="px-4 py-3 bg-surface border-b border-border flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-foreground text-sm">
                    {macroName}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {items.map((item) => {
                    const damageState = itemDamageState[item.inventoryId] || {};
                    const isDamaged = damageState.enabled;

                    return (
                      <div key={item.inventoryId} className="p-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {item.name}
                            </p>
                            {item.categoryName && (
                              <p className="text-xs text-muted-foreground">
                                {item.categoryName}
                              </p>
                            )}
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer shrink-0 select-none">
                            <span
                              className={`text-xs font-semibold ${isDamaged ? "text-red-600" : "text-muted-foreground"}`}
                            >
                              Problema
                            </span>
                            <div
                              onClick={() => onToggleItemDamage(item.inventoryId)}
                              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${isDamaged ? "bg-red-500" : "bg-gray-200"}`}
                            >
                              <div
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isDamaged ? "translate-x-5" : "translate-x-1"}`}
                              />
                            </div>
                          </label>
                        </div>
                        <AnimatePresence>
                          {isDamaged && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-border space-y-3">
                                <div>
                                  <p className="text-xs font-medium text-foreground mb-2">
                                    Tipo problema
                                  </p>
                                  <div className="flex gap-2">
                                    {LOSS_TYPES.map((type) => (
                                      <button
                                        key={type.id}
                                        onClick={() =>
                                          onUpdateItemDamageField(
                                            item.inventoryId,
                                            "tipo",
                                            type.id,
                                          )
                                        }
                                        className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all ${damageState.tipo === type.id ? type.color + " ring-1 ring-offset-1" : "bg-surface border-border text-muted-foreground"}`}
                                      >
                                        {type.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-foreground mb-1">
                                    Valore stimato (€) — opzionale
                                  </p>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="es. 15.00"
                                    value={damageState.valoreStimato || ""}
                                    onChange={(e) =>
                                      onUpdateItemDamageField(
                                        item.inventoryId,
                                        "valoreStimato",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                                  />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-foreground mb-1">
                                    Note — opzionale
                                  </p>
                                  <textarea
                                    rows={2}
                                    placeholder="Descrivi il problema..."
                                    value={damageState.note || ""}
                                    onChange={(e) =>
                                      onUpdateItemDamageField(
                                        item.inventoryId,
                                        "note",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="sticky bottom-4">
            <button
              onClick={onSubmitLosses}
              disabled={isSubmittingLosses}
              className="w-full btn-primary py-4 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-xl"
            >
              {isSubmittingLosses ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvataggio...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>
                    {damagedCount > 0
                      ? `Invia ${damagedCount} segnalazion${damagedCount === 1 ? "e" : "i"}`
                      : "Nessun problema — Conferma"}
                  </span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
