"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const AdminContext = createContext({});

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return context;
};

export default function AdminProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        await checkUserRole(session.user);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setIsAdmin(false);
        router.push("/admin/login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await checkUserRole(session.user);
      } else {
        // Se non c'è sessione e siamo in una pagina admin (non login), reindirizza
        if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
          router.push("/admin/login");
        }
      }
    } catch (error) {
      console.error("[v0] Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserRole = async (authUser) => {
    try {
      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error) {
        console.error("[v0] Error fetching user data:", error);
        setUser(null);
        setIsAdmin(false);
        router.push("/admin/login");
        return;
      }

      if (userData && userData.ruolo === "amministratore") {
        setUser(userData);
        setIsAdmin(true);
      } else {
        console.log("[v0] User is not admin:", userData?.ruolo);
        setUser(null);
        setIsAdmin(false);
        await supabase.auth.signOut();
        router.push("/admin/login");
      }
    } catch (error) {
      console.error("[v0] Error checking user role:", error);
      setUser(null);
      setIsAdmin(false);
      router.push("/admin/login");
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
      router.push("/admin/login");
    } catch (error) {
      console.error("[v0] Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifica autenticazione...</p>
        </div>
      </div>
    );
  }

  if (
    !isAdmin &&
    pathname.startsWith("/admin") &&
    pathname !== "/admin/login"
  ) {
    router.push("/admin/login");
    return null;
  }

  return (
    <AdminContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        signOut,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}
