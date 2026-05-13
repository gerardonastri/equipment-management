"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, AlertCircle, Upload } from "lucide-react";
import {
  createInventoryItem,
  updateInventoryItem,
  getInventoryItems,
  uploadInventoryImage,
  removeLossByType,
  addManualLoss,
  updatePrefixForMacroAndChildren,
} from "@/app/actions/inventory-actions";

/**
 * Estrae il prefix tipo "AC-" dalla fine del nome di un item.
 */
function extractPrefix(name = "") {
  const match = name.match(/\b([A-Z]{2,4}-(?:\d+)?)\s*$/i);
  return match ? match[1].toUpperCase() : null;
}

export default function InventoryFormModal({ isOpen, onClose, item, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    type: "macro",
    parent_id: null,
    materiale_mancante: false,
  });
  
  // Track dello stato secondario (Danneggiato/Rubato)
  const [toggles, setToggles] = useState({ danneggiato: false, rubato: false });
  const [initialToggles, setInitialToggles] = useState({ danneggiato: false, rubato: false });

  const [parentOptions, setParentOptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Prefix tracking per propagazione rinomina codice
  const [originalPrefix, setOriginalPrefix] = useState(null);
  const [showPrefixPropagate, setShowPrefixPropagate] = useState(false);
  const [prefixPropagating, setPrefixPropagating] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData(item);
      setImagePreview(item.image_url || null);
      
      const st = { danneggiato: !!item._hasDanneggiato, rubato: !!item._hasRubato };
      setToggles(st);
      setInitialToggles(st);

      setOriginalPrefix(item.type === "macro" ? extractPrefix(item.name) : null);
    } else {
      setFormData({ name: "", type: "macro", parent_id: null, materiale_mancante: false });
      setImagePreview(null);
      setToggles({ danneggiato: false, rubato: false });
      setInitialToggles({ danneggiato: false, rubato: false });
      setOriginalPrefix(null);
    }
    setShowPrefixPropagate(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      let result;
      if (item?.id) {
        // 1. Aggiorna elemento esistente
        result = await updateInventoryItem(item.id, formData);

        if (result?.success && item.type === "macro" && showPrefixPropagate) {
          const newPrefix = extractPrefix(formData.name);
          if (originalPrefix && newPrefix && originalPrefix !== newPrefix) {
            setPrefixPropagating(true);
            await updatePrefixForMacroAndChildren(item.id, originalPrefix, newPrefix);
            setPrefixPropagating(false);
          }
        }
      } else {
        // 1. Crea nuovo elemento
        result = await createInventoryItem(formData);
      }

      if (result.error) throw new Error(result.error);
      const targetId = item?.id || result.data?.id;

      // 2. Allinea stati secondari (Danneggiato / Rubato) solo se ci sono modifiche
      if (targetId) {
        if (toggles.danneggiato !== initialToggles.danneggiato) {
          if (toggles.danneggiato) await addManualLoss(targetId, "danneggiato");
          else await removeLossByType(targetId, "danneggiato");
        }
        if (toggles.rubato !== initialToggles.rubato) {
          if (toggles.rubato) await addManualLoss(targetId, "rubato");
          else await removeLossByType(targetId, "rubato");
        }
      }

      // 3. Upload Immagine
      if (imageFile && targetId) {
        const uploadResult = await uploadInventoryImage(targetId, imageFile);
        if (uploadResult.error) throw new Error(uploadResult.error);
      }

      onSuccess();
    } catch (err) {
      setError(err.message || "Errore durante il salvataggio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isEditing = !!item?.id;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-xl border border-border max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-foreground">{isEditing ? "Modifica" : "Aggiungi"} Articolo</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

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
              onChange={(e) => {
                const newName = e.target.value;
                setFormData({ ...formData, name: newName });
                if (item?.type === "macro" && originalPrefix) {
                  const newPrefix = extractPrefix(newName);
                  setShowPrefixPropagate(!!newPrefix && newPrefix !== originalPrefix);
                }
              }}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Propagazione prefix */}
          {showPrefixPropagate && item?.type === "macro" && (() => {
            const newPrefix = extractPrefix(formData.name);
            return newPrefix && newPrefix !== originalPrefix ? (
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
                <input type="checkbox" defaultChecked onChange={(e) => setShowPrefixPropagate(e.target.checked)} className="mt-0.5 rounded border-input" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Rinomina codice <span className="font-mono text-primary">{originalPrefix} → {newPrefix}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Aggiorna automaticamente figli e sottocategorie.</p>
                </div>
              </label>
            ) : null;
          })()}

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
                  <option key={option.id} value={option.id}>{option.name} ({option.type})</option>
                ))}
              </select>
            </div>
          )}

          {/* Stato Materiale - Unificato */}
          <div className="space-y-3 p-4 rounded-xl border border-border bg-surface">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Stato Materiale</p>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.materiale_mancante}
                onChange={(e) => setFormData({ ...formData, materiale_mancante: e.target.checked })}
                className="rounded border-input text-orange-500 focus:ring-orange-500"
                disabled={isSubmitting}
              />
              <span className="text-sm text-foreground">Materiale mancante</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={toggles.danneggiato}
                onChange={(e) => setToggles({ ...toggles, danneggiato: e.target.checked })}
                className="rounded border-input text-red-500 focus:ring-red-500"
                disabled={isSubmitting}
              />
              <span className="text-sm text-foreground">Segnala come Danneggiato</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={toggles.rubato}
                onChange={(e) => setToggles({ ...toggles, rubato: e.target.checked })}
                className="rounded border-input text-purple-500 focus:ring-purple-500"
                disabled={isSubmitting}
              />
              <span className="text-sm text-foreground">Segnala come Rubato</span>
            </label>
          </div>

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
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-surface transition-colors">
              Annulla
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary">
              {prefixPropagating ? "Aggiornando codici..." : isSubmitting ? "Salvataggio..." : "Salva"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}