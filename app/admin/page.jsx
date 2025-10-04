"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Package, Calendar, Users, CheckCircle } from "lucide-react";
import Navbar from "@/components/navbar";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export default function HomePage() {
  const [stats, setStats] = useState([
    {
      title: "Feste Attive",
      value: "0",
      change: "Caricamento...",
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-red-50",
    },
    {
      title: "Scaffali in Uso",
      value: "0/15",
      change: "0% utilizzo",
      icon: Package,
      color: "text-secondary",
      bgColor: "bg-orange-50",
    },
    {
      title: "Check Completati",
      value: "0",
      change: "Caricamento...",
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-green-50",
    },
    {
      title: "Utenti Attivi",
      value: "0",
      change: "Caricamento...",
      icon: Users,
      color: "text-chart",
      bgColor: "bg-purple-50",
    },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.rpc("get_admin_stats");

        if (error) {
          console.error("Errore RPC get_admin_stats:", error);
          return;
        }

        // dati ritornati dalla funzione SQL
        const {
          total_parties,
          active_parties,
          users_count,
          checks_count,
          today_checks,
          shelves_in_use,
        } = data;

        const totalShelves = 15;
        const shelfUsagePercent = Math.round(
          (shelves_in_use / totalShelves) * 100
        );

        setStats([
          {
            title: "Feste Attive",
            value: String(active_parties),
            change: `${total_parties} totali`,
            icon: Calendar,
            color: "text-primary",
            bgColor: "bg-red-50",
          },
          {
            title: "Scaffali in Uso",
            value: `${shelves_in_use}/${totalShelves}`,
            change: `${shelfUsagePercent}% utilizzo`,
            icon: Package,
            color: "text-secondary",
            bgColor: "bg-orange-50",
          },
          {
            title: "Check Completati",
            value: String(checks_count),
            change: `+${today_checks} oggi`,
            icon: CheckCircle,
            color: "text-success",
            bgColor: "bg-green-50",
          },
          {
            title: "Utenti Attivi",
            value: String(users_count),
            change: "Totali registrati",
            icon: Users,
            color: "text-chart",
            bgColor: "bg-purple-50",
          },
        ]);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, []);

  const quickActions = [
    {
      title: "Gestisci Inventario",
      description: "Visualizza e modifica tutto il materiale disponibile",
      href: "/admin/inventory",
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
        </motion.div>
      </main>
    </div>
  );
}
