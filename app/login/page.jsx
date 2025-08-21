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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, User, Key, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    name: "",
    securityCode: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate authentication
    setTimeout(() => {
      setIsLoading(false);
      // For demo purposes, redirect to scanner
      router.push("/qr-scanner");
    }, 1500);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Torna alla Home</span>
          </Link>

          <div className="flex items-center justify-center space-x-2 mb-4">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-black font-montserrat text-primary">
              Material Manager
            </h1>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0 bg-card/50 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-black font-montserrat">
              Accesso al Sistema
            </CardTitle>
            <CardDescription>
              Inserisci il tuo nome e il codice di sicurezza per accedere
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nome Utente
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Inserisci il tuo nome"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="securityCode" className="text-sm font-medium">
                  Codice di Sicurezza
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="securityCode"
                    type="password"
                    placeholder="Inserisci il codice di sicurezza"
                    value={formData.securityCode}
                    onChange={(e) =>
                      handleInputChange("securityCode", e.target.value)
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !formData.name || !formData.securityCode}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  "Accedi al Sistema"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Non hai un account? Contatta l'amministratore per ottenere le
                credenziali.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Demo Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-6 p-4 bg-muted/50 rounded-lg text-center"
        >
          <p className="text-sm text-muted-foreground">
            <strong>Demo:</strong> Usa qualsiasi nome e codice per accedere al
            sistema
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
