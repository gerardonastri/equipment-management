"use client";

import { useState, useEffect } from "react";
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
  Home,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function CheckPage({ params }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ name: "", code: "" });
  const [currentUser, setCurrentUser] = useState(null);
  const [checkType, setCheckType] = useState("");
  const [checkedItems, setCheckedItems] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [partyData, setPartyData] = useState(null);
  const [isLoadingParty, setIsLoadingParty] = useState(true);
  const [partyError, setPartyError] = useState("");
  const [materialData, setMaterialData] = useState([]);
  const [shelfId, setShelfId] = useState(null);
  const [existingChecks, setExistingChecks] = useState([]);
  const [isCheckCompleted, setIsCheckCompleted] = useState(false);

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setShelfId(resolvedParams.shelfId);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!shelfId) return;

    const loadPartyData = async () => {
      try {
        setIsLoadingParty(true);
        console.log("[v0] Loading party for shelf:", shelfId);

        const { data: parties, error } = await supabase
          .from("parties")
          .select(
            `
            *,
            animatore:animatore_id(nome, ruolo),
            magazziniere:magazziniere_id(nome, ruolo)
          `
          )
          .neq("stato", "scaricato_scaffale");

        if (error) throw error;

        console.log("[v0] All parties loaded:", parties);

        const matchingParties =
          parties?.filter((party) => {
            if (!party.shelves) return false;
            const shelvesList = party.shelves.split(",").map((s) => s.trim());
            return shelvesList.includes(shelfId);
          }) || [];

        console.log(
          "[v0] Matching parties for shelf",
          shelfId,
          ":",
          matchingParties
        );

        if (matchingParties.length === 0) {
          setPartyError("Nessuna festa trovata per questo scaffale");
          return;
        }

        const party = matchingParties[0];
        setPartyData(party);
        console.log("[v0] Selected party:", party);

        const { data: checks, error: checksError } = await supabase
          .from("checks")
          .select("*")
          .eq("party_id", party.id);

        if (checksError) throw checksError;
        setExistingChecks(checks || []);

        const { data: partyMaterial, error: materialError } = await supabase
          .from("party_inventory")
          .select(
            `
            inventory_items!inner(
              id,
              name,
              type,
              parent_id
            )
          `
          )
          .eq("party_id", party.id);

        if (materialError) throw materialError;

        console.log("[v0] Party material loaded:", partyMaterial);

        const macroCategories = partyMaterial
          .filter((item) => item.inventory_items.type === "macro")
          .map((item) => item.inventory_items);

        console.log("[v0] Macro categories:", macroCategories);

        const materialHierarchy = [];

        for (const macro of macroCategories) {
          const { data: categories, error: catError } = await supabase
            .from("inventory_items")
            .select("*")
            .eq("parent_id", macro.id)
            .eq("type", "categoria");

          if (catError) throw catError;

          const macroData = {
            id: macro.id,
            name: macro.name,
            categories: [],
          };

          for (const category of categories || []) {
            const { data: subcategories, error: subError } = await supabase
              .from("inventory_items")
              .select("*")
              .eq("parent_id", category.id)
              .eq("type", "sotto");

            if (subError) throw subError;

            macroData.categories.push({
              id: category.id,
              name: category.name,
              items: subcategories || [],
            });
          }

          materialHierarchy.push(macroData);
        }

        console.log("[v0] Final material hierarchy:", materialHierarchy);
        setMaterialData(materialHierarchy);
      } catch (error) {
        console.error("[v0] Error loading party data:", error);
        setPartyError("Errore nel caricamento dei dati della festa");
      } finally {
        setIsLoadingParty(false);
      }
    };

    loadPartyData();
  }, [shelfId]);

  useEffect(() => {
    if (checkType && existingChecks.length > 0) {
      const isCompleted = existingChecks.some(
        (check) => check.type === checkType
      );
      setIsCheckCompleted(isCompleted);
    }
  }, [checkType, existingChecks]);

  useEffect(() => {
    const savedUser = sessionStorage.getItem("currentUser");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setCurrentUser(userData);
      setIsAuthenticated(true);
    }
  }, []);

  const checkTypes = [
    {
      id: "deposito_scaffale",
      name: "Carico dal Deposito allo Scaffale",
      icon: Home,
      color: "text-primary",
      allowedRoles: ["magazziniere", "amministratore"],
    },
    {
      id: "scaffale_furgone",
      name: "Carico dallo Scaffale al Furgone",
      icon: Truck,
      color: "text-secondary",
      allowedRoles: ["animatore", "magazziniere", "amministratore"],
    },
    {
      id: "furgone_scaffale",
      name: "Scarico dal Furgone allo Scaffale",
      icon: MapPin,
      color: "text-accent",
      allowedRoles: ["animatore", "magazziniere", "amministratore"],
    },
    {
      id: "scaffale_deposito",
      name: "Scarico dallo Scaffale al Deposito",
      icon: Package,
      color: "text-primary",
      allowedRoles: ["magazziniere", "amministratore"],
    },
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .eq("nome", loginData.name)
        .eq("codice_sicurezza", loginData.code)
        .limit(1);

      if (error) throw error;

      if (!users || users.length === 0) {
        setLoginError("Nome o codice di sicurezza non validi");
        return;
      }

      const user = users[0];
      sessionStorage.setItem("currentUser", JSON.stringify(user));
      setCurrentUser(user);
      setIsAuthenticated(true);
      setLoginError("");
    } catch (error) {
      console.error("[v0] Login error:", error);
      setLoginError("Errore durante l'autenticazione. Riprova.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleItemCheck = (macroId, categoryId, itemId) => {
    const itemKey = `${macroId}-${categoryId}-${itemId}`;
    setCheckedItems((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

  const handleCategoryCheck = (macroId, categoryId) => {
    const categoryKey = `${macroId}-${categoryId}`;
    setCheckedItems((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const handleSubmitCheck = async () => {
    setIsSubmitting(true);

    try {
      const checkData = {
        party_id: partyData.id,
        user_id: currentUser.id,
        type: checkType,
        notes: `Check completato per scaffale ${shelfId}. Elementi controllati: ${getCheckedCount()}/${getTotalItems()}`,
      };

      const { data: check, error: checkError } = await supabase
        .from("checks")
        .insert(checkData)
        .select()
        .single();

      if (checkError) throw checkError;

      if (checkType === "scaffale_deposito") {
        const { error: partyUpdateError } = await supabase
          .from("parties")
          .update({ stato: "scaricato_scaffale" })
          .eq("id", partyData.id);

        if (partyUpdateError) {
          console.error("[v0] Error updating party status:", partyUpdateError);
          throw partyUpdateError;
        }

        console.log(
          "[v0] Party status updated to 'scaricato_scaffale' for party:",
          partyData.id
        );
      }

      const checkTypeNames = {
        deposito_scaffale: "Carico dal Deposito allo Scaffale",
        scaffale_furgone: "Carico dallo Scaffale al Furgone",
        furgone_scaffale: "Scarico dal Furgone allo Scaffale",
        scaffale_deposito: "Scarico dallo Scaffale al Deposito",
      };

      const notificationData = {
        title: `Check Completato - Scaffale ${shelfId}`,
        message: `${currentUser.nome} ha completato il check "${
          checkTypeNames[checkType]
        }" per la festa "${
          partyData.nome
        }" (scaffale ${shelfId}). Elementi controllati: ${getCheckedCount()}/${getTotalItems()}${
          checkType === "scaffale_deposito"
            ? ". Festa scaricata dal scaffale."
            : ""
        }`,
        user_id: currentUser.id,
        is_read: false,
      };

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert(notificationData);

      if (notificationError) throw notificationError;

      const telegramMessage = `📦 <b>Nuovo Check Completato</b>

👤 Utente: ${currentUser.nome}
🔑 Ruolo: ${currentUser.ruolo}
🎉 Festa: ${partyData.nome}
📍 Scaffale: ${shelfId}
✅ Tipo: ${checkTypeNames[checkType]}
📊 Controllati: ${getCheckedCount()}/${getTotalItems()}`;

      // chiama la tua API
      await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: telegramMessage }),
      });

      alert(
        `Check ${
          checkTypeNames[checkType]
        } completato con successo!\nNotifica inviata all'amministratore.${
          checkType === "scaffale_deposito"
            ? "\nLa festa è stata marcata come scaricata dal scaffale."
            : ""
        }`
      );

      setCheckedItems({});
      setCheckType("");
    } catch (error) {
      console.error("[v0] Error submitting check:", error);
      alert("Errore durante l'invio del check. Riprova.");
    }

    setIsSubmitting(false);
  };

  const getTotalItems = () => {
    let total = 0;
    if (!materialData || !Array.isArray(materialData)) return 0;

    materialData.forEach((macro) => {
      if (macro.categories && Array.isArray(macro.categories)) {
        macro.categories.forEach((category) => {
          if (category.items && Array.isArray(category.items)) {
            if (category.items.length === 0) {
              total += 1;
            } else {
              total += category.items.length;
            }
          } else {
            // If items is not an array, count the category itself
            total += 1;
          }
        });
      }
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

  if (!shelfId) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (isLoadingParty) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Caricamento festa per scaffale {shelfId}...
          </p>
        </div>
      </div>
    );
  }

  if (partyError) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card p-8 rounded-xl border border-border max-w-md w-full mx-4 text-center"
        >
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Scaffale {shelfId}
          </h1>
          <p className="text-muted-foreground mb-6">
            Non è stata trovata nessuna festa assegnata a questo scaffale.
            Contatta l'amministratore per verificare l'assegnazione.
          </p>
        </motion.div>
      </div>
    );
  }

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
              Accesso Scaffale {shelfId}
            </h1>
            <p className="text-muted-foreground">
              Inserisci le tue credenziali per accedere al check
            </p>
            {partyData && (
              <p className="text-sm text-primary mt-2 font-medium">
                Festa: {partyData.nome}
              </p>
            )}
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
              {loginError}
            </div>
          )}

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
                disabled={isLoggingIn}
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
                disabled={isLoggingIn}
              />
            </div>

            <button
              type="submit"
              className="w-full btn-primary"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Accesso in corso...</span>
                </div>
              ) : (
                "Accedi al Check"
              )}
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
            <div className="bg-card p-6 rounded-xl border border-border mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Scaffale {shelfId}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Festa:</span>
                  <span className="font-medium text-foreground">
                    {partyData.nome}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium text-foreground">
                    {new Date(partyData.data).toLocaleDateString("it-IT")}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Luogo:</span>
                  <span className="font-medium text-foreground">
                    {partyData.luogo}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Animatore:</span>
                  <span className="font-medium text-foreground">
                    {partyData.animatore?.nome || "Non assegnato"}
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
                  const isAllowed = type.allowedRoles.includes(
                    currentUser.ruolo
                  );
                  const isCompleted = existingChecks.some(
                    (check) => check.type === type.id
                  );

                  return (
                    <motion.button
                      key={type.id}
                      whileHover={
                        isAllowed && !isCompleted ? { scale: 1.02 } : {}
                      }
                      whileTap={
                        isAllowed && !isCompleted ? { scale: 0.98 } : {}
                      }
                      onClick={() =>
                        isAllowed && !isCompleted && setCheckType(type.id)
                      }
                      disabled={!isAllowed || isCompleted}
                      className={`bg-card p-6 rounded-xl border border-border text-left ${
                        isCompleted
                          ? "opacity-50 cursor-not-allowed bg-green-50 border-green-200"
                          : isAllowed
                          ? "card-hover cursor-pointer"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-surface rounded-lg flex items-center justify-center">
                          <Icon
                            className={`w-6 h-6 ${
                              isCompleted ? "text-green-600" : type.color
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {type.name}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            {isCompleted
                              ? "✓ Check già completato"
                              : isAllowed
                              ? `Utente: ${currentUser.nome}`
                              : `Richiesto ruolo: ${type.allowedRoles.join(
                                  ", "
                                )}`}
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

  if (isCheckCompleted) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card p-8 rounded-xl border border-border max-w-md w-full mx-4 text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Check Completato
          </h1>
          <p className="text-muted-foreground mb-6">
            Questo tipo di check è già stato completato per la festa "
            {partyData?.nome}".
          </p>
          <button
            onClick={() => setCheckType("")}
            className="btn-primary w-full mb-2"
          >
            Scegli Altro Check
          </button>
        </motion.div>
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
                Utente: {currentUser.nome}
              </p>
              <p className="text-sm text-muted-foreground">
                Ruolo: {currentUser.ruolo}
              </p>
              <p className="text-sm text-muted-foreground">
                {checkTypes.find((t) => t.id === checkType)?.name}
              </p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                Progresso Check - Scaffale {shelfId}
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

          <div className="space-y-6">
            {materialData.map((macro) => (
              <motion.div
                key={macro.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card p-6 rounded-xl border border-border"
              >
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center space-x-2">
                  <Package className="w-5 h-5 text-primary" />
                  <span>{macro.name}</span>
                </h3>

                <div className="space-y-4">
                  {macro.categories.map((category) => (
                    <div
                      key={category.id}
                      className="border border-border rounded-lg p-4"
                    >
                      <h4 className="font-medium text-foreground mb-3">
                        {category.name}
                      </h4>

                      {category.items.length === 0 ? (
                        <div className="grid grid-cols-1">
                          {(() => {
                            const categoryKey = `${macro.id}-${category.id}`;
                            const isChecked = checkedItems[categoryKey];

                            return (
                              <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() =>
                                  handleCategoryCheck(macro.id, category.id)
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
                                  Categoria completa
                                </span>
                              </motion.button>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {category.items.map((item) => {
                            const itemKey = `${macro.id}-${category.id}-${item.id}`;
                            const isChecked = checkedItems[itemKey];

                            return (
                              <motion.button
                                key={item.id}
                                whileTap={{ scale: 0.98 }}
                                onClick={() =>
                                  handleItemCheck(
                                    macro.id,
                                    category.id,
                                    item.id
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
                                  {item.name}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

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
