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

/**
 * Invia l'email di reset password tramite Supabase Auth.
 * Supabase manderà un link che punta a /admin/login/reset-password
 * con i token necessari nell'URL.
 */
export async function requestPasswordReset(formData) {
  const email = formData.get("email");

  if (!email) {
    return { error: "Inserisci un indirizzo email valido." };
  }

  const supabase = await createClient();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/admin/login/reset-password`,
  });

  // Non riveliamo se l'email esiste o no per sicurezza
  if (error) {
    console.error("[v0] Reset password error:", error);
    // Restituiamo success comunque per non rivelare se l'email esiste
  }

  return {
    success: true,
    message:
      "Se l'email è registrata, riceverai un link per reimpostare la password.",
  };
}

/**
 * Aggiorna la password dell'utente autenticato tramite il token di reset.
 * Viene chiamata dalla pagina /admin/login/reset-password dopo che
 * Supabase ha già verificato il token nell'URL e ha creato una sessione.
 */
export async function updatePassword(formData) {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (!password || password.length < 6) {
    return { error: "La password deve essere di almeno 6 caratteri." };
  }

  if (password !== confirmPassword) {
    return { error: "Le password non corrispondono." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[v0] Update password error:", error);
    return { error: "Errore durante l'aggiornamento della password. Il link potrebbe essere scaduto." };
  }

  return { success: true };
}