"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Search,
  Filter,
  Calendar,
  User,
  Package,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Box,
  AlertTriangle,
  Check
} from "lucide-react";
import Navbar from "@/components/navbar";
import { createBrowserClient } from "@supabase/ssr";

export default function ChecksHistoryPage() {
  const [checks, setChecks] = useState([]);
  const [filteredChecks, setFilteredChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  
  // Stato per gestire l'apertura a fisarmonica dei check
  const [expandedChecks, setExpandedChecks] = useState({});

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    loadChecksHistory();
  }, []);

  useEffect(() => {
    filterChecks();
  }, [checks, searchTerm, filterType]);

  const loadChecksHistory = async () => {
    try {
      // Aggiunta la relazione check_items -> inventory_items per recuperare il materiale
      const { data: checksData, error } = await supabase
        .from("checks")
        .select(`
          *,
          users!inner(nome, ruolo),
          parties!inner(nome, data, luogo),
          check_items (
            id,
            quantita_prevista,
            quantita_trovata,
            stato,
            note,
            inventory_items (
              name,
              image_url
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setChecks(checksData || []);
    } catch (error) {
      console.error("Error loading checks history:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterChecks = () => {
    let filtered = checks;

    if (searchTerm) {
      filtered = filtered.filter(
        (check) =>
          check.parties.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          check.users.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          check.parties.luogo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter((check) => check.type === filterType);
    }

    setFilteredChecks(filtered);
  };

  const toggleCheck = (checkId) => {
    setExpandedChecks((prev) => ({
      ...prev,
      [checkId]: !prev[checkId],
    }));
  };

  const getCheckTypeLabel = (type) => {
    const types = {
      deposito_scaffale: "Deposito → Scaffale",
      scaffale_furgone: "Scaffale → Furgone",
      furgone_scaffale: "Furgone → Scaffale",
      scaffale_deposito: "Scaffale → Deposito",
    };
    return types[type] || type;
  };

  const getCheckTypeColor = (type) => {
    const colors = {
      deposito_scaffale: "bg-blue-100 text-blue-800",
      scaffale_furgone: "bg-orange-100 text-orange-800",
      furgone_scaffale: "bg-green-100 text-green-800",
      scaffale_deposito: "bg-purple-100 text-purple-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const getItemStatusUI = (stato) => {
    switch (stato) {
      case "mancante":
        return <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-md"><AlertTriangle className="w-3 h-3"/> Mancante</span>;
      case "danneggiato":
        return <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md"><AlertTriangle className="w-3 h-3"/> Danneggiato</span>;
      case "parziale":
        return <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-md">Parziale</span>;
      default:
        return <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-md"><Check className="w-3 h-3"/> OK</span>;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <main className="containerMod py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Caricamento storico check...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="containerMod py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Storico Check</h1>
              <p className="text-muted-foreground">Visualizza tutti i check completati e i materiali verificati</p>
            </div>
            <div className="flex items-center space-x-2 bg-card px-4 py-2 rounded-xl border border-border shadow-sm">
              <History className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">{filteredChecks.length} <span className="font-normal text-muted-foreground">check trovati</span></span>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cerca per festa, utente o luogo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-surface"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-surface"
                >
                  <option value="all">Tutti i tipi</option>
                  <option value="deposito_scaffale">Deposito → Scaffale</option>
                  <option value="scaffale_furgone">Scaffale → Furgone</option>
                  <option value="furgone_scaffale">Furgone → Scaffale</option>
                  <option value="scaffale_deposito">Scaffale → Deposito</option>
                </select>
              </div>
            </div>
          </div>

          {/* Checks List */}
          <div className="space-y-4">
            {filteredChecks.map((check, index) => {
              const isExpanded = !!expandedChecks[check.id];
              const hasItems = check.check_items && check.check_items.length > 0;

              return (
                <motion.div
                  key={check.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-card rounded-xl border transition-all duration-200 ${isExpanded ? "border-primary/40 shadow-md" : "border-border hover:border-border/80"}`}
                >
                  {/* Card Header (Cliccabile) */}
                  <div 
                    onClick={() => toggleCheck(check.id)}
                    className="p-5 cursor-pointer flex items-start justify-between group"
                  >
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <h3 className="text-lg font-bold text-foreground">{check.parties.nome}</h3>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] uppercase tracking-wider font-bold ${getCheckTypeColor(check.type)}`}>
                          {getCheckTypeLabel(check.type)}
                        </span>
                        {check.materiale_smarrito && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] uppercase tracking-wider font-bold bg-red-100 text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3"/> Anomalie
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>Operatore:</span>
                          <span className="font-semibold text-foreground">{check.users.nome}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Data:</span>
                          <span className="font-semibold text-foreground">{formatDate(check.created_at)}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Package className="w-4 h-4" />
                          <span>Luogo:</span>
                          <span className="font-semibold text-foreground line-clamp-1">{check.parties.luogo}</span>
                        </div>
                      </div>

                      {check.notes && (
                        <p className="text-sm text-muted-foreground mt-2 bg-surface p-2.5 rounded-lg border border-border/50">
                          <strong className="text-foreground">Note:</strong> {check.notes}
                        </p>
                      )}
                    </div>
                    
                    {/* Toggle Button */}
                    <div className="ml-4 flex items-center justify-center w-8 h-8 rounded-full bg-surface text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded Material Section */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden border-t border-border bg-surface/30 rounded-b-xl"
                      >
                        <div className="p-5">
                          <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                            <Box className="w-4 h-4 text-primary" /> 
                            Materiale Verificato ({check.check_items?.length || 0})
                          </h4>
                          
                          {hasItems ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {check.check_items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg shadow-sm">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 rounded-md bg-surface border border-border flex items-center justify-center shrink-0 overflow-hidden">
                                      {item.inventory_items?.image_url ? (
                                        <img src={item.inventory_items.image_url} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <Package className="w-4 h-4 text-muted-foreground opacity-50" />
                                      )}
                                    </div>
                                    <div className="truncate text-sm font-medium text-foreground">
                                      {item.inventory_items?.name || "Articolo rimosso"}
                                      <div className="text-[10px] text-muted-foreground font-normal">
                                        Q.tà: {item.quantita_trovata} / {item.quantita_prevista}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="shrink-0 ml-3">
                                    {getItemStatusUI(item.stato)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-surface rounded-xl border border-dashed border-border">
                              <p className="text-sm text-muted-foreground">Nessun dettaglio materiale salvato per questo check.</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {filteredChecks.length === 0 && (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-1">Nessun check trovato</h3>
                <p className="text-sm text-muted-foreground">Modifica i filtri o cerca un termine diverso.</p>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}