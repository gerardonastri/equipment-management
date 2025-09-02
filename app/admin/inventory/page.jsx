"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Trash2,
  Filter,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { createBrowserClient } from "@supabase/ssr";

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({
    name: "",
    type: "sotto",
    parent_id: "",
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const { data, error } = await supabase
          .from("inventory_items")
          .select("*")
          .order("name", { ascending: true });

        if (error) {
          console.error("Errore fetch inventario:", error.message);
          return;
        }

        // Ricostruisci la gerarchia
        const macros = data.filter((item) => item.type === "macro");
        const categories = data.filter((item) => item.type === "categoria");
        const subs = data.filter((item) => item.type === "sotto");

        const structured = macros.map((macro) => {
          const macroCategories = categories
            .filter((c) => c.parent_id === macro.id)
            .map((cat) => ({
              ...cat,
              subs: subs.filter((s) => s.parent_id === cat.id),
            }));

          return { ...macro, categories: macroCategories };
        });

        setInventory(structured);
      } catch (error) {
        console.error("Errore durante il fetch:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleAddItem = async (e) => {
    e.preventDefault();

    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .insert([newItem])
        .select();

      if (error) {
        console.error("Errore aggiunta item:", error.message);
        return;
      }

      // Refresh inventory data
      const { data: allData, error: fetchError } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name", { ascending: true });

      if (!fetchError) {
        const macros = allData.filter((item) => item.type === "macro");
        const categories = allData.filter((item) => item.type === "categoria");
        const subs = allData.filter((item) => item.type === "sotto");

        const structured = macros.map((macro) => {
          const macroCategories = categories
            .filter((c) => c.parent_id === macro.id)
            .map((cat) => ({
              ...cat,
              subs: subs.filter((s) => s.parent_id === cat.id),
            }));

          return { ...macro, categories: macroCategories };
        });

        setInventory(structured);
      }

      setShowAddForm(false);
      setNewItem({
        name: "",
        type: "sotto",
        parent_id: "",
      });
    } catch (error) {
      console.error("Errore durante l'aggiunta:", error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm("Sei sicuro di voler eliminare questo elemento?")) return;

    try {
      const { error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", itemId);

      if (error) {
        console.error("Errore eliminazione item:", error.message);
        return;
      }

      // Refresh inventory data
      const { data: allData, error: fetchError } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name", { ascending: true });

      if (!fetchError) {
        const macros = allData.filter((item) => item.type === "macro");
        const categories = allData.filter((item) => item.type === "categoria");
        const subs = allData.filter((item) => item.type === "sotto");

        const structured = macros.map((macro) => {
          const macroCategories = categories
            .filter((c) => c.parent_id === macro.id)
            .map((cat) => ({
              ...cat,
              subs: subs.filter((s) => s.parent_id === cat.id),
            }));

          return { ...macro, categories: macroCategories };
        });

        setInventory(structured);
      }
    } catch (error) {
      console.error("Errore durante l'eliminazione:", error);
    }
  };

  const filteredInventory = () => {
    if (!searchTerm && selectedCategory === "all") return inventory;

    return inventory.filter((macro) => {
      if (selectedCategory !== "all" && selectedCategory !== macro.id)
        return false;

      const matchesMacro = macro.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const hasMatchingCategories = macro.categories.some((cat) => {
        const matchesCategory = cat.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const hasMatchingSubs = cat.subs.some((sub) =>
          sub.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return matchesCategory || hasMatchingSubs;
      });

      return matchesMacro || hasMatchingCategories;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <main className="containerMod py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Caricamento inventario...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="containerMod py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Inventario</h1>
              <p className="text-muted-foreground">
                Gestisci tutto il materiale disponibile
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Aggiungi Materiale</span>
            </button>
          </div>

          {/* Filters */}
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Cerca materiale..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">Tutte le categorie</option>
                  {inventory.map((macro) => (
                    <option key={macro.id} value={macro.id}>
                      {macro.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Inventory List */}
          <div className="space-y-4">
            {filteredInventory().map((macro) => (
              <motion.div
                key={macro.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                <button
                  onClick={() => toggleCategory(macro.id)}
                  className="w-full p-6 flex items-center justify-between hover:bg-surface transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {macro.name.charAt(0)}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-primary">
                      {macro.name}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      (
                      {macro.categories.reduce(
                        (acc, cat) => acc + cat.subs.length,
                        0
                      )}{" "}
                      elementi)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(macro.id);
                      }}
                      className="p-2 text-muted-foreground hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedCategories[macro.id] ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {expandedCategories[macro.id] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-border"
                  >
                    {macro.categories.map((category) => (
                      <div
                        key={category.id}
                        className="p-6 border-b border-border last:border-b-0"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-foreground">
                            {category.name}
                          </h3>
                          <button
                            onClick={() => handleDeleteItem(category.id)}
                            className="p-2 text-muted-foreground hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          {category.subs.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between p-4 bg-surface rounded-lg hover:bg-card transition-colors"
                            >
                              <div className="flex-1">
                                <h4 className="font-medium text-foreground">
                                  {sub.name}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Sotto-categoria
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleDeleteItem(sub.id)}
                                  className="p-2 text-muted-foreground hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Add Item Modal */}
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card p-6 rounded-xl border border-border max-w-md w-full"
              >
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Aggiungi Nuovo Materiale
                </h3>

                <form onSubmit={handleAddItem} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={newItem.name}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tipo
                    </label>
                    <select
                      value={newItem.type}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          type: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    >
                      <option value="macro">Macro Categoria</option>
                      <option value="categoria">Categoria</option>
                      <option value="sotto">Sotto-categoria</option>
                    </select>
                  </div>

                  {newItem.type !== "macro" && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {newItem.type === "categoria"
                          ? "Macro Categoria"
                          : "Categoria"}{" "}
                        Padre
                      </label>
                      <select
                        value={newItem.parent_id}
                        onChange={(e) =>
                          setNewItem((prev) => ({
                            ...prev,
                            parent_id: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      >
                        <option value="">Seleziona...</option>
                        {newItem.type === "categoria" &&
                          inventory.map((macro) => (
                            <option key={macro.id} value={macro.id}>
                              {macro.name}
                            </option>
                          ))}
                        {newItem.type === "sotto" &&
                          inventory.flatMap((macro) =>
                            macro.categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {macro.name} → {cat.name}
                              </option>
                            ))
                          )}
                      </select>
                    </div>
                  )}

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-surface transition-colors"
                    >
                      Annulla
                    </button>
                    <button type="submit" className="flex-1 btn-primary">
                      Aggiungi
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
