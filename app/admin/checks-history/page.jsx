"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  History,
  Search,
  Filter,
  Calendar,
  User,
  Package,
  CheckCircle,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { createBrowserClient } from "@supabase/ssr";

export default function ChecksHistoryPage() {
  const [checks, setChecks] = useState([]);
  const [filteredChecks, setFilteredChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

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
      const { data: checksData } = await supabase
        .from("checks")
        .select(
          `
          *,
          users!inner(nome, ruolo),
          parties!inner(nome, data, luogo)
        `
        )
        .order("created_at", { ascending: false });

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
              <p className="text-muted-foreground">
                Caricamento storico check...
              </p>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Storico Check
              </h1>
              <p className="text-muted-foreground">
                Visualizza tutti i check completati
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                {filteredChecks.length} check trovati
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Cerca per festa, utente o luogo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
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
            {filteredChecks.map((check, index) => (
              <motion.div
                key={check.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card p-6 rounded-xl border border-border card-hover"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <h3 className="text-lg font-semibold text-foreground">
                        {check.parties.nome}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getCheckTypeColor(
                          check.type
                        )}`}
                      >
                        {getCheckTypeLabel(check.type)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Operatore:
                        </span>
                        <span className="font-medium text-foreground">
                          {check.users.nome}
                        </span>
                        <span className="text-xs bg-surface px-2 py-1 rounded">
                          {check.users.ruolo}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Data:</span>
                        <span className="font-medium text-foreground">
                          {formatDate(check.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Luogo festa:
                        </span>
                        <span className="font-medium text-foreground">
                          {check.parties.luogo}
                        </span>
                      </div>
                    </div>

                    {check.notes && (
                      <div className="bg-surface p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Note:</strong> {check.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredChecks.length === 0 && (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nessun check trovato
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterType !== "all"
                    ? "Prova a modificare i filtri di ricerca"
                    : "Non ci sono ancora check completati"}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
