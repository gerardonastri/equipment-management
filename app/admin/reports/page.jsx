"use client";

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

export default function ReportsPage() {
  // Mock data for reports
  const stats = [
    {
      title: "Check Completati Oggi",
      value: "23",
      change: "+15%",
      trend: "up",
      icon: CheckCircle,
      color: "text-success",
    },
    {
      title: "Feste Attive",
      value: "12",
      change: "+2",
      trend: "up",
      icon: Calendar,
      color: "text-primary",
    },
    {
      title: "Scaffali Utilizzati",
      value: "8/15",
      change: "53%",
      trend: "stable",
      icon: Package,
      color: "text-secondary",
    },
    {
      title: "Utenti Attivi",
      value: "24",
      change: "+3",
      trend: "up",
      icon: Users,
      color: "text-chart",
    },
  ];

  const recentActivity = [
    {
      type: "check_completed",
      message: "Check completato per Scaffale A-12",
      user: "Marco Rossi",
      time: "2 min fa",
      status: "success",
    },
    {
      type: "party_created",
      message: "Nuova festa creata: Matrimonio Villa Rosa",
      user: "Admin",
      time: "15 min fa",
      status: "info",
    },
    {
      type: "check_delayed",
      message: "Check in ritardo per Scaffale B-05",
      user: "Sara Verdi",
      time: "1 ora fa",
      status: "warning",
    },
    {
      type: "material_added",
      message: "Nuovo materiale aggiunto: Casse Audio JBL",
      user: "Luca Bianchi",
      time: "2 ore fa",
      status: "info",
    },
  ];

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      strokeDasharray="92, 100"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">
                      92%
                    </span>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground">
                  Utilizzo Scaffali
                </h3>
                <p className="text-sm text-muted-foreground">
                  Scaffali utilizzati
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
                      strokeDasharray="78, 100"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">
                      78%
                    </span>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground">Soddisfazione</h3>
                <p className="text-sm text-muted-foreground">
                  Feedback positivi
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
