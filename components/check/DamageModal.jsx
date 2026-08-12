"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TriangleAlert, X } from "lucide-react";
import { reportItemDamage } from "@/app/actions/check-actions";

export default function DamageModal({ item, partyId, userId, onClose, onConfirmed }) {
  const [tipo, setTipo] = useState("danneggiato");
  const [valoreStimato, setValoreStimato] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await reportItemDamage(
        item.id,
        partyId,
        userId,
        tipo,
        valoreStimato ? Number(valoreStimato) : null,
        note || null,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      onConfirmed(item.id, tipo);
    } catch (err) {
      setError("Errore durante il salvataggio. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <TriangleAlert className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Segnala problema</p>
              <p className="text-sm font-semibold text-foreground leading-tight truncate max-w-[180px]">
                {item.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
              Tipo problema
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  id: "danneggiato",
                  label: "Danneggiato",
                  active: "bg-red-500 text-white border-red-500",
                },
                {
                  id: "rubato",
                  label: "Rubato",
                  active: "bg-purple-500 text-white border-purple-500",
                },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipo(t.id)}
                  className={`py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all ${
                    tipo === t.id
                      ? t.active
                      : "bg-surface border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground mb-1 uppercase tracking-wide">
              Valore stimato (€) — opzionale
            </p>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="es. 25.00"
              value={valoreStimato}
              onChange={(e) => setValoreStimato(e.target.value)}
              className="w-full px-3 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm bg-surface"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground mb-1 uppercase tracking-wide">
              Note — opzionale
            </p>
            <textarea
              rows={2}
              placeholder="Descrivi il problema..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none bg-surface"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-surface transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Conferma"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
