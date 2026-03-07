"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getPartiesData() {
  const supabase = await createServerClient();

  const [partiesRes, usersRes, macroRes] = await Promise.all([
    supabase
      .from("parties")
      .select(
        `
        *,
        animatore:animatore_id(nome),
        magazziniere:magazziniere_id(nome)
      `
      )
      .order("created_at", { ascending: false }),

    supabase.from("users").select("*").order("nome"),

    supabase
      .from("inventory_items")
      .select("*")
      .eq("type", "macro")
      .is("parent_id", null)
      .order("name"),
  ]);

  return {
    parties: partiesRes.data || [],
    users: usersRes.data || [],
    macroCategories: macroRes.data || [],
  };
}

export async function getPartyMaterials(partyId) {
  const supabase = await createServerClient();

  const { data: partyMacros, error: macroError } = await supabase
    .from("party_inventory")
    .select("inventory_id")
    .eq("party_id", partyId);

  if (macroError) {
    console.error("[v0] Error loading party macros:", macroError);
    return [];
  }

  if (!partyMacros || partyMacros.length === 0) {
    return [];
  }

  const macroIds = partyMacros.map((m) => m.inventory_id);

  const { data: macros, error: macrosError } = await supabase
    .from("inventory_items")
    .select("*")
    .in("id", macroIds)
    .eq("type", "macro");

  if (macrosError) {
    console.error("[v0] Error loading macros:", macrosError);
    return [];
  }

  const result = [];
  for (const macro of macros || []) {
    const { data: categories, error: catError } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("parent_id", macro.id)
      .eq("type", "categoria");

    if (catError) {
      console.error("[v0] Error loading categories:", catError);
      continue;
    }

    const categoriesWithSubs = [];
    for (const category of categories || []) {
      const { data: subcategories, error: subError } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("parent_id", category.id)
        .eq("type", "sotto");

      if (subError) {
        console.error("[v0] Error loading subcategories:", subError);
        continue;
      }

      categoriesWithSubs.push({
        ...category,
        subcategories: subcategories || [],
      });
    }

    result.push({
      ...macro,
      categories: categoriesWithSubs,
    });
  }

  return result;
}

/**
 * Carica lo storico completo di una festa:
 * - checks (con utente che ha eseguito il check)
 * - inventory_losses (con elemento inventario e utente che ha segnalato)
 */
export async function getPartyHistory(partyId) {
  const supabase = await createServerClient();

  // Checks della festa, con join all'utente
  const { data: checks, error: checksError } = await supabase
    .from("checks")
    .select(
      `
      *,
      user:user_id(nome, ruolo)
    `
    )
    .eq("party_id", partyId)
    .order("created_at", { ascending: true });

  if (checksError) {
    console.error("[v0] Error loading checks:", checksError);
    return { checks: [], losses: [] };
  }

  // Perdite/danni della festa, con join all'elemento e all'utente
  const { data: losses, error: lossesError } = await supabase
    .from("inventory_losses")
    .select(
      `
      *,
      item:inventory_id(name, type),
      reporter:reported_by(nome)
    `
    )
    .eq("party_id", partyId)
    .order("created_at", { ascending: false });

  if (lossesError) {
    console.error("[v0] Error loading losses:", lossesError);
    return { checks: checks || [], losses: [] };
  }

  return {
    checks: checks || [],
    losses: losses || [],
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

  const { data, error } = await supabase
    .from("parties")
    .insert([partyData])
    .select();

  if (error) throw error;

  if (formData.selectedMaterials?.length > 0 && data[0]) {
    const materialAssignments = formData.selectedMaterials.map((materialId) => ({
      party_id: data[0].id,
      inventory_id: materialId,
    }));

    const { error: materialError } = await supabase
      .from("party_inventory")
      .insert(materialAssignments);

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

  const { data, error } = await supabase
    .from("parties")
    .update(partyData)
    .eq("id", partyId)
    .select();

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

  const { error } = await supabase.from("party_inventory").insert([
    {
      party_id: partyId,
      inventory_id: macroId,
    },
  ]);

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