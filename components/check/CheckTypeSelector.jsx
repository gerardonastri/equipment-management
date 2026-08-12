"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Download,
  Layers,
  Lock,
  RefreshCw,
} from "lucide-react";

export default function CheckTypeSelector({
  shelfId,
  isVirtualShelf,
  partyData,
  allPartyShelves,
  checkTypes,
  existingChecks,
  materialData,
  userRole,
  currentUser,
  onDownloadList,
  onSelectType,
  onResumeCheck,
}) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="containerMod py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-card p-6 rounded-xl border border-border mb-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h1 className="text-2xl font-bold text-foreground">
                {isVirtualShelf ? "Scaffale Virtuale" : "Scaffale"}{" "}
                {shelfId.toUpperCase()}
              </h1>
              <button
                onClick={onDownloadList}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 text-sm font-medium transition-all shrink-0"
                title="Scarica lista materiale (offline)"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Scarica lista</span>
              </button>
            </div>
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
            {allPartyShelves.length > 1 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Tutti gli scaffali di
                  questa festa
                </p>
                <div className="flex flex-wrap gap-2">
                  {allPartyShelves.map((s) => (
                    <span
                      key={s}
                      className={`text-sm font-bold px-3 py-1 rounded-full border ${
                        s.toLowerCase() === shelfId.toLowerCase()
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-surface text-muted-foreground border-border"
                      }`}
                    >
                      #{s}
                      {s === (isVirtualShelf ? shelfId.substring(1) : shelfId)
                        ? " ← questo"
                        : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              Seleziona il tipo di check
            </h2>

            {checkTypes.length === 0 && (
              <div className="p-4 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium border border-amber-200">
                Questa festa non prevede passaggi di materiale (Handoff),
                oppure lo scaffale virtuale non è applicabile.
              </div>
            )}

            <div className="grid gap-4">
              {checkTypes.map((type, index) => {
                const Icon = type.icon;
                const isAdmin = userRole === "amministratore";

                const completedCheckObj = existingChecks.find(
                  (check) => check.type === type.id,
                );
                const isCompleted = !!completedCheckObj;

                // --- NUOVA LOGICA: Rilevamento materiale aggiunto post-check ---
                let isFullyCompleted = isCompleted;
                if (isCompleted) {
                  // Raccoglie tutti gli ID degli oggetti già spuntati in questo check
                  const checkedItemIds = new Set(
                    completedCheckObj.check_items?.map(
                      (ci) => ci.inventory_id,
                    ) || [],
                  );
                  let hasNewUncheckedItems = false;

                  // Controlla se esiste almeno un pezzo nel materialData attuale non presente nel check salvato
                  materialData.forEach((macro) => {
                    macro.categories.forEach((cat) => {
                      if (!cat.items || cat.items.length === 0) {
                        if (!checkedItemIds.has(cat.id))
                          hasNewUncheckedItems = true;
                      } else {
                        cat.items.forEach((item) => {
                          if (!checkedItemIds.has(item.id))
                            hasNewUncheckedItems = true;
                        });
                      }
                    });
                  });

                  if (hasNewUncheckedItems) {
                    isFullyCompleted = false;
                  }
                }
                // ----------------------------------------------------------------

                let isPreviousCompleted = true;
                if (index > 0) {
                  const previousType = checkTypes[index - 1];
                  isPreviousCompleted = existingChecks.some(
                    (check) => check.type === previousType.id,
                  );
                }

                const isRoleAllowed = type.allowedRoles.includes(userRole);
                const isDisabled =
                  (isCompleted && isFullyCompleted && !isAdmin) ||
                  !isPreviousCompleted ||
                  !isRoleAllowed;

                let statusMessage = "";
                let statusColor = "text-muted-foreground";

                if (isCompleted && isFullyCompleted) {
                  statusMessage = "✓ Check già completato";
                  statusColor = "text-green-700 font-medium";
                } else if (isCompleted && !isFullyCompleted) {
                  statusMessage =
                    "⚠️ Nuovo materiale aggiunto! Clicca per aggiornare";
                  statusColor = "text-amber-700 font-bold";
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
                  <motion.div
                    key={type.id}
                    whileHover={!isDisabled ? { scale: 1.01 } : {}}
                    whileTap={!isDisabled ? { scale: 0.99 } : {}}
                    onClick={(e) => {
                      if (isDisabled) return;
                      if (isCompleted && !isFullyCompleted) {
                        // Se è incompleto, apre automaticamente in modalità Resume
                        onResumeCheck(e, type.id, completedCheckObj);
                      } else if (!isCompleted) {
                        onSelectType(type.id);
                      }
                    }}
                    className={`bg-card p-6 rounded-xl border border-border text-left relative overflow-hidden transition-all duration-200 ${
                      isCompleted && isFullyCompleted && !isAdmin
                        ? "opacity-60 bg-green-50 border-green-200"
                        : isCompleted && isFullyCompleted && isAdmin
                          ? "border-green-300 shadow-sm"
                          : isCompleted && !isFullyCompleted
                            ? "bg-amber-50 border-amber-300 shadow-md card-hover cursor-pointer"
                            : !isPreviousCompleted
                              ? "opacity-60 bg-gray-100 border-gray-200 grayscale"
                              : !isRoleAllowed
                                ? "opacity-50"
                                : "card-hover cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                          isCompleted && isFullyCompleted
                            ? "bg-green-100"
                            : isCompleted && !isFullyCompleted
                              ? "bg-amber-100"
                              : "bg-surface"
                        }`}
                      >
                        {!isPreviousCompleted && !isCompleted ? (
                          <Lock className="w-6 h-6 text-gray-500" />
                        ) : (
                          <Icon
                            className={`w-6 h-6 ${
                              isCompleted && isFullyCompleted
                                ? "text-green-600"
                                : isCompleted && !isFullyCompleted
                                  ? "text-amber-600"
                                  : type.color
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground truncate">
                          {type.name}
                        </h3>
                        <p className={`text-sm truncate ${statusColor}`}>
                          {statusMessage}
                        </p>
                      </div>
                    </div>

                    {/* TASTO SBLOCCA - SOLO AMMINISTRATORI (Mostrato solo se il check è fully completed) */}
                    {isCompleted && isFullyCompleted && isAdmin && (
                      <div className="mt-4 pt-3 border-t border-green-200/50 flex justify-end">
                        <button
                          onClick={(e) =>
                            onResumeCheck(e, type.id, completedCheckObj)
                          }
                          className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Sblocca e
                          Aggiungi Materiale
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
