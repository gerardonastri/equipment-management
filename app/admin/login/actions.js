"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
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
 * Reimposta la password direttamente senza email.
 * Usa il service role key per trovare l'utente per email
 * e aggiornare la password tramite Admin API.
 *
 * Richiede SUPABASE_SERVICE_ROLE_KEY nelle variabili d'ambiente.
 */
export async function resetPasswordDirect(formData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (!email) {
    return { error: "Inserisci l'email." };
  }

  if (!password || password.length < 6) {
    return { error: "La password deve essere di almeno 6 caratteri." };
  }

  if (password !== confirmPassword) {
    return { error: "Le password non corrispondono." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[v0] Missing SUPABASE_SERVICE_ROLE_KEY env variable");
    return { error: "Configurazione server mancante. Contatta l'amministratore di sistema." };
  }

  // Client con service role — bypassa RLS e ha accesso Admin API
  const adminClient = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Cerca l'utente per email tramite Admin API
  const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();

  if (listError) {
    console.error("[v0] Error listing users:", listError);
    return { error: "Errore nel recupero dell'utente." };
  }

  const user = listData.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase().trim()
  );

  if (!user) {
    // Non riveliamo se l'email esiste per sicurezza minima
    return { error: "Nessun account trovato con questa email." };
  }

  // 2. Verifica che sia un amministratore nella tabella users
  const regularClient = await createClient();
  const { data: userData, error: userError } = await regularClient
    .from("users")
    .select("ruolo")
    .eq("id", user.id)
    .single();

  if (userError || !userData || userData.ruolo !== "amministratore") {
    return { error: "Account non autorizzato al reset della password." };
  }

  // 3. Aggiorna la password tramite Admin API
  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    user.id,
    { password }
  );

  if (updateError) {
    console.error("[v0] Error updating password:", updateError);
    return { error: "Errore durante l'aggiornamento della password." };
  }

  return { success: true };
}