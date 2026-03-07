"use client";

import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Circle,
  Package,
  Truck,
  MapPin,
  Home,
  ArrowLeft,
  User,
  Calendar,
  Clock,
  AlertCircle,
  Lock,
  Wifi,
  ScanLine,
  AlertTriangle,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import useSWR from "swr";
import {
  getPartyDataForShelf,
  authenticateUser,
  submitCheck,
  reportLosses,
} from "@/app/actions/check-actions";

// --- FETCHER SWR ---
const fetcher = async (shelfId) => {
  const result = await getPartyDataForShelf(shelfId);
  if (result.error) {
    throw new Error(result.error);
  }
  return result;
};

// Fasi in cui è permesso scansionare la categoria per spuntare tutti i sotto-elementi
const FASI_CATEGORIA_CONSENTITA = ["scaffale_furgone", "furgone_scaffale"];

// Tipi di perdita disponibili
const LOSS_TYPES = [
  { id: "mancante", label: "Mancante", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "danneggiato", label: "Danneggiato", color: "bg-red-100 text-red-700 border-red-200" },
  { id: "rubato", label: "Rubato", color: "bg-purple-100 text-purple-700 border-purple-200" },
];

export default function CheckPage({ params }) {
  const resolvedParams = use(params);
  const shelfId = resolvedParams.shelfId;

  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ name: "", code: "" });
  const [currentUser, setCurrentUser] = useState(null);
  const [checkType, setCheckType] = useState("");
  const [checkedItems, setCheckedItems] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isCheckCompleted, setIsCheckCompleted] = useState(false);
  const [materialSmarrito, setMaterialSmarrito] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [lastScannedMessage, setLastScannedMessage] = useState(null);

  // --- STATI PER SEGNALAZIONE PERDITE ---
  // "idle" | "reporting" | "done"
  const [lossPhase, setLossPhase] = useState("idle");
  const [lastCheckId, setLastCheckId] = useState(null);
  const [lastPartyId, setLastPartyId] = useState(null);
  // Snapshot degli items checkati al momento del submit, per mostrarli nella fase reporting
  const [checkedItemsSnapshot, setCheckedItemsSnapshot] = useState([]);
  // { [inventoryId]: { enabled: bool, tipo: string, note: string, valoreStimato: string } }
  const [itemDamageState, setItemDamageState] = useState({});
  // Espansione dettagli per item con spunta danneggiato
  const [expandedDamage, setExpandedDamage] = useState({});
  const [isSubmittingLosses, setIsSubmittingLosses] = useState(false);
  // ---------------------------------------

  // --- DATI (SWR) ---
  const {
    data,
    error: partyError,
    isLoading: isLoadingParty,
    mutate,
  } = useSWR(
    shelfId ? `party-${shelfId}` : null,
    () => (shelfId ? fetcher(shelfId) : null),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const partyData = data?.party;
  const existingChecks = data?.checks || [];
  const materialData = data?.materialHierarchy || [];
  const partyCompleted = data?.partyCompleted || false;

  // --- NFC BROADCAST LISTENER ---
  useEffect(() => {
    const channel = new BroadcastChannel("nfc_scan_channel");

    channel.onmessage = (event) => {
      if (event.data && event.data.type === "TAG_SCANNED") {
        const scannedId = event.data.itemId;
        console.log("📡 NFC Rilevato:", scannedId);
        handleNfcMatch(scannedId);
      }
    };

    return () => {
      channel.close();
    };
  }, [materialData, checkType]);

  /**
   * Regola principale:
   * - Fasi 1 e 4: scan NFC su categoria CON sotto-elementi NON è permesso.
   *               scan NFC su categoria SENZA sotto-elementi è sempre permesso.
   * - Fasi 2 e 3: scan NFC su categoria spunta automaticamente tutti i sotto-elementi.
   */
  const handleNfcMatch = (scannedId) => {
    if (!materialData || materialData.length === 0) return;

    const categoriaConsentita = FASI_CATEGORIA_CONSENTITA.includes(checkType);

    let found = false;
    let foundName = "";

    for (const macro of materialData) {
      if (found) break;

      for (const category of macro.categories) {
        if (found) break;

        // --- Caso 1: l'ID corrisponde a un sotto-elemento ---
        const matchingItem = category.items.find((i) => i.id === scannedId);
        if (matchingItem) {
          found = true;
          foundName = matchingItem.name;

          if (matchingItem.materiale_mancante) {
            alert(`⚠️ ATTENZIONE: ${foundName} è segnalato come MANCANTE nel sistema!`);
            return;
          }

          const itemKey = `${macro.id}-${category.id}-${matchingItem.id}`;
          setCheckedItems((prev) => {
            if (!prev[itemKey] && typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([100, 50, 100]);
            }
            return { ...prev, [itemKey]: true };
          });
          break;
        }

        // --- Caso 2: l'ID corrisponde alla categoria stessa ---
        if (category.id === scannedId) {
          found = true;
          foundName = category.name;

          if (category.materiale_mancante) {
            alert(`⚠️ ATTENZIONE: ${foundName} è segnalato come MANCANTE nel sistema!`);
            return;
          }

          const hasItems = category.items && category.items.length > 0;

          if (hasItems && !categoriaConsentita) {
            alert(
              `⛔ In questa fase devi scansionare ogni elemento singolarmente.\nScannerizza i singoli oggetti della categoria "${category.name}".`
            );
            return;
          }

          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }

          setCheckedItems((prev) => {
            const updated = { ...prev };
            if (!hasItems) {
              updated[`${macro.id}-${category.id}`] = true;
            } else {
              category.items.forEach((item) => {
                if (!item.materiale_mancante) {
                  updated[`${macro.id}-${category.id}-${item.id}`] = true;
                }
              });
            }
            return updated;
          });
          break;
        }
      }
    }

    if (found) {
      setLastScannedMessage(`${foundName} verificato!`);
      setTimeout(() => setLastScannedMessage(null), 3000);
    }
  };

  // --- EFFETTI LOGICI ---
  useEffect(() => {
    if (checkType && existingChecks.length > 0) {
      const isCompleted = existingChecks.some((check) => check.type === checkType);
      setIsCheckCompleted(isCompleted);
    }
  }, [checkType, existingChecks]);

  useEffect(() => {
    const savedUser = sessionStorage.getItem("currentUser");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setCurrentUser(userData);
      setUserRole(userData.ruolo);
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

  // --- HANDLER LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const result = await authenticateUser(
        loginData.name.toLowerCase().trim(),
        loginData.code
      );

      if (result.error) {
        setLoginError(result.error);
        return;
      }

      const user = result.user;
      sessionStorage.setItem("currentUser", JSON.stringify(user));
      setCurrentUser(user);
      setUserRole(user.ruolo);
      setIsAuthenticated(true);
      setLoginError("");
    } catch (error) {
      console.error("[v0] Login error:", error);
      setLoginError("Errore durante l'autenticazione. Riprova.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // --- HANDLER SUBMIT CHECK ---
  const handleSubmitCheck = async () => {
    if (!partyData || !currentUser || !shelfId) return;

    if (!isAllItemsChecked() && !materialSmarrito) {
      alert("Devi scansionare tutti gli elementi o spuntare 'materiale smarrito' per procedere.");
      return;
    }

    setIsSubmitting(true);

    try {
      const uncheckedItemIds = materialSmarrito ? getUncheckedItemIds() : [];
      const result = await submitCheck(
        partyData.id,
        currentUser.id,
        currentUser.ruolo,
        checkType,
        shelfId,
        getCheckedCount(),
        getTotalItems(),
        currentUser.nome,
        partyData.nome,
        materialSmarrito,
        uncheckedItemIds
      );

      if (result.error) {
        alert(`Errore: ${result.error}`);
        return;
      }

      // Costruiamo lo snapshot degli elementi verificati per la fase di segnalazione
      const snapshot = buildCheckedSnapshot();

      setLastCheckId(result.checkId);
      setLastPartyId(partyData.id);
      setCheckedItemsSnapshot(snapshot);
      // Inizializziamo lo stato danno per ogni item checkato
      const initialDamageState = {};
      snapshot.forEach((item) => {
        initialDamageState[item.inventoryId] = {
          enabled: false,
          tipo: "danneggiato",
          note: "",
          valoreStimato: "",
        };
      });
      setItemDamageState(initialDamageState);

      // Reset check e mutate
      setCheckedItems({});
      setCheckType("");
      mutate();

      // Passiamo alla fase di segnalazione perdite
      setLossPhase("reporting");
    } catch (error) {
      console.error("[v0] Error submitting check:", error);
      alert("Errore durante l'invio del check. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Costruisce la lista flat di tutti gli elementi che sono stati checkati,
   * con le loro informazioni per mostrarli nella schermata di segnalazione.
   */
  const buildCheckedSnapshot = () => {
    const snapshot = [];

    materialData.forEach((macro) => {
      macro.categories.forEach((category) => {
        if (!category.items || category.items.length === 0) {
          // Categoria senza sotto-elementi
          const categoryKey = `${macro.id}-${category.id}`;
          if (checkedItems[categoryKey]) {
            snapshot.push({
              inventoryId: category.id,
              name: category.name,
              macroName: macro.name,
              categoryName: null,
            });
          }
        } else {
          category.items.forEach((item) => {
            const itemKey = `${macro.id}-${category.id}-${item.id}`;
            if (checkedItems[itemKey] && !item.materiale_mancante) {
              snapshot.push({
                inventoryId: item.id,
                name: item.name,
                macroName: macro.name,
                categoryName: category.name,
              });
            }
          });
        }
      });
    });

    return snapshot;
  };

  // --- HANDLERS PERDITE ---
  const toggleItemDamage = (inventoryId) => {
    setItemDamageState((prev) => ({
      ...prev,
      [inventoryId]: {
        ...prev[inventoryId],
        enabled: !prev[inventoryId]?.enabled,
      },
    }));
    // Apri automaticamente i dettagli quando si attiva il danno
    if (!itemDamageState[inventoryId]?.enabled) {
      setExpandedDamage((prev) => ({ ...prev, [inventoryId]: true }));
    } else {
      setExpandedDamage((prev) => ({ ...prev, [inventoryId]: false }));
    }
  };

  const updateItemDamageField = (inventoryId, field, value) => {
    setItemDamageState((prev) => ({
      ...prev,
      [inventoryId]: {
        ...prev[inventoryId],
        [field]: value,
      },
    }));
  };

  const toggleExpandedDamage = (inventoryId) => {
    setExpandedDamage((prev) => ({ ...prev, [inventoryId]: !prev[inventoryId] }));
  };

  const handleSubmitLosses = async () => {
    setIsSubmittingLosses(true);
    try {
      // Raccogliamo solo gli items con danno attivato
      const losses = checkedItemsSnapshot
        .filter((item) => itemDamageState[item.inventoryId]?.enabled)
        .map((item) => {
          const damage = itemDamageState[item.inventoryId];
          return {
            inventoryId: item.inventoryId,
            tipo: damage.tipo,
            quantita: 1,
            valoreStimato: damage.valoreStimato ? Number(damage.valoreStimato) : null,
            note: damage.note || null,
          };
        });

      if (losses.length > 0) {
        const result = await reportLosses(
          lastCheckId,
          lastPartyId,
          currentUser.id,
          losses
        );

        if (result.error) {
          alert(`Errore nel salvataggio delle segnalazioni: ${result.error}`);
          return;
        }
      }

      setLossPhase("done");
    } catch (error) {
      console.error("[v0] Error submitting losses:", error);
      alert("Errore durante il salvataggio. Riprova.");
    } finally {
      setIsSubmittingLosses(false);
    }
  };

  // Quanti items hanno il danno attivato
  const damagedCount = Object.values(itemDamageState).filter((v) => v?.enabled).length;

  // --- HELPER FUNCTIONS ---
  const getTotalItems = () => {
    let total = 0;
    if (!materialData || !Array.isArray(materialData)) return 0;

    materialData.forEach((macro) => {
      if (!macro.categories) return;
      macro.categories.forEach((category) => {
        if (!category.items || category.items.length === 0) {
          total += 1;
        } else {
          total += category.items.filter((item) => !item.materiale_mancante).length;
        }
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

  const isAllItemsChecked = () => {
    let totalSelectable = 0;
    let checkedSelectable = 0;

    materialData.forEach((macro) => {
      macro.categories.forEach((category) => {
        if (!category.items || category.items.length === 0) {
          totalSelectable++;
          const categoryKey = `${macro.id}-${category.id}`;
          if (checkedItems[categoryKey]) checkedSelectable++;
        } else {
          category.items.forEach((item) => {
            if (!item.materiale_mancante) {
              totalSelectable++;
              const itemKey = `${macro.id}-${category.id}-${item.id}`;
              if (checkedItems[itemKey]) checkedSelectable++;
            }
          });
        }
      });
    });

    return totalSelectable > 0 && totalSelectable === checkedSelectable;
  };

  const getUncheckedItemIds = () => {
    const uncheckedIds = [];
    materialData.forEach((macro) => {
      macro.categories.forEach((category) => {
        if (!category.items || category.items.length === 0) {
          const categoryKey = `${macro.id}-${category.id}`;
          if (!checkedItems[categoryKey]) uncheckedIds.push(category.id);
        } else {
          category.items.forEach((item) => {
            if (!item.materiale_mancante) {
              const itemKey = `${macro.id}-${category.id}-${item.id}`;
              if (!checkedItems[itemKey]) uncheckedIds.push(item.id);
            }
          });
        }
      });
    });
    return uncheckedIds;
  };

  const isCategoryChecked = (macro, category) => {
    if (!category.items || category.items.length === 0) {
      return !!checkedItems[`${macro.id}-${category.id}`];
    }
    const nonMissing = category.items.filter((i) => !i.materiale_mancante);
    if (nonMissing.length === 0) return false;
    return nonMissing.every((item) => checkedItems[`${macro.id}-${category.id}-${item.id}`]);
  };

  // --- RENDER ---
  if (!shelfId || isLoadingParty) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {!shelfId ? "Caricamento..." : `Caricamento festa per scaffale ${shelfId}...`}
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
          <h1 className="text-2xl font-bold text-foreground mb-2">Scaffale {shelfId}</h1>
          <p className="text-muted-foreground mb-6">
            Non è stata trovata nessuna festa assegnata a questo scaffale. Contatta l'amministratore.
          </p>
        </motion.div>
      </div>
    );
  }

  // FIX: Scaffale libero — la festa è completata
  if (partyCompleted && lossPhase === "idle") {
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
          <h1 className="text-2xl font-bold text-foreground mb-2">Scaffale Libero</h1>
          <p className="text-muted-foreground">
            Tutti i check per la festa{" "}
            <span className="font-semibold text-foreground">"{partyData?.nome}"</span> sono stati
            completati. Lo scaffale <span className="font-semibold">{shelfId}</span> è ora
            disponibile.
          </p>
        </motion.div>
      </div>
    );
  }

  if (currentUser && partyData?.animatore_id) {
    const isAnimator = currentUser.ruolo === "animatore";
    const isAssignedAnimator = partyData.animatore_id === currentUser.id;
    if (isAnimator && !isAssignedAnimator) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card p-8 rounded-xl border border-border max-w-md w-full mx-4 text-center"
          >
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Accesso Negato</h1>
            <p className="text-muted-foreground mb-6">
              Solo l'animatore assegnato può accedere a questo check.
            </p>
          </motion.div>
        </div>
      );
    }
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
              <p className="text-sm text-primary mt-2 font-medium">Festa: {partyData.nome}</p>
            )}
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
              <input
                type="text"
                value={loginData.name}
                onChange={(e) => setLoginData((prev) => ({ ...prev, name: e.target.value }))}
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
                onChange={(e) => setLoginData((prev) => ({ ...prev, code: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Codice"
                required
                disabled={isLoggingIn}
              />
            </div>
            <button type="submit" className="w-full btn-primary" disabled={isLoggingIn}>
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

  // -----------------------------------------------------------------------
  // --- FASE SEGNALAZIONE PERDITE (post-check) ---
  // Mostriamo ogni elemento checkato con una checkbox "Segnala problema"
  // -----------------------------------------------------------------------
  if (lossPhase === "reporting") {
    // Raggruppiamo per macroName per leggibilità
    const groupedByMacro = {};
    checkedItemsSnapshot.forEach((item) => {
      if (!groupedByMacro[item.macroName]) groupedByMacro[item.macroName] = [];
      groupedByMacro[item.macroName].push(item);
    });

    return (
      <div className="min-h-screen bg-surface pb-28">
        <div className="containerMod py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            {/* Header */}
            <div className="bg-card p-6 rounded-xl border border-border mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Segnala Problemi</h1>
                  <p className="text-sm text-muted-foreground">
                    Check completato ✓ — Spunta gli elementi con problemi e specifica il tipo.
                  </p>
                </div>
              </div>
              {damagedCount > 0 && (
                <div className="mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
                  {damagedCount} element{damagedCount === 1 ? "o segnalato" : "i segnalati"}
                </div>
              )}
            </div>

            {/* Lista elementi per macro */}
            <div className="space-y-6 mb-6">
              {Object.entries(groupedByMacro).map(([macroName, items]) => (
                <div key={macroName} className="bg-card rounded-xl border border-border overflow-hidden">
                  {/* Header macro */}
                  <div className="px-4 py-3 bg-surface border-b border-border flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground text-sm">{macroName}</span>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-border">
                    {items.map((item) => {
                      const damageState = itemDamageState[item.inventoryId] || {};
                      const isDamaged = damageState.enabled;
                      const isExpanded = expandedDamage[item.inventoryId];

                      return (
                        <div key={item.inventoryId} className="p-4">
                          {/* Riga principale: nome + checkbox */}
                          <div className="flex items-center gap-3">
                            {/* Icona check (sempre verde, è già verificato) */}
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />

                            {/* Nome elemento */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {item.name}
                              </p>
                              {item.categoryName && (
                                <p className="text-xs text-muted-foreground">{item.categoryName}</p>
                              )}
                            </div>

                            {/* Checkbox segnala problema */}
                            <label className="flex items-center gap-2 cursor-pointer shrink-0 select-none">
                              <span className={`text-xs font-semibold ${isDamaged ? "text-red-600" : "text-muted-foreground"}`}>
                                Problema
                              </span>
                              <div
                                onClick={() => toggleItemDamage(item.inventoryId)}
                                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                                  isDamaged ? "bg-red-500" : "bg-gray-200"
                                }`}
                              >
                                <div
                                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                    isDamaged ? "translate-x-5" : "translate-x-1"
                                  }`}
                                />
                              </div>
                            </label>
                          </div>

                          {/* Dettagli danno (visibili solo se il problema è attivato) */}
                          <AnimatePresence>
                            {isDamaged && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 pt-3 border-t border-border space-y-3">
                                  {/* Tipo problema */}
                                  <div>
                                    <p className="text-xs font-medium text-foreground mb-2">Tipo problema</p>
                                    <div className="flex gap-2">
                                      {LOSS_TYPES.map((type) => (
                                        <button
                                          key={type.id}
                                          onClick={() =>
                                            updateItemDamageField(item.inventoryId, "tipo", type.id)
                                          }
                                          className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all ${
                                            damageState.tipo === type.id
                                              ? type.color + " ring-1 ring-offset-1"
                                              : "bg-surface border-border text-muted-foreground"
                                          }`}
                                        >
                                          {type.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Valore stimato */}
                                  <div>
                                    <p className="text-xs font-medium text-foreground mb-1">
                                      Valore stimato (€) — opzionale
                                    </p>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="es. 15.00"
                                      value={damageState.valoreStimato || ""}
                                      onChange={(e) =>
                                        updateItemDamageField(
                                          item.inventoryId,
                                          "valoreStimato",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                                    />
                                  </div>

                                  {/* Note */}
                                  <div>
                                    <p className="text-xs font-medium text-foreground mb-1">
                                      Note — opzionale
                                    </p>
                                    <textarea
                                      rows={2}
                                      placeholder="Descrivi il problema..."
                                      value={damageState.note || ""}
                                      onChange={(e) =>
                                        updateItemDamageField(item.inventoryId, "note", e.target.value)
                                      }
                                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottone invio — sticky in fondo */}
            <div className="sticky bottom-4">
              <button
                onClick={handleSubmitLosses}
                disabled={isSubmittingLosses}
                className="w-full btn-primary py-4 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-xl"
              >
                {isSubmittingLosses ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Salvataggio...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>
                      {damagedCount > 0
                        ? `Invia ${damagedCount} segnalazion${damagedCount === 1 ? "e" : "i"}`
                        : "Nessun problema — Conferma"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // --- FASE COMPLETATA DOPO SEGNALAZIONE ---
  if (lossPhase === "done") {
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
          <h1 className="text-2xl font-bold text-foreground mb-2">Tutto Completato!</h1>
          <p className="text-muted-foreground mb-6">
            Check e segnalazioni salvati con successo.
          </p>
          <button
            onClick={() => {
              setLossPhase("idle");
              setLastCheckId(null);
              setLastPartyId(null);
              setCheckedItemsSnapshot([]);
              setItemDamageState({});
              mutate();
            }}
            className="btn-primary w-full"
          >
            Torna alla Pagina
          </button>
        </motion.div>
      </div>
    );
  }

  // --- SELETTORE CHECK ---
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
              <h1 className="text-2xl font-bold text-foreground mb-4">Scaffale {shelfId}</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Festa:</span>
                  <span className="font-medium text-foreground">{partyData.nome}</span>
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
                  <span className="font-medium text-foreground">{partyData.luogo}</span>
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
              <h2 className="text-xl font-semibold text-foreground">Seleziona il tipo di check</h2>
              <div className="grid gap-4">
                {checkTypes.map((type, index) => {
                  const Icon = type.icon;
                  const isCompleted = existingChecks.some((check) => check.type === type.id);
                  let isPreviousCompleted = true;
                  if (index > 0) {
                    const previousType = checkTypes[index - 1];
                    isPreviousCompleted = existingChecks.some(
                      (check) => check.type === previousType.id
                    );
                  }
                  const isRoleAllowed = type.allowedRoles.includes(userRole);
                  const isDisabled = isCompleted || !isPreviousCompleted || !isRoleAllowed;

                  let statusMessage = "";
                  let statusColor = "text-muted-foreground";
                  if (isCompleted) {
                    statusMessage = "✓ Check già completato";
                    statusColor = "text-green-700 font-medium";
                  } else if (!isPreviousCompleted) {
                    statusMessage = "🔒 Richiede completamento fase precedente";
                    statusColor = "text-amber-700 font-bold";
                  } else if (!isRoleAllowed) {
                    statusMessage = `⛔ Richiesto ruolo: ${type.allowedRoles.join(", ")}`;
                    statusColor = "text-red-500";
                  } else {
                    statusMessage = `Utente: ${currentUser.nome}`;
                  }

                  return (
                    <motion.button
                      key={type.id}
                      whileHover={!isDisabled ? { scale: 1.02 } : {}}
                      whileTap={!isDisabled ? { scale: 0.98 } : {}}
                      onClick={() => !isDisabled && setCheckType(type.id)}
                      disabled={isDisabled}
                      className={`bg-card p-6 rounded-xl border border-border text-left relative overflow-hidden transition-all duration-200 ${
                        isCompleted
                          ? "opacity-60 bg-green-50 border-green-200 cursor-not-allowed"
                          : !isPreviousCompleted
                          ? "opacity-60 bg-gray-100 border-gray-200 grayscale cursor-not-allowed"
                          : !isRoleAllowed
                          ? "opacity-50 cursor-not-allowed"
                          : "card-hover cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-surface rounded-lg flex items-center justify-center shrink-0">
                          {!isPreviousCompleted && !isCompleted ? (
                            <Lock className="w-6 h-6 text-gray-500" />
                          ) : (
                            <Icon
                              className={`w-6 h-6 ${isCompleted ? "text-green-600" : type.color}`}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-foreground truncate">
                            {type.name}
                          </h3>
                          <p className={`text-sm truncate ${statusColor}`}>{statusMessage}</p>
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

  // --- CHECK GIÀ COMPLETATO ---
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
          <h1 className="text-2xl font-bold text-foreground mb-2">Check Completato</h1>
          <p className="text-muted-foreground mb-6">
            Questo tipo di check è già stato completato per la festa "{partyData?.nome}".
          </p>
          <button onClick={() => setCheckType("")} className="btn-primary w-full mb-2">
            Scegli Altro Check
          </button>
        </motion.div>
      </div>
    );
  }

  // --- LISTA ITEMS (MAIN) ---
  const categoriaConsentita = FASI_CATEGORIA_CONSENTITA.includes(checkType);

  return (
    <div className="min-h-screen bg-surface pb-20">
      <div className="containerMod py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between mb-6 sticky top-0 z-10 bg-surface py-2 backdrop-blur-sm bg-opacity-90">
            <button
              onClick={() => setCheckType("")}
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Cambia Tipo Check</span>
            </button>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Utente: {currentUser.nome}</p>
              <p className="text-sm text-muted-foreground">Ruolo: {userRole}</p>
              <p className="text-sm text-muted-foreground font-semibold">
                {checkTypes.find((t) => t.id === checkType)?.name}
              </p>
            </div>
          </div>

          {/* TOAST NFC */}
          <AnimatePresence>
            {lastScannedMessage && (
              <motion.div
                initial={{ opacity: 0, y: -50, x: "-50%" }}
                animate={{ opacity: 1, y: 0, x: "-50%" }}
                exit={{ opacity: 0, y: -50, x: "-50%" }}
                className="fixed top-20 left-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3"
              >
                <Wifi className="w-6 h-6 animate-pulse" />
                <span className="font-bold text-lg">{lastScannedMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PROGRESS BAR */}
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

          {/* LISTA MACRO CATEGORIE */}
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
                  {macro.categories.map((category) => {
                    const catChecked = isCategoryChecked(macro, category);
                    const hasItems = category.items && category.items.length > 0;

                    return (
                      <div key={category.id} className="border border-border rounded-lg p-4">
                        {/* Header categoria */}
                        <div className="flex items-center gap-2 mb-3">
                          {catChecked ? (
                            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                          <h4
                            className={`font-medium ${
                              catChecked ? "text-green-700" : "text-foreground"
                            }`}
                          >
                            {category.name}
                          </h4>
                          {hasItems && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded ml-1 ${
                                categoriaConsentita
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {categoriaConsentita ? "Scan categoria ✓" : "Scan singoli elementi"}
                            </span>
                          )}
                          {category.materiale_mancante && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded ml-auto">
                              Mancante
                            </span>
                          )}
                        </div>

                        {/* Categoria senza sotto-elementi */}
                        {!hasItems ? (
                          <div
                            className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                              category.materiale_mancante
                                ? "opacity-50 bg-gray-100 border-gray-200"
                                : catChecked
                                ? "bg-green-50 border-green-200 text-green-800"
                                : "bg-surface border-border text-foreground"
                            }`}
                          >
                            {category.materiale_mancante ? (
                              <div className="w-5 h-5 bg-gray-300 rounded-full" />
                            ) : catChecked ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <ScanLine className="w-5 h-5 text-muted-foreground opacity-50" />
                            )}
                            <span className="text-sm font-medium">
                              {catChecked ? "Verificato via NFC" : "In attesa di scansione NFC"}
                            </span>
                          </div>
                        ) : (
                          /* Categoria con sotto-elementi */
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {category.items.map((item) => {
                              const itemKey = `${macro.id}-${category.id}-${item.id}`;
                              const isChecked = !!checkedItems[itemKey];
                              const isDisabled = item.materiale_mancante;

                              return (
                                <div
                                  key={item.id}
                                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                                    isDisabled
                                      ? "opacity-50 cursor-not-allowed bg-gray-100 border-gray-200"
                                      : isChecked
                                      ? "bg-green-50 border-green-200 text-green-800"
                                      : "bg-surface border-border text-foreground"
                                  }`}
                                >
                                  {isDisabled ? (
                                    <div className="w-5 h-5 bg-gray-300 rounded-full" />
                                  ) : isChecked ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <ScanLine className="w-5 h-5 text-muted-foreground opacity-50" />
                                  )}
                                  <span className="text-sm font-medium flex-1 text-left">
                                    {item.name}
                                  </span>
                                  {item.materiale_mancante && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                      Mancante
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>

          {/* CHECKBOX MATERIALE SMARRITO */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="sticky bottom-20 mt-8 bg-card p-6 rounded-xl border border-border shadow-lg"
          >
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={materialSmarrito}
                onChange={(e) => setMaterialSmarrito(e.target.checked)}
                className="w-6 h-6 rounded border-border text-primary focus:ring-primary"
              />
              <span className="font-bold text-foreground">Materiale Smarrito / Danneggiato</span>
            </label>
            <p className="text-sm text-muted-foreground mt-2 pl-9">
              Spunta questa casella solo se hai scansionato tutto il possibile e manca qualcosa.
            </p>
          </motion.div>

          {/* BOTTONE INVIO */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sticky bottom-4 mt-4">
            <button
              onClick={handleSubmitCheck}
              disabled={isSubmitting || (!isAllItemsChecked() && !materialSmarrito)}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all shadow-xl ${
                isSubmitting || (!isAllItemsChecked() && !materialSmarrito)
                  ? "bg-muted cursor-not-allowed"
                  : "btn-primary transform hover:scale-[1.02]"
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