"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Circle,
  Package,
  Truck,
  MapPin,
  ArrowLeft,
  User,
  Calendar,
  Clock,
} from "lucide-react";

export default function CheckPage({ params }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ name: "", code: "" });
  const [currentUser, setCurrentUser] = useState(null);
  const [checkType, setCheckType] = useState("");
  const [checkedItems, setCheckedItems] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock data - in real app this would come from API
  const shelfData = {
    id: params.shelfId,
    party: "Matrimonio Villa Rosa",
    date: "2024-01-15",
    location: "Villa Rosa, Milano",
    responsible: "Marco Rossi",
  };

  const materialCategories = {
    audio: {
      name: "Audio",
      icon: "🎵",
      categories: {
        speakers: {
          name: "Casse",
          items: [
            'Cassa JBL 15"',
            'Cassa JBL 12"',
            'Subwoofer 18"',
            "Monitor da palco",
          ],
        },
        microphones: {
          name: "Microfoni",
          items: [
            "Microfono wireless Shure",
            "Microfono a filo",
            "Microfono headset",
            "Microfono lavalier",
          ],
        },
        mixers: {
          name: "Mixer",
          items: [
            "Mixer 16 canali",
            "Mixer 8 canali",
            "Processore audio",
            "Equalizzatore",
          ],
        },
      },
    },
    lighting: {
      name: "Illuminazione",
      icon: "💡",
      categories: {
        led: {
          name: "LED",
          items: [
            "Faro LED 200W",
            "Faro LED RGB",
            "Striscia LED",
            "Proiettore LED",
          ],
        },
        traditional: {
          name: "Tradizionale",
          items: [
            "Faro alogeno 1000W",
            "Faro alogeno 500W",
            "Lampada da terra",
            "Faretto spot",
          ],
        },
        effects: {
          name: "Effetti",
          items: [
            "Macchina del fumo",
            "Laser RGB",
            "Stroboscopio",
            "Moving head",
          ],
        },
      },
    },
    decorations: {
      name: "Decorazioni",
      icon: "🎨",
      categories: {
        flowers: {
          name: "Fiori",
          items: [
            "Centrotavola rose",
            "Bouquet sposa",
            "Composizione ingresso",
            "Petali sparsi",
          ],
        },
        furniture: {
          name: "Arredamento",
          items: [
            "Tavolo rotondo 8 posti",
            "Sedia chiavarina",
            "Tovaglia bianca",
            "Runner dorato",
          ],
        },
        accessories: {
          name: "Accessori",
          items: [
            "Candele profumate",
            "Lanterne decorative",
            "Palloncini",
            "Nastri colorati",
          ],
        },
      },
    },
  };

  const checkTypes = [
    {
      id: "load_truck",
      name: "Carico al Furgone",
      icon: Truck,
      color: "text-secondary",
    },
    {
      id: "unload_truck",
      name: "Scarico dal Furgone",
      icon: MapPin,
      color: "text-accent",
    },
    {
      id: "return_warehouse",
      name: "Scarico al Deposito",
      icon: Package,
      color: "text-primary",
    },
  ];

  const handleLogin = (e) => {
    e.preventDefault();
    // Mock authentication - in real app this would validate against API
    if (loginData.name && loginData.code) {
      setCurrentUser(loginData.name);
      setIsAuthenticated(true);
    }
  };

  const handleItemCheck = (categoryKey, subcategoryKey, itemIndex) => {
    const itemKey = `${categoryKey}-${subcategoryKey}-${itemIndex}`;
    setCheckedItems((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

  const handleSubmitCheck = async () => {
    setIsSubmitting(true);

    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // In real app, send data to API
    console.log("Check submitted:", {
      shelfId: params.shelfId,
      user: currentUser,
      checkType,
      checkedItems,
      timestamp: new Date().toISOString(),
    });

    setIsSubmitting(false);
    router.push("/");
  };

  const getTotalItems = () => {
    let total = 0;
    Object.values(materialCategories).forEach((category) => {
      Object.values(category.categories).forEach((subcategory) => {
        total += subcategory.items.length;
      });
    });
    return total;
  };

  const getCheckedCount = () => {
    return Object.values(checkedItems).filter(Boolean).length;
  };

  const getProgress = () => {
    const total = getTotalItems();
    const checked = getCheckedCount();
    return total > 0 ? (checked / total) * 100 : 0;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card p-8 rounded-xl border border-border max-w-md w-full mx-4"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Accesso Scaffale {params.shelfId}
            </h1>
            <p className="text-muted-foreground">
              Inserisci le tue credenziali per accedere al check
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nome
              </label>
              <input
                type="text"
                value={loginData.name}
                onChange={(e) =>
                  setLoginData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Il tuo nome"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Codice di Sicurezza
              </label>
              <input
                type="password"
                value={loginData.code}
                onChange={(e) =>
                  setLoginData((prev) => ({ ...prev, code: e.target.value }))
                }
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Codice"
                required
              />
            </div>

            <button type="submit" className="w-full btn-primary">
              Accedi al Check
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!checkType) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="containerMod py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <button
              onClick={() => router.push("/")}
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Torna alla Dashboard</span>
            </button>

            <div className="bg-card p-6 rounded-xl border border-border mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Scaffale {params.shelfId}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Festa:</span>
                  <span className="font-medium text-foreground">
                    {shelfData.party}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium text-foreground">
                    {shelfData.date}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Luogo:</span>
                  <span className="font-medium text-foreground">
                    {shelfData.location}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Responsabile:</span>
                  <span className="font-medium text-foreground">
                    {shelfData.responsible}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Seleziona il tipo di check
              </h2>
              <div className="grid gap-4">
                {checkTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <motion.button
                      key={type.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCheckType(type.id)}
                      className="bg-card p-6 rounded-xl border border-border text-left card-hover"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-surface rounded-lg flex items-center justify-center">
                          <Icon className={`w-6 h-6 ${type.color}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {type.name}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            Utente: {currentUser}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="containerMod py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCheckType("")}
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Cambia Tipo Check</span>
            </button>

            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                Utente: {currentUser}
              </p>
              <p className="text-sm text-muted-foreground">
                {checkTypes.find((t) => t.id === checkType)?.name}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-card p-6 rounded-xl border border-border mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                Progresso Check - Scaffale {params.shelfId}
              </h2>
              <span className="text-sm text-muted-foreground">
                {getCheckedCount()}/{getTotalItems()} completati
              </span>
            </div>
            <div className="w-full bg-surface rounded-full h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${getProgress()}%` }}
                className="bg-primary h-3 rounded-full transition-all duration-300"
              />
            </div>
          </div>

          {/* Material Categories */}
          <div className="space-y-6">
            {Object.entries(materialCategories).map(
              ([categoryKey, category]) => (
                <motion.div
                  key={categoryKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card p-6 rounded-xl border border-border"
                >
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center space-x-2">
                    <span className="text-2xl">{category.icon}</span>
                    <span>{category.name}</span>
                  </h3>

                  <div className="space-y-4">
                    {Object.entries(category.categories).map(
                      ([subcategoryKey, subcategory]) => (
                        <div
                          key={subcategoryKey}
                          className="border border-border rounded-lg p-4"
                        >
                          <h4 className="font-medium text-foreground mb-3">
                            {subcategory.name}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {subcategory.items.map((item, itemIndex) => {
                              const itemKey = `${categoryKey}-${subcategoryKey}-${itemIndex}`;
                              const isChecked = checkedItems[itemKey];

                              return (
                                <motion.button
                                  key={itemIndex}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() =>
                                    handleItemCheck(
                                      categoryKey,
                                      subcategoryKey,
                                      itemIndex
                                    )
                                  }
                                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                                    isChecked
                                      ? "bg-green-50 border-green-200 text-green-800"
                                      : "bg-surface border-border text-foreground hover:bg-card"
                                  }`}
                                >
                                  {isChecked ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-muted-foreground" />
                                  )}
                                  <span className="text-sm font-medium">
                                    {item}
                                  </span>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </motion.div>
              )
            )}
          </div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="sticky bottom-4 mt-8"
          >
            <button
              onClick={handleSubmitCheck}
              disabled={isSubmitting || getCheckedCount() === 0}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                isSubmitting || getCheckedCount() === 0
                  ? "bg-muted cursor-not-allowed"
                  : "btn-primary"
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Invio in corso...</span>
                </div>
              ) : (
                `Completa Check (${getCheckedCount()}/${getTotalItems()})`
              )}
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
