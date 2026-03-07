"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle,
  Clock,
  Truck,
  Home,
  Package,
  Warehouse,
  AlertTriangle,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { getPartyHistory } from "@/app/admin/parties/actions";

// ---- Costanti label ----
const CHECK_TYPE_LABELS = {
  deposito_scaffale: "Carico Deposito → Scaffale",
  scaffale_furgone: "Carico Scaffale → Furgone",
  furgone_scaffale: "Scarico Furgone → Scaffale",
  scaffale_deposito: "Scarico Scaffale → Deposito",
};

const CHECK_TYPE_ICONS = {
  deposito_scaffale: Home,
  scaffale_furgone: Truck,
  furgone_scaffale: Warehouse,
  scaffale_deposito: Package,
};

const CHECK_TYPE_COLORS = {
  deposito_scaffale: "bg-yellow-100 text-yellow-700 border-yellow-200",
  scaffale_furgone: "bg-blue-100 text-blue-700 border-blue-200",
  furgone_scaffale: "bg-purple-100 text-purple-700 border-purple-200",
  scaffale_deposito: "bg-green-100 text-green-700 border-green-200",
};

const LOSS_TYPE_LABELS = {
  mancante: "Mancante",
  danneggiato: "Danneggiato",
  rubato: "Rubato",
};

const LOSS_TYPE_COLORS = {
  mancante: "bg-orange-100 text-orange-700 border-orange-200",
  danneggiato: "bg-red-100 text-red-700 border-red-200",
  rubato: "bg-purple-100 text-purple-700 border-purple-200",
};

// ---- Helpers ----
function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---- Component ----
export function PartyHistoryModal({ isOpen, party, onClose }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("checks"); // "checks" | "losses"
  const [expandedCheck, setExpandedCheck] = useState(null);

  useEffect(() => {
    if (isOpen && party?.id) {
      setLoading(true);
      setHistory(null);
      setActiveTab("checks");
      setExpandedCheck(null);
      getPartyHistory(party.id)
        .then(setHistory)
        .catch((err) => {
          console.error("Error loading party history:", err);
          setHistory({ checks: [], losses: [] });
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, party?.id]);

  if (!isOpen) return null;

  const checks = history?.checks || [];
  const losses = history?.losses || [];

  // Raggruppa perdite per check_id per mostrarle vicino al check
  const lossesByCheck = {};
  losses.forEach((loss) => {
    const key = loss.check_id || "no_check";
    if (!lossesByCheck[key]) lossesByCheck[key] = [];
    lossesByCheck[key].push(loss);
  });

  const totalLossValue = losses.reduce(
    (sum, l) => sum + (l.valore_stimato || 0),
    0
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Storico Festa
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {party?.nome} —{" "}
                  {party?.data
                    ? new Date(party.data).toLocaleDateString("it-IT")
                    : ""}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border shrink-0">
              <button
                onClick={() => setActiveTab("checks")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === "checks"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Check ({checks.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab("losses")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === "losses"
                    ? "border-b-2 border-red-500 text-red-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Segnalazioni ({losses.length})
                  {losses.length > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                      !
                    </span>
                  )}
                </span>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : (
                <>
                  {/* ---- TAB CHECKS ---- */}
                  {activeTab === "checks" && (
                    <div className="space-y-4">
                      {checks.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
                          <p>Nessun check ancora effettuato</p>
                        </div>
                      ) : (
                        <>
                          {/* Progress visivo delle 4 fasi */}
                          <div className="bg-surface rounded-xl p-4 mb-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                              Avanzamento fasi
                            </p>
                            <div className="flex items-center gap-1">
                              {[
                                "deposito_scaffale",
                                "scaffale_furgone",
                                "furgone_scaffale",
                                "scaffale_deposito",
                              ].map((type, idx) => {
                                const done = checks.some(
                                  (c) => c.type === type
                                );
                                const Icon = CHECK_TYPE_ICONS[type];
                                return (
                                  <div
                                    key={type}
                                    className="flex items-center flex-1"
                                  >
                                    <div
                                      className={`flex flex-col items-center flex-1 ${
                                        done
                                          ? "opacity-100"
                                          : "opacity-30"
                                      }`}
                                    >
                                      <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                                          done
                                            ? "bg-green-100 border-green-500"
                                            : "bg-surface border-border"
                                        }`}
                                      >
                                        {done ? (
                                          <CheckCircle className="w-4 h-4 text-green-600" />
                                        ) : (
                                          <Icon className="w-4 h-4 text-muted-foreground" />
                                        )}
                                      </div>
                                      <p className="text-[10px] text-center text-muted-foreground mt-1 leading-tight max-w-[56px]">
                                        {CHECK_TYPE_LABELS[type]
                                          .split("→")[0]
                                          .trim()}
                                      </p>
                                    </div>
                                    {idx < 3 && (
                                      <div
                                        className={`h-0.5 w-4 shrink-0 ${
                                          done ? "bg-green-400" : "bg-border"
                                        }`}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Lista check */}
                          {checks.map((check) => {
                            const Icon =
                              CHECK_TYPE_ICONS[check.type] || Clock;
                            const checkLosses =
                              lossesByCheck[check.id] || [];
                            const isExpanded = expandedCheck === check.id;

                            return (
                              <div
                                key={check.id}
                                className="border border-border rounded-xl overflow-hidden"
                              >
                                {/* Riga principale check */}
                                <button
                                  onClick={() =>
                                    setExpandedCheck(
                                      isExpanded ? null : check.id
                                    )
                                  }
                                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface transition-colors"
                                >
                                  <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center border shrink-0 ${
                                      CHECK_TYPE_COLORS[check.type] ||
                                      "bg-gray-100 text-gray-600 border-gray-200"
                                    }`}
                                  >
                                    <Icon className="w-4 h-4" />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                      {CHECK_TYPE_LABELS[check.type] ||
                                        check.type}
                                    </p>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                      <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {check.user?.nome || "—"}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(check.created_at)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {check.materiale_smarrito && (
                                      <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                                        ⚠️ Smarrito
                                      </span>
                                    )}
                                    {checkLosses.length > 0 && (
                                      <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                                        {checkLosses.length} prob.
                                      </span>
                                    )}
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </div>
                                </button>

                                {/* Dettagli espandibili */}
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0 }}
                                      animate={{ height: "auto" }}
                                      exit={{ height: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="border-t border-border px-4 pb-4 pt-3 space-y-3 bg-surface/50">
                                        {check.notes && (
                                          <p className="text-sm text-muted-foreground italic">
                                            {check.notes}
                                          </p>
                                        )}

                                        {/* Perdite associate a questo check */}
                                        {checkLosses.length > 0 && (
                                          <div>
                                            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
                                              Segnalazioni in questo check
                                            </p>
                                            <div className="space-y-2">
                                              {checkLosses.map((loss) => (
                                                <div
                                                  key={loss.id}
                                                  className="flex items-start gap-2 bg-card rounded-lg p-2 border border-border"
                                                >
                                                  <span
                                                    className={`text-xs font-semibold px-2 py-0.5 rounded border shrink-0 ${
                                                      LOSS_TYPE_COLORS[
                                                        loss.tipo
                                                      ] ||
                                                      "bg-gray-100 text-gray-600 border-gray-200"
                                                    }`}
                                                  >
                                                    {LOSS_TYPE_LABELS[
                                                      loss.tipo
                                                    ] || loss.tipo}
                                                  </span>
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground">
                                                      {loss.item?.name || "—"}
                                                    </p>
                                                    {loss.note && (
                                                      <p className="text-xs text-muted-foreground mt-0.5">
                                                        {loss.note}
                                                      </p>
                                                    )}
                                                  </div>
                                                  {loss.valore_stimato && (
                                                    <span className="text-xs text-muted-foreground shrink-0">
                                                      €{loss.valore_stimato}
                                                    </span>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}

                  {/* ---- TAB SEGNALAZIONI ---- */}
                  {activeTab === "losses" && (
                    <div className="space-y-4">
                      {losses.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-40 text-green-500" />
                          <p className="font-medium text-green-700">
                            Nessun problema segnalato
                          </p>
                          <p className="text-sm mt-1">
                            Tutto il materiale è integro.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Riepilogo */}
                          <div className="grid grid-cols-3 gap-3">
                            {["mancante", "danneggiato", "rubato"].map(
                              (tipo) => {
                                const count = losses.filter(
                                  (l) => l.tipo === tipo
                                ).length;
                                return (
                                  <div
                                    key={tipo}
                                    className={`rounded-xl border p-3 text-center ${
                                      LOSS_TYPE_COLORS[tipo]
                                    }`}
                                  >
                                    <p className="text-2xl font-bold">
                                      {count}
                                    </p>
                                    <p className="text-xs font-medium capitalize">
                                      {LOSS_TYPE_LABELS[tipo]}
                                    </p>
                                  </div>
                                );
                              }
                            )}
                          </div>

                          {totalLossValue > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                              <p className="text-sm text-red-700">
                                Valore stimato totale perdite:
                              </p>
                              <p className="text-2xl font-bold text-red-700">
                                €{totalLossValue.toFixed(2)}
                              </p>
                            </div>
                          )}

                          {/* Lista perdite */}
                          <div className="space-y-2">
                            {losses.map((loss) => {
                              // Troviamo il check associato per contestualizzare
                              const associatedCheck = checks.find(
                                (c) => c.id === loss.check_id
                              );

                              return (
                                <div
                                  key={loss.id}
                                  className="bg-card border border-border rounded-xl p-4"
                                >
                                  <div className="flex items-start gap-3">
                                    <span
                                      className={`text-xs font-semibold px-2 py-1 rounded border shrink-0 ${
                                        LOSS_TYPE_COLORS[loss.tipo] ||
                                        "bg-gray-100 text-gray-600 border-gray-200"
                                      }`}
                                    >
                                      {LOSS_TYPE_LABELS[loss.tipo] || loss.tipo}
                                    </span>

                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-foreground">
                                        {loss.item?.name || "Elemento sconosciuto"}
                                      </p>

                                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                                        {loss.reporter?.nome && (
                                          <span className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {loss.reporter.nome}
                                          </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          {formatDate(loss.created_at)}
                                        </span>
                                        {associatedCheck && (
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {CHECK_TYPE_LABELS[
                                              associatedCheck.type
                                            ] || associatedCheck.type}
                                          </span>
                                        )}
                                        {loss.quantita > 1 && (
                                          <span>
                                            Qnt: {loss.quantita}
                                          </span>
                                        )}
                                      </div>

                                      {loss.note && (
                                        <p className="text-xs text-muted-foreground mt-1.5 italic bg-surface rounded px-2 py-1">
                                          "{loss.note}"
                                        </p>
                                      )}
                                    </div>

                                    {loss.valore_stimato && (
                                      <div className="shrink-0 text-right">
                                        <p className="text-sm font-bold text-red-600">
                                          €{Number(loss.valore_stimato).toFixed(2)}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}