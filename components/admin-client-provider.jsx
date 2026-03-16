"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import  { supabaseBrowserClient as supabase }from "@/lib/supabase/client";

const AdminContext = createContext({});

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within AdminClientProvider");
  }
  return context;
};

export default function AdminClientProvider({ children, initialUser }) {
  const [user, setUser] = useState(initialUser);
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        router.replace("/admin/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.replace("/admin/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AdminContext.Provider
      value={{
        user,
        isAdmin: user?.ruolo === "amministratore",
        signOut,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}
