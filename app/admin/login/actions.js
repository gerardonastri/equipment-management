"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function loginAdmin(formData) {
  const email = formData.get("email");
  const password = formData.get("password");

  const supabase = await createClient();

  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!data.user) {
    return { error: "Errore durante il login" };
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("ruolo")
    .eq("id", data.user.id)
    .single();

  if (userError || !userData) {
    await supabase.auth.signOut();
    return { error: "Utente non trovato nel sistema" };
  }

  if (userData.ruolo !== "amministratore") {
    await supabase.auth.signOut();
    return { error: "Accesso negato: non hai i permessi di amministratore" };
  }

  redirect("/admin");
}
