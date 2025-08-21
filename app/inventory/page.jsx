"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Filter,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Navbar from "@/components/navbar";

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    macroCategory: "",
    category: "",
    subCategory: "",
    quantity: "",
    description: "",
  });

  // Mock inventory data
  const inventory = {
    audio: {
      name: "Audio",
      icon: "🎵",
      color: "text-primary",
      categories: {
        speakers: {
          name: "Casse",
          items: [
            {
              id: 1,
              name: 'Cassa JBL 15"',
              quantity: 8,
              description: "Cassa attiva 400W",
            },
            {
              id: 2,
              name: 'Cassa JBL 12"',
              quantity: 12,
              description: "Cassa attiva 300W",
            },
            {
              id: 3,
              name: 'Subwoofer 18"',
              quantity: 4,
              description: "Subwoofer attivo 800W",
            },
          ],
        },
        microphones: {
          name: "Microfoni",
          items: [
            {
              id: 4,
              name: "Microfono wireless Shure",
              quantity: 6,
              description: "Microfono wireless professionale",
            },
            {
              id: 5,
              name: "Microfono a filo",
              quantity: 10,
              description: "Microfono dinamico cardioide",
            },
          ],
        },
      },
    },
    lighting: {
      name: "Illuminazione",
      icon: "💡",
      color: "text-secondary",
      categories: {
        led: {
          name: "LED",
          items: [
            {
              id: 6,
              name: "Faro LED 200W",
              quantity: 15,
              description: "Faro LED RGBW",
            },
            {
              id: 7,
              name: "Striscia LED",
              quantity: 20,
              description: "Striscia LED 5m RGB",
            },
          ],
        },
        effects: {
          name: "Effetti",
          items: [
            {
              id: 8,
              name: "Macchina del fumo",
              quantity: 3,
              description: "Macchina del fumo 1500W",
            },
            {
              id: 9,
              name: "Laser RGB",
              quantity: 2,
              description: "Laser show RGB 500mW",
            },
          ],
        },
      },
    },
    decorations: {
      name: "Decorazioni",
      icon: "🎨",
      color: "text-accent",
      categories: {
        flowers: {
          name: "Fiori",
          items: [
            {
              id: 10,
              name: "Centrotavola rose",
              quantity: 25,
              description: "Centrotavola con rose rosse",
            },
            {
              id: 11,
              name: "Bouquet sposa",
              quantity: 5,
              description: "Bouquet misto stagionale",
            },
          ],
        },
        furniture: {
          name: "Arredamento",
          items: [
            {
              id: 12,
              name: "Tavolo rotondo 8 posti",
              quantity: 30,
              description: "Tavolo rotondo diametro 180cm",
            },
            {
              id: 13,
              name: "Sedia chiavarina",
              quantity: 200,
              description: "Sedia chiavarina dorata",
            },
          ],
        },
      },
    },
  };

  const toggleCategory = (categoryKey) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    // Mock add item - in real app this would call API
    console.log("Adding item:", newItem);
    setShowAddForm(false);
    setNewItem({
      name: "",
      macroCategory: "",
      category: "",
      subCategory: "",
      quantity: "",
      description: "",
    });
  };

  const filteredInventory = () => {
    if (selectedCategory === "all" && !searchTerm) return inventory;

    const filtered = {};
    Object.entries(inventory).forEach(([macroKey, macro]) => {
      if (selectedCategory !== "all" && selectedCategory !== macroKey) return;

      const filteredCategories = {};
      Object.entries(macro.categories).forEach(([catKey, category]) => {
        const filteredItems = category.items.filter(
          (item) =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filteredItems.length > 0) {
          filteredCategories[catKey] = {
            ...category,
            items: filteredItems,
          };
        }
      });

      if (Object.keys(filteredCategories).length > 0) {
        filtered[macroKey] = {
          ...macro,
          categories: filteredCategories,
        };
      }
    });

    return filtered;
  };

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
                  <option value="audio">Audio</option>
                  <option value="lighting">Illuminazione</option>
                  <option value="decorations">Decorazioni</option>
                </select>
              </div>
            </div>
          </div>

          {/* Inventory List */}
          <div className="space-y-4">
            {Object.entries(filteredInventory()).map(([macroKey, macro]) => (
              <motion.div
                key={macroKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                <button
                  onClick={() => toggleCategory(macroKey)}
                  className="w-full p-6 flex items-center justify-between hover:bg-surface transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{macro.icon}</span>
                    <h2 className={`text-xl font-semibold ${macro.color}`}>
                      {macro.name}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      (
                      {Object.values(macro.categories).reduce(
                        (acc, cat) => acc + cat.items.length,
                        0
                      )}{" "}
                      elementi)
                    </span>
                  </div>
                  {expandedCategories[macroKey] ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>

                {expandedCategories[macroKey] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-border"
                  >
                    {Object.entries(macro.categories).map(
                      ([catKey, category]) => (
                        <div
                          key={catKey}
                          className="p-6 border-b border-border last:border-b-0"
                        >
                          <h3 className="font-semibold text-foreground mb-4">
                            {category.name}
                          </h3>
                          <div className="space-y-2">
                            {category.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-4 bg-surface rounded-lg hover:bg-card transition-colors"
                              >
                                <div className="flex-1">
                                  <h4 className="font-medium text-foreground">
                                    {item.name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {item.description}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <span className="text-sm font-medium text-foreground">
                                    Qty: {item.quantity}
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-card rounded-lg transition-colors">
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 text-muted-foreground hover:text-danger hover:bg-red-50 rounded-lg transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
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
                      Macro Categoria
                    </label>
                    <select
                      value={newItem.macroCategory}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          macroCategory: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    >
                      <option value="">Seleziona...</option>
                      <option value="audio">Audio</option>
                      <option value="lighting">Illuminazione</option>
                      <option value="decorations">Decorazioni</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Quantità
                    </label>
                    <input
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          quantity: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Descrizione
                    </label>
                    <textarea
                      value={newItem.description}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      rows="3"
                    />
                  </div>

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
