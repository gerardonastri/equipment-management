"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Layers, TriangleAlert, Check, ChevronDown, ChevronUp } from "lucide-react";

/**
 * Estrae il prefix tipo "AC-" da un nome.
 * Es: "AUDIO (Mini Club) AG-" → "AG-"
 */
function extractPrefix(name = "") {
  const match = name.match(/\b([A-Z]{2,4}-(?:\d+)?)\s*$/i);
  return match ? match[1].toUpperCase() : null;
}

const SUFFIX_OPTIONS = [
  { value: " v2",  label: "v2",  desc: "Versione 2 — standard per revisioni" },
  { value: " v3",  label: "v3",  desc: "Versione 3" },
  { value: " dup", label: "dup", desc: "Duplicato esplicito" },
  { value: " B",   label: "B",   desc: "Variante B — utile per set multipli" },
  { value: " II",  label: "II",  desc: "Numerazione romana" },
  { value: "",     label: "Custom", desc: "Personalizzato" },
];

export default function DuplicateMacroModal({ item, onClose, onDuplicate }) {
  const detectedPrefix = extractPrefix(item?.name);

  const [newName, setNewName] = useState("");
  const [selectedSuffix, setSelectedSuffix] = useState(" v2");
  const [customSuffix, setCustomSuffix] = useState("");
  const [propagatePrefix, setPropagatePrefix] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Rileva il nuovo prefix dal nome che l'utente sta scrivendo
  const newPrefix = extractPrefix(newName);
  const oldPrefix = detectedPrefix;
  const prefixWillChange = propagatePrefix && oldPrefix && newPrefix && oldPrefix !== newPrefix;

  // Suggerisci nome di default quando si apre
  useEffect(() => {
    if (item?.name) {
      const effectiveSuffix = selectedSuffix === "" ? customSuffix : selectedSuffix;
      // Inserisci il suffix prima del codice se presente
      const codeMatch = item.name.match(/\s+([A-Z]{2,4}-\d*)\s*$/i);
      if (codeMatch) {
        setNewName(
          item.name.slice(0, item.name.lastIndexOf(codeMatch[0])) +
          effectiveSuffix +
          codeMatch[0]
        );
      } else {
        setNewName(item.name + effectiveSuffix);
      }
    }
  }, [item]);

  // Aggiorna il nome quando cambia il suffix selezionato
  const applySuffix = (suffix) => {
    setSelectedSuffix(suffix);
    if (!item?.name) return;
    const effectiveSuffix = suffix === "" ? customSuffix : suffix;
    const codeMatch = item.name.match(/\s+([A-Z]{2,4}-\d*)\s*$/i);
    if (codeMatch) {
      setNewName(
        item.name.slice(0, item.name.lastIndexOf(codeMatch[0])) +
        effectiveSuffix +
        codeMatch[0]
      );
    } else {
      setNewName(item.name + effectiveSuffix);
    }
  };

  const effectiveSuffix = selectedSuffix === "" ? customSuffix : selectedSuffix;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) { setError("Inserisci un nome per la macro duplicata."); return; }
    if (newName.trim() === item.name) { setError("Il nome deve essere diverso dall'originale."); return; }
    setLoading(true);
    setError("");
    try {
      await onDuplicate(item.id, newName.trim(), effectiveSuffix, propagatePrefix);
    } catch (err) {
      setError(err.message || "Errore durante la duplicazione.");
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10001] p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl border border-border max-w-lg w-full shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Copy className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Duplica Macro Categoria</h2>
              <p className="text-xs text-muted-foreground">Copia con tutte le categorie e sotto-categorie</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Original name pill */}
          <div className="flex items-center gap-2 px-3 py-2 bg-surface rounded-xl border border-border">
            <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Originale:</span>
            <span className="text-xs font-semibold text-foreground truncate">{item.name}</span>
            {detectedPrefix && (
              <span className="ml-auto text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                {detectedPrefix}
              </span>
            )}
          </div>

          {/* Suffix selector */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Suffisso versione
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SUFFIX_OPTIONS.filter((o) => o.value !== "").map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => applySuffix(opt.value)}
                  className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-all text-left ${
                    selectedSuffix === opt.value
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}>
                  <span className="font-mono">{opt.label}</span>
                  <p className="text-xs font-normal opacity-70 mt-0.5 leading-tight">{opt.desc}</p>
                </button>
              ))}
              <button type="button"
                onClick={() => setSelectedSuffix("")}
                className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-all text-left ${
                  selectedSuffix === ""
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}>
                <span className="font-mono">Custom</span>
                <p className="text-xs font-normal opacity-70 mt-0.5 leading-tight">Personalizzato</p>
              </button>
            </div>
            {selectedSuffix === "" && (
              <input type="text" value={customSuffix}
                onChange={(e) => setCustomSuffix(e.target.value)}
                placeholder="Es. ' PRO', ' NEW', ' 2025'"
                className="w-full mt-2 px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            )}
          </div>

          {/* New name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nome nuova macro
              <span className="text-xs text-muted-foreground font-normal ml-2">— puoi modificarlo liberamente</span>
            </label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              placeholder="Es. AUDIO Mini Club v2 AG-"
              required />
            {newPrefix && newPrefix !== oldPrefix && (
              <p className="text-xs text-primary font-medium mt-1.5 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Nuovo prefix rilevato: <span className="font-mono">{newPrefix}</span>
                {oldPrefix && <span className="text-muted-foreground">(era {oldPrefix})</span>}
              </p>
            )}
          </div>

          {/* Prefix propagation option */}
          {oldPrefix && newPrefix && oldPrefix !== newPrefix && (
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
              <input type="checkbox" checked={propagatePrefix} onChange={(e) => setPropagatePrefix(e.target.checked)}
                className="mt-0.5 rounded border-input" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Propaga il prefix <span className="font-mono text-primary">{oldPrefix} → {newPrefix}</span> ai figli
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tutte le categorie e sotto-categorie che contengono <span className="font-mono">{oldPrefix}</span> verranno rinominate con <span className="font-mono">{newPrefix}</span>
                </p>
              </div>
            </label>
          )}

          {/* Preview toggle */}
          <button type="button" onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showPreview ? "Nascondi" : "Mostra"} anteprima nomi figli
          </button>

          <AnimatePresence>
            {showPreview && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden">
                <div className="bg-surface rounded-xl border border-border p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Anteprima nuova macro</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span className="font-semibold text-foreground truncate">{newName || "—"}</span>
                    <span className="text-muted-foreground shrink-0">(macro)</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-4">
                    {prefixWillChange
                      ? `Le categorie e sotto-categorie con "${oldPrefix}" verranno rinominate con "${newPrefix}"`
                      : `Alle categorie e sotto-categorie verrà aggiunto il suffisso "${effectiveSuffix || "(nessuno)"}"`
                    }
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <TriangleAlert className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-surface transition-colors">
              Annulla
            </button>
            <button type="submit" disabled={loading || !newName.trim()}
              className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Duplicando...</>
                : <><Copy className="w-4 h-4" />Duplica</>}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}