"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * OTTIMIZZATO: carica tutti gli scaffali occupati con query batch.
 * Invece di N query per N feste, usa 3 query totali:
 * 1. Tutte le feste attive con scaffali
 * 2. Tutto il materiale (party_inventory + inventory_items) in una sola query
 * 3. Tutte le losses attive in una sola query
 * Poi assembla i dati in-memory.
 */
export async function getOccupiedShelves() {
  const supabase = await createServerClient();

  // 1. Feste attive con scaffali
  const { data: parties, error: partiesError } = await supabase
    .from("parties")
    .select(`
      id, nome, data, luogo, stato, shelves, note,
      animatore:animatore_id(nome),
      magazziniere:magazziniere_id(nome)
    `)
    .neq("stato", "scaricato_scaffale")
    .not("shelves", "is", null)
    .order("data", { ascending: true });

  if (partiesError) {
    console.error("[v0] Error loading parties:", partiesError);
    return [];
  }

  const activeParties = (parties || []).filter(
    (p) => p.shelves && p.shelves.trim() !== ""
  );

  if (!activeParties.length) return [];

  const partyIds = activeParties.map((p) => p.id);

  // 2. Tutto il materiale macro di tutte le feste in UNA query
  const { data: allPartyItems } = await supabase
    .from("party_inventory")
    .select(`
      party_id,
      inventory_id,
      inventory_items!inner(id, name, type)
    `)
    .in("party_id", partyIds)
    .eq("inventory_items.type", "macro");

  // Raggruppa per party_id
  const macrosByParty = {};
  for (const item of allPartyItems || []) {
    if (!macrosByParty[item.party_id]) macrosByParty[item.party_id] = [];
    macrosByParty[item.party_id].push(item.inventory_items);
  }

  // 3. Tutte le categorie di tutti i macro in UNA query
  const allMacroIds = [...new Set((allPartyItems || []).map((i) => i.inventory_id))];
  let categoriesByMacro = {};

  if (allMacroIds.length > 0) {
    const { data: allCats } = await supabase
      .from("inventory_items")
      .select("id, name, parent_id")
      .in("parent_id", allMacroIds)
      .eq("type", "categoria")
      .order("name");

    for (const cat of allCats || []) {
      if (!categoriesByMacro[cat.parent_id]) categoriesByMacro[cat.parent_id] = [];
      categoriesByMacro[cat.parent_id].push(cat.name);
    }
  }

  // 4. Tutte le losses attive di tutte le feste in UNA query
  const { data: allLosses } = await supabase
    .from("inventory_losses")
    .select(`
      id, party_id, tipo, valore_stimato, note,
      item:inventory_id(name)
    `)
    .in("party_id", partyIds)
    .eq("resolved", false)
    .order("created_at", { ascending: false });

  const lossesByParty = {};
  for (const loss of allLosses || []) {
    if (!lossesByParty[loss.party_id]) lossesByParty[loss.party_id] = [];
    lossesByParty[loss.party_id].push(loss);
  }

  // 5. Assembla in-memory (zero query aggiuntive)
  const shelvesList = [];

  for (const party of activeParties) {
    const shelfNumbers = party.shelves
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!shelfNumbers.length) continue;

    const macros = macrosByParty[party.id] || [];
    const materialSummary = macros.map((macro) => ({
      id: macro.id,
      name: macro.name,
      categories: categoriesByMacro[macro.id] || [],
    }));

    const activeLosses = lossesByParty[party.id] || [];

    for (const shelfNum of shelfNumbers) {
      const numericVal = parseInt(shelfNum, 10);
      shelvesList.push({
        shelfId: shelfNum,
        // Per scaffali lettera (A-L) usiamo un valore alto per ordinamento
        shelfNumber: isNaN(numericVal) ? 1000 + shelfNum.charCodeAt(0) : numericVal,
        shelfLabel: shelfNum,
        party: {
          id: party.id,
          nome: party.nome,
          data: party.data,
          luogo: party.luogo,
          stato: party.stato,
          note: party.note,
          animatore: party.animatore,
          magazziniere: party.magazziniere,
        },
        material: materialSummary,
        activeLosses,
      });
    }
  }

  shelvesList.sort((a, b) => a.shelfNumber - b.shelfNumber);
  return shelvesList;
}

/**
 * OTTIMIZZATO: materiale in uso con query batch.
 * Invece di N*M query, usa 3 query totali.
 */
export async function getMaterialInUse() {
  const supabase = await createServerClient();

  // 1. Feste attive
  const { data: parties, error } = await supabase
    .from("parties")
    .select("id, nome, data, luogo, stato, shelves")
    .neq("stato", "scaricato_scaffale")
    .order("data", { ascending: true });

  if (error) { console.error("[v0] getMaterialInUse error:", error); return []; }

  if (!parties?.length) return [];

  const partyIds = parties.map((p) => p.id);

  // 2. Tutto il materiale macro in UNA query
  const { data: allItems } = await supabase
    .from("party_inventory")
    .select("party_id, inventory_id, inventory_items!inner(id, name, type)")
    .in("party_id", partyIds)
    .eq("inventory_items.type", "macro");

  if (!allItems?.length) return [];

  const allMacroIds = [...new Set(allItems.map((i) => i.inventory_id))];

  // 3. Conta categorie per macro in UNA query
  const { data: allCats } = await supabase
    .from("inventory_items")
    .select("parent_id")
    .in("parent_id", allMacroIds)
    .eq("type", "categoria");

  const catCountByMacro = {};
  for (const cat of allCats || []) {
    catCountByMacro[cat.parent_id] = (catCountByMacro[cat.parent_id] || 0) + 1;
  }

  // 4. Assembla in-memory
  const partyMap = Object.fromEntries(parties.map((p) => [p.id, p]));
  const result = [];

  for (const item of allItems) {
    const party = partyMap[item.party_id];
    const macro = item.inventory_items;
    if (!party || !macro) continue;

    result.push({
      macro: {
        id: macro.id,
        name: macro.name,
        categoriesCount: catCountByMacro[macro.id] || 0,
      },
      party: {
        id: party.id,
        nome: party.nome,
        data: party.data,
        luogo: party.luogo,
        stato: party.stato,
        shelves: party.shelves,
      },
    });
  }

  result.sort((a, b) => a.macro.name.localeCompare(b.macro.name));
  return result;
}

export async function getActiveParties() {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("parties")
    .select("id, nome, data, luogo, stato, shelves")
    .neq("stato", "scaricato_scaffale")
    .order("data", { ascending: true });

  if (error) { console.error("[v0] Error loading active parties:", error); return []; }
  return data || [];
}

/**
 * Assegna uno scaffale a una festa.
 * Verifica conflitti SOLO tra feste dello stesso giorno (stessa data).
 * Un check è completo quando lo stato è "scaricato_scaffale".
 */
export async function assignShelfToParty(partyId, shelfInput, partyDate) {
  const supabase = await createServerClient();

  const shelf = String(shelfInput).trim().toUpperCase();

  // Valida formato scaffale
  const numVal = parseInt(shelf, 10);
  const LETTER_SHELVES = Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i));
  const isValidNumeric = !isNaN(numVal) && numVal >= 1 && numVal <= 36 && String(numVal) === shelf;
  const isValidLetter = LETTER_SHELVES.includes(shelf);

  if (!isValidNumeric && !isValidLetter) {
    return { error: "Scaffale non valido. Usa un numero (1–36) o una lettera (A–L)." };
  }

  // Recupera la data della festa target se non passata
  let targetDate = partyDate;
  if (!targetDate) {
    const { data: targetParty } = await supabase
      .from("parties")
      .select("data")
      .eq("id", partyId)
      .single();
    targetDate = targetParty?.data;
  }

  // Verifica conflitti: stesso scaffale, stessa data, stato attivo (non scaricato_scaffale)
  const { data: sameDayParties } = await supabase
    .from("parties")
    .select("id, shelves, nome")
    .eq("data", targetDate)
    .neq("stato", "scaricato_scaffale")
    .neq("id", partyId);

  const conflict = (sameDayParties || []).find((p) => {
    if (!p.shelves) return false;
    return p.shelves.split(",").map((s) => s.trim().toUpperCase()).includes(shelf);
  });

  if (conflict) {
    return { error: `Lo scaffale #${shelf} è già usato dalla festa "${conflict.nome}" in questa data.` };
  }

  // Carica scaffali attuali della festa
  const { data: party, error: partyError } = await supabase
    .from("parties")
    .select("shelves")
    .eq("id", partyId)
    .single();

  if (partyError) return { error: "Festa non trovata." };

  const currentShelves = (party.shelves || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s && s !== "0");

  if (currentShelves.includes(shelf)) {
    return { error: `Lo scaffale #${shelf} è già assegnato a questa festa.` };
  }

  const newShelves = [...currentShelves, shelf].join(",");

  const { error: updateError } = await supabase
    .from("parties")
    .update({ shelves: newShelves })
    .eq("id", partyId);

  if (updateError) {
    console.error("[v0] Error assigning shelf:", updateError);
    return { error: "Errore nell'assegnazione dello scaffale." };
  }

  revalidatePath("/admin/shelves");
  return { success: true };
}

export async function removeMaterialFromParty(partyId, macroId) {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("party_inventory")
    .delete()
    .eq("party_id", partyId)
    .eq("inventory_id", macroId);

  if (error) {
    console.error("[v0] removeMaterialFromParty error:", error);
    return { error: "Errore nella rimozione del materiale." };
  }

  revalidatePath("/admin/shelves");
  return { success: true };
}

export async function getPartiesWithoutShelf() {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("parties")
    .select("id, nome, data, luogo, stato")
    .neq("stato", "scaricato_scaffale")
    .order("data", { ascending: true });

  if (error) { console.error("[v0] Error loading parties:", error); return []; }

  return (data || []).filter(
    (p) => !p.shelves || p.shelves.trim() === "" || p.shelves === "0"
  );
}