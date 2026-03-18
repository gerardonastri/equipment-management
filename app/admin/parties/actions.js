"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// SYNC — API ESTERNA → SUPABASE
// ─────────────────────────────────────────────────────────────────────────────

const EXTERNAL_API_BASE = "http://93.39.183.62:99/s.movida/api/eventi.php";
const SYNC_COOLDOWN_MINUTES = 10;

function mapEventoToParty(evento) {
  return {
    external_id: String(evento.id_evento),
    nome: evento.categoria || "Evento senza nome",
    data: evento.giorno,
    luogo: evento.location || "Luogo non specificato",
    source: "gestionale",
    last_synced_at: new Date().toISOString(),
  };
}

async function fetchEventsByDate(date) {
  const url = `${EXTERNAL_API_BASE}?data=${date}`;
  console.log("[sync] Fetching:", url);
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`API responded with status ${res.status}`);
  const json = await res.json();
  return json?.eventi || [];
}

export async function syncPartiesByDate(date) {
  const supabase = await createServerClient();

  const cooldownCutoff = new Date(
    Date.now() - SYNC_COOLDOWN_MINUTES * 60 * 1000
  ).toISOString();

  const { data: recentLog } = await supabase
    .from("sync_logs")
    .select("id, finished_at")
    .eq("entity", `parties:${date}`)
    .eq("status", "success")
    .gte("finished_at", cooldownCutoff)
    .maybeSingle();

  if (recentLog) {
    return { skipped: true, alreadyFresh: true, rowsFetched: 0, rowsUpserted: 0 };
  }

  const { data: logRow, error: logInsertError } = await supabase
    .from("sync_logs")
    .insert({
      entity: `parties:${date}`,
      status: "running",
      started_at: new Date().toISOString(),
      rows_fetched: 0,
      rows_upserted: 0,
    })
    .select()
    .single();

  if (logInsertError) console.error("[sync] Could not insert sync_log:", logInsertError);

  const logId = logRow?.id;
  const updateLog = async (fields) => {
    if (!logId) return;
    await supabase.from("sync_logs").update(fields).eq("id", logId);
  };

  try {
    const eventi = await fetchEventsByDate(date);

    if (!eventi || eventi.length === 0) {
      await updateLog({ status: "skipped", finished_at: new Date().toISOString(), rows_fetched: 0, rows_upserted: 0 });
      return { skipped: true, alreadyFresh: false, rowsFetched: 0, rowsUpserted: 0 };
    }

    const rowsFetched = eventi.length;
    const partiesToUpsert = eventi.map(mapEventoToParty);
    const externalIds = partiesToUpsert.map((p) => p.external_id);

    const { data: existing } = await supabase
      .from("parties")
      .select("id, external_id")
      .in("external_id", externalIds);

    const existingIds = new Set((existing || []).map((p) => p.external_id));

    const toInsert = partiesToUpsert
      .filter((p) => !existingIds.has(p.external_id))
      .map((p) => ({ ...p, shelves: "", stato: "iniziale" }));

    const toUpdate = partiesToUpsert.filter((p) => existingIds.has(p.external_id));

    let rowsUpserted = 0;

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from("parties").insert(toInsert);
      if (insertError) throw insertError;
      rowsUpserted += toInsert.length;
    }

    for (const party of toUpdate) {
      const { error: updateError } = await supabase
        .from("parties")
        .update({ nome: party.nome, data: party.data, luogo: party.luogo, source: party.source, last_synced_at: party.last_synced_at })
        .eq("external_id", party.external_id);
      if (!updateError) rowsUpserted++;
    }

    await updateLog({ status: "success", finished_at: new Date().toISOString(), rows_fetched: rowsFetched, rows_upserted: rowsUpserted });
    revalidatePath("/admin/parties");
    return { skipped: false, alreadyFresh: false, rowsFetched, rowsUpserted };
  } catch (err) {
    console.error("[sync] Error:", err);
    await updateLog({ status: "error", finished_at: new Date().toISOString(), error_message: err?.message || "Unknown error" });
    return { error: err?.message || "Errore durante la sincronizzazione" };
  }
}

export async function getPartiesByDate(date) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("parties")
    .select(`*, animatore:animatore_id(nome), magazziniere:magazziniere_id(nome)`)
    .eq("data", date)
    .order("created_at", { ascending: false });
  if (error) { console.error("[v0] Error fetching parties by date:", error); return []; }
  return data || [];
}

export async function getLastSyncInfo(date) {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("sync_logs")
    .select("status, finished_at, rows_fetched, rows_upserted, error_message")
    .eq("entity", `parties:${date}`)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPONIBILITÀ MATERIALE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Restituisce i macro_id già assegnati a feste ANCORA ATTIVE
 * (stato != 'scaricato_scaffale'), escludendo la festa corrente.
 * Usato per disabilitare le macro non disponibili.
 */
export async function getUsedMacroIds(excludePartyId = null) {
  const supabase = await createServerClient();

  // Prendi tutte le feste attive
  let query = supabase
    .from("parties")
    .select("id")
    .neq("stato", "scaricato_scaffale");

  if (excludePartyId) {
    query = query.neq("id", excludePartyId);
  }

  const { data: activeParties } = await query;
  if (!activeParties?.length) return new Set();

  const activeIds = activeParties.map((p) => p.id);

  // Prendi gli inventory_id assegnati a quelle feste (solo quelli di tipo macro)
  const { data: assignments } = await supabase
    .from("party_inventory")
    .select("inventory_id, inventory_items!inner(id, type)")
    .in("party_id", activeIds)
    .eq("inventory_items.type", "macro");

  const usedIds = new Set((assignments || []).map((a) => a.inventory_id));
  return usedIds;
}

/**
 * Per una festa, restituisce i sotto-elementi disponibili per l'aggiunta singola
 * in modalità "festa speciale".
 *
 * Logica: prende tutte le categorie e sotto di macro NON già assegnate alla festa,
 * raggruppate per macro → categoria → sotto.
 */
export async function getAvailableItemsForSpecialParty(partyId) {
  const supabase = await createServerClient();

  // 1. Trova le macro già assegnate a questa festa
  const { data: assigned } = await supabase
    .from("party_inventory")
    .select("inventory_id, inventory_items!inner(type)")
    .eq("party_id", partyId)
    .eq("inventory_items.type", "macro");

  const assignedMacroIds = new Set((assigned || []).map((a) => a.inventory_id));

  // 2. Prendi tutte le macro dell'inventario
  const { data: allMacros } = await supabase
    .from("inventory_items")
    .select("id, name, type")
    .eq("type", "macro")
    .order("name");

  // 3. Filtra le macro NON assegnate
  const unassignedMacros = (allMacros || []).filter((m) => !assignedMacroIds.has(m.id));

  if (!unassignedMacros.length) return [];

  // 4. Per ogni macro non assegnata, carica categorie e sotto
  const result = [];
  for (const macro of unassignedMacros) {
    const { data: categories } = await supabase
      .from("inventory_items")
      .select("id, name, type, materiale_mancante")
      .eq("parent_id", macro.id)
      .eq("type", "categoria")
      .order("name");

    const cats = [];
    for (const cat of categories || []) {
      const { data: subs } = await supabase
        .from("inventory_items")
        .select("id, name, type, materiale_mancante")
        .eq("parent_id", cat.id)
        .eq("type", "sotto")
        .order("name");

      cats.push({ ...cat, items: subs || [] });
    }

    if (cats.length > 0) {
      result.push({ ...macro, categories: cats });
    }
  }

  return result;
}

/**
 * Assegna un singolo elemento (categoria o sotto) a una festa tramite party_inventory.
 */
export async function assignSingleItem(partyId, itemId) {
  const supabase = await createServerClient();

  // Evita duplicati
  const { data: existing } = await supabase
    .from("party_inventory")
    .select("id")
    .eq("party_id", partyId)
    .eq("inventory_id", itemId)
    .maybeSingle();

  if (existing) return { success: true, alreadyExists: true };

  const { error } = await supabase.from("party_inventory").insert([{ party_id: partyId, inventory_id: itemId }]);
  if (error) throw error;

  revalidatePath("/admin/parties");
  return { success: true };
}

/**
 * Rimuove un singolo elemento (categoria o sotto) da una festa.
 */
export async function removeSingleItem(partyId, itemId) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("party_inventory")
    .delete()
    .eq("party_id", partyId)
    .eq("inventory_id", itemId);
  if (error) throw error;
  revalidatePath("/admin/parties");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNZIONI ESISTENTI
// ─────────────────────────────────────────────────────────────────────────────

export async function getPartiesData() {
  const supabase = await createServerClient();

  const [partiesRes, usersRes, macroRes] = await Promise.all([
    supabase
      .from("parties")
      .select(`*, animatore:animatore_id(nome), magazziniere:magazziniere_id(nome)`)
      .order("created_at", { ascending: false }),
    supabase.from("users").select("*").order("nome"),
    supabase.from("inventory_items").select("*").eq("type", "macro").is("parent_id", null).order("name"),
  ]);

  return {
    parties: partiesRes.data || [],
    users: usersRes.data || [],
    macroCategories: macroRes.data || [],
  };
}

export async function getPartyMaterials(partyId) {
  const supabase = await createServerClient();

  const { data: partyItems, error: itemsError } = await supabase
    .from("party_inventory")
    .select("inventory_id, inventory_items!inner(id, name, type, parent_id, materiale_mancante)")
    .eq("party_id", partyId);

  if (itemsError) { console.error("[v0] Error loading party items:", itemsError); return []; }
  if (!partyItems?.length) return [];

  // Separa macro, categorie e sotto
  const macroItems = partyItems.filter((i) => i.inventory_items.type === "macro");
  const singleItems = partyItems.filter((i) => i.inventory_items.type !== "macro");

  const result = [];

  // Carica gerarchia completa per le macro
  for (const item of macroItems) {
    const macro = item.inventory_items;
    const { data: categories } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("parent_id", macro.id)
      .eq("type", "categoria");

    const categoriesWithSubs = [];
    for (const category of categories || []) {
      const { data: subcategories } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("parent_id", category.id)
        .eq("type", "sotto");
      categoriesWithSubs.push({ ...category, subcategories: subcategories || [] });
    }

    result.push({ ...macro, categories: categoriesWithSubs, _isMacro: true });
  }

  // Aggiungi gli elementi singoli raggruppati per macro padre
  const singleByMacro = {};
  for (const item of singleItems) {
    const el = item.inventory_items;
    // Trova il macro antenato
    let macroId = null;
    if (el.type === "categoria") {
      // parent_id è il macro
      macroId = el.parent_id;
    } else if (el.type === "sotto") {
      // parent_id è la categoria → dobbiamo trovare il nonno
      const { data: parent } = await supabase
        .from("inventory_items")
        .select("parent_id")
        .eq("id", el.parent_id)
        .single();
      macroId = parent?.parent_id || null;
    }
    if (!singleByMacro[macroId]) singleByMacro[macroId] = [];
    singleByMacro[macroId].push({ ...el, _isSingle: true });
  }

  // Raggruppa gli elementi singoli sotto il loro macro
  for (const [macroId, items] of Object.entries(singleByMacro)) {
    // Potrebbe esserci già il macro nella lista (se ha anche la macro completa)
    const existing = result.find((r) => r.id === macroId);
    if (existing) {
      if (!existing._singleItems) existing._singleItems = [];
      existing._singleItems.push(...items);
    } else {
      // Carica il macro padre
      const { data: macro } = await supabase.from("inventory_items").select("*").eq("id", macroId).single();
      if (macro) {
        result.push({ ...macro, categories: [], _isMacro: false, _singleItems: items });
      }
    }
  }

  return result;
}

/**
 * Carica lo storico completo di una festa.
 *
 * - `losses`       → TUTTE le losses (anche resolved) — per lo storico nel modal
 * - `activeLosses` → solo resolved=false — per gli alert sulla card e nel check
 */
export async function getPartyHistory(partyId) {
  const supabase = await createServerClient();

  const { data: checks, error: checksError } = await supabase
    .from("checks")
    .select(`*, user:user_id(nome, ruolo)`)
    .eq("party_id", partyId)
    .order("created_at", { ascending: true });

  if (checksError) { console.error("[v0] Error loading checks:", checksError); return { checks: [], losses: [], activeLosses: [] }; }

  const { data: losses, error: lossesError } = await supabase
    .from("inventory_losses")
    .select(`*, item:inventory_id(name, type), reporter:reported_by(nome)`)
    .eq("party_id", partyId)
    .order("created_at", { ascending: false });

  if (lossesError) { console.error("[v0] Error loading losses:", lossesError); return { checks: checks || [], losses: [], activeLosses: [] }; }

  const allLosses = losses || [];

  return {
    checks: checks || [],
    losses: allLosses,                               // storico completo → party-history-modal
    activeLosses: allLosses.filter((l) => !l.resolved), // solo attive → alert card + check
  };
}

export async function createParty(formData) {
  const supabase = await createServerClient();

  const partyData = {
    nome: formData.nome,
    data: formData.data,
    luogo: formData.luogo,
    animatore_id: formData.animatore_id || null,
    magazziniere_id: formData.magazziniere_id || null,
    stato: formData.stato,
    note: formData.note,
    shelves: formData.shelves.join(","),
  };

  const { data, error } = await supabase.from("parties").insert([partyData]).select();
  if (error) throw error;

  const allItemIds = [
    ...(formData.selectedMaterials || []),
    ...(formData.selectedSingleItems || []),
  ];

  if (allItemIds.length > 0 && data[0]) {
    const assignments = allItemIds.map((id) => ({ party_id: data[0].id, inventory_id: id }));
    const { error: materialError } = await supabase.from("party_inventory").insert(assignments);
    if (materialError) throw materialError;
  }

  revalidatePath("/admin/parties");
  return { success: true, data: data[0] };
}

export async function updateParty(partyId, formData) {
  const supabase = await createServerClient();

  const partyData = {
    nome: formData.nome,
    data: formData.data,
    luogo: formData.luogo,
    animatore_id: formData.animatore_id || null,
    magazziniere_id: formData.magazziniere_id || null,
    stato: formData.stato,
    note: formData.note,
    shelves: formData.shelves.join(","),
  };

  const { data, error } = await supabase.from("parties").update(partyData).eq("id", partyId).select();
  if (error) throw error;

  revalidatePath("/admin/parties");
  return { success: true, data: data[0] };
}

export async function deleteParty(partyId) {
  const supabase = await createServerClient();
  const { error } = await supabase.from("parties").delete().eq("id", partyId);
  if (error) throw error;
  revalidatePath("/admin/parties");
  return { success: true };
}

export async function assignMaterial(partyId, macroId) {
  const supabase = await createServerClient();
  const { error } = await supabase.from("party_inventory").insert([{ party_id: partyId, inventory_id: macroId }]);
  if (error) throw error;
  revalidatePath("/admin/parties");
  return { success: true };
}

export async function removeMaterial(partyId, macroId) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("party_inventory")
    .delete()
    .eq("party_id", partyId)
    .eq("inventory_id", macroId);
  if (error) throw error;
  revalidatePath("/admin/parties");
  return { success: true };
}