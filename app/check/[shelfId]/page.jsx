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
  X,
  TriangleAlert,
  Download,
  Layers,
} from "lucide-react";
import useSWR from "swr";
import {
  getPartyDataForShelf,
  authenticateUser,
  submitCheck,
  reportLosses,
  reportItemDamage,
} from "@/app/actions/check-actions";

// --- FETCHER SWR ---
const fetcher = async (shelfId) => {
  const result = await getPartyDataForShelf(shelfId);
  if (result.error) throw new Error(result.error);
  return result;
};

// Fasi in cui \u00e8 permesso scansionare la categoria per spuntare tutti i sotto-elementi
const FASI_CATEGORIA_CONSENTITA = ["scaffale_furgone", "furgone_scaffale"];

// Tipi di perdita disponibili
const LOSS_TYPES = [
  { id: "mancante",   label: "Mancante",   color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "danneggiato",label: "Danneggiato",color: "bg-red-100 text-red-700 border-red-200" },
  { id: "rubato",     label: "Rubato",     color: "bg-purple-100 text-purple-700 border-purple-200" },
];

const DAMAGE_TYPE_CONFIG = {
  danneggiato: { label: "Danneggiato", badge: "bg-red-100 text-red-700 border-red-200" },
  rubato:      { label: "Rubato",      badge: "bg-purple-100 text-purple-700 border-purple-200" },
};

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Modal Danno/Rubato \u2014 si apre su un singolo item
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function DamageModal({ item, partyId, userId, onClose, onConfirmed }) {
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
        note || null
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
        {/* Header */}
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

          {/* Tipo */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
              Tipo problema
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "danneggiato", label: "Danneggiato", active: "bg-red-500 text-white border-red-500" },
                { id: "rubato",      label: "Rubato",      active: "bg-purple-500 text-white border-purple-500" },
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

          {/* Valore stimato */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-1 uppercase tracking-wide">
              Valore stimato (\u20ac) \u2014 opzionale
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

          {/* Note */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-1 uppercase tracking-wide">
              Note \u2014 opzionale
            </p>
            <textarea
              rows={2}
              placeholder="Descrivi il problema..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none bg-surface"
            />
          </div>

          {/* Bottoni */}
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

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// PAGINA PRINCIPALE
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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

  // --- MODAL DANNO/RUBATO ---
  // { item, categoryId, macroId } oppure null
  const [damageModal, setDamageModal] = useState(null);
  // Elementi gi\u00e0 segnalati durante questa sessione: { [itemId]: tipo }
  // Vengono aggiunti quando si conferma dal modal
  const [sessionReportedItems, setSessionReportedItems] = useState({});

  // --- STATI PER SEGNALAZIONE PERDITE (fase post-check) ---
  const [lossPhase, setLossPhase] = useState("idle");
  const [lastCheckId, setLastCheckId] = useState(null);
  const [lastPartyId, setLastPartyId] = useState(null);
  const [checkedItemsSnapshot, setCheckedItemsSnapshot] = useState([]);
  const [itemDamageState, setItemDamageState] = useState({});
  const [expandedDamage, setExpandedDamage] = useState({});
  const [isSubmittingLosses, setIsSubmittingLosses] = useState(false);

  // --- DATI (SWR) ---
  const {
    data,
    error: partyError,
    isLoading: isLoadingParty,
    mutate,
  } = useSWR(
    shelfId ? `party-${shelfId}` : null,
    () => (shelfId ? fetcher(shelfId) : null),
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  const partyData = data?.party;
  const existingChecks = data?.checks || [];
  const materialData = data?.materialHierarchy || [];
  const partyCompleted = data?.partyCompleted || false;
  const allPartyShelves = data?.allPartyShelves || [];
  // Perdite gi\u00e0 registrate in DB per questa festa (caricate all'avvio)
  const existingLosses = data?.existingLosses || [];

  // Set di inventory_id gi\u00e0 segnalati (da DB + da sessione corrente)
  const reportedItemIds = new Set([
    ...existingLosses.map((l) => l.inventory_id),
    ...Object.keys(sessionReportedItems),
  ]);

  // --- NFC BROADCAST LISTENER ---
  useEffect(() => {
    const channel = new BroadcastChannel("nfc_scan_channel");
    channel.onmessage = (event) => {
      if (event.data && event.data.type === "TAG_SCANNED") {
        handleNfcMatch(event.data.itemId);
      }
    };
    return () => channel.close();
  }, [materialData, checkType]);

  const handleNfcMatch = (scannedId) => {
    if (!materialData || materialData.length === 0) return;

    const categoriaConsentita = FASI_CATEGORIA_CONSENTITA.includes(checkType);
    let found = false;
    let foundName = "";

    for (const macro of materialData) {
      if (found) break;
      for (const category of macro.categories) {
        if (found) break;

        // Sotto-elemento
        const matchingItem = category.items.find((i) => i.id === scannedId);
        if (matchingItem) {
          found = true;
          foundName = matchingItem.name;
          if (matchingItem.materiale_mancante || reportedItemIds.has(matchingItem.id)) {
            alert(`\u26a0\ufe0f ATTENZIONE: ${foundName} \u00e8 segnalato come non disponibile nel sistema!`);
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

        // Categoria
        if (category.id === scannedId) {
          found = true;
          foundName = category.name;
          if (category.materiale_mancante || reportedItemIds.has(category.id)) {
            alert(`\u26a0\ufe0f ATTENZIONE: ${foundName} \u00e8 segnalato come non disponibile nel sistema!`);
            return;
          }
          const hasItems = category.items && category.items.length > 0;
          if (hasItems && !categoriaConsentita) {
            alert(`\u26d4 In questa fase devi scansionare ogni elemento singolarmente.\
Scannerizza i singoli oggetti della categoria "${category.name}".`);
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
                if (!item.materiale_mancante && !reportedItemIds.has(item.id)) {
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

  // --- EFFETTI ---
  useEffect(() => {
    if (checkType && existingChecks.length > 0) {
      setIsCheckCompleted(existingChecks.some((c) => c.type === checkType));
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
    { id: "deposito_scaffale",  name: "Carico dal Deposito allo Scaffale",  icon: Home,    color: "text-primary",   allowedRoles: ["magazziniere", "amministratore"] },
    { id: "scaffale_furgone",   name: "Carico dallo Scaffale al Furgone",   icon: Truck,   color: "text-secondary", allowedRoles: ["animatore", "magazziniere", "amministratore", "responsabile", "driver"] },
    { id: "furgone_scaffale",   name: "Scarico dal Furgone allo Scaffale",  icon: MapPin,  color: "text-accent",    allowedRoles: ["animatore", "magazziniere", "amministratore", "responsabile", "driver"] },
    { id: "scaffale_deposito",  name: "Scarico dallo Scaffale al Deposito", icon: Package, color: "text-primary",   allowedRoles: ["magazziniere", "amministratore"] },
  ];

  // --- LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const result = await authenticateUser(loginData.name.toLowerCase().trim(), loginData.code);
      if (result.error) { setLoginError(result.error); return; }
      const user = result.user;
      sessionStorage.setItem("currentUser", JSON.stringify(user));
      setCurrentUser(user);
      setUserRole(user.ruolo);
      setIsAuthenticated(true);
    } catch (error) {
      setLoginError("Errore durante l'autenticazione. Riprova.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // --- SUBMIT CHECK ---
 const handleSubmitCheck = async () => {
    if (!partyData || !currentUser || !shelfId) return;
    if (!isAllItemsChecked() && !materialSmarrito) {
      alert("Devi scansionare tutti gli elementi o spuntare 'materiale smarrito' per procedere.");
      return;
    }
    setIsSubmitting(true);
    try {
      const uncheckedItemIds = materialSmarrito ? getUncheckedItemIds() : [];

      // 1. ASSEMBLA I RISULTATI DI TUTTI GLI ELEMENTI DEL CHECK
      const itemsResults = [];
      materialData.forEach((macro) => {
        macro.categories.forEach((category) => {
          if (!category.items || category.items.length === 0) {
            // Categoria che funge da elemento singolo
            const isChecked = !!checkedItems[`${macro.id}-${category.id}`];
            const reportInfo = getReportInfo(category.id);
            
            let stato = isChecked ? 'ok' : 'mancante';
            if (!isChecked && reportInfo) stato = reportInfo.tipo; // danneggiato o rubato
            else if (!isChecked && category.materiale_mancante) stato = 'mancante';

            itemsResults.push({
              inventory_id: category.id,
              quantita_prevista: 1,
              quantita_trovata: isChecked ? 1 : 0,
              stato: stato,
              note: ""
            });
          } else {
            // Sotto-elementi della categoria
            category.items.forEach((item) => {
              const isChecked = !!checkedItems[`${macro.id}-${category.id}-${item.id}`];
              const reportInfo = getReportInfo(item.id);
              
              let stato = isChecked ? 'ok' : 'mancante';
              if (!isChecked && reportInfo) stato = reportInfo.tipo;
              else if (!isChecked && item.materiale_mancante) stato = 'mancante';

              itemsResults.push({
                inventory_id: item.id,
                quantita_prevista: 1,
                quantita_trovata: isChecked ? 1 : 0,
                stato: stato,
                note: ""
              });
            });
          }
        });
      });

      // 2. INVIA TUTTO AL DATABASE (compreso il nuovo array itemsResults)
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
        uncheckedItemIds,
        itemsResults // <--- IL NUOVO PARAMETRO
      );
      
      if (result.error) { alert(`Errore: ${result.error}`); return; }

      const snapshot = buildCheckedSnapshot();
      setLastCheckId(result.checkId);
      setLastPartyId(partyData.id);
      setCheckedItemsSnapshot(snapshot);

      const initialDamageState = {};
      snapshot.forEach((item) => {
        initialDamageState[item.inventoryId] = { enabled: false, tipo: "danneggiato", note: "", valoreStimato: "" };
      });
      setItemDamageState(initialDamageState);
      setCheckedItems({});
      setCheckType("");
      mutate();
      setLossPhase("reporting");
    } catch (error) {
      console.error(error);
      alert("Errore durante l'invio del check. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildCheckedSnapshot = () => {
    const snapshot = [];
    materialData.forEach((macro) => {
      macro.categories.forEach((category) => {
        if (!category.items || category.items.length === 0) {
          const categoryKey = `${macro.id}-${category.id}`;
          if (checkedItems[categoryKey]) {
            snapshot.push({ inventoryId: category.id, name: category.name, macroName: macro.name, categoryName: null });
          }
        } else {
          category.items.forEach((item) => {
            const itemKey = `${macro.id}-${category.id}-${item.id}`;
            if (checkedItems[itemKey] && !item.materiale_mancante) {
              snapshot.push({ inventoryId: item.id, name: item.name, macroName: macro.name, categoryName: category.name });
            }
          });
        }
      });
    });
    return snapshot;
  };

  // --- HANDLERS MODAL DANNO ---
  const openDamageModal = (e, item, category, macro) => {
    e.stopPropagation();
    setDamageModal({ item, category, macro });
  };

  const handleDamageConfirmed = (itemId, tipo) => {
    // Aggiunge alla mappa locale cos\u00ec l'elemento diventa subito disabilitato
    setSessionReportedItems((prev) => ({ ...prev, [itemId]: tipo }));
    // Rimuove dai checked se era gi\u00e0 stato checkato
    setCheckedItems((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (key.includes(itemId)) delete updated[key];
      });
      return updated;
    });
    setDamageModal(null);
    // Ricarica dati per aggiornare materiale_mancante dal server
    mutate();
  };

  // --- HANDLERS PERDITE POST-CHECK ---
  const toggleItemDamage = (inventoryId) => {
    setItemDamageState((prev) => ({
      ...prev,
      [inventoryId]: { ...prev[inventoryId], enabled: !prev[inventoryId]?.enabled },
    }));
    if (!itemDamageState[inventoryId]?.enabled) {
      setExpandedDamage((prev) => ({ ...prev, [inventoryId]: true }));
    } else {
      setExpandedDamage((prev) => ({ ...prev, [inventoryId]: false }));
    }
  };

  const updateItemDamageField = (inventoryId, field, value) => {
    setItemDamageState((prev) => ({ ...prev, [inventoryId]: { ...prev[inventoryId], [field]: value } }));
  };

  const handleSubmitLosses = async () => {
    setIsSubmittingLosses(true);
    try {
      const losses = checkedItemsSnapshot
        .filter((item) => itemDamageState[item.inventoryId]?.enabled)
        .map((item) => {
          const damage = itemDamageState[item.inventoryId];
          return { inventoryId: item.inventoryId, tipo: damage.tipo, quantita: 1, valoreStimato: damage.valoreStimato ? Number(damage.valoreStimato) : null, note: damage.note || null };
        });
      if (losses.length > 0) {
        const result = await reportLosses(lastCheckId, lastPartyId, currentUser.id, losses);
        if (result.error) { alert(`Errore nel salvataggio delle segnalazioni: ${result.error}`); return; }
      }
      setLossPhase("done");
    } catch (error) {
      alert("Errore durante il salvataggio. Riprova.");
    } finally {
      setIsSubmittingLosses(false);
    }
  };

  const damagedCount = Object.values(itemDamageState).filter((v) => v?.enabled).length;

  // --- HELPERS ---
  const getTotalItems = () => {
    let total = 0;
    if (!materialData || !Array.isArray(materialData)) return 0;
    materialData.forEach((macro) => {
      if (!macro.categories) return;
      macro.categories.forEach((category) => {
        if (!category.items || category.items.length === 0) {
          total += 1;
        } else {
          total += category.items.filter((item) => !item.materiale_mancante && !reportedItemIds.has(item.id)).length;
        }
      });
    });
    return total;
  };

  const getCheckedCount = () => Object.values(checkedItems).filter(Boolean).length;
  const getProgress = () => { const total = getTotalItems(); const checked = getCheckedCount(); return total > 0 ? (checked / total) * 100 : 0; };

  const isAllItemsChecked = () => {
    let totalSelectable = 0;
    let checkedSelectable = 0;
    materialData.forEach((macro) => {
      macro.categories.forEach((category) => {
        if (!category.items || category.items.length === 0) {
          if (!category.materiale_mancante && !reportedItemIds.has(category.id)) {
            totalSelectable++;
            if (checkedItems[`${macro.id}-${category.id}`]) checkedSelectable++;
          }
        } else {
          category.items.forEach((item) => {
            if (!item.materiale_mancante && !reportedItemIds.has(item.id)) {
              totalSelectable++;
              if (checkedItems[`${macro.id}-${category.id}-${item.id}`]) checkedSelectable++;
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
          if (!checkedItems[categoryKey] && !reportedItemIds.has(category.id)) uncheckedIds.push(category.id);
        } else {
          category.items.forEach((item) => {
            if (!item.materiale_mancante && !reportedItemIds.has(item.id)) {
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
    const eligible = category.items.filter((i) => !i.materiale_mancante && !reportedItemIds.has(i.id));
    if (eligible.length === 0) return false;
    return eligible.every((item) => checkedItems[`${macro.id}-${category.id}-${item.id}`]);
  };

  // --- DOWNLOAD LISTA MATERIALE ---
  const handleDownloadList = () => {
    if (!partyData || !materialData) return;

    const dateStr = partyData.data
      ? new Date(partyData.data + "T00:00:00").toLocaleDateString("it-IT")
      : "";

    let html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Lista Materiale - ${partyData.nome}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { font-size: 13px; color: #555; margin-bottom: 20px; }
    .macro { margin-bottom: 20px; }
    .macro-title { font-size: 15px; font-weight: bold; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; }
    .cat { margin: 8px 0 4px 12px; font-size: 13px; font-weight: 600; color: #374151; }
    .item { display: flex; align-items: center; gap: 8px; margin: 3px 0 3px 24px; font-size: 13px; }
    .check { width: 14px; height: 14px; border: 1.5px solid #9ca3af; border-radius: 3px; display: inline-block; flex-shrink: 0; }
    .missing { color: #ef4444; text-decoration: line-through; }
    .shelf-badge { background: #ede9fe; color: #7c3aed; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 99px; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <h1>${partyData.nome}</h1>
  <div class="meta">
    ${dateStr} — ${partyData.luogo}
    ${allPartyShelves.length > 0 ? ' &nbsp;|&nbsp; Scaffali: ' + allPartyShelves.map(s => '<span class="shelf-badge">#' + s + '</span>').join(' ') : ''}
  </div>`;

    for (const macro of materialData) {
      html += `
  <div class="macro">
    <div class="macro-title">${macro.name}</div>`;
      for (const cat of macro.categories || []) {
        html += `
    <div class="cat">${cat.name}</div>`;
        if (!cat.items || cat.items.length === 0) {
          const cls = cat.materiale_mancante ? ' class="item missing"' : ' class="item"';
          html += `
    <div${cls}><span class="check"></span>${cat.name}${cat.materiale_mancante ? " — MANCANTE" : ""}</div>`;
        } else {
          for (const item of cat.items) {
            const cls = item.materiale_mancante ? ' class="item missing"' : ' class="item"';
            html += `
      <div${cls}><span class="check"></span>${item.name}${item.materiale_mancante ? " — MANCANTE" : ""}</div>`;
          }
        }
      }
      html += `
  </div>`;
    }

    html += `
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lista-materiale-${partyData.nome.replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper: ottiene info segnalazione per un item (da DB o da sessione)
  const getReportInfo = (itemId) => {
    const fromSession = sessionReportedItems[itemId];
    if (fromSession) return { tipo: fromSession };
    const fromDb = existingLosses.find((l) => l.inventory_id === itemId);
    if (fromDb) return { tipo: fromDb.tipo };
    return null;
  };

  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // RENDER CONDIZIONALI
  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  if (!shelfId || isLoadingParty) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{!shelfId ? "Caricamento..." : `Caricamento festa per scaffale ${shelfId}...`}</p>
        </div>
      </div>
    );
  }

  if (partyError) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card p-8 rounded-xl border border-border max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Scaffale {shelfId}</h1>
          <p className="text-muted-foreground mb-6">Non \u00e8 stata trovata nessuna festa assegnata a questo scaffale. Contatta l'amministratore.</p>
        </motion.div>
      </div>
    );
  }

  if (partyCompleted && lossPhase === "idle") {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card p-8 rounded-xl border border-border max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Scaffale Libero</h1>
          <p className="text-muted-foreground">Tutti i check per la festa <span className="font-semibold text-foreground">"{partyData?.nome}"</span> sono stati completati. Lo scaffale <span className="font-semibold">{shelfId}</span> \u00e8 ora disponibile.</p>
        </motion.div>
      </div>
    );
  }

  if (currentUser && partyData?.animatore_id) {
    const role = currentUser.ruolo;
    const animatoriIds   = partyData.animatori_ids   || [];
    const responsabiliIds = partyData.responsabili_ids || [];
    const driversIds      = partyData.drivers_ids      || [];

    // Animatore non assegnato
    if (role === "animatore") {
      const isAssigned =
        partyData.animatore_id === currentUser.id ||
        animatoriIds.includes(currentUser.id);
      if (!isAssigned) {
        return (
          <div className="min-h-screen bg-surface flex items-center justify-center">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card p-8 rounded-xl border border-border max-w-md w-full mx-4 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Accesso Negato</h1>
              <p className="text-muted-foreground mb-6">Non sei tra gli animatori assegnati a questa festa.</p>
            </motion.div>
          </div>
        );
      }
    }

    // Responsabile non assegnato
    if (role === "responsabile" && responsabiliIds.length > 0) {
      if (!responsabiliIds.includes(currentUser.id)) {
        return (
          <div className="min-h-screen bg-surface flex items-center justify-center">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card p-8 rounded-xl border border-border max-w-md w-full mx-4 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Accesso Negato</h1>
              <p className="text-muted-foreground mb-6">Non sei tra i responsabili assegnati a questa festa.</p>
            </motion.div>
          </div>
        );
      }
    }

    // Driver non assegnato
    if (role === "driver" && driversIds.length > 0) {
      if (!driversIds.includes(currentUser.id)) {
        return (
          <div className="min-h-screen bg-surface flex items-center justify-center">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card p-8 rounded-xl border border-border max-w-md w-full mx-4 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Accesso Negato</h1>
              <p className="text-muted-foreground mb-6">Non sei tra i driver assegnati a questa festa.</p>
            </motion.div>
          </div>
        );
      }
    }
  }

  // --- LOGIN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card p-8 rounded-xl border border-border max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Accesso Scaffale {shelfId}</h1>
            <p className="text-muted-foreground">Inserisci le tue credenziali per accedere al check</p>
            {partyData && <p className="text-sm text-primary mt-2 font-medium">Festa: {partyData.nome}</p>}
          </div>
          {loginError && <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">{loginError}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
              <input type="text" value={loginData.name} onChange={(e) => setLoginData((prev) => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Il tuo nome" required disabled={isLoggingIn} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Codice di Sicurezza</label>
              <input type="password" value={loginData.code} onChange={(e) => setLoginData((prev) => ({ ...prev, code: e.target.value }))} className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Codice" required disabled={isLoggingIn} />
            </div>
            <button type="submit" className="w-full btn-primary" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Accesso in corso...</span>
                </div>
              ) : "Accedi al Check"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // FASE SEGNALAZIONE PERDITE (post-check)
  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  if (lossPhase === "reporting") {
    const groupedByMacro = {};
    checkedItemsSnapshot.forEach((item) => {
      if (!groupedByMacro[item.macroName]) groupedByMacro[item.macroName] = [];
      groupedByMacro[item.macroName].push(item);
    });

    return (
      <div className="min-h-screen bg-surface pb-28">
        <div className="containerMod py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
            <div className="bg-card p-6 rounded-xl border border-border mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Segnala Problemi</h1>
                  <p className="text-sm text-muted-foreground">Check completato \u2713 \u2014 Spunta gli elementi con problemi e specifica il tipo.</p>
                </div>
              </div>
              {damagedCount > 0 && (
                <div className="mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
                  {damagedCount} element{damagedCount === 1 ? "o segnalato" : "i segnalati"}
                </div>
              )}
            </div>

            <div className="space-y-6 mb-6">
              {Object.entries(groupedByMacro).map(([macroName, items]) => (
                <div key={macroName} className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-3 bg-surface border-b border-border flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground text-sm">{macroName}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {items.map((item) => {
                      const damageState = itemDamageState[item.inventoryId] || {};
                      const isDamaged = damageState.enabled;

                      return (
                        <div key={item.inventoryId} className="p-4">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                              {item.categoryName && <p className="text-xs text-muted-foreground">{item.categoryName}</p>}
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer shrink-0 select-none">
                              <span className={`text-xs font-semibold ${isDamaged ? "text-red-600" : "text-muted-foreground"}`}>Problema</span>
                              <div onClick={() => toggleItemDamage(item.inventoryId)} className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${isDamaged ? "bg-red-500" : "bg-gray-200"}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isDamaged ? "translate-x-5" : "translate-x-1"}`} />
                              </div>
                            </label>
                          </div>
                          <AnimatePresence>
                            {isDamaged && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="mt-3 pt-3 border-t border-border space-y-3">
                                  <div>
                                    <p className="text-xs font-medium text-foreground mb-2">Tipo problema</p>
                                    <div className="flex gap-2">
                                      {LOSS_TYPES.map((type) => (
                                        <button key={type.id} onClick={() => updateItemDamageField(item.inventoryId, "tipo", type.id)}
                                          className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all ${damageState.tipo === type.id ? type.color + " ring-1 ring-offset-1" : "bg-surface border-border text-muted-foreground"}`}>
                                          {type.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-foreground mb-1">Valore stimato (\u20ac) \u2014 opzionale</p>
                                    <input type="number" min="0" step="0.01" placeholder="es. 15.00" value={damageState.valoreStimato || ""} onChange={(e) => updateItemDamageField(item.inventoryId, "valoreStimato", e.target.value)} className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-foreground mb-1">Note \u2014 opzionale</p>
                                    <textarea rows={2} placeholder="Descrivi il problema..." value={damageState.note || ""} onChange={(e) => updateItemDamageField(item.inventoryId, "note", e.target.value)} className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none" />
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

            <div className="sticky bottom-4">
              <button onClick={handleSubmitLosses} disabled={isSubmittingLosses} className="w-full btn-primary py-4 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-xl">
                {isSubmittingLosses ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Salvataggio...</span></>) : (<><Send className="w-5 h-5" /><span>{damagedCount > 0 ? `Invia ${damagedCount} segnalazion${damagedCount === 1 ? "e" : "i"}` : "Nessun problema \u2014 Conferma"}</span></>)}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // --- FASE COMPLETATA ---
  if (lossPhase === "done") {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card p-8 rounded-xl border border-border max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Tutto Completato!</h1>
          <p className="text-muted-foreground mb-6">Check e segnalazioni salvati con successo.</p>
          <button onClick={() => { setLossPhase("idle"); setLastCheckId(null); setLastPartyId(null); setCheckedItemsSnapshot([]); setItemDamageState({}); mutate(); }} className="btn-primary w-full">
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
            <div className="bg-card p-6 rounded-xl border border-border mb-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h1 className="text-2xl font-bold text-foreground">Scaffale {shelfId}</h1>
                <button
                  onClick={handleDownloadList}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 text-sm font-medium transition-all shrink-0"
                  title="Scarica lista materiale (offline)"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Scarica lista</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Festa:</span><span className="font-medium text-foreground">{partyData.nome}</span></div>
                <div className="flex items-center space-x-2"><Clock className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Data:</span><span className="font-medium text-foreground">{new Date(partyData.data).toLocaleDateString("it-IT")}</span></div>
                <div className="flex items-center space-x-2"><MapPin className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Luogo:</span><span className="font-medium text-foreground">{partyData.luogo}</span></div>
                <div className="flex items-center space-x-2"><User className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Animatore:</span><span className="font-medium text-foreground">{partyData.animatore?.nome || "Non assegnato"}</span></div>
              </div>
              {/* Tutti gli scaffali della festa */}
              {allPartyShelves.length > 1 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> Tutti gli scaffali di questa festa
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allPartyShelves.map((s) => (
                      <span key={s}
                        className={`text-sm font-bold px-3 py-1 rounded-full border ${
                          s === shelfId
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-surface text-muted-foreground border-border"
                        }`}>
                        #{s}{s === shelfId ? " ← questo" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
                    isPreviousCompleted = existingChecks.some((check) => check.type === previousType.id);
                  }
                  const isRoleAllowed = type.allowedRoles.includes(userRole);
                  const isDisabled = isCompleted || !isPreviousCompleted || !isRoleAllowed;
                  let statusMessage = "";
                  let statusColor = "text-muted-foreground";
                  if (isCompleted) { statusMessage = "\u2713 Check gi\u00e0 completato"; statusColor = "text-green-700 font-medium"; }
                  else if (!isPreviousCompleted) { statusMessage = "\ud83d\udd12 Richiede completamento fase precedente"; statusColor = "text-amber-700 font-bold"; }
                  else if (!isRoleAllowed) { statusMessage = `\u26d4 Richiesto ruolo: ${type.allowedRoles.join(", ")}`; statusColor = "text-red-500"; }
                  else { statusMessage = `Utente: ${currentUser.nome}`; }
                  return (
                    <motion.button key={type.id} whileHover={!isDisabled ? { scale: 1.02 } : {}} whileTap={!isDisabled ? { scale: 0.98 } : {}} onClick={() => !isDisabled && setCheckType(type.id)} disabled={isDisabled}
                      className={`bg-card p-6 rounded-xl border border-border text-left relative overflow-hidden transition-all duration-200 ${isCompleted ? "opacity-60 bg-green-50 border-green-200 cursor-not-allowed" : !isPreviousCompleted ? "opacity-60 bg-gray-100 border-gray-200 grayscale cursor-not-allowed" : !isRoleAllowed ? "opacity-50 cursor-not-allowed" : "card-hover cursor-pointer"}`}>
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-surface rounded-lg flex items-center justify-center shrink-0">
                          {!isPreviousCompleted && !isCompleted ? <Lock className="w-6 h-6 text-gray-500" /> : <Icon className={`w-6 h-6 ${isCompleted ? "text-green-600" : type.color}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-foreground truncate">{type.name}</h3>
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

  // --- CHECK GI\u00c0 COMPLETATO ---
  if (isCheckCompleted) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card p-8 rounded-xl border border-border max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Check Completato</h1>
          <p className="text-muted-foreground mb-6">Questo tipo di check \u00e8 gi\u00e0 stato completato per la festa "{partyData?.nome}".</p>
          <button onClick={() => setCheckType("")} className="btn-primary w-full mb-2">Scegli Altro Check</button>
        </motion.div>
      </div>
    );
  }

  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // LISTA ITEMS (MAIN CHECK VIEW)
  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const categoriaConsentita = FASI_CATEGORIA_CONSENTITA.includes(checkType);

  return (
    <>
      <div className="min-h-screen bg-surface pb-20">
        <div className="containerMod py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">

            {/* HEADER */}
            <div className="flex items-center justify-between mb-6 sticky top-0 z-10 bg-surface py-2 backdrop-blur-sm bg-opacity-90">
              <button onClick={() => setCheckType("")} className="flex items-center space-x-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span>Cambia Tipo Check</span>
              </button>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Utente: {currentUser.nome}</p>
                <p className="text-sm text-muted-foreground">Ruolo: {userRole}</p>
                <p className="text-sm text-muted-foreground font-semibold">{checkTypes.find((t) => t.id === checkType)?.name}</p>
              </div>
            </div>

            {/* TOAST NFC */}
            <AnimatePresence>
              {lastScannedMessage && (
                <motion.div initial={{ opacity: 0, y: -50, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: -50, x: "-50%" }}
                  className="fixed top-20 left-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
                  <Wifi className="w-6 h-6 animate-pulse" />
                  <span className="font-bold text-lg">{lastScannedMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PROGRESS BAR */}
            <div className="bg-card p-6 rounded-xl border border-border mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Progresso Check</h2>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {allPartyShelves.map((s) => (
                      <span key={s} className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        s === shelfId
                          ? "bg-primary text-white border-primary"
                          : "bg-surface text-muted-foreground border-border"
                      }`}>#{s}</span>
                    ))}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{getCheckedCount()}/{getTotalItems()} completati</span>
              </div>
              <div className="w-full bg-surface rounded-full h-3">
                <motion.div initial={{ width: 0 }} animate={{ width: `${getProgress()}%` }} className="bg-primary h-3 rounded-full transition-all duration-300" />
              </div>
            </div>

            {/* LISTA MACRO CATEGORIE */}
            <div className="space-y-6">
              {materialData.map((macro) => (
                <motion.div key={macro.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card p-6 rounded-xl border border-border">
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
                            {catChecked ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                            <h4 className={`font-medium ${catChecked ? "text-green-700" : "text-foreground"}`}>{category.name}</h4>
                            {hasItems && (
                              <span className={`text-xs px-2 py-0.5 rounded ml-1 ${categoriaConsentita ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                                {categoriaConsentita ? "Scan categoria \u2713" : "Scan singoli elementi"}
                              </span>
                            )}
                            {category.materiale_mancante && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded ml-auto">Mancante</span>
                            )}
                          </div>

                          {/* Categoria senza sotto-elementi */}
                          {!hasItems ? (
                            <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                              category.materiale_mancante || reportedItemIds.has(category.id)
                                ? "opacity-50 bg-gray-100 border-gray-200"
                                : catChecked ? "bg-green-50 border-green-200 text-green-800" : "bg-surface border-border text-foreground"
                            }`}>
                              {category.materiale_mancante ? (
                                <div className="w-5 h-5 bg-gray-300 rounded-full" />
                              ) : reportedItemIds.has(category.id) ? (
                                <TriangleAlert className="w-5 h-5 text-red-500" />
                              ) : catChecked ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <ScanLine className="w-5 h-5 text-muted-foreground opacity-50" />
                              )}
                              <span className="text-sm font-medium flex-1">
                                {category.materiale_mancante ? "Mancante" : reportedItemIds.has(category.id) ? `Segnalato: ${getReportInfo(category.id)?.tipo || "problema"}` : catChecked ? "Verificato via NFC" : "In attesa di scansione NFC"}
                              </span>
                              {/* Bottone segnala danno \u2014 solo se non gi\u00e0 segnalato/mancante */}
                              {!category.materiale_mancante && !reportedItemIds.has(category.id) && (
                                <button
                                  onClick={(e) => openDamageModal(e, category, category, macro)}
                                  className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors"
                                  title="Segnala danneggiato/rubato"
                                >
                                  <TriangleAlert className="w-3.5 h-3.5" />
                                  Segnala
                                </button>
                              )}
                            </div>
                          ) : (
                            /* Categoria con sotto-elementi */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {category.items.map((item) => {
                                const itemKey = `${macro.id}-${category.id}-${item.id}`;
                                const isChecked = !!checkedItems[itemKey];
                                const isDisabled = item.materiale_mancante;
                                const isReported = reportedItemIds.has(item.id);
                                const reportInfo = getReportInfo(item.id);

                                return (
                                  <div key={item.id} className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                                    isDisabled || isReported
                                      ? "opacity-60 cursor-not-allowed bg-gray-100 border-gray-200"
                                      : isChecked ? "bg-green-50 border-green-200 text-green-800" : "bg-surface border-border text-foreground"
                                  }`}>
                                    {/* Icona stato */}
                                    {isDisabled ? (
                                      <div className="w-5 h-5 bg-gray-300 rounded-full shrink-0" />
                                    ) : isReported ? (
                                      <TriangleAlert className="w-5 h-5 text-red-500 shrink-0" />
                                    ) : isChecked ? (
                                      <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                                    ) : (
                                      <ScanLine className="w-5 h-5 text-muted-foreground opacity-50 shrink-0" />
                                    )}

                                    {/* Nome + badge stato */}
                                    <span className="text-sm font-medium flex-1 text-left min-w-0">
                                      <span className="truncate block">{item.name}</span>
                                      {isReported && reportInfo && (
                                        <span className={`inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded border font-semibold ${DAMAGE_TYPE_CONFIG[reportInfo.tipo]?.badge || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                          {DAMAGE_TYPE_CONFIG[reportInfo.tipo]?.label || reportInfo.tipo}
                                        </span>
                                      )}
                                      {isDisabled && !isReported && (
                                        <span className="inline-block mt-0.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200 font-semibold">
                                          Mancante
                                        </span>
                                      )}
                                    </span>

                                    {/* Bottone segnala \u2014 solo se non gi\u00e0 segnalato/mancante */}
                                    {!isDisabled && !isReported && (
                                      <button
                                        onClick={(e) => openDamageModal(e, item, category, macro)}
                                        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors"
                                        title="Segnala danneggiato/rubato"
                                      >
                                        <TriangleAlert className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Segnala</span>
                                      </button>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sticky bottom-20 mt-8 bg-card p-6 rounded-xl border border-border shadow-lg">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" checked={materialSmarrito} onChange={(e) => setMaterialSmarrito(e.target.checked)} className="w-6 h-6 rounded border-border text-primary focus:ring-primary" />
                <span className="font-bold text-foreground">Materiale Smarrito / Perso</span>
              </label>
              <p className="text-sm text-muted-foreground mt-2 pl-9">Spunta questa casella solo se hai scansionato tutto il possibile e manca qualcosa.</p>
            </motion.div>

            {/* BOTTONE INVIO */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sticky bottom-4 mt-4">
              <button onClick={handleSubmitCheck} disabled={isSubmitting || (!isAllItemsChecked() && !materialSmarrito)}
                className={`w-full py-4 rounded-xl font-semibold text-white transition-all shadow-xl ${isSubmitting || (!isAllItemsChecked() && !materialSmarrito) ? "bg-muted cursor-not-allowed" : "btn-primary transform hover:scale-[1.02]"}`}>
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Invio in corso...</span>
                  </div>
                ) : `Completa Check (${getCheckedCount()}/${getTotalItems()})`}
              </button>
            </motion.div>

          </motion.div>
        </div>
      </div>

      {/* MODAL DANNO/RUBATO */}
      <AnimatePresence>
        {damageModal && (
          <DamageModal
            item={damageModal.item}
            partyId={partyData?.id}
            userId={currentUser?.id}
            onClose={() => setDamageModal(null)}
            onConfirmed={handleDamageConfirmed}
          />
        )}
      </AnimatePresence>
    </>
  );
}