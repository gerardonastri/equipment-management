"use client";

import { motion } from "framer-motion";
import { Package } from "lucide-react";

export default function LoginForm({
  shelfId,
  isVirtualShelf,
  partyData,
  loginData,
  setLoginData,
  loginError,
  isLoggingIn,
  onSubmit,
}) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card p-8 rounded-xl border border-border max-w-md w-full mx-4"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Accesso {isVirtualShelf ? "Scaffale Virtuale" : "Scaffale"} {shelfId}
          </h1>
          <p className="text-muted-foreground">
            Inserisci le tue credenziali per accedere al check
          </p>
          {partyData && (
            <p className="text-sm text-primary mt-2 font-medium">
              Festa: {partyData.nome}
            </p>
          )}
        </div>
        {loginError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
            {loginError}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nome
            </label>
            <input
              type="text"
              value={loginData.name}
              onChange={(e) =>
                setLoginData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Il tuo nome"
              required
              disabled={isLoggingIn}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Codice di Sicurezza
            </label>
            <input
              type="password"
              value={loginData.code}
              onChange={(e) =>
                setLoginData((prev) => ({ ...prev, code: e.target.value }))
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Codice"
              required
              disabled={isLoggingIn}
            />
          </div>
          <button
            type="submit"
            className="w-full btn-primary"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Accesso in corso...</span>
              </div>
            ) : (
              "Accedi al Check"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
