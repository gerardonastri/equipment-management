"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Upload, AlertCircle } from "lucide-react";
import { uploadInventoryImage } from "@/app/actions/inventory-actions";

export default function ImageUploadModal({ isOpen, onClose, item, onSuccess }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !item) return;

    setError("");
    setIsUploading(true);

    try {
      const result = await uploadInventoryImage(item.id, file);
      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    } finally {
      setIsUploading(false);
      setPreview(null);
    }
  };

  if (!isOpen || !item) return null;

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
        className="bg-card rounded-xl border border-border max-w-md w-full p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">
            Carica Foto - {item.name}
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
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {preview && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img
              src={preview || "/placeholder.svg"}
              alt="Preview"
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        {item.image_url && !preview && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img
              src={item.image_url || "/placeholder.svg"}
              alt={item.name}
              className="w-full h-48 object-cover"
            />
            <p className="text-xs text-muted-foreground mt-2">Foto attuale</p>
          </div>
        )}

        <label className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors">
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-foreground font-medium">Scegli una foto</p>
          <p className="text-xs text-muted-foreground">PNG, JPG fino a 5MB</p>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 border border-border rounded-lg hover:bg-card transition-colors"
          disabled={isUploading}
        >
          Chiudi
        </button>
      </motion.div>
    </motion.div>
  );
}
