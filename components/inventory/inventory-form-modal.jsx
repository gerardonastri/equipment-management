"use client";

import React from "react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, Upload, TriangleAlert, Loader2 } from "lucide-react";
import {
  createInventoryItem,
  updateInventoryItem,
  getInventoryItems,
  uploadInventoryImage,
  removeLossByType,
} from "@/app/actions/inventory-actions";

// Config badge per i tipi di perdita rimovibili
const LOSS_BADGE_CONFIG = {
  danneggiato: {
    label: "Danneggiato",
    cls: "bg-red-100 text-red-700 border-red-200",
    xCls: "hover:bg-red-200 text-red-500",
    confirmMsg: 'Rimuovere tutte le segnalazioni "Danneggiato" per questo elemento? Questa azione è irreversibile.',
  },
  rubato: {
    label: "Rubato",
    cls: "bg-purple-100 text-purple-700 border-purple-200",
    xCls: "hover:bg-purple-200 text-purple-500",
    confirmMsg: 'Rimuovere tutte le segnalazioni "Rubato" per questo elemento? Questa azione è irreversibile.',
  },
};

export default function InventoryFormModal({ isOpen, onClose, item, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    type: "macro",
    parent_id: null,
    materiale_mancante: false,
  });
  const [parentOptions, setParentOptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Stato locale per i badge rimovibili — si aggiorna ottimisticamente
  // quando l'utente rimuove una segnalazione senza aspettare il mutate della pagina
  const [localHasDanneggiato, setLocalHasDanneggiato] = useState(false);
  const [localHasRubato, setLocalHasRubato] = useState(false);
  // Quale tipo sta caricando la rimozione
  const [removingType, setRemovingType] = useState(null);

  useEffect(() => {
    if (item) {
      setFormData(item);
      setImagePreview(item.image_url || null);
      setLocalHasDanneggiato(!!item._hasDanneggiato);
      setLocalHasRubato(!!item._hasRubato);
    } else {
      setFormData({ name: "", type: "macro", parent_id: null, materiale_mancante: false });
      setImagePreview(null);
      setLocalHasDanneggiato(false);
      setLocalHasRubato(false);
    }
    setImageFile(null);
    setError("");
    loadParents();
  }, [item, isOpen]);

  const loadParents = async () => {
    const items = await getInventoryItems();
    setParentOptions(items.filter((i) => i.type !== "sotto"));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLoss = async (tipo) => {
    const cfg = LOSS_BADGE_CONFIG[tipo];
    if (!cfg || !item?.id) return;
    if (!confirm(cfg.confirmMsg)) return;

    setRemovingType(tipo);
    try {
      const result = await removeLossByType(item.id, tipo);
      if (result.error) {
        setError(`Errore nella rimozione: ${result.error}`);
        return;
      }
      // Aggiornamento ottimistico locale
      if (tipo === "danneggiato") setLocalHasDanneggiato(false);
      if (tipo === "rubato") setLocalHasRubato(false);
      // Notifica la pagina padre di aggiornare la lista
      onSuccess();
    } catch (err) {
      setError("Errore durante la rimozione. Riprova.");
    } finally {
      setRemovingType(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      let result;
      if (item?.id) {
        result = await updateInventoryItem(item.id, formData);
      } else {
        result = await createInventoryItem(formData);
      }

      if (result.error) { setError(result.error); return; }

      if (imageFile && result.data) {
        const uploadResult = await uploadInventoryImage(result.data.id, imageFile);
        if (uploadResult.error) { setError(uploadResult.error); return; }
      }

      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isEditing = !!item?.id;
  const showLossBadges = isEditing && (localHasDanneggiato || localHasRubato);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-xl border border-border max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">
            {isEditing ? "Modifica" : "Aggiungi"} Articolo
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sezione stato segnalazioni (solo in modifica) */}
        <AnimatePresence>
          {showLossBadges && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 overflow-hidden"
            >
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <TriangleAlert className="w-3.5 h-3.5" />
                  Segnalazioni attive
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["danneggiato", "rubato"] ).map((tipo) => {
                    const isActive = tipo === "danneggiato" ? localHasDanneggiato : localHasRubato;
                    if (!isActive) return null;
                    const cfg = LOSS_BADGE_CONFIG[tipo];
                    const isRemoving = removingType === tipo;
                    return (
                      <div
                        key={tipo}
                        className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full border text-xs font-semibold ${cfg.cls}`}
                      >
                        <span>{cfg.label}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLoss(tipo)}
                          disabled={isRemoving || !!removingType}
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${cfg.xCls}`}
                          title={`Rimuovi segnalazioni "${cfg.label}"`}
                        >
                          {isRemoving
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <X className="w-3 h-3" />
                          }
                        </button>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Clicca × per eliminare tutte le segnalazioni di quel tipo.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isSubmitting}
            >
              <option value="macro">Macro Categoria</option>
              <option value="categoria">Categoria</option>
              <option value="sotto">Sottocategoria</option>
            </select>
          </div>

          {formData.type !== "macro" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Padre</label>
              <select
                value={formData.parent_id || ""}
                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isSubmitting}
              >
                <option value="">Seleziona un padre</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({option.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Materiale mancante — toggle esistente invariato */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.materiale_mancante}
              onChange={(e) => setFormData({ ...formData, materiale_mancante: e.target.checked })}
              className="rounded border-input"
              disabled={isSubmitting}
            />
            <span className="text-sm text-foreground">Materiale mancante</span>
          </label>

          {/* Immagine */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Immagine</label>
            {imagePreview && (
              <div className="mb-2 rounded-lg overflow-hidden">
                <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover" />
              </div>
            )}
            <label className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors block">
              <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-foreground font-medium">Scegli una foto</p>
              <p className="text-xs text-muted-foreground">PNG, JPG fino a 5MB</p>
              <input type="file" accept="image/*" onChange={handleFileChange} disabled={isSubmitting} className="hidden" />
            </label>
          </div>

          {/* Azioni */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-surface transition-colors"
              disabled={isSubmitting}
            >
              Annulla
            </button>
            <button type="submit" className="flex-1 btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvataggio..." : "Salva"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}