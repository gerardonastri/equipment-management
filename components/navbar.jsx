"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  Bell,
  Users,
  Calendar,
  BarChart3,
  LogOut,
} from "lucide-react";
import { useAdmin } from "./admin-provider";

export default function Navbar() {
  const pathname = usePathname();
  const { user, signOut } = useAdmin();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/inventory", label: "Inventario", icon: Package },
    { href: "/admin/parties", label: "Feste", icon: Calendar },
    { href: "/admin/users", label: "Utenti", icon: Users },
    { href: "/admin/reports", label: "Report", icon: BarChart3 },
    { href: "/admin/notifications", label: "Notifiche", icon: Bell },
  ];

  const handleLogout = () => {
    if (confirm("Sei sicuro di voler uscire?")) {
      signOut();
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border"
    >
      <div className="containerMod">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-foreground">
              Movida Manager
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
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

          <div className="flex items-center space-x-4">
            {user && (
              <div className="hidden md:block text-sm text-muted-foreground">
                Ciao,{" "}
                <span className="font-medium text-foreground">{user.nome}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Esci</span>
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
