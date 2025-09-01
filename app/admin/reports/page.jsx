"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Package,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { createBrowserClient } from "@supabase/ssr";

export default function ReportsPage() {
  const [stats, setStats] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    try {
      // Get parties count and active parties
      const { data: parties } = await supabase.from("parties").select("*");
      const activeParties =
        parties?.filter((p) => p.stato !== "scaricato_scaffale").length || 0;

      // Get total users count
      const { data: users } = await supabase.from("users").select("*");
      const totalUsers = users?.length || 0;

      // Get total checks count
      const { data: checks } = await supabase.from("checks").select("*");
      const totalChecks = checks?.length || 0;

      const usedShelves = new Set();
      parties?.forEach((party) => {
        if (party.shelves && party.stato !== "scaricato_scaffale") {
          party.shelves
            .split(",")
            .forEach((shelf) => usedShelves.add(shelf.trim()));
        }
      });
      const totalShelves = 15; // Assuming max 15 shelves
      const shelvesUsed = usedShelves.size;

      // Get notifications count (unread)
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("is_read", false);
      const unreadNotifications = notifications?.length || 0;

      setStats([
        {
          title: "Check Completati",
          value: totalChecks.toString(),
          change: "+12%",
          trend: "up",
          icon: CheckCircle,
          color: "text-success",
        },
        {
          title: "Feste Attive",
          value: activeParties.toString(),
          change: "+2",
          trend: "up",
          icon: Calendar,
          color: "text-primary",
        },
        {
          title: "Scaffali Utilizzati",
          value: `${shelvesUsed}/${totalShelves}`,
          change: `${Math.round((shelvesUsed / totalShelves) * 100)}%`,
          trend: "stable",
          icon: Package,
          color: "text-secondary",
        },
        {
          title: "Utenti Totali",
          value: totalUsers.toString(),
          change: "+3",
          trend: "up",
          icon: Users,
          color: "text-chart",
        },
      ]);

      const { data: recentNotifications } = await supabase
        .from("notifications")
        .select(
          `
          *,
          users!inner(nome)
        `
        )
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: recentChecks } = await supabase
        .from("checks")
        .select(
          `
          *,
          users!inner(nome),
          parties!inner(nome)
        `
        )
        .order("created_at", { ascending: false })
        .limit(5);

      const activityData = [
        ...(recentNotifications?.map((notification) => ({
          type: "notification",
          message: notification.title,
          user: notification.users?.nome || "Sistema",
          time: getTimeAgo(notification.created_at),
          status: notification.is_read ? "info" : "warning",
        })) || []),
        ...(recentChecks?.map((check) => ({
          type: "check_completed",
          message: `Check ${check.type} completato per ${check.parties?.nome}`,
          user: check.users?.nome || "Utente",
          time: getTimeAgo(check.created_at),
          status: "success",
        })) || []),
      ]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 10);

      setRecentActivity(activityData);
    } catch (error) {
      console.error("Error loading reports data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return "Ora";
    if (diffInMinutes < 60) return `${diffInMinutes} min fa`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ore fa`;
    return `${Math.floor(diffInMinutes / 1440)} giorni fa`;
  };

  // Mock weekly data (keeping this as requested for now)
  const weeklyData = [
    { day: "Lun", checks: 45, parties: 3 },
    { day: "Mar", checks: 52, parties: 4 },
    { day: "Mer", checks: 38, parties: 2 },
    { day: "Gio", checks: 61, parties: 5 },
    { day: "Ven", checks: 49, parties: 3 },
    { day: "Sab", checks: 73, parties: 8 },
    { day: "Dom", checks: 67, parties: 6 },
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case "notification":
        return AlertTriangle;
      case "check_completed":
        return CheckCircle;
      case "party_created":
        return Calendar;
      case "check_delayed":
        return Clock;
      case "material_added":
        return Package;
      default:
        return AlertTriangle;
    }
  };

  const getActivityColor = (status) => {
    switch (status) {
      case "success":
        return "text-success";
      case "warning":
        return "text-warning";
      case "info":
        return "text-primary";
      default:
        return "text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <main className="containerMod py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Caricamento report...</p>
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
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Report e Statistiche
            </h1>
            <p className="text-muted-foreground">
              Monitora le performance del sistema
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card p-6 rounded-xl border border-border card-hover"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {stat.value}
                      </p>
                      <div className="flex items-center space-x-1 mt-1">
                        <TrendingUp
                          className={`w-3 h-3 ${
                            stat.trend === "up"
                              ? "text-success"
                              : "text-muted-foreground"
                          }`}
                        />
                        <p className="text-xs text-muted-foreground">
                          {stat.change}
                        </p>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface">
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Activity Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card p-6 rounded-xl border border-border"
            >
              <div className="flex items-center space-x-2 mb-6">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">
                  Attività Settimanale
                </h2>
              </div>

              <div className="space-y-4">
                {weeklyData.map((day, index) => (
                  <div key={day.day} className="flex items-center space-x-4">
                    <div className="w-8 text-sm font-medium text-muted-foreground">
                      {day.day}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Check
                        </span>
                        <span className="text-xs font-medium text-foreground">
                          {day.checks}
                        </span>
                      </div>
                      <div className="w-full bg-surface rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(day.checks / 80) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Feste
                        </span>
                        <span className="text-xs font-medium text-foreground">
                          {day.parties}
                        </span>
                      </div>
                      <div className="w-full bg-surface rounded-full h-2">
                        <div
                          className="bg-secondary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(day.parties / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card p-6 rounded-xl border border-border"
            >
              <div className="flex items-center space-x-2 mb-6">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">
                  Attività Recente
                </h2>
              </div>

              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-surface transition-colors"
                    >
                      <div
                        className={`p-2 rounded-lg bg-surface ${getActivityColor(
                          activity.status
                        )}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {activity.message}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            da {activity.user}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            •
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {activity.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Performance Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card p-6 rounded-xl border border-border"
          >
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Metriche di Performance
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 relative">
                  <svg
                    className="w-20 h-20 transform -rotate-90"
                    viewBox="0 0 36 36"
                  >
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#be123c"
                      strokeWidth="2"
                      strokeDasharray="85, 100"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">
                      85%
                    </span>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground">
                  Efficienza Check
                </h3>
                <p className="text-sm text-muted-foreground">
                  Check completati in tempo
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 relative">
                  <svg
                    className="w-20 h-20 transform -rotate-90"
                    viewBox="0 0 36 36"
                  >
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2"
                      strokeDasharray={`${Math.round(
                        ((stats
                          .find((s) => s.title.includes("Scaffali"))
                          ?.value.split("/")[0] || 0) /
                          15) *
                          100
                      )}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">
                      {Math.round(
                        ((stats
                          .find((s) => s.title.includes("Scaffali"))
                          ?.value.split("/")[0] || 0) /
                          15) *
                          100
                      )}
                      %
                    </span>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground">
                  Utilizzo Scaffali
                </h3>
                <p className="text-sm text-muted-foreground">
                  Scaffali attualmente utilizzati
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 relative">
                  <svg
                    className="w-20 h-20 transform -rotate-90"
                    viewBox="0 0 36 36"
                  >
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="2"
                      strokeDasharray="85, 100"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">
                      85%
                    </span>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground">
                  Sistema Attivo
                </h3>
                <p className="text-sm text-muted-foreground">
                  Uptime del sistema
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
