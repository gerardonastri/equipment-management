"use client";

import React from "react";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, AlertCircle, Upload } from "lucide-react";
import {
  createInventoryItem,
  updateInventoryItem,
  getInventoryItems,
  uploadInventoryImage,
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
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (item) {
      setFormData(item);
      setImagePreview(item.image_url || null);
    } else {
      setFormData({
        name: "",
        type: "macro",
        parent_id: null,
        materiale_mancante: false,
      });
      setImagePreview(null);
    }
    setImageFile(null);
    loadParents();
  }, [item, isOpen]);

  const loadParents = async () => {
    const items = await getInventoryItems();
    const filteredParents = items.filter((i) => i.type !== "sotto");
    setParentOptions(filteredParents);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result);
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
        result = await updateInventoryItem(item.id, formData);
      } else {
        result = await createInventoryItem(formData);
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      if (imageFile && result.data) {
        const uploadResult = await uploadInventoryImage(
          result.data.id,
          imageFile
        );
        if (uploadResult.error) {
          setError(uploadResult.error);
          return;
        }
      }

      onSuccess();
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-xl border border-border max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
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

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Immagine
            </label>
            {imagePreview && (
              <div className="mb-2 rounded-lg overflow-hidden">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="Preview"
                  className="w-full h-32 object-cover"
                />
              </div>
            )}
            <label className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors block">
              <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-foreground font-medium">
                Scegli una foto
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG fino a 5MB
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="hidden"
              />
            </label>
          </div>

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
