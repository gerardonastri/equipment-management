"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  User,
  Users,
  Calendar,
  MapPin,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Search,
  Boxes,
  CheckCircle2,
  Clock,
  Truck,
  Home,
  Warehouse,
  X,
  Plus,
  ChevronDown,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import {
  getOccupiedShelves,
  getActiveParties,
  assignShelfToParty,
} from "./actions";

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  iniziale:           { label: "Iniziale",              cls: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  caricato_scaffale:  { label: "Caricato su scaffale",  cls: "bg-red-100 text-red-800 border-red-200",         icon: Warehouse },
  caricato_furgone:   { label: "Caricato nel furgone",  cls: "bg-blue-100 text-blue-800 border-blue-200",      icon: Truck },
  scaricato_furgone:  { label: "Scaricato dal furgone", cls: "bg-purple-100 text-purple-800 border-purple-200",icon: Package },
  scaricato_scaffale: { label: "Ritornato al deposito", cls: "bg-green-100 text-green-800 border-green-200",   icon: Home },
};

const LOSS_CONFIG = {
  mancante:    { label: "Mancante",    cls: "bg-orange-100 text-orange-700 border-orange-200" },
  danneggiato: { label: "Danneggiato", cls: "bg-red-100 text-red-700 border-red-200" },
  rubato:      { label: "Rubato",      cls: "bg-purple-100 text-purple-700 border-purple-200" },
};

function StatusBadge({ stato }) {
  const cfg = STATUS_CONFIG[stato] || STATUS_CONFIG.iniziale;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ─── Modal Assegna Scaffale ──────────────────────────────────────────────────

// Scaffali disponibili: 36 numerici (1-36) + 12 lettere (A-L)
const NUMERIC_SHELVES = Array.from({ length: 36 }, (_, i) => String(i + 1));
const LETTER_SHELVES = Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i));
const ALL_SHELVES = [...NUMERIC_SHELVES, ...LETTER_SHELVES];

function AssignShelfModal({ parties, occupiedShelfIds, onClose, onSuccess }) {
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [shelfValue, setShelfValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const availableShelves = ALL_SHELVES.filter((s) => !(occupiedShelfIds || new Set()).has(s));
  const availableNumeric = availableShelves.filter((s) => !isNaN(Number(s)));
  const availableLetters = availableShelves.filter((s) => isNaN(Number(s)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPartyId || !shelfValue) return;

    setLoading(true);
    setError("");

    try {
      const result = await assignShelfToParty(selectedPartyId, shelfValue);
      if (result.error) { setError(result.error); return; }
      onSuccess();
    } catch (err) {
      setError("Errore durante l'assegnazione. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Assegna Scaffale</h2>
              <p className="text-xs text-muted-foreground">Collega uno scaffale libero a una festa attiva</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
            >
              <TriangleAlert className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Scaffale</label>
            <select
              value={shelfValue}
              onChange={(e) => setShelfValue(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm bg-surface"
            >
              <option value="">Seleziona scaffale libero...</option>
              {availableNumeric.length > 0 && (
                <optgroup label="Numerici (1–36)">
                  {availableNumeric.map((s) => (
                    <option key={s} value={s}>#{s}</option>
                  ))}
                </optgroup>
              )}
              {availableLetters.length > 0 && (
                <optgroup label="Lettere (A–L)">
                  {availableLetters.map((s) => (
                    <option key={s} value={s}>#{s}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <p className="text-xs text-muted-foreground mt-1">48 scaffali totali: numerici 1–36 e lettere A–L</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Festa</label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm bg-surface"
            >
              <option value="">Seleziona una festa...</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — {new Date(p.data + "T00:00:00").toLocaleDateString("it-IT")} — {p.luogo}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-surface transition-colors">
              Annulla
            </button>
            <button type="submit" disabled={loading || !selectedPartyId || !shelfValue}
              className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Assegnando...</>
                : <><Plus className="w-4 h-4" />Assegna</>
              }
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Card Scaffale ───────────────────────────────────────────────────────────

function ShelfCard({ shelf, index }) {
  const [materialExpanded, setMaterialExpanded] = useState(false);
  const { party, material, activeLosses, shelfId } = shelf;
  const hasLosses = activeLosses.length > 0;

  // Raggruppa perdite per tipo
  const lossByType = activeLosses.reduce((acc, l) => {
    if (!acc[l.tipo]) acc[l.tipo] = [];
    acc[l.tipo].push(l);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={`bg-card rounded-2xl border overflow-hidden transition-all ${
        hasLosses ? "border-amber-300 shadow-amber-100 shadow-sm" : "border-border"
      }`}
    >
      {/* Striscia alert */}
      {hasLosses && (
        <div className="flex items-center gap-2 px-5 py-2 bg-amber-50 border-b border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-xs font-semibold text-amber-700">
            {activeLosses.length} segnalazion{activeLosses.length !== 1 ? "i" : "e"} attiv{activeLosses.length !== 1 ? "e" : "a"}
          </span>
          <div className="ml-auto flex items-center gap-1">
            {Object.entries(lossByType).map(([tipo, items]) => {
              const cfg = LOSS_CONFIG[tipo] || { label: tipo, cls: "bg-gray-100 text-gray-600 border-gray-200" };
              return (
                <span key={tipo} className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                  {items.length} {cfg.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Header: numero scaffale + stato + link check */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Numero scaffale */}
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0 border border-primary/20">
              <span className="text-xs font-bold text-primary/70 leading-none">#</span>
              <span className="text-lg font-black text-primary leading-none">{shelf.shelfNumber}</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground leading-tight">{party.nome}</h3>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 shrink-0" />
                <span>{party.luogo}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge stato={party.stato} />
            <Link href={`/check/${shelfId}`}>
              <button
                className="p-2 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                title="Vai al Check"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>

        {/* Info griglia */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-xs">Data:</span>
            <span className="font-medium text-foreground text-xs">
              {new Date(party.data + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-xs">Animatore:</span>
            <span className="font-medium text-foreground text-xs truncate">{party.animatore?.nome || "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-xs">Magazziniere:</span>
            <span className="font-medium text-foreground text-xs truncate">{party.magazziniere?.nome || "—"}</span>
          </div>
        </div>

        {/* Materiale */}
        {material.length > 0 && (
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setMaterialExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-surface hover:bg-surface/80 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  Materiale ({material.length} macro)
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${materialExpanded ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {materialExpanded && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 py-3 space-y-2.5 border-t border-border">
                    {material.map((macro) => (
                      <div key={macro.id}>
                        <p className="text-xs font-semibold text-foreground">{macro.name}</p>
                        {macro.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {macro.categories.map((cat, i) => (
                              <span key={i} className="text-xs bg-surface border border-border text-muted-foreground px-2 py-0.5 rounded-full">
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Segnalazioni attive inline */}
        {hasLosses && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Materiale con problemi
            </p>
            <div className="flex flex-wrap gap-1.5">
              {activeLosses.map((loss) => {
                const cfg = LOSS_CONFIG[loss.tipo] || { label: loss.tipo, cls: "bg-gray-100 text-gray-600 border-gray-200" };
                return (
                  <span key={loss.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${cfg.cls}`}>
                    <span className="font-semibold">{cfg.label}</span>
                    <span className="opacity-60">·</span>
                    <span>{loss.item?.name || "—"}</span>
                    {loss.valore_stimato && (
                      <>
                        <span className="opacity-60">·</span>
                        <span>€{Number(loss.valore_stimato).toFixed(2)}</span>
                      </>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── PAGINA PRINCIPALE ───────────────────────────────────────────────────────

export default function ShelvesPage() {
  const [shelves, setShelves] = useState([]);
  const [allParties, setAllParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAssignModal, setShowAssignModal] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [shelvesData, partiesData] = await Promise.all([
        getOccupiedShelves(),
        getActiveParties(),
      ]);
      setShelves(shelvesData);
      setAllParties(partiesData);
    } catch (err) {
      console.error("[v0] Error loading shelves:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  const filteredShelves = shelves.filter((shelf) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      shelf.party.nome.toLowerCase().includes(q) ||
      shelf.party.luogo.toLowerCase().includes(q) ||
      String(shelf.shelfNumber).includes(q) ||
      (shelf.party.animatore?.nome || "").toLowerCase().includes(q) ||
      (shelf.party.magazziniere?.nome || "").toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "all" || shelf.party.stato === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalOccupied = shelves.length;
  const withAlerts = shelves.filter((s) => s.activeLosses.length > 0).length;
  const byStatus = shelves.reduce((acc, s) => {
    acc[s.party.stato] = (acc[s.party.stato] || 0) + 1;
    return acc;
  }, {});

  const STATUS_FILTERS = [
    { id: "all",              label: "Tutti" },
    { id: "iniziale",         label: "Iniziale" },
    { id: "caricato_scaffale",label: "Su scaffale" },
    { id: "caricato_furgone", label: "In furgone" },
    { id: "scaricato_furgone",label: "Scaricato" },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="containerMod py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gestione Scaffali</h1>
              <p className="text-muted-foreground mt-1">
                {loading ? "Caricamento..." : `${totalOccupied} scaffal${totalOccupied === 1 ? "e occupato" : "i occupati"}`}
                {withAlerts > 0 && (
                  <span className="ml-2 text-amber-600 font-medium">
                    · {withAlerts} con segnalazioni attive
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-surface text-muted-foreground hover:text-foreground text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Aggiornando..." : "Aggiorna"}
              </button>
              <button
                onClick={() => setShowAssignModal(true)}
                className="btn-primary flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Assegna Scaffale
              </button>
            </div>
          </div>

          {/* ── Stats cards ── */}
          {!loading && shelves.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Scaffali occupati", value: totalOccupied, icon: Boxes, cls: "text-primary bg-primary/10" },
                { label: "Con segnalazioni", value: withAlerts, icon: AlertTriangle, cls: "text-amber-600 bg-amber-100" },
                { label: "In furgone", value: byStatus["caricato_furgone"] || 0, icon: Truck, cls: "text-blue-600 bg-blue-100" },
                { label: "Iniziali", value: byStatus["iniziale"] || 0, icon: Clock, cls: "text-yellow-600 bg-yellow-100" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-card rounded-xl border border-border p-4 flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.cls}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-foreground leading-none">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Filtri e ricerca ── */}
          <div className="bg-card p-4 rounded-xl border border-border space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cerca per numero scaffale, festa, luogo, animatore..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground pt-1.5">Stato:</span>
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    statusFilter === f.id
                      ? "bg-primary text-white border-primary"
                      : "bg-surface text-muted-foreground border-border hover:bg-surface/80"
                  }`}
                >
                  {f.label}
                  {f.id !== "all" && byStatus[f.id] ? ` (${byStatus[f.id]})` : ""}
                </button>
              ))}
            </div>
          </div>

          {/* ── Lista scaffali ── */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-surface shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-surface rounded-lg w-2/3" />
                      <div className="h-3 bg-surface rounded-lg w-1/2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[...Array(3)].map((_, j) => <div key={j} className="h-3 bg-surface rounded-lg" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : filteredShelves.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredShelves.map((shelf, i) => (
                <ShelfCard key={`${shelf.shelfId}-${shelf.party.id}`} shelf={shelf} index={i} />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
                <Boxes className="w-8 h-8 text-muted-foreground opacity-40" />
              </div>
              <p className="text-foreground font-medium">
                {searchTerm || statusFilter !== "all"
                  ? "Nessuno scaffale corrisponde ai filtri"
                  : "Nessuno scaffale occupato al momento"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 opacity-60">
                {searchTerm || statusFilter !== "all"
                  ? "Prova a modificare la ricerca o i filtri"
                  : "Assegna uno scaffale a una festa per iniziare"}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="btn-primary mt-5 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Assegna il primo scaffale
                </button>
              )}
            </motion.div>
          )}

        </motion.div>
      </main>

      {/* Modal assegna scaffale */}
      <AnimatePresence>
        {showAssignModal && (
          <AssignShelfModal
            parties={allParties}
            occupiedShelfIds={new Set(shelves.map((s) => s.shelfId))}
            onClose={() => setShowAssignModal(false)}
            onSuccess={() => {
              setShowAssignModal(false);
              loadData(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}