"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function getInventoryItems() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("inventory_items")
      .select(`
        *,
        inventory_losses(tipo, resolved)
      `)
      .order("name");

    if (error) throw error;

    return (data || []).map((item) => {
      // Solo le losses NON resolved contano per i filtri attivi
      const activeLossTypes = new Set(
        (item.inventory_losses || [])
          .filter((l) => !l.resolved)
          .map((l) => l.tipo)
      );
      return {
        ...item,
        _hasDanneggiato: activeLossTypes.has("danneggiato"),
        _hasRubato: activeLossTypes.has("rubato"),
        inventory_losses: undefined,
      };
    });
  } catch (error) {
    console.error("[v0] Error fetching inventory:", error);
    return [];
  }
}

export async function getItemDetails(itemId) {
  try {
    const supabase = await createClient();

    const { data: children, error: childError } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("parent_id", itemId)
      .order("name");

    if (childError) throw childError;

    const { data: losses, error: lossError } = await supabase
      .from("inventory_losses")
      .select(`
        id,
        tipo,
        quantita,
        valore_stimato,
        note,
        created_at,
        resolved,
        reported_by,
        reporter:reported_by(nome),
        party:party_id(nome, data)
      `)
      .eq("inventory_id", itemId)
      .order("created_at", { ascending: false });

    if (lossError) throw lossError;

    return { children: children || [], losses: losses || [] };
  } catch (error) {
    console.error("[v0] Error fetching item details:", error);
    return { children: [], losses: [] };
  }
}

/**
 * Rimuove TUTTE le segnalazioni di un tipo specifico per un item
 * marcandole come resolved (non cancella per mantenere lo storico).
 */
export async function removeLossByType(itemId, tipo) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("inventory_losses")
      .update({ resolved: true })
      .eq("inventory_id", itemId)
      .eq("tipo", tipo);

    if (error) throw error;

    if (tipo === "mancante") {
      await supabase
        .from("inventory_items")
        .update({ materiale_mancante: false })
        .eq("id", itemId);
    }

    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (error) {
    console.error("[v0] Error removing losses:", error);
    return { error: error.message };
  }
}

export async function createInventoryItem(formData) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("inventory_items")
      .insert([{
        name: formData.name,
        type: formData.type,
        parent_id: formData.parent_id || null,
        materiale_mancante: formData.materiale_mancante || false,
        image_url: formData.image_url || null,
      }])
      .select();

    if (error) throw error;

    revalidatePath("/admin/inventory");
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("[v0] Error creating inventory item:", error);
    return { error: error.message };
  }
}

export async function updateInventoryItem(id, formData) {
  try {
    const supabase = await createClient();

    const updateData = {
      name: formData.name,
      type: formData.type,
      parent_id: formData.parent_id || null,
      materiale_mancante: formData.materiale_mancante || false,
    };

    if (formData.image_url !== undefined) {
      updateData.image_url = formData.image_url;
    }

    const { data, error } = await supabase
      .from("inventory_items")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;

    // Se l'item viene rimesso come disponibile (materiale_mancante = false),
    // segna tutte le sue losses come resolved per non impattare sul check
    // e sulle segnalazioni attive — le righe rimangono per lo storico.
    if (!formData.materiale_mancante) {
      await supabase
        .from("inventory_losses")
        .update({ resolved: true })
        .eq("inventory_id", id)
        .eq("resolved", false);
    }

    revalidatePath("/admin/inventory");
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("[v0] Error updating inventory item:", error);
    return { error: error.message };
  }
}

export async function deleteInventoryItem(id) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (error) {
    console.error("[v0] Error deleting inventory item:", error);
    return { error: error.message };
  }
}

export async function uploadInventoryImage(itemId, file) {
  try {
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const fileExt = file.name.split(".").pop();
    const fileName = `${itemId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("inventory")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from("inventory").getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({ image_url: publicUrl })
      .eq("id", itemId);

    if (updateError) throw updateError;

    revalidatePath("/admin/inventory");
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error("[v0] Error uploading inventory image:", error);
    return { error: error.message };
  }
}