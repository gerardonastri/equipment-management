"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function getInventoryItems() {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("name");

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("[v0] Error fetching inventory:", error);
    return [];
  }
}

export async function createInventoryItem(formData) {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("inventory_items")
      .insert([
        {
          name: formData.name,
          type: formData.type,
          parent_id: formData.parent_id || null,
          materiale_mancante: formData.materiale_mancante || false,
          image_url: formData.image_url || null,
        },
      ])
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
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("inventory_items")
      .update({
        name: formData.name,
        type: formData.type,
        parent_id: formData.parent_id || null,
        materiale_mancante: formData.materiale_mancante || false,
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    revalidatePath("/admin/inventory");
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("[v0] Error updating inventory item:", error);
    return { error: error.message };
  }
}

export async function deleteInventoryItem(id) {
  try {
    const supabase = await createServerClient();

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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY, // ❤️ bypassa RLS completamente
      { auth: { persistSession: false } }
    );
    // const supabase = await createServerClient();

    const fileExt = file.name.split(".").pop();
    const filePath = `${itemId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("inventory")
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("inventory").getPublicUrl(filePath);

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
