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
/**
 * Duplica una macro categoria con tutta la gerarchia (categorie + sotto).
 *
 * @param macroId      - ID della macro da duplicare
 * @param newMacroName - Nome della nuova macro (scelto dall'utente)
 * @param suffix       - Suffisso da appendere ai nomi figli es. " v2", " dup"
 *
 * Strategia suffix sulle lettere:
 * Il codice prefix (es. "AC-") viene rilevato automaticamente dal nome della macro originale.
 * Se il nuovo nome ha un prefix diverso (es. "BC-"), viene propagato a tutti i figli.
 * Altrimenti viene semplicemente aggiunto il suffix.
 */
export async function duplicateInventoryItem(macroId, newMacroName, suffix = " v2") {
  const supabase = await createClient();

  // 1. Carica la macro originale
  const { data: macro, error: macroError } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", macroId)
    .single();

  if (macroError || !macro) return { error: "Macro non trovata." };

  // Rileva il prefix del nome originale (tutto ciò che precede il primo spazio o le prime lettere+trattino)
  // Es. "AUDIO (Mini Club) AC-" → prefix "AC-", "Baby SPA AC-" → prefix "AC-"
  // Cerca pattern tipo "XX-" o "XX-NNN" alla fine del nome
  const oldPrefix = extractPrefix(macro.name);
  const newPrefix = extractPrefix(newMacroName);
  const prefixChanged = oldPrefix && newPrefix && oldPrefix !== newPrefix;

  // 2. Crea la nuova macro
  const { data: newMacro, error: insertMacroError } = await supabase
    .from("inventory_items")
    .insert([{
      name: newMacroName,
      type: "macro",
      parent_id: null,
      materiale_mancante: false,
      image_url: macro.image_url || null,
    }])
    .select()
    .single();

  if (insertMacroError) return { error: insertMacroError.message };

  // 3. Carica tutte le categorie della macro originale
  const { data: categories } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("parent_id", macroId)
    .eq("type", "categoria")
    .order("name");

  for (const cat of categories || []) {
    const newCatName = renameItem(cat.name, oldPrefix, newPrefix, suffix, prefixChanged);

    // Inserisci la categoria duplicata
    const { data: newCat, error: catErr } = await supabase
      .from("inventory_items")
      .insert([{
        name: newCatName,
        type: "categoria",
        parent_id: newMacro.id,
        materiale_mancante: false,
        image_url: cat.image_url || null,
      }])
      .select()
      .single();

    if (catErr) continue;

    // 4. Carica e duplica tutti i sotto della categoria
    const { data: subs } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("parent_id", cat.id)
      .eq("type", "sotto")
      .order("name");

    if (subs?.length) {
      const subInserts = subs.map((sub) => ({
        name: renameItem(sub.name, oldPrefix, newPrefix, suffix, prefixChanged),
        type: "sotto",
        parent_id: newCat.id,
        materiale_mancante: false,
        image_url: sub.image_url || null,
      }));

      await supabase.from("inventory_items").insert(subInserts);
    }
  }

  revalidatePath("/admin/inventory");
  return { success: true, newId: newMacro.id };
}

/**
 * Estrae il prefix tipo "AC-" o "ABC-" dalla fine del nome.
 * Es: "AUDIO (Mini Club) AG-" → "AG-"
 *     "Baby SPA AC-"          → "AC-"
 *     "Basket Grande"         → null
 */
function extractPrefix(name) {
  const match = name?.match(/\b([A-Z]{2,4}-(?:\d+)?)\s*$/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Rinomina un item figlio in base alla strategia:
 * - Se il prefix è cambiato (es. AC- → BC-), sostituisce il vecchio con il nuovo
 * - Altrimenti aggiunge il suffix al nome
 */
function renameItem(name, oldPrefix, newPrefix, suffix, prefixChanged) {
  if (prefixChanged && oldPrefix && name.toUpperCase().includes(oldPrefix.toUpperCase())) {
    // Sostituisci il vecchio prefix con il nuovo (case-insensitive)
    const regex = new RegExp(oldPrefix.replace(/[-]/g, "\\-"), "gi");
    return name.replace(regex, newPrefix);
  }
  // Aggiungi suffix prima del codice se presente, altrimenti in fondo
  const codeMatch = name.match(/\s+([A-Z]{2,4}-\d+)\s*$/i);
  if (codeMatch) {
    return name.slice(0, name.lastIndexOf(codeMatch[0])) + suffix + codeMatch[0];
  }
  return name + suffix;
}

/**
 * Aggiorna il prefix del codice su una macro e tutti i suoi discendenti.
 * Es: oldPrefix="AC-", newPrefix="BC-" aggiorna tutti i nomi che contengono "AC-"
 *
 * @param macroId   - ID della macro
 * @param oldPrefix - Vecchio prefix (es. "AC-")
 * @param newPrefix - Nuovo prefix (es. "BC-")
 */
export async function updatePrefixForMacroAndChildren(macroId, oldPrefix, newPrefix) {
  const supabase = await createClient();

  if (!oldPrefix || !newPrefix || oldPrefix === newPrefix) {
    return { success: true, updated: 0 };
  }

  const prefixRegex = new RegExp(oldPrefix.replace(/[-]/g, "\\-"), "gi");

  // Carica tutti i discendenti (categorie + sotto) della macro
  const { data: cats } = await supabase
    .from("inventory_items")
    .select("id, name")
    .eq("parent_id", macroId)
    .eq("type", "categoria");

  let updated = 0;

  for (const cat of cats || []) {
    if (cat.name.toUpperCase().includes(oldPrefix.toUpperCase())) {
      const newName = cat.name.replace(prefixRegex, newPrefix);
      await supabase.from("inventory_items").update({ name: newName }).eq("id", cat.id);
      updated++;
    }

    // Sotto di questa categoria
    const { data: subs } = await supabase
      .from("inventory_items")
      .select("id, name")
      .eq("parent_id", cat.id)
      .eq("type", "sotto");

    for (const sub of subs || []) {
      if (sub.name.toUpperCase().includes(oldPrefix.toUpperCase())) {
        const newName = sub.name.replace(prefixRegex, newPrefix);
        await supabase.from("inventory_items").update({ name: newName }).eq("id", sub.id);
        updated++;
      }
    }
  }

  revalidatePath("/admin/inventory");
  return { success: true, updated };
}

/**
 * Aggiunge manualmente una segnalazione di danneggiamento/furto dall'inventario.
 */
export async function addManualLoss(inventoryId, tipo) {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("inventory_losses").insert({
      inventory_id: inventoryId,
      tipo: tipo,
      note: "Impostato manualmente da gestione inventario",
      resolved: false,
    });

    if (error) throw error;

    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (error) {
    console.error("[v0] Error adding manual loss:", error);
    return { error: error.message };
  }
}

export async function duplicateSimpleItem(itemId, newName) {
  const supabase = await createClient();

  const { data: original, error: fetchErr } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (fetchErr || !original) return { error: "Elemento non trovato." };

  // Inserisci la copia dell'item
  const { data: newItem, error: insertErr } = await supabase
    .from("inventory_items")
    .insert([{
      name:               newName,
      type:               original.type,
      parent_id:          original.parent_id,
      materiale_mancante: false,
      image_url:          original.image_url || null,
    }])
    .select()
    .single();

  if (insertErr) return { error: insertErr.message };

  // Se è una categoria, duplica anche tutti i sotto
  if (original.type === "categoria") {
    const { data: subs } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("parent_id", itemId)
      .eq("type", "sotto")
      .order("name");

    if (subs?.length) {
      // Applica lo stesso suffix che è stato usato sul nome della categoria
      const originalBase = original.name;
      const suffix = newName.slice(originalBase.length) || " copia";

      const subInserts = subs.map((sub) => ({
        name:               sub.name + suffix,
        type:               "sotto",
        parent_id:          newItem.id,
        materiale_mancante: false,
        image_url:          sub.image_url || null,
      }));
      await supabase.from("inventory_items").insert(subInserts);
    }
  }

  revalidatePath("/admin/inventory");
  return { success: true, newId: newItem.id };
}