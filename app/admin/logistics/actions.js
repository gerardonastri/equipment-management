"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Normalizza stringhe per evitare bug da spazi o case sensitivity.
 */
const normalizeId = (id) => String(id).toLowerCase().replace(/\s+/g, "");

/**
 * Carica tutte le feste di una data con le rispettive logistiche.
 */
export async function getLogisticsByDate(date) {
  const supabase = await createServerClient();

  const { data: parties, error: partiesError } = await supabase
    .from("parties")
    .select(`
      id, external_id, nome, luogo, data, ora_inizio, servizi, cliente, stato,
      animatori_ids,
      animatore:animatore_id(id, nome),
      magazziniere:magazziniere_id(id, nome)
    `)
    .eq("data", date)
    // Rimosso il filtro ".neq('stato', 'scaricato_scaffale')" per mostrare tutto
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

  // Carica le macro assegnate a ogni festa tramite party_inventory
  const { data: partyInventory } = await supabase
    .from("party_inventory")
    .select("party_id, inventory_items!inner(id, name, type)")
    .in("party_id", partyIds)
    .eq("inventory_items.type", "macro");

  // Raggruppa macro per party_id
  const macrosMap = {};
  for (const row of partyInventory || []) {
    const pid = row.party_id;
    if (!macrosMap[pid]) macrosMap[pid] = [];
    macrosMap[pid].push({ id: row.inventory_items.id, name: row.inventory_items.name });
  }
  // Ordine alfabetico per coerenza con il resto dell'app
  for (const pid of Object.keys(macrosMap)) {
    macrosMap[pid].sort((a, b) => a.name.localeCompare(b.name, "it"));
  }

  return parties.map((p) => ({
    party: p,
    logistics: logisticsMap[p.id] || null,
    macros: macrosMap[p.id] || [],
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
    responsabili_ids: logisticsData.responsabili_ids || [], // <-- AGGIUNTO
    veicoli_andata: logisticsData.veicoli_andata || [],
    drivers_andata_ids: logisticsData.drivers_andata_ids || [],
    veicoli_ritorno: logisticsData.veicoli_ritorno || [],
    drivers_ritorno_ids: logisticsData.drivers_ritorno_ids || [],
    start_logistica: logisticsData.start_logistica || null,
    solo_andata: logisticsData.solo_andata || false,
    updated_at: new Date().toISOString(),
  };

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
// ─────────────────────────────────────────────────────────────────────────────
// ANIMATORI DA API MOVIDA
// ─────────────────────────────────────────────────────────────────────────────

const MOVIDA_API_BASE = "http://93.39.183.62:99/s.movida/api/eventi.php";

/**
 * Recupera dall'API Movida gli animatori assegnati agli eventi di una data.
 * Restituisce { [id_evento_string_normalizzato]: AnimatoreMovida[] }
 */
export async function getMovidaAnimatoriForDate(date) {
  try {
    const res = await fetch(`${MOVIDA_API_BASE}?data=${date}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return {};

    const json = await res.json();
    const eventi = json?.eventi || [];

    const result = {};
    for (const evento of eventi) {
      // Normalizzazione Apple-style: niente spazi, tutto lowercase.
      const id = normalizeId(evento.id_evento);
      result[id] = (evento.animatori || []).map((a) => ({
        id:            a.id_animatore,
        denominazione: a.denominazione || "",
        categoria:     a.categoria     || "",
        responsabile:  !!a.responsabile,
        assente:       !!a.assente,
      }));
    }
    return result;
  } catch (err) {
    console.error("[logistics] getMovidaAnimatoriForDate error:", err);
    return {};
  }
}