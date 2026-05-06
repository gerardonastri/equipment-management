"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Carica tutte le feste di una data con le rispettive logistiche.
 */
export async function getLogisticsByDate(date) {
  const supabase = await createServerClient();

  const { data: parties, error: partiesError } = await supabase
    .from("parties")
    .select(`
      id, nome, luogo, data, ora_inizio, servizi, cliente, stato,
      animatori_ids,
      animatore:animatore_id(id, nome),
      magazziniere:magazziniere_id(id, nome)
    `)
    .eq("data", date)
    .neq("stato", "scaricato_scaffale")
    .order("ora_inizio", { ascending: true, nullsFirst: false });

  if (partiesError) {
    console.error("[logistics] Error loading parties:", partiesError);
    return [];
  }

  if (!parties?.length) return [];

  const partyIds = parties.map((p) => p.id);
  const { data: logistics } = await supabase
    .from("logistics")
    .select("*")
    .in("party_id", partyIds);

  const logisticsMap = Object.fromEntries(
    (logistics || []).map((l) => [l.party_id, l])
  );

  return parties.map((p) => ({
    party: p,
    logistics: logisticsMap[p.id] || null,
  }));
}

/**
 * Carica tutti gli utenti disponibili come staff/driver.
 */
export async function getLogisticsUsers() {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("users")
    .select("id, nome, ruolo")
    .order("nome");
  return data || [];
}

/**
 * Salva o aggiorna la logistica di una festa.
 * Usa UPSERT su party_id.
 */
export async function saveLogistics(partyId, logisticsData) {
  const supabase = await createServerClient();

  const payload = {
    party_id: partyId,
    staff_ids: logisticsData.staff_ids || [],
    veicoli_andata: logisticsData.veicoli_andata || [],
    driver_andata_id: logisticsData.driver_andata_id || null,
    veicoli_ritorno: logisticsData.veicoli_ritorno || [],
    driver_ritorno_id: logisticsData.driver_ritorno_id || null,
    start_logistica: logisticsData.start_logistica || null,
    updated_at: new Date().toISOString(),
  };

  // Includi "note" solo dopo: ALTER TABLE logistics ADD COLUMN IF NOT EXISTS note text;
  if (logisticsData.note !== undefined) {
    payload.note = logisticsData.note || null;
  }

  const { error } = await supabase
    .from("logistics")
    .upsert(payload, { onConflict: "party_id" });

  if (error) {
    console.error("[logistics] Error saving logistics:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/logistics");
  return { success: true };
}