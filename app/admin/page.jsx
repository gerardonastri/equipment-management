"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Package, Calendar, Users, CheckCircle, Activity } from "lucide-react";
import Navbar from "@/components/navbar";

export default function HomePage() {
  const stats = [
    {
      title: "Feste Attive",
      value: "12",
      change: "+2 questa settimana",
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-red-50",
    },
    {
      title: "Scaffali in Uso",
      value: "8/15",
      change: "53% utilizzo",
      icon: Package,
      color: "text-secondary",
      bgColor: "bg-orange-50",
    },
    {
      title: "Check Completati",
      value: "156",
      change: "+23 oggi",
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-green-50",
    },
    {
      title: "Utenti Attivi",
      value: "24",
      change: "8 online ora",
      icon: Users,
      color: "text-chart",
      bgColor: "bg-purple-50",
    },
  ];

  const quickActions = [
    {
      title: "Gestisci Inventario",
      description: "Visualizza e modifica tutto il materiale disponibile",
      href: "/inventory",
      icon: Package,
      gradient: "gradient-primary",
    },
    {
      title: "Gestisci Feste",
      description: "Crea nuove feste e assegna scaffali",
      href: "/admin/parties",
      icon: Calendar,
      gradient: "gradient-secondary",
    },
    {
      title: "Gestisci Utenti",
      description: "Aggiungi e modifica utenti del sistema",
      href: "/admin/users",
      icon: Users,
      gradient: "gradient-accent",
    },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="containerMod py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">
              Dashboard Material Manager
            </h1>
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
                      <p className="text-xs text-muted-foreground mt-1">
                        {stat.change}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">
              Azioni Rapide
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <Link href={action.href}>
                      <div className="bg-card p-6 rounded-xl border border-border card-hover group">
                        <div
                          className={`w-12 h-12 ${action.gradient} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {action.title}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {action.description}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center space-x-2 mb-4">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                Attività Recente
              </h2>
            </div>
            <div className="space-y-3">
              {[
                {
                  action: "Check completato",
                  item: "Scaffale A-12",
                  user: "Marco Rossi",
                  time: "2 min fa",
                },
                {
                  action: "Festa creata",
                  item: "Matrimonio Villa Rosa",
                  user: "Admin",
                  time: "15 min fa",
                },
                {
                  action: "Materiale aggiunto",
                  item: "Casse Audio JBL",
                  user: "Luca Bianchi",
                  time: "1 ora fa",
                },
                {
                  action: "Check completato",
                  item: "Scaffale B-05",
                  user: "Sara Verdi",
                  time: "2 ore fa",
                },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {activity.action}:{" "}
                        <span className="text-primary">{activity.item}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        da {activity.user}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
