"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  MapPin,
  User,
  Users,
  Package,
  Edit,
  Trash2,
  ExternalLink,
  History,
  AlertTriangle,
  Building2,
  Tag,
  FileText,
} from "lucide-react";
import Link from "next/link";

const LOSS_TYPE_CONFIG = {
  mancante: {
    label: "Mancante",
    className: "bg-orange-100 text-orange-700 border-orange-200",
    dot: "bg-orange-400",
  },
  danneggiato: {
    label: "Danneggiato",
    className: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-400",
  },
  rubato: {
    label: "Rubato",
    className: "bg-purple-100 text-purple-700 border-purple-200",
    dot: "bg-purple-400",
  },
};

export function PartyCard({
  party,
  onEdit,
  onDelete,
  onMaterial,
  onHistory,
  getStatusColor,
  getStatusText,
  getStatusIcon,
  // allUsers è opzionale: se passato, risolve i nomi da animatori_ids
  allUsers = [],
}) {
  const firstShelf = party.shelves ? party.shelves.split(",")[0].trim() : null;

  const losses          = party._losses || [];
  const hasLosses       = losses.length > 0;
  const hasMissingMaterial = party._hasMissingMaterial;
  const showAlert       = hasLosses || hasMissingMaterial;

  const countByType = losses.reduce((acc, l) => {
    acc[l.tipo] = (acc[l.tipo] || 0) + 1;
    return acc;
  }, {});

  // ── Risolvi nomi animatori ──────────────────────────────────────────────────
  // Strategia: se animatori_ids è popolato, usa quelli (con risoluzione nomi da allUsers).
  // Fallback: campo join animatore?.nome (legacy).
  const animatoriIds = Array.isArray(party.animatori_ids) ? party.animatori_ids : [];

  let animatoriNomi = [];
  if (animatoriIds.length > 0 && allUsers.length > 0) {
    // Risolve da allUsers
    animatoriNomi = animatoriIds
      .map((id) => allUsers.find((u) => u.id === id)?.nome)
      .filter(Boolean);
  } else if (animatoriIds.length > 0) {
    // allUsers non passato, ma abbiamo gli id: mostra count generico
    animatoriNomi = [`${animatoriIds.length} animator${animatoriIds.length > 1 ? "i" : "e"}`];
  } else if (party.animatore?.nome) {
    // Legacy: singolo animatore dal join
    animatoriNomi = [party.animatore.nome];
  }

  const animatoriLabel = animatoriNomi.length > 0
    ? animatoriNomi.join(", ")
    : "Non assegnato";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-xl border card-hover transition-all overflow-hidden ${
        showAlert ? "border-amber-300" : "border-border"
      }`}
    >
      {/* Striscia allerta */}
      {showAlert && (
        <div className="flex items-center gap-2 px-6 py-2 bg-amber-50 border-b border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs font-semibold text-amber-700">
            {hasLosses && hasMissingMaterial
              ? `${losses.length} segnalazion${losses.length !== 1 ? "i" : "e"} — include materiale mancante`
              : hasLosses
              ? `${losses.length} segnalazion${losses.length !== 1 ? "i" : "e"} di perdita/danno`
              : "Materiale mancante segnalato"}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            {Object.entries(countByType).map(([tipo, count]) => {
              const cfg = LOSS_TYPE_CONFIG[tipo] || {};
              return (
                <span key={tipo} className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.className}`}>
                  {count} {cfg.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            {/* Nome + stato + badge */}
            <div className="flex items-center flex-wrap gap-2 mb-3">
              <h3 className="text-xl font-semibold text-foreground">{party.nome}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(party.stato)}`}>
                {getStatusIcon(party.stato)}
                <span>{getStatusText(party.stato)}</span>
              </span>
              {party.categoria_evento && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                  <Tag className="w-3 h-3" />
                  {party.categoria_evento}
                </span>
              )}
            </div>

            {/* Cliente */}
            {party.cliente && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-surface rounded-lg border border-border">
                <Building2 className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground">Cliente:</span>
                <span className="text-sm font-semibold text-foreground">{party.cliente}</span>
              </div>
            )}

            {/* Info griglia */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium text-foreground">
                  {new Date(party.data + "T00:00:00").toLocaleDateString("it-IT")}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Luogo:</span>
                <span className="font-medium text-foreground">{party.luogo}</span>
              </div>

              {/* ── Animatori — mostra tutti ── */}
              <div className="flex items-start space-x-2 md:col-span-2 lg:col-span-1">
                <User className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground shrink-0">
                  {animatoriIds.length > 1 ? "Animatori:" : "Animatore:"}
                </span>
                <span className={`font-medium ${animatoriNomi.length === 0 ? "text-muted-foreground italic" : "text-foreground"}`}>
                  {animatoriLabel}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Magazziniere:</span>
                <span className="font-medium text-foreground">
                  {party.magazziniere?.nome || "Non assegnato"}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Scaffali:</span>
                <span className="font-medium text-foreground">
                  {party.shelves
                    ? party.shelves.split(",").map((s) => `#${s.trim()}`).join(", ")
                    : "Nessuno"}
                </span>
              </div>
            </div>

            {party.note && (
              <p className="text-sm text-muted-foreground mt-3 italic">{party.note}</p>
            )}

            {party.servizi && (
              <div className="mt-3 p-3 bg-surface rounded-lg border border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Note Servizi
                </p>
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                  {party.servizi}
                </p>
              </div>
            )}

            {/* Perdite inline */}
            {hasLosses && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Materiale con problemi
                </p>
                <div className="flex flex-wrap gap-2">
                  {losses.map((loss) => {
                    const cfg = LOSS_TYPE_CONFIG[loss.tipo] || {
                      label: loss.tipo,
                      className: "bg-gray-100 text-gray-600 border-gray-200",
                      dot: "bg-gray-400",
                    };
                    return (
                      <div key={loss.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${cfg.className}`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                        <span className="font-semibold">{cfg.label}</span>
                        <span className="opacity-70">·</span>
                        <span>{loss.item?.name || "—"}</span>
                        {loss.valore_stimato && (
                          <>
                            <span className="opacity-70">·</span>
                            <span>€{Number(loss.valore_stimato).toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bottoni */}
          <div className="flex items-center space-x-2 lg:self-start">
            {firstShelf && (
              <Link href={`/check/${firstShelf}`}>
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors" title="Vai al Check">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </Link>
            )}
            <button
              onClick={() => onHistory(party)}
              className={`p-2 rounded-lg transition-colors relative ${
                hasLosses ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-muted-foreground hover:text-foreground hover:bg-surface"
              }`}
              title="Storico Check e Perdite"
            >
              <History className="w-4 h-4" />
              {hasLosses && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full border border-card" />
              )}
            </button>
            <button onClick={() => onMaterial(party)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors" title="Gestisci Materiale">
              <Package className="w-4 h-4" />
            </button>
            <button onClick={() => onEdit(party)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors" title="Modifica Festa">
              <Edit className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(party.id)} className="p-2 text-muted-foreground hover:text-danger hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}