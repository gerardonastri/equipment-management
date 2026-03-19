"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Package,
  Calendar,
  Users,
  CheckCircle,
  Warehouse,
  ArrowRight,
  Truck,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Clock,
  ShoppingBag,
  Boxes,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

// ─── Contatore animato ────────────────────────────────────────────────────────
function AnimatedNumber({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = parseFloat(value) || 0;
    if (isNaN(target)) { setDisplay(value); return; }

    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <>{display}</>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ stat, index, loaded }) {
  const Icon = stat.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="bg-card rounded-2xl border border-border p-6 relative overflow-hidden group hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
    >
      {/* Decorative background blob */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.07] ${stat.blobColor} group-hover:opacity-[0.12] transition-opacity`} />

      <div className="flex items-start justify-between relative">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">{stat.title}</p>
          <p className="text-3xl font-black text-foreground mt-1 leading-none">
            {loaded
              ? stat.animated
                ? <AnimatedNumber value={stat.value} />
                : stat.value
              : <span className="inline-block w-12 h-7 bg-surface rounded-lg animate-pulse" />
            }
          </p>
          <p className={`text-xs font-medium mt-2 flex items-center gap-1 ${stat.changeColor || "text-muted-foreground"}`}>
            {stat.changeIcon && <stat.changeIcon className="w-3 h-3" />}
            {loaded ? stat.change : <span className="inline-block w-20 h-3 bg-surface rounded animate-pulse" />}
          </p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${stat.bgColor}`}>
          <Icon className={`w-5 h-5 ${stat.color}`} />
        </div>
      </div>

      {/* Progress bar opzionale */}
      {stat.progress !== undefined && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Utilizzo scaffali</span>
            <span>{stat.progress}%</span>
          </div>
          <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stat.progress}%` }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className={`h-1.5 rounded-full ${stat.progress > 80 ? "bg-red-500" : stat.progress > 50 ? "bg-amber-500" : "bg-primary"}`}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Quick Action Card ────────────────────────────────────────────────────────
function ActionCard({ action, index }) {
  const Icon = action.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + index * 0.07, duration: 0.4 }}
    >
      <Link href={action.href}>
        <div className="group bg-card rounded-2xl border border-border p-6 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer relative overflow-hidden">
          {/* Hover gradient overlay */}
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity ${action.gradient}`} />

          <div className="relative">
            <div className={`w-12 h-12 ${action.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
              {action.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{action.description}</p>
            <div className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0">
              Vai <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── PAGINA ───────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data: rpcData, error } = await supabase.rpc("get_admin_stats");
      if (error) { console.error("Errore RPC:", error); return; }
      setData(rpcData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoaded(true);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const TOTAL_SHELVES = 48; // 36 numerici + 12 lettere

  const shelvesInUse = data?.shelves_in_use ?? 0;
  const shelfPct = Math.round((shelvesInUse / TOTAL_SHELVES) * 100);

  const stats = [
    {
      title: "Feste Attive",
      value: data?.active_parties ?? 0,
      change: `${data?.total_parties ?? 0} totali nel sistema`,
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
      blobColor: "bg-primary",
      animated: true,
    },
    {
      title: "Scaffali Occupati",
      value: `${shelvesInUse}/${TOTAL_SHELVES}`,
      change: `${shelfPct}% utilizzo attuale`,
      icon: Warehouse,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      blobColor: "bg-orange-500",
      progress: shelfPct,
      animated: false,
    },
    {
      title: "Check Completati",
      value: data?.checks_count ?? 0,
      change: `+${data?.today_checks ?? 0} oggi`,
      changeColor: data?.today_checks > 0 ? "text-green-600" : "text-muted-foreground",
      changeIcon: data?.today_checks > 0 ? TrendingUp : null,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
      blobColor: "bg-green-500",
      animated: true,
    },
    {
      title: "Utenti Registrati",
      value: data?.users_count ?? 0,
      change: "Totali nel sistema",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      blobColor: "bg-purple-500",
      animated: true,
    },
  ];

  const quickActions = [
    {
      title: "Gestisci Inventario",
      description: "Visualizza, modifica e monitora tutto il materiale. Controlla mancanti e segnalazioni.",
      href: "/admin/inventory",
      icon: Package,
      gradient: "gradient-primary",
    },
    {
      title: "Gestisci Feste",
      description: "Sincronizza dal gestionale, assegna scaffali e materiale, segui lo stato di ogni evento.",
      href: "/admin/parties",
      icon: Calendar,
      gradient: "gradient-secondary",
    },
    {
      title: "Scaffali",
      description: "Panoramica in tempo reale di ogni scaffale: cosa c'è sopra, quale festa e lo stato del check.",
      href: "/admin/shelves",
      icon: Boxes,
      gradient: "gradient-accent",
    },
    {
      title: "Gestisci Utenti",
      description: "Aggiungi animatori e magazzinieri, gestisci ruoli e codici di accesso.",
      href: "/admin/users",
      icon: Users,
      gradient: "bg-gradient-to-br from-purple-500 to-indigo-600",
    },
  ];

  // Feste con stato per la timeline rapida
  const statusSummary = loaded && data ? [
    { label: "In Attesa",         value: data.parties_by_status?.iniziale ?? 0,          color: "bg-yellow-400", stato: "iniziale" },
    { label: "Su Scaffale",       value: data.parties_by_status?.caricato_scaffale ?? 0, color: "bg-red-400",    stato: "caricato_scaffale" },
    { label: "In Furgone",        value: data.parties_by_status?.caricato_furgone ?? 0,  color: "bg-blue-400",   stato: "caricato_furgone" },
    { label: "Scaricato",         value: data.parties_by_status?.scaricato_furgone ?? 0, color: "bg-purple-400", stato: "scaricato_furgone" },
  ] : [];

  const totalStatusParties = statusSummary.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="containerMod py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xs font-semibold text-primary uppercase tracking-widest mb-1"
              >
                Pannello di Controllo
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="text-3xl font-black text-foreground"
              >
                Movida Manager
              </motion.h1>
              {lastUpdate && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-xs text-muted-foreground mt-1 flex items-center gap-1"
                >
                  <Clock className="w-3 h-3" />
                  Aggiornato alle {lastUpdate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </motion.p>
              )}
            </div>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-surface text-muted-foreground hover:text-foreground text-sm font-medium transition-all disabled:opacity-50 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Aggiornando..." : "Aggiorna"}
            </motion.button>
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <StatCard key={stat.title} stat={stat} index={i} loaded={loaded} />
            ))}
          </div>

          {/* ── Pipeline feste (barra di stato) ── */}
          {loaded && statusSummary.some((s) => s.value > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card rounded-2xl border border-border p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Pipeline Feste</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Distribuzione per stato attuale</p>
                </div>
                <Link href="/admin/parties">
                  <button className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                    Vedi tutte <ArrowRight className="w-3 h-3" />
                  </button>
                </Link>
              </div>

              {/* Barra segmentata */}
              <div className="flex rounded-full overflow-hidden h-3 mb-4 bg-surface gap-0.5">
                {statusSummary.map((s) =>
                  s.value > 0 ? (
                    <motion.div
                      key={s.stato}
                      initial={{ width: 0 }}
                      animate={{ width: `${(s.value / totalStatusParties) * 100}%` }}
                      transition={{ delay: 0.5, duration: 0.7 }}
                      className={`${s.color} h-full first:rounded-l-full last:rounded-r-full`}
                      title={`${s.label}: ${s.value}`}
                    />
                  ) : null
                )}
              </div>

              {/* Legenda */}
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {statusSummary.map((s) => (
                  <div key={s.stato} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                    <span>{s.label}</span>
                    <span className="font-bold text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Quick Actions ── */}
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-between mb-4"
            >
              <h2 className="text-lg font-bold text-foreground">Accesso Rapido</h2>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, i) => (
                <ActionCard key={action.href} action={action} index={i} />
              ))}
            </div>
          </div>

          {/* ── Link Scaffali rapido (se ci sono scaffali occupati) ── */}
          {loaded && shelvesInUse > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Link href="/admin/shelves">
                <div className="group bg-card rounded-2xl border border-border p-5 hover:border-primary/30 hover:shadow-lg transition-all flex items-center gap-4 cursor-pointer">
                  <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm">
                      {shelvesInUse} scaffal{shelvesInUse === 1 ? "e occupato" : "i occupati"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Clicca per vedere il materiale caricato su ogni scaffale
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
              </Link>
            </motion.div>
          )}

        </motion.div>
      </main>
    </div>
  );
}