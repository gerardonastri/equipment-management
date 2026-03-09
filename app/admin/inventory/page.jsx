"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  AlertCircle,
  ImageIcon,
  Trash2,
  Edit,
  ChevronDown,
  Nfc,
  Copy,
  Check,
  ExternalLink,
  X,
} from "lucide-react";
import useSWR from "swr";
import {
  getInventoryItems,
  deleteInventoryItem,
} from "@/app/actions/inventory-actions";
import InventoryFormModal from "@/components/inventory/inventory-form-modal";
import ImageUploadModal from "@/components/inventory/image-upload-modal";
import Navbar from "@/components/navbar";

const ITEMS_PER_PAGE = 12;
const BASE_URL = "https://movida-manager.vercel.app/t";

const fetcher = () => getInventoryItems();

// ── Pannello NFC che appare sotto la card ──────────────────────────────────
function NfcPanel({ item, onClose }) {
  const [copied, setCopied] = useState(false);
  const url = `${BASE_URL}/${item.id}`;

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => e.stopPropagation()}
      className="absolute left-0 right-0 top-full mt-2 z-30 bg-card border border-primary/30 rounded-xl shadow-xl p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
            <Nfc className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            Link Tag NFC
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* URL row */}
      <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2">
        <code className="flex-1 text-xs text-muted-foreground font-mono truncate select-all">
          {url}
        </code>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-card transition-colors"
          title="Apri"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={handleCopy}
          className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
            copied
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-primary text-white hover:bg-primary/90"
          }`}
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5" />Copiato!</>
          ) : (
            <><Copy className="w-3.5 h-3.5" />Copia</>
          )}
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        ID:{" "}
        <span className="font-mono text-foreground/60">
          {item.id}
        </span>
      </p>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { data: allItems = [], mutate } = useSWR("inventory", fetcher, {
    revalidateOnFocus: false,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMissing, setFilterMissing] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [nfcOpenId, setNfcOpenId] = useState(null);

  const categories = [
    "all",
    ...new Set(allItems.map((item) => item.type).filter(Boolean)),
  ];

  const filteredItems = allItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMissing = !filterMissing || item.materiale_mancante === true;
    const matchesCategory =
      filterCategory === "all" || item.type === filterCategory;
    return matchesSearch && matchesMissing && matchesCategory;
  });

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, page * ITEMS_PER_PAGE);
  }, [page, filteredItems]);

  const hasMore = page * ITEMS_PER_PAGE < filteredItems.length;

  // Chiudi pannello NFC cliccando fuori
  useEffect(() => {
    if (!nfcOpenId) return;
    const close = () => setNfcOpenId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [nfcOpenId]);

  const handleDelete = async (id) => {
    if (!confirm("Sei sicuro di voler eliminare questo articolo?")) return;
    setIsDeleting(true);
    try {
      await deleteInventoryItem(id);
      mutate();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageClick = (item) => {
    setSelectedItem(item);
    setIsImageOpen(true);
  };

  const handleEditClick = (item) => {
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="containerMod py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Gestione Inventario
              </h1>
              <p className="text-muted-foreground">
                Visualizza, modifica, aggiungi e elimina materiale (
                {filteredItems.length} articoli)
              </p>
            </div>
            <button
              onClick={() => { setSelectedItem(null); setIsFormOpen(true); }}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Aggiungi Materiale
            </button>
          </div>

          {/* Filters */}
          <div className="bg-card p-4 rounded-xl border border-border mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cerca per nome o tipo..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={() => { setFilterMissing(!filterMissing); setPage(1); }}
                className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 whitespace-nowrap ${
                  filterMissing
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "border-border text-foreground hover:bg-card"
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                Mancante
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setFilterCategory(cat); setPage(1); }}
                  className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                    filterCategory === cat
                      ? "bg-primary text-white border-primary"
                      : "border-border text-foreground hover:bg-card"
                  }`}
                >
                  {cat === "all" ? "Tutte le Categorie" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedItems.map((item) => (
              // Wrapper relativo per posizionare il pannello NFC
              <div key={item.id} className="relative">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setNfcOpenId((prev) => (prev === item.id ? null : item.id));
                  }}
                  className={`bg-card rounded-xl border overflow-hidden cursor-pointer transition-all ${
                    nfcOpenId === item.id
                      ? "border-primary shadow-md ring-1 ring-primary/20"
                      : "border-border hover:border-primary"
                  }`}
                >
                  {/* Immagine */}
                  <div className="relative h-48 bg-surface flex items-center justify-center group">
                    {item.image_url ? (
                      <>
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity"
                          onLoad={(e) => (e.target.style.opacity = "1")}
                        />
                        <div
                          onClick={(e) => { e.stopPropagation(); handleImageClick(item); }}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="text-white text-sm font-medium">
                            Visualizza Foto
                          </span>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleImageClick(item); }}
                        className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-sm">Aggiungi Foto</span>
                      </button>
                    )}

                    {/* Badge NFC attivo */}
                    {nfcOpenId === item.id && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-primary text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        <Nfc className="w-3 h-3" />
                        NFC
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="font-semibold text-foreground">{item.name}</h3>
                        <p className="text-xs text-muted-foreground">{item.type}</p>
                      </div>
                      {item.materiale_mancante && (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">
                          Mancante
                        </span>
                      )}
                    </div>

                    {/* Hint */}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                      <Nfc className="w-3 h-3" />
                      {nfcOpenId === item.id
                        ? "Clicca per chiudere"
                        : "Clicca per ottenere il link NFC"}
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditClick(item); }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-surface text-sm transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Modifica
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        disabled={isDeleting}
                        className="px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Pannello NFC — fuori dalla card per non essere nascosto dall'overflow:hidden */}
                <AnimatePresence>
                  {nfcOpenId === item.id && (
                    <NfcPanel item={item} onClose={() => setNfcOpenId(null)} />
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-8 py-3 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white transition-all flex items-center gap-2"
              >
                <span>
                  Carica altri ({displayedItems.length}/{filteredItems.length})
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {displayedItems.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nessun articolo trovato</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Modals */}
      <InventoryFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setSelectedItem(null); }}
        item={selectedItem}
        onSuccess={() => {
          mutate();
          setIsFormOpen(false);
          setSelectedItem(null);
          setPage(1);
        }}
      />

      <ImageUploadModal
        isOpen={isImageOpen}
        onClose={() => { setIsImageOpen(false); setSelectedItem(null); }}
        item={selectedItem}
        onSuccess={() => { mutate(); setIsImageOpen(false); }}
      />
    </div>
  );
}