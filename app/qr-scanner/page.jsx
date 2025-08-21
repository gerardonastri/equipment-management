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
import { QrCode, Scan, ArrowLeft, Package, Calendar, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function QRScannerPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const router = useRouter();

  // Mock shelf data
  const mockShelves = {
    A1: {
      id: "A1",
      festa: {
        name: "Compleanno Marco",
        date: "2024-01-15",
        responsible: "Giuseppe Rossi",
        status: "carico_pending",
      },
    },
    B2: {
      id: "B2",
      festa: {
        name: "Matrimonio Sara & Luca",
        date: "2024-01-16",
        responsible: "Maria Bianchi",
        status: "scarico_pending",
      },
    },
    C3: {
      id: "C3",
      festa: null,
    },
  };

  const handleScan = () => {
    setIsScanning(true);

    // Simulate QR code scanning
    setTimeout(() => {
      const shelfIds = Object.keys(mockShelves);
      const randomShelf = shelfIds[Math.floor(Math.random() * shelfIds.length)];
      setScannedData(mockShelves[randomShelf]);
      setIsScanning(false);
    }, 2000);
  };

  const handleProceedToCheck = () => {
    if (scannedData?.festa) {
      router.push(
        `/check/${scannedData.id}?status=${scannedData.festa.status}`
      );
    }
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
            <QrCode className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-black font-montserrat text-primary">
              Scanner QR
            </h1>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Scanner Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-2xl font-black font-montserrat">
                  Scansiona QR Code Scaffale
                </CardTitle>
                <CardDescription>
                  Posiziona il QR code dello scaffale davanti alla fotocamera
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Scanner Area */}
                <div className="relative mx-auto w-64 h-64 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  {isScanning ? (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{
                        duration: 1,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                      className="text-primary"
                    >
                      <Scan className="h-16 w-16" />
                    </motion.div>
                  ) : (
                    <QrCode className="h-16 w-16 text-muted-foreground" />
                  )}

                  {/* Scanning overlay */}
                  {isScanning && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                      className="absolute inset-0 bg-primary/10 rounded-lg"
                    />
                  )}
                </div>

                <Button
                  onClick={handleScan}
                  disabled={isScanning}
                  size="lg"
                  className="w-full"
                >
                  {isScanning ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "linear",
                        }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Scansionando...
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4 mr-2" />
                      Avvia Scansione
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Scanned Result */}
          {scannedData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-black font-montserrat">
                      Scaffale {scannedData.id} Scansionato
                    </CardTitle>
                    <Badge variant="secondary">
                      <Package className="w-3 h-3 mr-1" />
                      {scannedData.id}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {scannedData.festa ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Festa Assegnata</span>
                          </div>
                          <p className="text-lg font-semibold text-primary">
                            {scannedData.festa.name}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Responsabile</span>
                          </div>
                          <p className="text-lg">
                            {scannedData.festa.responsible}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="font-medium">Data Festa</span>
                        <p className="text-lg">
                          {new Date(scannedData.festa.date).toLocaleDateString(
                            "it-IT"
                          )}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <span className="font-medium">Stato Attuale</span>
                        <Badge
                          variant={
                            scannedData.festa.status.includes("pending")
                              ? "destructive"
                              : "default"
                          }
                        >
                          {scannedData.festa.status === "carico_pending" &&
                            "In attesa di carico"}
                          {scannedData.festa.status === "scarico_pending" &&
                            "In attesa di scarico"}
                          {scannedData.festa.status === "completed" &&
                            "Completato"}
                        </Badge>
                      </div>

                      <Button
                        onClick={handleProceedToCheck}
                        className="w-full"
                        size="lg"
                      >
                        Procedi al Controllo
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">
                        Scaffale Libero
                      </h3>
                      <p className="text-muted-foreground">
                        Questo scaffale non ha feste assegnate al momento
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Instructions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg font-montserrat">
                  Istruzioni
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    • Assicurati che il QR code sia ben visibile e illuminato
                  </li>
                  <li>
                    • Mantieni il dispositivo stabile durante la scansione
                  </li>
                  <li>
                    • Se la scansione fallisce, riprova dopo alcuni secondi
                  </li>
                  <li>• Ogni scaffale ha un QR code unico per identificarlo</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
