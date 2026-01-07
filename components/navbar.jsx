"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  Bell,
  Users,
  Calendar,
  BarChart3,
  LogOut,
  Menu,
  X,
  History,
  ChartBar,
} from "lucide-react";
import { useAdmin } from "@/components/admin-client-provider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAdmin();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/admin/inventory", label: "Inventario", icon: Package },
    { href: "/admin/parties", label: "Feste", icon: Calendar },
    { href: "/admin/users", label: "Utenti", icon: Users },
    // { href: "/admin/reports", label: "Report", icon: BarChart3 },
    { href: "/admin/analytics", label: "Grafici", icon: ChartBar },
    { href: "/admin/checks-history", label: "Storico Check", icon: History },
  ];

  const handleLogout = () => {
    if (confirm("Sei sicuro di voler uscire?")) {
      signOut();
    }
  };

  const handleMobileNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-[9999] bg-white/95 backdrop-blur-sm border-b border-border pointer-events-auto shadow-sm"
      >
        <div className="containerMod">
          <div className="flex items-center justify-between h-16 relative z-[9999]">
            <Link
              href="/admin"
              className="flex items-center space-x-2 pointer-events-auto"
            >
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-foreground">
                Movida Manager
              </span>
            </Link>

            <div className="hidden lg:flex items-center space-x-1 pointer-events-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 relative z-[9999] pointer-events-auto ${
                      isActive
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center space-x-4 pointer-events-auto relative z-[9999]">
              {user && (
                <div className="hidden sm:block text-sm text-muted-foreground">
                  Ciao,{" "}
                  <span className="font-medium text-foreground">
                    {user.nome}
                  </span>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="hidden lg:flex items-center space-x-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors pointer-events-auto"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Esci</span>
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors pointer-events-auto"
                aria-label="Toggle menu"
              >
                <motion.div
                  animate={{ rotate: isMobileMenuOpen ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isMobileMenuOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </motion.div>
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9000] lg:hidden pointer-events-auto"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-16 right-0 bottom-0 w-80 max-w-[85vw] bg-white border-l border-border z-[9500] lg:hidden pointer-events-auto"
            >
              <div className="flex flex-col h-full">
                {user && (
                  <div className="p-6 border-b border-border bg-surface/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {user.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {user.nome}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {user.ruolo}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex-1 py-6">
                  <nav className="space-y-2 px-4">
                    {navItems.map((item, index) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;

                      return (
                        <motion.div
                          key={item.href}
                          initial={{ x: 50, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Link
                            href={item.href}
                            onClick={handleMobileNavClick}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                              isActive
                                ? "bg-primary text-white shadow-lg"
                                : "text-muted-foreground hover:text-foreground hover:bg-surface"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </nav>
                </div>

                <div className="p-4 border-t border-border">
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Esci</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
