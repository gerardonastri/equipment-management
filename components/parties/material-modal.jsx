"use client";

import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

export function MaterialModal({
  isOpen,
  party,
  materials,
  loading,
  macroCategories,
  onAssignMaterial,
  onRemoveMaterial,
  onClose,
}) {
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
        className="bg-card p-6 rounded-xl border border-border max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-foreground">
            Materiale per: {party.nome}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-medium text-foreground mb-4">
                Macro-Categorie Disponibili
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {macroCategories.map((macro) => (
                  <div
                    key={macro.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <span className="font-medium">{macro.name}</span>
                    <button
                      onClick={() => onAssignMaterial(macro.id)}
                      className="btn-primary text-sm px-3 py-1"
                      disabled={materials.some((m) => m.id === macro.id)}
                    >
                      {materials.some((m) => m.id === macro.id)
                        ? "Assegnato"
                        : "Assegna"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-medium text-foreground mb-4">
                Materiale Assegnato
              </h4>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {materials.map((macro) => (
                  <div
                    key={macro.id}
                    className="border border-border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-primary">
                        {macro.name}
                      </h5>
                      <button
                        onClick={() => onRemoveMaterial(macro.id)}
                        className="text-danger hover:bg-red-50 p-1 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {macro.categories?.map((category) => (
                      <div key={category.id} className="ml-4 mb-2">
                        <div className="font-medium text-sm text-foreground">
                          • {category.name}
                        </div>
                        {category.subcategories?.map((sub) => (
                          <div
                            key={sub.id}
                            className="ml-4 text-sm text-muted-foreground"
                          >
                            - {sub.name}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}

                {materials.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    Nessun materiale assegnato
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
