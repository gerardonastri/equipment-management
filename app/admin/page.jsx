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
        // Count total parties
        const { count: partiesCount } = await supabase
          .from("parties")
          .select("*", { count: "exact", head: true });

        // Count parties that are not "scaricato_scaffale" (active parties)
        const { count: activePartiesCount } = await supabase
          .from("parties")
          .select("*", { count: "exact", head: true })
          .neq("stato", "scaricato_scaffale");

        // Count total users
        const { count: usersCount } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true });

        // Count total checks
        const { count: checksCount } = await supabase
          .from("checks")
          .select("*", { count: "exact", head: true });

        // Count checks from today
        const today = new Date().toISOString().split("T")[0];
        const { count: todayChecksCount } = await supabase
          .from("checks")
          .select("*", { count: "exact", head: true })
          .gte("created_at", today);

        // Count unique shelves in use (from parties with shelves)
        const { data: partiesWithShelves } = await supabase
          .from("parties")
          .select("shelves")
          .not("shelves", "is", null)
          .neq("stato", "scaricato_scaffale");

        const uniqueShelves = new Set();
        partiesWithShelves?.forEach((party) => {
          if (party.shelves) {
            const shelves = party.shelves.split(",");
            shelves.forEach((shelf) => uniqueShelves.add(shelf.trim()));
          }
        });

        const shelvesInUse = uniqueShelves.size;
        const totalShelves = 15; // Assuming 15 total shelves
        const shelfUsagePercent = Math.round(
          (shelvesInUse / totalShelves) * 100
        );

        // Update stats with real data
        setStats([
          {
            title: "Feste Attive",
            value: (activePartiesCount || 0).toString(),
            change: `${partiesCount || 0} totali`,
            icon: Calendar,
            color: "text-primary",
            bgColor: "bg-red-50",
          },
          {
            title: "Scaffali in Uso",
            value: `${shelvesInUse}/${totalShelves}`,
            change: `${shelfUsagePercent}% utilizzo`,
            icon: Package,
            color: "text-secondary",
            bgColor: "bg-orange-50",
          },
          {
            title: "Check Completati",
            value: (checksCount || 0).toString(),
            change: `+${todayChecksCount || 0} oggi`,
            icon: CheckCircle,
            color: "text-success",
            bgColor: "bg-green-50",
          },
          {
            title: "Utenti Attivi",
            value: (usersCount || 0).toString(),
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
      href: "/inventory",
      icon: Package,
      gradient: "gradient-primary",
    },
    {
      title: "Gestisci Feste",
      description: "Crea nuove feste e assegna scaffali",
      href: "/parties",
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
