"use client";

import { useState, useEffect, use } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Package,
  AlertCircle,
  Home,
  Truck,
  MapPin,
  Send,
} from "lucide-react";
import useSWR from "swr";
import {
  getPartyDataForShelf,
  authenticateUser,
  submitCheck,
  reportLosses,
  reportItemDamage,
} from "@/app/actions/check-actions";

import { FASI_CATEGORIA_CONSENTITA } from "@/components/check/constants";
import DamageModal from "@/components/check/DamageModal";
import LoadingScreen from "@/components/check/LoadingScreen";
import MessageScreen from "@/components/check/MessageScreen";
import LoginForm from "@/components/check/LoginForm";
import CheckTypeSelector from "@/components/check/CheckTypeSelector";
import LossReportingScreen from "@/components/check/LossReportingScreen";
import MaterialChecklist from "@/components/check/MaterialChecklist";

const fetcher = async (shelfId) => {
  const result = await getPartyDataForShelf(shelfId);
  if (result.error) throw new Error(result.error);
  return result;
};

export default function CheckPage({ params }) {
  const resolvedParams = use(params);
  const shelfId = resolvedParams.shelfId;

  // ── LOGICA SCAFFALE VIRTUALE (V12, VH) ──
  const isVirtualShelf =
    typeof shelfId === "string" && shelfId.toUpperCase().startsWith("V");

  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ name: "", code: "" });
  const [currentUser, setCurrentUser] = useState(null);
  const [checkType, setCheckType] = useState("");
  const [checkedItems, setCheckedItems] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [materialSmarrito, setMaterialSmarrito] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [lastScannedMessage, setLastScannedMessage] = useState(null);

  const [resumingCheckId, setResumingCheckId] = useState(null);

  const [damageModal, setDamageModal] = useState(null);
  const [sessionReportedItems, setSessionReportedItems] = useState({});

  const [lossPhase, setLossPhase] = useState("idle");
  const [lastCheckId, setLastCheckId] = useState(null);
  const [lastPartyId, setLastPartyId] = useState(null);
  const [checkedItemsSnapshot, setCheckedItemsSnapshot] = useState([]);
  const [itemDamageState, setItemDamageState] = useState({});
  const [expandedDamage, setExpandedDamage] = useState({});
  const [isSubmittingLosses, setIsSubmittingLosses] = useState(false);

  const {
    data,
    error: partyError,
    isLoading: isLoadingParty,
    mutate,
  } = useSWR(
    shelfId ? `party-${shelfId}` : null,
    () => (shelfId ? fetcher(shelfId) : null),
    { revalidateOnFocus: false, revalidateOnReconnect: true },
  );

  const partyData = data?.party;
  const existingChecks = data?.checks || [];
  const materialData = data?.materialHierarchy || [];
  const partyCompleted = data?.partyCompleted || false;
  const allPartyShelves = data?.allPartyShelves || [];
  const existingLosses = data?.existingLosses || [];

  const isSource = !!partyData?.handoff_to_party_id;
  const isDestination = !!partyData?._isHandoffDestination;

  const reportedItemIds = new Set([
    ...existingLosses.map((l) => l.inventory_id),
    ...Object.keys(sessionReportedItems),
  ]);

  // ── DEFINIZIONE DINAMICA CHECK TYPES (Fisico vs Virtuale) ──
  const baseCheckTypes = {
    deposito_scaffale: {
      id: "deposito_scaffale",
      name: "Carico dal Deposito allo Scaffale",
      icon: Home,
      color: "text-primary",
      allowedRoles: [
        "magazziniere",
        "amministratore",
        "animatore",
        "responsabile",
        "driver",
      ],
    },
    scaffale_furgone: {
      id: "scaffale_furgone",
      name: "Carico dallo Scaffale al Furgone",
      icon: Truck,
      color: "text-secondary",
      allowedRoles: ["magazziniere", "amministratore"],
    },
    furgone_scaffale: {
      id: "furgone_scaffale",
      name: "Scarico dal Furgone allo Scaffale",
      icon: MapPin,
      color: "text-accent",
      allowedRoles: [
        "animatore",
        "magazziniere",
        "amministratore",
        "responsabile",
        "driver",
      ],
    },
    scaffale_deposito: {
      id: "scaffale_deposito",
      name: "Scarico dallo Scaffale al Deposito",
      icon: Package,
      color: "text-primary",
      allowedRoles: ["magazziniere", "amministratore"],
    },
  };

  let checkTypes = [];
  if (isVirtualShelf) {
    if (isSource) {
      checkTypes.push({
        ...baseCheckTypes.furgone_scaffale,
        name: "Passaggio Materiale (Cessione)",
        icon: Send,
        color: "text-indigo-500",
      });
    }
    if (isDestination) {
      checkTypes.push({
        ...baseCheckTypes.deposito_scaffale,
        name: "Materiale Ricevuto (Handoff)",
        icon: Package,
        color: "text-violet-500",
      });
    }
  } else {
    if (isSource) {
      checkTypes.push(
        baseCheckTypes.deposito_scaffale,
        baseCheckTypes.scaffale_furgone,
      );
    } else if (isDestination) {
      checkTypes.push(
        baseCheckTypes.furgone_scaffale,
        baseCheckTypes.scaffale_deposito,
      );
    } else {
      checkTypes = Object.values(baseCheckTypes);
    }
  }

  useEffect(() => {
    const channel = new BroadcastChannel("nfc_scan_channel");
    channel.onmessage = (event) => {
      if (event.data && event.data.type === "TAG_SCANNED") {
        handleNfcMatch(event.data.itemId);
      }
    };
    return () => channel.close();
  }, [materialData, checkType, reportedItemIds]);

  const handleNfcMatch = (scannedId) => {
    if (!materialData || materialData.length === 0) return;

    const categoriaConsentita = FASI_CATEGORIA_CONSENTITA.includes(checkType);
    let found = false;
    let foundName = "";

    for (const macro of materialData) {
      if (found) break;
      for (const category of macro.categories) {
        if (found) break;

        const matchingItem = category.items.find((i) => i.id === scannedId);
        if (matchingItem) {
          found = true;
          foundName = matchingItem.name;
          if (
            matchingItem.materiale_mancante ||
            reportedItemIds.has(matchingItem.id)
          ) {
            alert(
              `⚠️ ATTENZIONE: ${foundName} è segnalato come non disponibile nel sistema!`,
            );
            return;
          }
          const itemKey = `${macro.id}-${category.id}-${matchingItem.id}`;
          setCheckedItems((prev) => {
            if (
              !prev[itemKey] &&
              typeof navigator !== "undefined" &&
              navigator.vibrate
            ) {
              navigator.vibrate([100, 50, 100]);
            }
            return { ...prev, [itemKey]: true };
          });
          break;
        }

        if (category.id === scannedId) {
          found = true;
          foundName = category.name;
          if (category.materiale_mancante || reportedItemIds.has(category.id)) {
            alert(
              `⚠️ ATTENZIONE: ${foundName} è segnalato come non disponibile nel sistema!`,
            );
            return;
          }
          const hasItems = category.items && category.items.length > 0;
          if (hasItems && !categoriaConsentita) {
            alert(
              `⛔ In questa fase devi scansionare ogni elemento singolarmente. Scannerizza i singoli oggetti della categoria "${category.name}".`,
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

  useEffect(() => {
    const savedUser = sessionStorage.getItem("currentUser");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setCurrentUser(userData);
      setUserRole(userData.ruolo);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const result = await authenticateUser(
        loginData.name.toLowerCase().trim(),
        loginData.code,
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
    } catch (error) {
      setLoginError("Errore durante l'autenticazione. Riprova.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResumeCheck = (e, typeId, checkObj) => {
    e.stopPropagation();
    setResumingCheckId(checkObj.id);
    setCheckType(typeId);

    const prefilled = {};
    const okItems = new Set(
      checkObj.check_items
        ?.filter((ci) => ci.stato === "ok")
        .map((ci) => ci.inventory_id) || [],
    );

    materialData.forEach((macro) => {
      macro.categories.forEach((cat) => {
        if (!cat.items || cat.items.length === 0) {
          if (okItems.has(cat.id)) prefilled[`${macro.id}-${cat.id}`] = true;
        } else {
          cat.items.forEach((item) => {
            if (okItems.has(item.id))
              prefilled[`${macro.id}-${cat.id}-${item.id}`] = true;
          });
        }
      });
    });
    setCheckedItems(prefilled);
  };

  const handleSubmitCheck = async () => {
    if (!partyData || !currentUser || !shelfId) return;
    if (!isAllItemsChecked() && !materialSmarrito) {
      alert(
        "Devi scansionare tutti gli elementi o spuntare 'materiale smarrito' per procedere.",
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const uncheckedItemIds = materialSmarrito ? getUncheckedItemIds() : [];

      const itemsResults = [];
      materialData.forEach((macro) => {
        macro.categories.forEach((category) => {
          if (!category.items || category.items.length === 0) {
            const isChecked = !!checkedItems[`${macro.id}-${category.id}`];
            const reportInfo = getReportInfo(category.id);

            let stato = isChecked ? "ok" : "mancante";
            if (!isChecked && reportInfo) stato = reportInfo.tipo;
            else if (!isChecked && category.materiale_mancante)
              stato = "mancante";

            itemsResults.push({
              inventory_id: category.id,
              quantita_prevista: 1,
              quantita_trovata: isChecked ? 1 : 0,
              stato: stato,
              note: "",
            });
          } else {
            category.items.forEach((item) => {
              const isChecked =
                !!checkedItems[`${macro.id}-${category.id}-${item.id}`];
              const reportInfo = getReportInfo(item.id);

              let stato = isChecked ? "ok" : "mancante";
              if (!isChecked && reportInfo) stato = reportInfo.tipo;
              else if (!isChecked && item.materiale_mancante)
                stato = "mancante";

              itemsResults.push({
                inventory_id: item.id,
                quantita_prevista: 1,
                quantita_trovata: isChecked ? 1 : 0,
                stato: stato,
                note: "",
              });
            });
          }
        });
      });

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
        itemsResults,
        resumingCheckId,
        isVirtualShelf, // <-- PASSATO AL BACKEND PER LA LOGICA HANDOFF
      );

      if (result.error) {
        alert(`Errore: ${result.error}`);
        return;
      }

      const snapshot = buildCheckedSnapshot();
      setLastCheckId(result.checkId);
      setLastPartyId(partyData.id);
      setCheckedItemsSnapshot(snapshot);

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
      setCheckedItems({});
      setCheckType("");
      setResumingCheckId(null);
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

  const openDamageModal = (e, item, category, macro) => {
    e.stopPropagation();
    setDamageModal({ item, category, macro });
  };

  const handleDamageConfirmed = (itemId, tipo) => {
    setSessionReportedItems((prev) => ({ ...prev, [itemId]: tipo }));
    setCheckedItems((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (key.includes(itemId)) delete updated[key];
      });
      return updated;
    });
    setDamageModal(null);
    mutate();
  };

  const toggleItemDamage = (inventoryId) => {
    setItemDamageState((prev) => ({
      ...prev,
      [inventoryId]: {
        ...prev[inventoryId],
        enabled: !prev[inventoryId]?.enabled,
      },
    }));
    if (!itemDamageState[inventoryId]?.enabled) {
      setExpandedDamage((prev) => ({ ...prev, [inventoryId]: true }));
    } else {
      setExpandedDamage((prev) => ({ ...prev, [inventoryId]: false }));
    }
  };

  const updateItemDamageField = (inventoryId, field, value) => {
    setItemDamageState((prev) => ({
      ...prev,
      [inventoryId]: { ...prev[inventoryId], [field]: value },
    }));
  };

  const handleSubmitLosses = async () => {
    setIsSubmittingLosses(true);
    try {
      const losses = checkedItemsSnapshot
        .filter((item) => itemDamageState[item.inventoryId]?.enabled)
        .map((item) => {
          const damage = itemDamageState[item.inventoryId];
          return {
            inventoryId: item.inventoryId,
            tipo: damage.tipo,
            quantita: 1,
            valoreStimato: damage.valoreStimato
              ? Number(damage.valoreStimato)
              : null,
            note: damage.note || null,
          };
        });
      if (losses.length > 0) {
        const result = await reportLosses(
          lastCheckId,
          lastPartyId,
          currentUser.id,
          losses,
        );
        if (result.error) {
          alert(`Errore nel salvataggio delle segnalazioni: ${result.error}`);
          return;
        }
      }
      setLossPhase("done");
    } catch (error) {
      alert("Errore durante il salvataggio. Riprova.");
    } finally {
      setIsSubmittingLosses(false);
    }
  };

  const damagedCount = Object.values(itemDamageState).filter(
    (v) => v?.enabled,
  ).length;

  const getTotalItems = () => {
    let total = 0;
    if (!materialData || !Array.isArray(materialData)) return 0;
    materialData.forEach((macro) => {
      if (!macro.categories) return;
      macro.categories.forEach((category) => {
        if (!category.items || category.items.length === 0) {
          total += 1;
        } else {
          total += category.items.filter(
            (item) => !item.materiale_mancante && !reportedItemIds.has(item.id),
          ).length;
        }
      });
    });
    return total;
  };

  const getCheckedCount = () =>
    Object.values(checkedItems).filter(Boolean).length;
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
          if (
            !category.materiale_mancante &&
            !reportedItemIds.has(category.id)
          ) {
            totalSelectable++;
            if (checkedItems[`${macro.id}-${category.id}`]) checkedSelectable++;
          }
        } else {
          category.items.forEach((item) => {
            if (!item.materiale_mancante && !reportedItemIds.has(item.id)) {
              totalSelectable++;
              if (checkedItems[`${macro.id}-${category.id}-${item.id}`])
                checkedSelectable++;
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
          if (!checkedItems[categoryKey] && !reportedItemIds.has(category.id))
            uncheckedIds.push(category.id);
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
    const eligible = category.items.filter(
      (i) => !i.materiale_mancante && !reportedItemIds.has(i.id),
    );
    if (eligible.length === 0) return false;
    return eligible.every(
      (item) => checkedItems[`${macro.id}-${category.id}-${item.id}`],
    );
  };

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
    ${allPartyShelves.length > 0 ? " &nbsp;|&nbsp; Scaffali: " + allPartyShelves.map((s) => '<span class="shelf-badge">#' + s + "</span>").join(" ") : ""}
  </div>`;

    for (const macro of materialData) {
      html += `
  <div class="macro">
    <div class="macro-title">${macro.name}</div>`;
      for (const cat of macro.categories || []) {
        html += `
    <div class="cat">${cat.name}</div>`;
        if (!cat.items || cat.items.length === 0) {
          const cls = cat.materiale_mancante
            ? ' class="item missing"'
            : ' class="item"';
          html += `
    <div${cls}><span class="check"></span>${cat.name}${cat.materiale_mancante ? " — MANCANTE" : ""}</div>`;
        } else {
          for (const item of cat.items) {
            const cls = item.materiale_mancante
              ? ' class="item missing"'
              : ' class="item"';
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

  const getReportInfo = (itemId) => {
    const fromSession = sessionReportedItems[itemId];
    if (fromSession) return { tipo: fromSession };
    const fromDb = existingLosses.find((l) => l.inventory_id === itemId);
    if (fromDb) return { tipo: fromDb.tipo };
    return null;
  };

  if (!shelfId || isLoadingParty) {
    return <LoadingScreen shelfId={shelfId} isVirtualShelf={isVirtualShelf} />;
  }

  if (partyError) {
    return (
      <MessageScreen
        icon={<Package className="w-8 h-8 text-muted-foreground" />}
        title={`Scaffale ${isVirtualShelf ? "Virtuale " : ""}${shelfId}`}
      >
        Non è stata trovata nessuna festa assegnata a questo scaffale. Contatta
        l'amministratore.
      </MessageScreen>
    );
  }

  if (partyCompleted && lossPhase === "idle") {
    return (
      <MessageScreen
        icon={<CheckCircle className="w-8 h-8 text-green-600" />}
        iconBgClass="bg-green-100"
        title="Scaffale Libero"
      >
        Tutti i check per la festa{" "}
        <span className="font-semibold text-foreground">
          "{partyData?.nome}"
        </span>{" "}
        sono stati completati. Lo scaffale{" "}
        <span className="font-semibold">
          {isVirtualShelf ? "virtuale " : ""}
          {shelfId}
        </span>{" "}
        è ora disponibile.
      </MessageScreen>
    );
  }

  // Controllo Autorizzazione Centralizzato
  if (currentUser && partyData) {
    const role = currentUser.ruolo;
    const animatoriIds = partyData.animatori_ids || [];
    const responsabiliIds = partyData.responsabili_ids || [];
    const driversIds = partyData.drivers_ids || [];

    // Verifica se l'utente è assegnato alla festa in QUALSIASI capacity
    const isAssigned =
      partyData.animatore_id === currentUser.id ||
      partyData.magazziniere_id === currentUser.id ||
      animatoriIds.includes(currentUser.id) ||
      responsabiliIds.includes(currentUser.id) ||
      driversIds.includes(currentUser.id);

    // Amministratori e magazzinieri (solitamente) necessitano di accesso globale.
    // Gli operatori sul campo vengono bloccati se non sono stati assegnati alla festa.
    if (["animatore", "responsabile", "driver"].includes(role) && !isAssigned) {
      return (
        <MessageScreen
          icon={<AlertCircle className="w-16 h-16 text-red-500" />}
          iconBgClass="bg-transparent"
          title="Accesso Negato"
        >
          Non sei assegnato a questa festa.
        </MessageScreen>
      );
    }
  }

  if (!isAuthenticated) {
    return (
      <LoginForm
        shelfId={shelfId}
        isVirtualShelf={isVirtualShelf}
        partyData={partyData}
        loginData={loginData}
        setLoginData={setLoginData}
        loginError={loginError}
        isLoggingIn={isLoggingIn}
        onSubmit={handleLogin}
      />
    );
  }

  if (lossPhase === "reporting") {
    return (
      <LossReportingScreen
        checkedItemsSnapshot={checkedItemsSnapshot}
        itemDamageState={itemDamageState}
        damagedCount={damagedCount}
        isSubmittingLosses={isSubmittingLosses}
        onToggleItemDamage={toggleItemDamage}
        onUpdateItemDamageField={updateItemDamageField}
        onSubmitLosses={handleSubmitLosses}
      />
    );
  }

  if (lossPhase === "done") {
    return (
      <MessageScreen
        icon={<CheckCircle className="w-8 h-8 text-green-600" />}
        iconBgClass="bg-green-100"
        title="Tutto Completato!"
        action={
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
        }
      >
        Check e segnalazioni salvati con successo.
      </MessageScreen>
    );
  }

  const isCurrentCheckCompleted =
    checkType &&
    existingChecks.some((c) => c.type === checkType) &&
    !resumingCheckId;

  if (isCurrentCheckCompleted) {
    return (
      <MessageScreen
        icon={<CheckCircle className="w-8 h-8 text-green-600" />}
        iconBgClass="bg-green-100"
        title="Check Completato"
        action={
          <button
            onClick={() => {
              setCheckType("");
              setResumingCheckId(null);
            }}
            className="btn-primary w-full mb-2"
          >
            Scegli Altro Check
          </button>
        }
      >
        Questo tipo di check è già stato completato per la festa "
        {partyData?.nome}".
      </MessageScreen>
    );
  }

  if (!checkType) {
    return (
      <CheckTypeSelector
        shelfId={shelfId}
        isVirtualShelf={isVirtualShelf}
        partyData={partyData}
        allPartyShelves={allPartyShelves}
        checkTypes={checkTypes}
        existingChecks={existingChecks}
        materialData={materialData}
        userRole={userRole}
        currentUser={currentUser}
        onDownloadList={handleDownloadList}
        onSelectType={setCheckType}
        onResumeCheck={handleResumeCheck}
      />
    );
  }

  const categoriaConsentita = FASI_CATEGORIA_CONSENTITA.includes(checkType);

  return (
    <>
      <MaterialChecklist
        shelfId={shelfId}
        isVirtualShelf={isVirtualShelf}
        currentUser={currentUser}
        userRole={userRole}
        checkType={checkType}
        checkTypes={checkTypes}
        resumingCheckId={resumingCheckId}
        lastScannedMessage={lastScannedMessage}
        allPartyShelves={allPartyShelves}
        materialData={materialData}
        categoriaConsentita={categoriaConsentita}
        checkedItems={checkedItems}
        reportedItemIds={reportedItemIds}
        materialSmarrito={materialSmarrito}
        isSubmitting={isSubmitting}
        isCategoryChecked={isCategoryChecked}
        getReportInfo={getReportInfo}
        getCheckedCount={getCheckedCount}
        getTotalItems={getTotalItems}
        getProgress={getProgress}
        isAllItemsChecked={isAllItemsChecked}
        onBack={() => {
          setCheckType("");
          setResumingCheckId(null);
          setCheckedItems({});
        }}
        onOpenDamageModal={openDamageModal}
        onSetMaterialSmarrito={setMaterialSmarrito}
        onSubmitCheck={handleSubmitCheck}
      />

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
