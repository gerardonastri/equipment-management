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

  const { data, error } = await supabase.rpc("get_party_materials_tree", {
    p_party_id: partyId,
  });

  if (error) {
    console.error("Error loading party materials:", error);
    return [];
  }

  // Group the flat results into hierarchical structure
  const macros = new Map();

  for (const item of data || []) {
    if (item.type === "macro") {
      if (!macros.has(item.id)) {
        macros.set(item.id, { ...item, categories: [] });
      }
    } else if (item.type === "categoria") {
      const macro = macros.get(item.parent_id);
      if (macro) {
        const category = { ...item, subcategories: [] };
        macro.categories.push(category);
      }
    } else if (item.type === "sotto") {
      for (const macro of macros.values()) {
        const category = macro.categories.find((c) => c.id === item.parent_id);
        if (category) {
          category.subcategories.push(item);
        }
      }
    }
  }

  return Array.from(macros.values());
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

  // Assign selected materials
  if (formData.selectedMaterials?.length > 0 && data[0]) {
    const materialAssignments = formData.selectedMaterials.map(
      (materialId) => ({
        party_id: data[0].id,
        inventory_id: materialId,
      })
    );

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
