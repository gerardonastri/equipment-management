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
  ChevronRight,
  Package,
  TriangleAlert,
  Clock,
  User,
  Euro,
  FileText,
  Layers,
} from "lucide-react";
import useSWR from "swr";
import {
  getInventoryItems,
  deleteInventoryItem,
  getItemDetails,
} from "@/app/actions/inventory-actions";
import InventoryFormModal from "@/components/inventory/inventory-form-modal";
import ImageUploadModal from "@/components/inventory/image-upload-modal";
import Navbar from "@/components/navbar";

const ITEMS_PER_PAGE = 12;
const BASE_URL = "https://movida-manager.vercel.app/t";

const fetcher = () => getInventoryItems();

const LOSS_CONFIG = {
  mancante:    { label: "Mancante",    cls: "bg-orange-100 text-orange-700 border-orange-200" },
  danneggiato: { label: "Danneggiato", cls: "bg-red-100 text-red-700 border-red-200" },
  rubato:      { label: "Rubato",      cls: "bg-purple-100 text-purple-700 border-purple-200" },
};

// Filtri stato materiale — radio (uno alla volta)
const STATUS_FILTERS = [
  { id: "all",         label: "Tutti",        activeClass: "bg-primary text-white border-primary" },
  { id: "mancante",    label: "Mancante",     activeClass: "bg-orange-500 text-white border-orange-500" },
  { id: "danneggiato", label: "Danneggiato",  activeClass: "bg-red-500 text-white border-red-500" },
  { id: "rubato",      label: "Rubato",       activeClass: "bg-purple-500 text-white border-purple-500" },
];

// ── Link NFC riutilizzabile ────────────────────────────────────────────────
function NfcLinkRow({ itemId, compact = false }) {
  const [copied, setCopied] = useState(false);
  const url = `${BASE_URL}/${itemId}`;

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
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
    <div className={`flex items-center gap-2 bg-surface border border-border rounded-xl ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
        <Nfc className="w-3.5 h-3.5 text-primary" />
      </div>
      <code className="flex-1 text-xs text-muted-foreground font-mono truncate select-all min-w-0">{url}</code>
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
        className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-card transition-colors" title="Apri link">
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <button onClick={handleCopy}
        className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
          copied ? "bg-green-100 text-green-700 border border-green-200" : "bg-primary text-white hover:bg-primary/90"
        }`}>
        {copied ? <><Check className="w-3.5 h-3.5" />Copiato!</> : <><Copy className="w-3.5 h-3.5" />Copia</>}
      </button>
    </div>
  );
}

// ── Drawer dettaglio ───────────────────────────────────────────────────────
function ItemDetailDrawer({ item, onClose, onEdit }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getItemDetails(item.id).then((d) => { setDetails(d); setLoading(false); });
  }, [item.id]);

  const typeLabel = item.type === "macro" ? "Macro Categoria" : item.type === "categoria" ? "Categoria" : "Sotto-elemento";
  const childLabel = item.type === "macro" ? "Categorie" : item.type === "categoria" ? "Sotto-elementi" : null;

  const statusBadge = item.materiale_mancante
    ? <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">Mancante</span>
    : <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">Disponibile</span>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4"
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full sm:max-w-2xl sm:rounded-2xl flex flex-col overflow-hidden border border-border shadow-2xl max-h-screen sm:max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border shrink-0">
          {item.image_url
            ? <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-border" />
            : <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center shrink-0 border border-border"><Package className="w-5 h-5 text-muted-foreground" /></div>
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-foreground leading-tight">{item.name}</h2>
              {statusBadge}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => { onClose(); onEdit(item); }} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors" title="Modifica">
              <Edit className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Nfc className="w-3.5 h-3.5" /> Link Tag NFC
            </p>
            <NfcLinkRow itemId={item.id} />
            <p className="text-xs text-muted-foreground mt-1.5 font-mono">ID: {item.id}</p>
          </section>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {childLabel && (
                <section>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> {childLabel} ({details?.children?.length || 0})
                  </p>
                  {details?.children?.length === 0
                    ? <p className="text-sm text-muted-foreground italic">Nessun elemento figlio.</p>
                    : (
                      <div className="space-y-2">
                        {details.children.map((child) => (
                          <div key={child.id} className={`rounded-xl border p-3 ${child.materiale_mancante ? "bg-orange-50 border-orange-200" : "bg-surface border-border"}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-sm text-foreground flex-1">{child.name}</span>
                              {child.materiale_mancante && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 font-semibold">Mancante</span>
                              )}
                            </div>
                            <NfcLinkRow itemId={child.id} compact />
                          </div>
                        ))}
                      </div>
                    )
                  }
                </section>
              )}

              <section>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <TriangleAlert className="w-3.5 h-3.5" /> Segnalazioni ({details?.losses?.length || 0})
                </p>
                {details?.losses?.length === 0
                  ? <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground italic">Nessuna segnalazione registrata.</div>
                  : (
                    <div className="space-y-3">
                      {details.losses.map((loss) => {
                        const cfg = LOSS_CONFIG[loss.tipo] || { label: loss.tipo, cls: "bg-gray-100 text-gray-600 border-gray-200" };
                        return (
                          <div key={loss.id} className="rounded-xl border border-border bg-surface overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
                              <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(loss.created_at).toLocaleDateString("it-IT")}
                              </span>
                            </div>
                            <div className="px-4 py-3 space-y-1.5 text-sm">
                              {loss.party?.nome && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Package className="w-3.5 h-3.5 shrink-0" />
                                  <span>Festa: <span className="font-medium text-foreground">{loss.party.nome}</span>
                                    {loss.party.data && <span className="text-xs ml-1">({new Date(loss.party.data).toLocaleDateString("it-IT")})</span>}
                                  </span>
                                </div>
                              )}
                              {loss.reporter?.nome && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <User className="w-3.5 h-3.5 shrink-0" />
                                  <span>Segnalato da: <span className="font-medium text-foreground">{loss.reporter.nome}</span></span>
                                </div>
                              )}
                              {loss.valore_stimato != null && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Euro className="w-3.5 h-3.5 shrink-0" />
                                  <span>Valore stimato: <span className="font-medium text-foreground">€{Number(loss.valore_stimato).toFixed(2)}</span></span>
                                </div>
                              )}
                              {loss.note && (
                                <div className="flex items-start gap-2 text-muted-foreground">
                                  <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                  <span className="italic">"{loss.note}"</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                }
              </section>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Pannello NFC inline card ───────────────────────────────────────────────
function NfcPanel({ item, onClose }) {
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
      onClick={(e) => e.stopPropagation()}
      className="absolute left-0 right-0 top-full mt-2 z-30 bg-card border border-primary/30 rounded-xl shadow-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center"><Nfc className="w-3.5 h-3.5 text-primary" /></div>
          <span className="text-sm font-semibold text-foreground">Link Tag NFC</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <NfcLinkRow itemId={item.id} />
      <p className="text-xs text-muted-foreground mt-2">ID: <span className="font-mono text-foreground/60">{item.id}</span></p>
    </motion.div>
  );
}

// ── PAGINA PRINCIPALE ──────────────────────────────────────────────────────
export default function InventoryPage() {
  const { data: allItems = [], mutate } = useSWR("inventory", fetcher, { revalidateOnFocus: false });

  const [searchTerm, setSearchTerm]         = useState("");
  const [statusFilter, setStatusFilter]     = useState("all"); // "all" | "mancante" | "danneggiato" | "rubato"
  const [filterCategory, setFilterCategory] = useState("all");
  const [page, setPage]                     = useState(1);
  const [isFormOpen, setIsFormOpen]         = useState(false);
  const [isImageOpen, setIsImageOpen]       = useState(false);
  const [selectedItem, setSelectedItem]     = useState(null);
  const [isDeleting, setIsDeleting]         = useState(false);
  const [nfcOpenId, setNfcOpenId]           = useState(null);
  const [detailItem, setDetailItem]         = useState(null);

  const typeCategories = ["all", ...new Set(allItems.map((item) => item.type).filter(Boolean))];

  const filteredItems = allItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all"         ? true :
      statusFilter === "mancante"    ? item.materiale_mancante === true :
      statusFilter === "danneggiato" ? item._hasDanneggiato === true :
      statusFilter === "rubato"      ? item._hasRubato === true :
      true;

    const matchesCategory = filterCategory === "all" || item.type === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const displayedItems = useMemo(() => filteredItems.slice(0, page * ITEMS_PER_PAGE), [page, filteredItems]);
  const hasMore = page * ITEMS_PER_PAGE < filteredItems.length;

  useEffect(() => {
    if (!nfcOpenId) return;
    const close = () => setNfcOpenId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [nfcOpenId]);

  const handleDelete = async (id) => {
    if (!confirm("Sei sicuro di voler eliminare questo articolo?")) return;
    setIsDeleting(true);
    try { await deleteInventoryItem(id); mutate(); } finally { setIsDeleting(false); }
  };

  const openDetail = (e, item) => { e.stopPropagation(); setNfcOpenId(null); setDetailItem(item); };

  // Badge stato per la card
  const getItemStatusBadge = (item) => {
    if (item.materiale_mancante)   return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">Mancante</span>;
    if (item._hasDanneggiato)      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">Danneggiato</span>;
    if (item._hasRubato)           return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">Rubato</span>;
    return null;
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="containerMod py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Gestione Inventario</h1>
              <p className="text-muted-foreground">
                Visualizza, modifica, aggiungi e elimina materiale ({filteredItems.length} articoli)
              </p>
            </div>
            <button onClick={() => { setSelectedItem(null); setIsFormOpen(true); }} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" />Aggiungi Materiale
            </button>
          </div>

          {/* Filters */}
          <div className="bg-card p-4 rounded-xl border border-border mb-6 space-y-4">
            {/* Cerca */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="Cerca per nome o tipo..." value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Filtro stato materiale (radio) */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Stato materiale</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((f) => (
                  <button key={f.id} onClick={() => { setStatusFilter(f.id); setPage(1); }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      statusFilter === f.id ? f.activeClass : "border-border text-foreground hover:bg-surface"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro tipo (macro/categoria/sotto) */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tipo elemento</p>
              <div className="flex flex-wrap gap-2">
                {typeCategories.map((cat) => (
                  <button key={cat} onClick={() => { setFilterCategory(cat); setPage(1); }}
                    className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                      filterCategory === cat ? "bg-primary text-white border-primary" : "border-border text-foreground hover:bg-surface"
                    }`}
                  >
                    {cat === "all" ? "Tutte le Categorie" : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedItems.map((item) => (
              <div key={item.id} className="relative">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={(e) => { e.stopPropagation(); setNfcOpenId((prev) => (prev === item.id ? null : item.id)); }}
                  className={`bg-card rounded-xl border overflow-hidden cursor-pointer transition-all ${
                    nfcOpenId === item.id ? "border-primary shadow-md ring-1 ring-primary/20" : "border-border hover:border-primary"
                  }`}
                >
                  {/* Immagine */}
                  <div className="relative h-48 bg-surface flex items-center justify-center group">
                    {item.image_url ? (
                      <>
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity" onLoad={(e) => (e.target.style.opacity = "1")} />
                        <div onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setIsImageOpen(true); }} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-sm font-medium">Visualizza Foto</span>
                        </div>
                      </>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setIsImageOpen(true); }} className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                        <ImageIcon className="w-8 h-8" /><span className="text-sm">Aggiungi Foto</span>
                      </button>
                    )}
                    {nfcOpenId === item.id && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-primary text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        <Nfc className="w-3 h-3" />NFC
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1 gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                        <p className="text-xs text-muted-foreground">{item.type}</p>
                      </div>
                      {getItemStatusBadge(item)}
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                      <Nfc className="w-3 h-3" />
                      {nfcOpenId === item.id ? "Clicca per chiudere" : "Clicca per link NFC"}
                    </p>

                    <div className="flex gap-2">
                      <button onClick={(e) => openDetail(e, item)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-sm font-medium transition-colors">
                        <ChevronRight className="w-4 h-4" />Dettagli
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setIsFormOpen(true); }}
                        className="flex items-center justify-center px-3 py-2 rounded-lg border border-border hover:bg-surface text-sm transition-colors" title="Modifica">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} disabled={isDeleting}
                        className="px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-700 transition-colors" title="Elimina">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>

                <AnimatePresence>
                  {nfcOpenId === item.id && <NfcPanel item={item} onClose={() => setNfcOpenId(null)} />}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-8">
              <button onClick={() => setPage((p) => p + 1)} className="px-8 py-3 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white transition-all flex items-center gap-2">
                <span>Carica altri ({displayedItems.length}/{filteredItems.length})</span>
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

      <InventoryFormModal isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setSelectedItem(null); }} item={selectedItem}
        onSuccess={() => { mutate(); setIsFormOpen(false); setSelectedItem(null); setPage(1); }} />
      <ImageUploadModal isOpen={isImageOpen} onClose={() => { setIsImageOpen(false); setSelectedItem(null); }} item={selectedItem}
        onSuccess={() => { mutate(); setIsImageOpen(false); }} />

      <AnimatePresence>
        {detailItem && (
          <ItemDetailDrawer item={detailItem} onClose={() => setDetailItem(null)}
            onEdit={(item) => { setSelectedItem(item); setIsFormOpen(true); }} />
        )}
      </AnimatePresence>
    </div>
  );
}