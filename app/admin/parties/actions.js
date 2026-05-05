"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// SYNC — API ESTERNA → SUPABASE
// ─────────────────────────────────────────────────────────────────────────────

const EXTERNAL_API_BASE = "http://93.39.183.62:99/s.movida/api/eventi.php";
const SYNC_COOLDOWN_MINUTES = 5;

function mapEventoToParty(evento) {
  const noteParts = [evento.nota_bene, evento.servizi].filter(Boolean).map((s) => s.trim()).filter(Boolean);
  return {
    external_id: String(evento.id_evento),
    nome: evento.categoria || "Evento senza nome",
    data: evento.giorno,
    luogo: evento.location || "Luogo non specificato",
    cliente: evento.cliente || null,
    categoria_evento: evento.categoria || null,
    servizi: noteParts.join("\n\n") || null,
    ora_inizio: evento.ora_inizio || null,
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
  console.log(res);
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
        .update({ nome: party.nome, data: party.data, luogo: party.luogo, cliente: party.cliente, categoria_evento: party.categoria_evento, servizi: party.servizi, ora_inizio: party.ora_inizio, source: party.source, last_synced_at: party.last_synced_at })
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
// CHECK SYNC — sincronizza i check in base allo stato della festa
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mappa stato festa → check che devono esistere.
 * Ogni stato implica tutti i check precedenti nella sequenza.
 */
const STATO_TO_CHECKS = {
  iniziale:           [],
  caricato_scaffale:  ["deposito_scaffale"],
  caricato_furgone:   ["deposito_scaffale", "scaffale_furgone"],
  scaricato_furgone:  ["deposito_scaffale", "scaffale_furgone", "furgone_scaffale"],
  scaricato_scaffale: ["deposito_scaffale", "scaffale_furgone", "furgone_scaffale", "scaffale_deposito"],
};

const CHECK_TYPE_NOTES = {
  deposito_scaffale: "Check creato automaticamente da admin (avanzamento stato manuale)",
  scaffale_furgone:  "Check creato automaticamente da admin (avanzamento stato manuale)",
  furgone_scaffale:  "Check creato automaticamente da admin (avanzamento stato manuale)",
  scaffale_deposito: "Check creato automaticamente da admin (avanzamento stato manuale)",
};

/**
 * Sincronizza la tabella `checks` al nuovo stato della festa.
 *
 * Avanzamento → crea i check mancanti (sintetici, firmati dall'animatore/magazziniere/admin)
 * Arretramento → elimina i check in eccesso + relative losses e check_items
 */
async function syncChecksForParty(supabase, partyId, newStato, partyRow) {
  const requiredChecks = STATO_TO_CHECKS[newStato] ?? [];

  const { data: existingChecks, error: fetchErr } = await supabase
    .from("checks")
    .select("id, type")
    .eq("party_id", partyId);

  if (fetchErr) {
    console.error("[v0] syncChecks: error fetching checks:", fetchErr);
    return;
  }

  const existing = existingChecks || [];
  const existingTypes = new Set(existing.map((c) => c.type));

  // ── Avanzamento: crea check mancanti ────────────────────────────────────────
  const toCreate = requiredChecks.filter((type) => !existingTypes.has(type));

  if (toCreate.length > 0) {
    const animatoreId    = partyRow?.animatore_id
      || (partyRow?.animatori_ids?.length ? partyRow.animatori_ids[0] : null)
      || null;
    const magazziniereId = partyRow?.magazziniere_id || null;

    // Fallback: primo amministratore disponibile
    let fallbackUserId = animatoreId || magazziniereId;
    if (!fallbackUserId) {
      const { data: adminUser } = await supabase
        .from("users")
        .select("id")
        .eq("ruolo", "amministratore")
        .limit(1)
        .maybeSingle();
      fallbackUserId = adminUser?.id || null;
    }

    for (const type of toCreate) {
      // I check di carico/scarico furgone sono tipicamente dell'animatore
      let userId = fallbackUserId;
      if (type === "scaffale_furgone" || type === "furgone_scaffale") {
        userId = animatoreId || magazziniereId || fallbackUserId;
      } else {
        userId = magazziniereId || animatoreId || fallbackUserId;
      }

      if (!userId) {
        console.warn(`[v0] syncChecks: nessun user_id per check "${type}" — skip`);
        continue;
      }

      const { error: insertErr } = await supabase.from("checks").insert({
        party_id:          partyId,
        user_id:           userId,
        type,
        notes:             CHECK_TYPE_NOTES[type],
        materiale_smarrito: false,
      });

      if (insertErr) {
        console.error(`[v0] syncChecks: errore creando check "${type}":`, insertErr);
      } else {
        console.log(`[v0] syncChecks: check "${type}" creato per festa ${partyId}`);
      }
    }
  }

  // ── Arretramento: elimina check in eccesso ───────────────────────────────────
  const requiredSet = new Set(requiredChecks);
  const toDelete = existing.filter((c) => !requiredSet.has(c.type));

  if (toDelete.length > 0) {
    const idsToDelete = toDelete.map((c) => c.id);

    // Dipendenze: check_items prima, poi losses collegate al check
    try { await supabase.from("check_items").delete().in("check_id", idsToDelete); } catch (_) {}
    await supabase.from("inventory_losses").delete().in("check_id", idsToDelete);

    const { error: delErr } = await supabase
      .from("checks")
      .delete()
      .in("id", idsToDelete);

    if (delErr) {
      console.error("[v0] syncChecks: errore eliminando check:", delErr);
    } else {
      console.log(`[v0] syncChecks: eliminati ${idsToDelete.length} check per festa ${partyId}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPONIBILITÀ MATERIALE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Restituisce i macro_id già assegnati a feste ANCORA ATTIVE
 * (stato != 'scaricato_scaffale'), escludendo la festa corrente.
 * Se viene passata partyDate, blocca solo le macro di feste della stessa data
 * (feste di giorni diversi non confliggono sul materiale).
 */
export async function getUsedMacroIds(excludePartyId = null, partyDate = null) {
  const supabase = await createServerClient();

  let query = supabase
    .from("parties")
    .select("id")
    .neq("stato", "scaricato_scaffale");

  if (excludePartyId) query = query.neq("id", excludePartyId);
  if (partyDate)      query = query.eq("data", partyDate);

  const { data: activeParties } = await query;
  if (!activeParties?.length) return new Set();

  const activeIds = activeParties.map((p) => p.id);

  const { data: assignments } = await supabase
    .from("party_inventory")
    .select("inventory_id, inventory_items!inner(id, type)")
    .in("party_id", activeIds)
    .eq("inventory_items.type", "macro");

  return new Set((assignments || []).map((a) => a.inventory_id));
}

/**
 * Per una festa, restituisce i sotto-elementi disponibili per la modalità
 * "festa speciale" (macro non assegnate, esplorate fino al livello sotto).
 */
export async function getAvailableItemsForSpecialParty(partyId) {
  const supabase = await createServerClient();

  const { data: assigned } = await supabase
    .from("party_inventory")
    .select("inventory_id, inventory_items!inner(type)")
    .eq("party_id", partyId)
    .eq("inventory_items.type", "macro");

  const assignedMacroIds = new Set((assigned || []).map((a) => a.inventory_id));

  const { data: allMacros } = await supabase
    .from("inventory_items")
    .select("id, name, type")
    .eq("type", "macro")
    .order("name");

  const unassignedMacros = (allMacros || []).filter((m) => !assignedMacroIds.has(m.id));
  if (!unassignedMacros.length) return [];

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

    if (cats.length > 0) result.push({ ...macro, categories: cats });
  }

  return result;
}

export async function assignSingleItem(partyId, itemId) {
  const supabase = await createServerClient();

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

  const macroItems  = partyItems.filter((i) => i.inventory_items.type === "macro");
  const singleItems = partyItems.filter((i) => i.inventory_items.type !== "macro");

  const result = [];

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

  const singleByMacro = {};
  for (const item of singleItems) {
    const el = item.inventory_items;
    let macroId = null;
    if (el.type === "categoria") {
      macroId = el.parent_id;
    } else if (el.type === "sotto") {
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

  for (const [macroId, items] of Object.entries(singleByMacro)) {
    const existing = result.find((r) => r.id === macroId);
    if (existing) {
      if (!existing._singleItems) existing._singleItems = [];
      existing._singleItems.push(...items);
    } else {
      const { data: macro } = await supabase.from("inventory_items").select("*").eq("id", macroId).single();
      if (macro) result.push({ ...macro, categories: [], _isMacro: false, _singleItems: items });
    }
  }

  return result;
}

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
    losses: allLosses,
    activeLosses: allLosses.filter((l) => !l.resolved),
  };
}

export async function getPartyMacroIds(partyId) {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("party_inventory")
    .select("inventory_id, inventory_items!inner(type)")
    .eq("party_id", partyId)
    .eq("inventory_items.type", "macro");
  return (data || []).map((d) => d.inventory_id);
}


// ─────────────────────────────────────────────────────────────────────────────
// HANDOFF — Passaggio materiale tra feste
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Restituisce le info handoff per una festa:
 * - se questa festa è SORGENTE (handoff_to_party_id settato)
 * - se questa festa è DESTINAZIONE (un'altra festa la punta)
 * Include i dettagli della festa collegata e le macro_ids coinvolte.
 */
export async function getPartyHandoffInfo(partyId) {
  const supabase = await createServerClient();

  // Questa festa è sorgente?
  const { data: party } = await supabase
    .from("parties")
    .select("handoff_to_party_id, handoff_macro_ids, shelves")
    .eq("id", partyId)
    .single();

  const result = { asSource: null, asDestination: null };

  if (party?.handoff_to_party_id) {
    const { data: destParty } = await supabase
      .from("parties")
      .select("id, nome, luogo, shelves, stato")
      .eq("id", party.handoff_to_party_id)
      .single();
    result.asSource = {
      destinationParty: destParty,
      handoffMacroIds:  party.handoff_macro_ids || [],
    };
  }

  // Questa festa è destinazione di un handoff?
  const { data: sourceParties } = await supabase
    .from("parties")
    .select("id, nome, luogo, shelves, stato, handoff_macro_ids")
    .eq("handoff_to_party_id", partyId)
    .neq("stato", "scaricato_scaffale");

  if (sourceParties?.length) {
    result.asDestination = sourceParties.map((sp) => ({
      sourceParty:     { id: sp.id, nome: sp.nome, luogo: sp.luogo, shelves: sp.shelves, stato: sp.stato },
      handoffMacroIds: sp.handoff_macro_ids || [],
    }));
  }

  return result;
}

export async function createParty(formData) {
  const supabase = await createServerClient();

  const partyData = {
    nome:               formData.nome,
    data:               formData.data,
    luogo:              formData.luogo,
    animatore_id:       formData.animatore_id       || null,
    magazziniere_id:    formData.magazziniere_id    || null,
    animatori_ids:      formData.animatori_ids      || [],
    handoff_to_party_id: formData.handoff_to_party_id || null,
    handoff_macro_ids:  formData.handoff_macro_ids  || [],
    stato:              formData.stato,
    note:               formData.note,
    shelves:            formData.shelves.join(","),
  };

  const { data, error } = await supabase.from("parties").insert([partyData]).select();
  if (error) throw error;

  const allItemIds = [
    ...(formData.selectedMaterials  || []),
    ...(formData.selectedSingleItems || []),
  ];

  if (allItemIds.length > 0 && data[0]) {
    const assignments = allItemIds.map((id) => ({ party_id: data[0].id, inventory_id: id }));
    const { error: materialError } = await supabase.from("party_inventory").insert(assignments);
    if (materialError) throw materialError;
  }

  // Se la festa viene creata con uno stato già avanzato, genera i check corrispondenti
  if (formData.stato && formData.stato !== "iniziale" && data[0]) {
    await syncChecksForParty(supabase, data[0].id, formData.stato, data[0]);
  }

  revalidatePath("/admin/parties");
  return { success: true, data: data[0] };
}

export async function updateParty(partyId, formData) {
  const supabase = await createServerClient();

  // Legge lo stato precedente prima di modificare
  const { data: prevParty } = await supabase
    .from("parties")
    .select("stato, animatore_id, magazziniere_id, animatori_ids, handoff_to_party_id, handoff_macro_ids")
    .eq("id", partyId)
    .single();

  const partyData = {
    nome:               formData.nome,
    data:               formData.data,
    luogo:              formData.luogo,
    animatore_id:       formData.animatore_id       || null,
    magazziniere_id:    formData.magazziniere_id    || null,
    animatori_ids:      formData.animatori_ids      || [],
    handoff_to_party_id: formData.handoff_to_party_id || null,
    handoff_macro_ids:  formData.handoff_macro_ids  || [],
    stato:              formData.stato,
    note:               formData.note,
    shelves:            formData.shelves.join(","),
  };

  const { data, error } = await supabase.from("parties").update(partyData).eq("id", partyId).select();
  if (error) throw error;

  // ── Sync materiale (macro) ────────────────────────────────────────────────
  if (formData.selectedMaterials !== undefined) {
    const { data: existingMacros } = await supabase
      .from("party_inventory")
      .select("inventory_id, inventory_items!inner(type)")
      .eq("party_id", partyId)
      .eq("inventory_items.type", "macro");

    const existingMacroIds = (existingMacros || []).map((m) => m.inventory_id);
    const newMacroIds      = formData.selectedMaterials || [];

    const toRemove = existingMacroIds.filter((id) => !newMacroIds.includes(id));
    if (toRemove.length > 0) {
      await supabase.from("party_inventory").delete().eq("party_id", partyId).in("inventory_id", toRemove);
    }

    const toAdd = newMacroIds.filter((id) => !existingMacroIds.includes(id));
    if (toAdd.length > 0) {
      const assignments = toAdd.map((id) => ({ party_id: partyId, inventory_id: id }));
      const { error: matError } = await supabase.from("party_inventory").insert(assignments);
      if (matError) console.error("[v0] Error updating party materials:", matError);
    }
  }

  // ── Sync checks in base al cambio di stato ───────────────────────────────
  const prevStato = prevParty?.stato;
  const newStato  = formData.stato;

  if (prevStato !== newStato) {
    console.log(`[v0] Stato cambiato: ${prevStato} → ${newStato} — sincronizzo i check`);
    await syncChecksForParty(supabase, partyId, newStato, {
      animatore_id:    formData.animatore_id    || prevParty?.animatore_id    || null,
      magazziniere_id: formData.magazziniere_id || prevParty?.magazziniere_id || null,
      animatori_ids:   formData.animatori_ids   || prevParty?.animatori_ids   || [],
    });
  }

  revalidatePath("/admin/parties");
  revalidatePath("/admin/check");
  return { success: true, data: data[0] };
}

export async function deleteParty(partyId) {
  const supabase = await createServerClient();

  // 1. inventory_losses della festa
  const { error: lossesError } = await supabase
    .from("inventory_losses")
    .delete()
    .eq("party_id", partyId);
  if (lossesError) { console.error("[v0] Error deleting losses:", lossesError); throw lossesError; }

  // 2. check_items + checks
  const { data: checks } = await supabase.from("checks").select("id").eq("party_id", partyId);
  if (checks?.length) {
    const checkIds = checks.map((c) => c.id);
    try { await supabase.from("check_items").delete().in("check_id", checkIds); } catch (_) {}
    const { error: checksError } = await supabase.from("checks").delete().eq("party_id", partyId);
    if (checksError) { console.error("[v0] Error deleting checks:", checksError); throw checksError; }
  }

  // 3. party_inventory
  const { error: invError } = await supabase.from("party_inventory").delete().eq("party_id", partyId);
  if (invError) { console.error("[v0] Error deleting party_inventory:", invError); throw invError; }

  // 4. La festa
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