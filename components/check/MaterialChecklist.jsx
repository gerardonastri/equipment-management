"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Wifi,
  AlertTriangle,
  Package,
  CheckCircle,
  Circle,
  ScanLine,
  TriangleAlert,
} from "lucide-react";
import { DAMAGE_TYPE_CONFIG } from "./constants";

export default function MaterialChecklist({
  shelfId,
  isVirtualShelf,
  currentUser,
  userRole,
  checkType,
  checkTypes,
  resumingCheckId,
  lastScannedMessage,
  allPartyShelves,
  materialData,
  categoriaConsentita,
  checkedItems,
  reportedItemIds,
  materialSmarrito,
  isSubmitting,
  isCategoryChecked,
  getReportInfo,
  getCheckedCount,
  getTotalItems,
  getProgress,
  isAllItemsChecked,
  onBack,
  onOpenDamageModal,
  onSetMaterialSmarrito,
  onSubmitCheck,
}) {
  return (
    <div className="min-h-screen bg-surface pb-20">
      <div className="containerMod py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="flex items-center justify-between mb-6 sticky top-0 z-10 bg-surface py-2 backdrop-blur-sm bg-opacity-90">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Cambia Tipo Check</span>
            </button>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                Utente: {currentUser.nome}
              </p>
              <p className="text-sm text-muted-foreground">Ruolo: {userRole}</p>
              <p className="text-sm text-muted-foreground font-semibold">
                {checkTypes.find((t) => t.id === checkType)?.name}
              </p>
            </div>
          </div>

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

          {resumingCheckId && (
            <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-3 rounded-xl mb-6 flex items-start gap-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="text-sm font-bold">
                  Stai modificando un check già completato
                </p>
                <p className="text-xs mt-0.5">
                  I materiali verificati in precedenza sono pre-selezionati.
                  Scansiona il materiale dimenticato/aggiunto e premi Completa
                  per aggiornare l'elenco nel server.
                </p>
              </div>
            </div>
          )}

          <div className="bg-card p-6 rounded-xl border border-border mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Progresso Check
                </h2>
                <div className="flex flex-wrap gap-1 mt-1">
                  {allPartyShelves.map((s) => {
                    const currentBase = isVirtualShelf
                      ? shelfId.substring(1)
                      : shelfId;
                    return (
                      <span
                        key={s}
                        className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          s === currentBase
                            ? "bg-primary text-white border-primary"
                            : "bg-surface text-muted-foreground border-border"
                        }`}
                      >
                        #{s}
                      </span>
                    );
                  })}
                </div>
              </div>
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
                  {macro.categories.map((category) => {
                    const catChecked = isCategoryChecked(macro, category);
                    const hasItems = category.items && category.items.length > 0;

                    return (
                      <div
                        key={category.id}
                        className="border border-border rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          {catChecked ? (
                            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                          <h4
                            className={`font-medium ${catChecked ? "text-green-700" : "text-foreground"}`}
                          >
                            {category.name}
                          </h4>
                          {hasItems && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded ml-1 ${categoriaConsentita ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}
                            >
                              {categoriaConsentita
                                ? "Scan categoria ✓"
                                : "Scan singoli elementi"}
                            </span>
                          )}
                          {category.materiale_mancante && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded ml-auto">
                              Mancante
                            </span>
                          )}
                        </div>

                        {!hasItems ? (
                          <div
                            className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                              category.materiale_mancante ||
                              reportedItemIds.has(category.id)
                                ? "opacity-50 bg-gray-100 border-gray-200"
                                : catChecked
                                  ? "bg-green-50 border-green-200 text-green-800"
                                  : "bg-surface border-border text-foreground"
                            }`}
                          >
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
                              {category.materiale_mancante
                                ? "Mancante"
                                : reportedItemIds.has(category.id)
                                  ? `Segnalato: ${getReportInfo(category.id)?.tipo || "problema"}`
                                  : catChecked
                                    ? "Verificato via NFC"
                                    : "In attesa di scansione NFC"}
                            </span>
                            {!category.materiale_mancante &&
                              !reportedItemIds.has(category.id) && (
                                <button
                                  onClick={(e) =>
                                    onOpenDamageModal(e, category, category, macro)
                                  }
                                  className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors"
                                  title="Segnala danneggiato/rubato"
                                >
                                  <TriangleAlert className="w-3.5 h-3.5" />
                                  Segnala
                                </button>
                              )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {category.items.map((item) => {
                              const itemKey = `${macro.id}-${category.id}-${item.id}`;
                              const isChecked = !!checkedItems[itemKey];
                              const isDisabled = item.materiale_mancante;
                              const isReported = reportedItemIds.has(item.id);
                              const reportInfo = getReportInfo(item.id);

                              return (
                                <div
                                  key={item.id}
                                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                                    isDisabled || isReported
                                      ? "opacity-60 cursor-not-allowed bg-gray-100 border-gray-200"
                                      : isChecked
                                        ? "bg-green-50 border-green-200 text-green-800"
                                        : "bg-surface border-border text-foreground"
                                  }`}
                                >
                                  {isDisabled ? (
                                    <div className="w-5 h-5 bg-gray-300 rounded-full shrink-0" />
                                  ) : isReported ? (
                                    <TriangleAlert className="w-5 h-5 text-red-500 shrink-0" />
                                  ) : isChecked ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                                  ) : (
                                    <ScanLine className="w-5 h-5 text-muted-foreground opacity-50 shrink-0" />
                                  )}

                                  <span className="text-sm font-medium flex-1 text-left min-w-0">
                                    <span className="truncate block">
                                      {item.name}
                                    </span>
                                    {isReported && reportInfo && (
                                      <span
                                        className={`inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded border font-semibold ${DAMAGE_TYPE_CONFIG[reportInfo.tipo]?.badge || "bg-gray-100 text-gray-600 border-gray-200"}`}
                                      >
                                        {DAMAGE_TYPE_CONFIG[reportInfo.tipo]
                                          ?.label || reportInfo.tipo}
                                      </span>
                                    )}
                                    {isDisabled && !isReported && (
                                      <span className="inline-block mt-0.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200 font-semibold">
                                        Mancante
                                      </span>
                                    )}
                                  </span>

                                  {!isDisabled && !isReported && (
                                    <button
                                      onClick={(e) =>
                                        onOpenDamageModal(e, item, category, macro)
                                      }
                                      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors"
                                      title="Segnala danneggiato/rubato"
                                    >
                                      <TriangleAlert className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">
                                        Segnala
                                      </span>
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

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="sticky bottom-20 mt-8 bg-card p-6 rounded-xl border border-border shadow-lg"
          >
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={materialSmarrito}
                onChange={(e) => onSetMaterialSmarrito(e.target.checked)}
                className="w-6 h-6 rounded border-border text-primary focus:ring-primary"
              />
              <span className="font-bold text-foreground">
                Materiale Smarrito / Perso
              </span>
            </label>
            <p className="text-sm text-muted-foreground mt-2 pl-9">
              Spunta questa casella solo se hai scansionato tutto il possibile e
              manca qualcosa.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="sticky bottom-4 mt-4"
          >
            <button
              onClick={onSubmitCheck}
              disabled={isSubmitting || (!isAllItemsChecked() && !materialSmarrito)}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all shadow-xl ${isSubmitting || (!isAllItemsChecked() && !materialSmarrito) ? "bg-muted cursor-not-allowed" : "btn-primary transform hover:scale-[1.02]"}`}
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
