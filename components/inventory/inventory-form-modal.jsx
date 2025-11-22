"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, AlertCircle } from "lucide-react";
import {
  createInventoryItem,
  updateInventoryItem,
  getInventoryItems,
} from "@/app/actions/inventory-actions";

export default function InventoryFormModal({
  isOpen,
  onClose,
  item,
  onSuccess,
}) {
  const [formData, setFormData] = useState({
    name: "",
    type: "macro",
    parent_id: null,
    materiale_mancante: false,
  });
  const [parentOptions, setParentOptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        name: "",
        type: "macro",
        parent_id: null,
        materiale_mancante: false,
      });
    }
    loadParents();
  }, [item, isOpen]);

  const loadParents = async () => {
    const items = await getInventoryItems();
    const filteredParents = items.filter((i) => i.type !== "sotto");
    setParentOptions(filteredParents);
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

      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-xl border border-border max-w-md w-full p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">
            {item ? "Modifica" : "Aggiungi"} Articolo
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 flex items-gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nome
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tipo
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
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
              <label className="block text-sm font-medium text-foreground mb-2">
                Padre
              </label>
              <select
                value={formData.parent_id || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parent_id: e.target.value || null,
                  })
                }
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

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.materiale_mancante}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  materiale_mancante: e.target.checked,
                })
              }
              className="rounded border-input"
              disabled={isSubmitting}
            />
            <span className="text-sm text-foreground">Materiale mancante</span>
          </label>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-card transition-colors"
              disabled={isSubmitting}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Salvataggio..." : "Salva"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
