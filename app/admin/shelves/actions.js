"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Carica tutti gli scaffali occupati da feste attive
 * (stato != 'scaricato_scaffale'), con tutte le info necessarie.
 *
 * Ogni scaffale include:
 * - numero scaffale
 * - festa (nome, data, luogo, stato, animatore, magazziniere)
 * - materiale assegnato (solo macro, con categorie)
 * - segnalazioni attive (resolved = false)
 */
export async function getOccupiedShelves() {
  const supabase = await createServerClient();

  // 1. Feste attive con animatore e magazziniere
  const { data: parties, error: partiesError } = await supabase
    .from("parties")
    .select(`
      id, nome, data, luogo, stato, shelves, note,
      animatore:animatore_id(nome),
      magazziniere:magazziniere_id(nome)
    `)
    .neq("stato", "scaricato_scaffale")
    .order("data", { ascending: true });

  if (partiesError) {
    console.error("[v0] Error loading parties:", partiesError);
    return [];
  }

  // 2. Espandi ogni festa per ogni scaffale assegnato
  const shelvesList = [];

  for (const party of parties || []) {
    if (!party.shelves) continue;

    const shelfNumbers = party.shelves
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!shelfNumbers.length) continue;

    // 2a. Materiale assegnato (macro con categorie)
    const { data: partyItems } = await supabase
      .from("party_inventory")
      .select(`
        inventory_id,
        inventory_items!inner(id, name, type, parent_id)
      `)
      .eq("party_id", party.id)
      .eq("inventory_items.type", "macro");

    const macros = (partyItems || []).map((i) => i.inventory_items);

    // Carica categorie per ogni macro (max 3 livelli — non appesantiamo)
    const materialSummary = [];
    for (const macro of macros) {
      const { data: cats } = await supabase
        .from("inventory_items")
        .select("id, name")
        .eq("parent_id", macro.id)
        .eq("type", "categoria")
        .order("name");

      materialSummary.push({
        id: macro.id,
        name: macro.name,
        categories: (cats || []).map((c) => c.name),
      });
    }

    // 2b. Segnalazioni attive (resolved = false)
    const { data: losses } = await supabase
      .from("inventory_losses")
      .select(`
        id, tipo, valore_stimato, note,
        item:inventory_id(name)
      `)
      .eq("party_id", party.id)
      .eq("resolved", false)
      .order("created_at", { ascending: false });

    const activeLosses = losses || [];

    // Crea una entry per ogni scaffale della festa
    for (const shelfNum of shelfNumbers) {
      shelvesList.push({
        shelfId: shelfNum,
        shelfNumber: parseInt(shelfNum, 10),
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

  // Ordina per numero scaffale
  shelvesList.sort((a, b) => a.shelfNumber - b.shelfNumber);

  return shelvesList;
}

/**
 * Carica la lista di feste attive senza scaffale assegnato (shelves = '' o null),
 * utile per il selettore "assegna scaffale".
 */
export async function getPartiesWithoutShelf() {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("parties")
    .select("id, nome, data, luogo, stato")
    .neq("stato", "scaricato_scaffale")
    .order("data", { ascending: true });

  if (error) {
    console.error("[v0] Error loading parties:", error);
    return [];
  }

  // Filtra solo quelle senza scaffali
  return (data || []).filter(
    (p) => !p.shelves || p.shelves.trim() === "" || p.shelves === "0"
  );
}

/**
 * Carica tutte le feste attive (per il selettore — possiamo assegnare
 * uno scaffale libero anche a una festa che ne ha già uno).
 */
export async function getActiveParties() {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("parties")
    .select("id, nome, data, luogo, stato, shelves")
    .neq("stato", "scaricato_scaffale")
    .order("data", { ascending: true });

  if (error) {
    console.error("[v0] Error loading active parties:", error);
    return [];
  }

  return data || [];
}

/**
 * Assegna uno scaffale libero a una festa.
 * Se la festa ha già degli scaffali, il nuovo viene aggiunto alla lista.
 * Controlla che lo scaffale non sia già occupato da un'altra festa attiva.
 */
export async function assignShelfToParty(partyId, shelfInput) {
  const supabase = await createServerClient();

  const shelf = String(shelfInput).trim().toUpperCase();

  // Valida: numerico 1-36 oppure lettera A-L
  const numVal = parseInt(shelf, 10);
  const LETTER_SHELVES = Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i));
  const isValidNumeric = !isNaN(numVal) && numVal >= 1 && numVal <= 36 && String(numVal) === shelf;
  const isValidLetter = LETTER_SHELVES.includes(shelf);

  if (!isValidNumeric && !isValidLetter) {
    return { error: "Scaffale non valido. Usa un numero (1–36) o una lettera (A–L)." };
  }

  // 1. Verifica che lo scaffale non sia già occupato
  const { data: allParties } = await supabase
    .from("parties")
    .select("id, shelves")
    .neq("stato", "scaricato_scaffale")
    .neq("id", partyId);

  const isOccupied = (allParties || []).some((p) => {
    if (!p.shelves) return false;
    return p.shelves.split(",").map((s) => s.trim()).includes(shelf);
  });

  if (isOccupied) {
    return { error: `Lo scaffale #${shelf} è già occupato da un'altra festa.` };
  }

  // 2. Carica gli scaffali attuali della festa
  const { data: party, error: partyError } = await supabase
    .from("parties")
    .select("shelves")
    .eq("id", partyId)
    .single();

  if (partyError) {
    return { error: "Festa non trovata." };
  }

  const currentShelves = (party.shelves || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s !== "0" && s !== "");

  if (currentShelves.includes(shelf)) {
    return { error: `Lo scaffale #${shelf} è già assegnato a questa festa.` };
  }

  const newShelves = [...currentShelves, shelf].join(",");

  // 3. Aggiorna la festa
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