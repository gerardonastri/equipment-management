"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, BarChart3, Calendar } from "lucide-react";
import Navbar from "@/components/navbar";
import { supabase } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("30d");
  const [loading, setLoading] = useState(true);

  const [checksOverTimeData, setChecksOverTimeData] = useState([]);
  const [checkTypeDistributionData, setCheckTypeDistributionData] = useState(
    []
  );
  const [userActivityData, setUserActivityData] = useState([]);
  const [partyStatusData, setPartyStatusData] = useState([]);
  const [materialeSmaritoCount, setMaterialeSmaritoCount] = useState(0);
  const [totalChecks, setTotalChecks] = useState(0);
  const [totalParties, setTotalParties] = useState(0);

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(false);

      const now = new Date();
      const startDate = new Date();
      if (dateRange === "30d") startDate.setDate(now.getDate() - 30);
      else if (dateRange === "6m") startDate.setMonth(now.getMonth() - 6);
      else if (dateRange === "1y") startDate.setFullYear(now.getFullYear() - 1);

      const { data: checks } = await supabase
        .from("checks")
        .select("*, users(nome, ruolo), parties(nome)")
        .gte("created_at", startDate.toISOString())
        .order("created_at");

      const { data: parties } = await supabase
        .from("parties")
        .select("*")
        .gte("created_at", startDate.toISOString());

      const checksTimeline = generateChecksOverTime(checks || [], dateRange);
      setChecksOverTimeData(checksTimeline);

      const typeDistribution = calculateCheckTypeDistribution(checks || []);
      setCheckTypeDistributionData(typeDistribution);

      const userActivity = calculateUserActivity(checks || []);
      setUserActivityData(userActivity);

      const partyStatus = calculatePartyStatusDistribution(parties || []);
      setPartyStatusData(partyStatus);

      const smaritoCount =
        checks?.filter((c) => c.materiale_smarrito === true).length || 0;
      setMaterialeSmaritoCount(smaritoCount);
      setTotalChecks(checks?.length || 0);
      setTotalParties(parties?.length || 0);
    } catch (error) {
      console.error("[v0] Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateChecksOverTime = (checks, range) => {
    const periods = range === "30d" ? 30 : range === "6m" ? 26 : 52;
    const groupBy = range === "30d" ? "day" : "week";
    const data = [];

    for (let i = periods; i >= 0; i--) {
      const date = new Date();
      if (groupBy === "day") {
        date.setDate(date.getDate() - i);
      } else {
        date.setDate(date.getDate() - i * 7);
      }

      const nextDate = new Date(date);
      if (groupBy === "day") {
        nextDate.setDate(nextDate.getDate() + 1);
      } else {
        nextDate.setDate(nextDate.getDate() + 7);
      }

      const checksInPeriod = checks.filter((c) => {
        const checkDate = new Date(c.created_at);
        return checkDate >= date && checkDate < nextDate;
      });

      const checksWithSmarito = checksInPeriod.filter(
        (c) => c.materiale_smarrito === true
      ).length;

      data.push({
        period:
          groupBy === "day"
            ? date.toLocaleDateString("it-IT", {
                day: "2-digit",
                month: "short",
              })
            : `Sett ${52 - i}`,
        checks: checksInPeriod.length,
        conProblemi: checksWithSmarito,
      });
    }

    return data.slice(-Math.min(periods, data.length));
  };

  const calculateCheckTypeDistribution = (checks) => {
    const checkTypeNames = {
      deposito_scaffale: "Deposito → Scaffale",
      scaffale_furgone: "Scaffale → Furgone",
      furgone_scaffale: "Furgone → Scaffale",
      scaffale_deposito: "Scaffale → Deposito",
    };

    const distribution = {};
    checks.forEach((check) => {
      const typeName = checkTypeNames[check.type] || check.type;
      distribution[typeName] = (distribution[typeName] || 0) + 1;
    });

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value: value,
      color: getColorForCheckType(name),
    }));
  };

  const getColorForCheckType = (type) => {
    if (type.includes("Deposito → Scaffale")) return "#3b82f6";
    if (type.includes("Scaffale → Furgone")) return "#8b5cf6";
    if (type.includes("Furgone → Scaffale")) return "#f97316";
    if (type.includes("Scaffale → Deposito")) return "#16a34a";
    return "#64748b";
  };

  const calculateUserActivity = (checks) => {
    const userCheckCount = {};

    checks.forEach((check) => {
      const userName = check.users?.nome || "Sconosciuto";
      const userRole = check.users?.ruolo || "";
      const key = `${userName} (${userRole})`;

      if (!userCheckCount[key]) {
        userCheckCount[key] = 0;
      }
      userCheckCount[key]++;
    });

    return Object.entries(userCheckCount)
      .map(([name, count]) => ({
        name,
        checks: count,
      }))
      .sort((a, b) => b.checks - a.checks)
      .slice(0, 10);
  };

  const calculatePartyStatusDistribution = (parties) => {
    const statusNames = {
      iniziale: "Iniziale",
      caricato_scaffale: "Caricato Scaffale",
      caricato_furgone: "Caricato Furgone",
      scaricato_furgone: "Scaricato Furgone",
      scaricato_scaffale: "Scaricato Scaffale",
    };

    const statusColors = {
      iniziale: "#64748b",
      caricato_scaffale: "#3b82f6",
      caricato_furgone: "#8b5cf6",
      scaricato_furgone: "#f97316",
      scaricato_scaffale: "#16a34a",
    };

    const distribution = {};
    parties.forEach((party) => {
      const status = party.stato || "iniziale";
      distribution[status] = (distribution[status] || 0) + 1;
    });

    return Object.entries(distribution).map(([status, value]) => ({
      name: statusNames[status] || status,
      value: value,
      color: statusColors[status] || "#64748b",
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <main className="containerMod py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Caricamento analisi...</p>
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Analisi e Statistiche
              </h1>
              <p className="text-muted-foreground">
                Monitora l'attività dei check, feste e utenti
              </p>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center space-x-2 bg-card border border-border rounded-lg p-1">
              <button
                onClick={() => setDateRange("30d")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateRange === "30d"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                30 Giorni
              </button>
              <button
                onClick={() => setDateRange("6m")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateRange === "6m"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                6 Mesi
              </button>
              <button
                onClick={() => setDateRange("1y")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateRange === "1y"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                1 Anno
              </button>
            </div>
          </div>

          {/* Summary Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Check Totali
                      </p>
                      <p className="text-3xl font-bold text-foreground mt-2">
                        {totalChecks}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Nel periodo selezionato
                      </p>
                    </div>
                    <BarChart3 className="w-10 h-10 text-primary opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Feste Gestite
                      </p>
                      <p className="text-3xl font-bold text-foreground mt-2">
                        {totalParties}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Nel periodo selezionato
                      </p>
                    </div>
                    <Calendar className="w-10 h-10 text-primary opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Check con Materiale Smarrito
                      </p>
                      <p className="text-3xl font-bold text-danger mt-2">
                        {materialeSmaritoCount}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {totalChecks > 0
                          ? `${(
                              (materialeSmaritoCount / totalChecks) *
                              100
                            ).toFixed(1)}%`
                          : "0%"}{" "}
                        del totale
                      </p>
                    </div>
                    <AlertTriangle className="w-10 h-10 text-danger opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Checks Over Time */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-chart" />
                    <CardTitle>Attività Check nel Tempo</CardTitle>
                  </div>
                  <CardDescription>
                    Traccia il numero di check eseguiti e quelli con problemi
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={checksOverTimeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="period"
                        stroke="#64748b"
                        style={{ fontSize: "12px" }}
                      />
                      <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="checks"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Check Totali"
                        dot={{ fill: "#3b82f6" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="conProblemi"
                        stroke="#dc2626"
                        strokeWidth={2}
                        name="Con Materiale Smarrito"
                        dot={{ fill: "#dc2626" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* 2. Check Type Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <CardTitle>Distribuzione Tipi di Check</CardTitle>
                  </div>
                  <CardDescription>
                    Visualizza quali tipi di check vengono eseguiti più
                    frequentemente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {checkTypeDistributionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={checkTypeDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name.split(" → ")[0]} ${(percent * 100).toFixed(
                              0
                            )}%`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {checkTypeDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Nessun dato disponibile
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* 3. User Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-success" />
                    <CardTitle>Attività Utenti</CardTitle>
                  </div>
                  <CardDescription>
                    Top utenti per numero di check eseguiti
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {userActivityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={userActivityData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          type="number"
                          stroke="#64748b"
                          style={{ fontSize: "12px" }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          stroke="#64748b"
                          style={{ fontSize: "12px" }}
                          width={150}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="checks"
                          fill="#16a34a"
                          name="Check Eseguiti"
                          radius={[0, 8, 8, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Nessun dato disponibile
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* 4. Party Status Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <CardTitle>Stato delle Feste</CardTitle>
                  </div>
                  <CardDescription>
                    Distribuzione delle feste per stato
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {partyStatusData.length > 0 ? (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={partyStatusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {partyStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "white",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="space-y-3">
                        {partyStatusData.map((entry, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-3"
                          >
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: entry.color }}
                            />
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {entry.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {entry.value} feste
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                      Nessun dato disponibile
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
