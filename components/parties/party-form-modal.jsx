"use client";

import { motion } from "framer-motion";
import { ShelfSelector } from "./shelf-selector";

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
}) {
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nome Festa
              </label>
              <input
                type="text"
                value={party.nome}
                onChange={(e) =>
                  onPartyChange({ ...party, nome: e.target.value })
                }
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Data
              </label>
              <input
                type="date"
                value={party.data}
                onChange={(e) =>
                  onPartyChange({ ...party, data: e.target.value })
                }
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Luogo
            </label>
            <input
              type="text"
              value={party.luogo}
              onChange={(e) =>
                onPartyChange({ ...party, luogo: e.target.value })
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Animatore
              </label>
              <select
                value={party.animatore_id || ""}
                onChange={(e) =>
                  onPartyChange({ ...party, animatore_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Seleziona animatore...</option>
                {users
                  .filter(
                    (user) =>
                      user.ruolo === "animatore" ||
                      user.ruolo === "amministratore"
                  )
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.nome}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Magazziniere
              </label>
              <select
                value={party.magazziniere_id || ""}
                onChange={(e) =>
                  onPartyChange({ ...party, magazziniere_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Seleziona magazziniere...</option>
                {users
                  .filter(
                    (user) =>
                      user.ruolo === "magazziniere" ||
                      user.ruolo === "amministratore"
                  )
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.nome}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Stato
            </label>
            <select
              value={party.stato}
              onChange={(e) =>
                onPartyChange({ ...party, stato: e.target.value })
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="iniziale">Iniziale</option>
              <option value="caricato_furgone">Caricato nel Furgone</option>
              <option value="scaricato_furgone">Scaricato dal Furgone</option>
              <option value="scaricato_scaffale">Scaricato da Scaffale</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Note
            </label>
            <textarea
              value={party.note || ""}
              onChange={(e) =>
                onPartyChange({ ...party, note: e.target.value })
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              rows="3"
              placeholder="Note aggiuntive..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Materiale da Assegnare
            </label>
            <div className="border border-border rounded-lg p-4 max-h-48 overflow-y-auto">
              {macroCategories.length > 0 ? (
                <div className="space-y-2">
                  {macroCategories.map((macro) => (
                    <label
                      key={macro.id}
                      className="flex items-center space-x-3 cursor-pointer hover:bg-surface p-2 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMaterials.includes(macro.id)}
                        onChange={() => onMaterialToggle(macro.id)}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-ring"
                      />
                      <span className="text-sm font-medium text-foreground">
                        {macro.name}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessuna macro-categoria disponibile.
                </p>
              )}
            </div>
            {selectedMaterials.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {selectedMaterials.length} macro-categorie selezionate
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Scaffali
            </label>
            <ShelfSelector
              allParties={allParties}
              currentPartyId={party.id}
              selectedShelves={party.shelves}
              onAddShelf={onAddShelf}
              onRemoveShelf={onRemoveShelf}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-surface transition-colors"
            >
              Annulla
            </button>
            <button type="submit" className="flex-1 btn-primary">
              {isEdit ? "Salva Modifiche" : "Crea Festa"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
