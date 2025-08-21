"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Calendar,
  Package,
  Bell,
  Plus,
  Settings,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const [notifications] = useState([
    {
      id: 1,
      type: "check_completed",
      message:
        'Controllo carico completato per Scaffale A1 - Festa "Compleanno Marco"',
      time: "2 ore fa",
      read: false,
    },
    {
      id: 2,
      type: "festa_created",
      message: 'Nuova festa creata: "Matrimonio Sara & Luca"',
      time: "4 ore fa",
      read: false,
    },
    {
      id: 3,
      type: "check_pending",
      message: "Controllo scarico in attesa per Scaffale B2",
      time: "6 ore fa",
      read: true,
    },
  ]);

  const [feste] = useState([
    {
      id: 1,
      name: "Compleanno Marco",
      date: "2024-01-15",
      responsible: "Giuseppe Rossi",
      shelves: ["A1"],
      status: "in_progress",
    },
    {
      id: 2,
      name: "Matrimonio Sara & Luca",
      date: "2024-01-16",
      responsible: "Maria Bianchi",
      shelves: ["B2", "B3"],
      status: "pending",
    },
    {
      id: 3,
      name: "Festa Aziendale TechCorp",
      date: "2024-01-20",
      responsible: "Luca Verdi",
      shelves: ["C1"],
      status: "planned",
    },
  ]);

  const [users] = useState([
    {
      id: 1,
      name: "Giuseppe Rossi",
      role: "worker",
      securityCode: "GR2024",
      active: true,
    },
    {
      id: 2,
      name: "Maria Bianchi",
      role: "worker",
      securityCode: "MB2024",
      active: true,
    },
    {
      id: 3,
      name: "Luca Verdi",
      role: "worker",
      securityCode: "LV2024",
      active: false,
    },
    {
      id: 4,
      name: "Admin Super",
      role: "admin",
      securityCode: "ADMIN2024",
      active: true,
    },
  ]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      in_progress: { label: "In Corso", variant: "default", icon: Clock },
      pending: { label: "In Attesa", variant: "secondary", icon: AlertCircle },
      planned: { label: "Pianificata", variant: "outline", icon: Calendar },
      completed: { label: "Completata", variant: "success", icon: CheckCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Torna alla Home</span>
          </Link>

          <div className="flex items-center space-x-2">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-black font-montserrat text-primary">
              Pannello Admin
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                {notifications.filter((n) => !n.read).length}
              </Badge>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Feste Attive
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {feste.filter((f) => f.status === "in_progress").length}
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Utenti Attivi
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-secondary">
                  {users.filter((u) => u.active).length}
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Scaffali in Uso
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-chart-3">
                  {feste.reduce((acc, festa) => acc + festa.shelves.length, 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Notifiche</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-chart-4">
                  {notifications.filter((n) => !n.read).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="feste" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="feste">Gestione Feste</TabsTrigger>
              <TabsTrigger value="users">Utenti</TabsTrigger>
              <TabsTrigger value="notifications">Notifiche</TabsTrigger>
              <TabsTrigger value="settings">Impostazioni</TabsTrigger>
            </TabsList>

            {/* Feste Tab */}
            <TabsContent value="feste" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black font-montserrat">
                  Gestione Feste
                </h2>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Festa
                </Button>
              </div>

              <div className="grid gap-6">
                {feste.map((festa) => (
                  <Card
                    key={festa.id}
                    className="hover:shadow-lg transition-shadow duration-300"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl font-black font-montserrat">
                            {festa.name}
                          </CardTitle>
                          <CardDescription>
                            Data:{" "}
                            {new Date(festa.date).toLocaleDateString("it-IT")} •
                            Responsabile: {festa.responsible}
                          </CardDescription>
                        </div>
                        {getStatusBadge(festa.status)}
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Scaffali:</span>
                            <div className="flex space-x-1">
                              {festa.shelves.map((shelf) => (
                                <Badge key={shelf} variant="outline">
                                  {shelf}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            Modifica
                          </Button>
                          <Button variant="outline" size="sm">
                            Dettagli
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black font-montserrat">
                  Gestione Utenti
                </h2>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Utente
                </Button>
              </div>

              <div className="grid gap-4">
                {users.map((user) => (
                  <Card
                    key={user.id}
                    className="hover:shadow-lg transition-shadow duration-300"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{user.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Codice: {user.securityCode} • Ruolo: {user.role}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={user.active ? "default" : "secondary"}
                          >
                            {user.active ? "Attivo" : "Inattivo"}
                          </Badge>
                          <Button variant="outline" size="sm">
                            Modifica
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <h2 className="text-2xl font-black font-montserrat">
                Centro Notifiche
              </h2>

              <div className="space-y-4">
                {notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`hover:shadow-lg transition-shadow duration-300 ${
                      !notification.read ? "border-primary/20 bg-primary/5" : ""
                    }`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-2 h-2 rounded-full mt-2 ${
                              !notification.read
                                ? "bg-primary"
                                : "bg-muted-foreground"
                            }`}
                          />
                          <div>
                            <p className="font-medium">
                              {notification.message}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {notification.time}
                            </p>
                          </div>
                        </div>

                        {!notification.read && (
                          <Button variant="ghost" size="sm">
                            Segna come letto
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <h2 className="text-2xl font-black font-montserrat">
                Impostazioni Sistema
              </h2>

              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Configurazione Scaffali</CardTitle>
                    <CardDescription>
                      Gestisci la configurazione degli scaffali e QR codes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline">Configura Scaffali</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Backup e Sicurezza</CardTitle>
                    <CardDescription>
                      Gestisci backup dei dati e impostazioni di sicurezza
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-2">
                      <Button variant="outline">Esporta Dati</Button>
                      <Button variant="outline">Backup Sistema</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Notifiche</CardTitle>
                    <CardDescription>
                      Configura le notifiche del sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline">Impostazioni Notifiche</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
