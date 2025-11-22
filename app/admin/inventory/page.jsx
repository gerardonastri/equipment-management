"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  AlertCircle,
  ImageIcon,
  Trash2,
  Edit,
  ChevronDown,
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

const fetcher = () => getInventoryItems();

export default function InventoryPage() {
  const { data: allItems = [], mutate } = useSWR("inventory", fetcher, {
    revalidateOnFocus: false,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMissing, setFilterMissing] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all"); // Add category filter
  const [displayedItems, setDisplayedItems] = useState([]);
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    const startIdx = 0;
    const endIdx = page * ITEMS_PER_PAGE;
    setDisplayedItems(filteredItems.slice(startIdx, endIdx));
  }, [page, filteredItems]);

  const hasMore = page * ITEMS_PER_PAGE < filteredItems.length;
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
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
              onClick={() => {
                setSelectedItem(null);
                setIsFormOpen(true);
              }}
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
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={() => {
                  setFilterMissing(!filterMissing);
                  setPage(1);
                }}
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
                  onClick={() => {
                    setFilterCategory(cat);
                    setPage(1);
                  }}
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
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary transition-colors"
              >
                {/* ... existing image section ... */}
                <div className="relative h-48 bg-surface flex items-center justify-center group cursor-pointer">
                  {item.image_url ? (
                    <>
                      <img
                        src={item.image_url || "/placeholder.svg"}
                        alt={item.name}
                        className="w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity"
                        onLoad={(e) => (e.target.style.opacity = "1")}
                      />
                      <div
                        onClick={() => handleImageClick(item)}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="text-white text-sm font-medium">
                          Visualizza Foto
                        </span>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => handleImageClick(item)}
                      className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-sm">Aggiungi Foto</span>
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {item.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {item.type}
                      </p>
                    </div>
                    {item.materiale_mancante && (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">
                        Mancante
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleEditClick(item)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-card text-sm transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Modifica
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={isDeleting}
                      className="px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

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
        onClose={() => {
          setIsFormOpen(false);
          setSelectedItem(null);
        }}
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
        onClose={() => {
          setIsImageOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onSuccess={() => {
          mutate();
          setIsImageOpen(false);
        }}
      />
    </div>
  );
}
