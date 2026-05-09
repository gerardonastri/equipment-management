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

export async function getPartyDataForShelf(shelfId) {
  "use server";
  try {
    const supabase = await createClient();

    // 1. Recupera le feste attive (con animatore per non far crashare la UI)
    const { data: parties, error: partyError } = await supabase
      .from("parties")
      .select(`
        *,
        animatore:animatore_id(nome, ruolo),
        magazziniere:magazziniere_id(nome, ruolo)
      `)
      .neq("stato", "scaricato_scaffale");

    if (partyError) throw partyError;

    // 2. Filtra la festa usando la TUA nuova logica case-insensitive
    const matchingParties = (parties || []).filter((p) => {
      const shelfList = (p.shelves || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      return shelfList.includes(shelfId.trim().toLowerCase());
    });

    if (matchingParties.length === 0) {
      return { error: "Nessuna festa trovata per questo scaffale" };
    }

    // 3. Se ci sono più feste, prendi quella di oggi o la più vicina (vecchia logica sicura)
    let party;
    if (matchingParties.length === 1) {
      party = matchingParties[0];
    } else {
      const todayStr = new Date().toISOString().slice(0, 10);
      const today = new Date(todayStr);

      const todayParty = matchingParties.find((p) => p.data === todayStr);
      if (todayParty) {
        party = todayParty;
      } else {
        party = matchingParties.reduce((best, p) => {
          const diffBest = new Date(best.data) - today;
          const diffP    = new Date(p.data) - today;
          const absBest = Math.abs(diffBest);
          const absP    = Math.abs(diffP);
          if (diffBest < 0 && diffP >= 0) return p;  
          if (diffP < 0 && diffBest >= 0) return best; 
          return absP < absBest ? p : best;          
        });
      }
    }

    // 4. Carica i check completati
    const { data: checks, error: checksError } = await supabase
      .from("checks")
      .select("*")
      .eq("party_id", party.id);

    if (checksError) throw checksError;

    // 5. Carica la gerarchia del materiale (FONDAMENTALE per page.jsx e lo scan NFC)
    const { data: partyMaterial, error: materialError } = await supabase
      .from("party_inventory")
      .select(`
        inventory_items!inner(
          id,
          name,
          type,
          parent_id,
          materiale_mancante,
          image_url
        )
      `)
      .eq("party_id", party.id);

    if (materialError) throw materialError;

    const macroCategories = partyMaterial
      .filter((item) => item.inventory_items.type === "macro")
      .map((item) => item.inventory_items);

    const materialHierarchy = [];
    for (const macro of macroCategories) {
      const { data: categories } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("parent_id", macro.id)
        .eq("type", "categoria");

      const macroData = {
        id: macro.id,
        name: macro.name,
        materiale_mancante: macro.materiale_mancante,
        categories: [],
      };

      for (const category of categories || []) {
        const { data: subcategories } = await supabase
          .from("inventory_items")
          .select("*")
          .eq("parent_id", category.id)
          .eq("type", "sotto");

        macroData.categories.push({
          id: category.id,
          name: category.name,
          items: subcategories || [],
          materiale_mancante: category.materiale_mancante,
        });
      }
      materialHierarchy.push(macroData);
    }

    // 6. Carica le losses non risolte
    const { data: existingLosses } = await supabase
      .from("inventory_losses")
      .select("inventory_id, tipo, note, valore_stimato")
      .eq("party_id", party.id)
      .eq("resolved", false);

    const allPartyShelves = (party.shelves || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // 7. RESTITUISCE TUTTO NELLA STRUTTURA ESATTA CHE page.jsx SI ASPETTA
    return {
      party,
      checks: checks || [],
      materialHierarchy,
      existingLosses: existingLosses || [],
      allPartyShelves,
    };
  } catch (error) {
    console.error("[check] getPartyDataForShelf error:", error);
    return { error: "Errore nel caricamento dei dati" };
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
 * Duplica un singolo item (categoria o sotto) con un suffix al nome.
 * - Per una categoria: duplica anche tutti i suoi sotto-elementi.
 * - Per un sotto: duplica solo se stesso.
 * Il parent_id rimane lo stesso dell'originale.
 */
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

// -------------------------------------------------------------------------
// --- FUNZIONI RECUPERATE DALLA VECCHIA VERSIONE (AGGIUNTE QUI SOTTO) ---
// -------------------------------------------------------------------------

export async function authenticateUser(name, code) {
  try {
    const supabase = await createClient();

    const normalizedName = name.toLowerCase().trim();

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .ilike("nome", normalizedName)
      .eq("codice_sicurezza", code)
      .single();

    if (error || !user) {
      return { error: "Credenziali non valide" };
    }

    return { user };
  } catch (error) {
    console.error("[v0] Authentication error:", error);
    return { error: "Errore durante l'autenticazione" };
  }
}

export async function submitCheck(
  partyId,
  userId,
  userRole,
  checkType,
  shelfId,
  checkedCount,
  totalItems,
  userName,
  partyName,
  materialSmarrito = false,
  itemsToMarkMissing = []
) {
  try {
    const supabase = await createClient();

    const allowedRoles = {
      deposito_scaffale: ["magazziniere", "amministratore"],
      scaffale_furgone: ["animatore", "magazziniere", "amministratore"],
      furgone_scaffale: ["animatore", "magazziniere", "amministratore"],
      scaffale_deposito: ["magazziniere", "amministratore"],
    };

    if (!allowedRoles[checkType]?.includes(userRole)) {
      return { error: "Non hai i permessi per questo tipo di check" };
    }

    const checkSequence = [
      "deposito_scaffale",
      "scaffale_furgone",
      "furgone_scaffale",
      "scaffale_deposito",
    ];

    const currentIndex = checkSequence.indexOf(checkType);

    if (currentIndex > 0) {
      const previousCheckType = checkSequence[currentIndex - 1];

      const { data: previousCheck, error: prevError } = await supabase
        .from("checks")
        .select("id")
        .eq("party_id", partyId)
        .eq("type", previousCheckType)
        .single();

      if (prevError || !previousCheck) {
        return {
          error: `Devi completare prima il check: ${previousCheckType.replace(/_/g, " ")}`,
        };
      }
    }

    const { data: existingCheck } = await supabase
      .from("checks")
      .select("id")
      .eq("party_id", partyId)
      .eq("type", checkType)
      .single();

    if (existingCheck) {
      return { error: "Questo check è già stato completato" };
    }

    const { data: currentParty } = await supabase
      .from("parties")
      .select("animatore_id, magazziniere_id")
      .eq("id", partyId)
      .single();

    const partyUpdates = {};

    if (userRole === "animatore") {
      // Legacy: aggiorna animatore_id se vuoto
      if (!currentParty?.animatore_id) {
        partyUpdates.animatore_id = userId;
      }
      // Multi-animatore: aggiungi a animatori_ids se non già presente
      const currentAnimatoriIds = currentParty?.animatori_ids || [];
      if (!currentAnimatoriIds.includes(userId)) {
        partyUpdates.animatori_ids = [...currentAnimatoriIds, userId];
      }
    }

    if (userRole === "magazziniere" && !currentParty?.magazziniere_id) {
      partyUpdates.magazziniere_id = userId;
      console.log("[v0] Auto-assigning magazziniere:", userId);
    }

    if (materialSmarrito && itemsToMarkMissing.length > 0) {
      console.log("[v0] Marking items as missing:", itemsToMarkMissing);

      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({ materiale_mancante: true })
        .in("id", itemsToMarkMissing);

      if (updateError) {
        console.error("[v0] Error marking items as missing:", updateError);
      } else {
        console.log("[v0] Successfully marked items as missing");
      }
    }

    const { data: insertedCheck, error: insertError } = await supabase
      .from("checks")
      .insert({
        party_id: partyId,
        user_id: userId,
        type: checkType,
        notes: `Check completato: ${checkedCount}/${totalItems} elementi verificati`,
        materiale_smarrito: materialSmarrito,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    let newStatus = null;
    if (checkType === "deposito_scaffale") newStatus = "caricato_scaffale";
    else if (checkType === "scaffale_furgone") newStatus = "caricato_furgone";
    else if (checkType === "furgone_scaffale") newStatus = "scaricato_furgone";
    else if (checkType === "scaffale_deposito") newStatus = "scaricato_scaffale";

    if (newStatus) partyUpdates.stato = newStatus;

    if (Object.keys(partyUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from("parties")
        .update(partyUpdates)
        .eq("id", partyId);

      if (updateError) console.error("[v0] Error updating party:", updateError);
      else console.log("[v0] Party updated with:", partyUpdates);
    }

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        titolo: `Check Completato - ${checkType.replace(/_/g, " ")}`,
        messaggio: `${userName} ha completato il check per la festa "${partyName}" (Scaffale ${shelfId}). Elementi verificati: ${checkedCount}/${totalItems}${materialSmarrito ? " - MATERIALE SMARRITO" : ""}`,
        tipo: "check",
        letto: false,
      });

    if (notificationError) console.error("[v0] Error creating notification:", notificationError);

    const checkTypeNames = {
      deposito_scaffale: "Carico dal Deposito allo Scaffale",
      scaffale_furgone: "Carico dallo Scaffale al Furgone",
      furgone_scaffale: "Scarico dal Furgone allo Scaffale",
      scaffale_deposito: "Scarico dallo Scaffale al Deposito",
    };

    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      await fetch(`${siteUrl}/api/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `${materialSmarrito ? "⚠️" : "✅"} Check completato!\n\nFesta: ${partyName}\nScaffale: ${shelfId}\nTipo: ${checkTypeNames[checkType]}\nUtente: ${userName}\nCompletati: ${checkedCount}/${totalItems}${materialSmarrito ? "\n⚠️ MATERIALE SMARRITO" : ""}`,
        }),
      });
      console.log("[v0] Telegram notification sent successfully");
    } catch (telegramError) {
      console.error("[v0] Error sending Telegram notification:", telegramError);
    }

    // ── Logica Handoff ──────────────────────────────────────────────────────
    // Se questa festa ha un handoff attivo e stiamo completando lo scarico furgone (furgone_scaffale),
    // creiamo automaticamente il check deposito_scaffale per la festa destinazione
    // sulle macro handoff — così il magazziniere non deve fare il check iniziale.
    if (checkType === "furgone_scaffale") {
      const { data: currentPartyFull } = await supabase
        .from("parties")
        .select("handoff_to_party_id, handoff_macro_ids")
        .eq("id", partyId)
        .single();

      if (currentPartyFull?.handoff_to_party_id && currentPartyFull.handoff_macro_ids?.length > 0) {
        const destPartyId = currentPartyFull.handoff_to_party_id;
        console.log("[v0] Handoff attivo: creazione check automatici per festa", destPartyId);

        // Crea deposito_scaffale sintetico per la festa destinazione (se non esiste)
        const { data: existingDestCheck } = await supabase
          .from("checks")
          .select("id")
          .eq("party_id", destPartyId)
          .eq("type", "deposito_scaffale")
          .maybeSingle();

        if (!existingDestCheck) {
          await supabase.from("checks").insert({
            party_id:           destPartyId,
            user_id:            userId,
            type:               "deposito_scaffale",
            notes:              `Check automatico — materiale ricevuto in handoff dalla festa sorgente (scaffale animatore). Macro trasferite: ${currentPartyFull.handoff_macro_ids.length}`,
            materiale_smarrito: false,
          });

          // Aggiorna stato festa destinazione a caricato_scaffale
          await supabase
            .from("parties")
            .update({ stato: "caricato_scaffale" })
            .eq("id", destPartyId);

          console.log("[v0] Handoff: check deposito_scaffale creato per festa destinazione", destPartyId);
        }
      }
    }

    // Se stiamo completando lo scarico scaffale (scaffale_deposito) con handoff attivo,
    // il check scaffale_deposito sulle macro handoff è già gestito dall'animatore —
    // lo creiamo sinteticamente per non bloccare il flusso del magazziniere.
    if (checkType === "furgone_scaffale") {
      const { data: srcParties } = await supabase
        .from("parties")
        .select("id, handoff_macro_ids")
        .eq("handoff_to_party_id", partyId)
        .neq("stato", "scaricato_scaffale");

      if (srcParties?.length) {
        for (const srcParty of srcParties) {
          if (!srcParty.handoff_macro_ids?.length) continue;
          // La festa sorgente non deve fare scaffale_deposito per le macro in handoff.
          // Creiamo il check sintetico scaffale_deposito solo se non esiste già.
          const { data: existingSrc } = await supabase
            .from("checks")
            .select("id")
            .eq("party_id", srcParty.id)
            .eq("type", "scaffale_deposito")
            .maybeSingle();

          if (!existingSrc) {
            await supabase.from("checks").insert({
              party_id:           srcParty.id,
              user_id:            userId,
              type:               "scaffale_deposito",
              notes:              `Check automatico — materiale in handoff, non rientra in magazzino. Gestito dall'animatore.`,
              materiale_smarrito: false,
            });

            await supabase
              .from("parties")
              .update({ stato: "scaricato_scaffale" })
              .eq("id", srcParty.id);

            console.log("[v0] Handoff: check scaffale_deposito sintetico creato per festa sorgente", srcParty.id);
          }
        }
      }
    }
    // ── Fine Logica Handoff ──────────────────────────────────────────────────

    revalidatePath(`/admin/check/${shelfId}`);

    return { message: "Check completato con successo!", checkId: insertedCheck?.id };
  } catch (error) {
    console.error("[v0] Error submitting check:", error);
    return { error: "Errore durante l'invio del check" };
  }
}

/**
 * Salva IMMEDIATAMENTE una segnalazione di danneggiato/rubato
 * su un singolo elemento durante il check (prima del submit).
 * - Inserisce in inventory_losses (resolved=false)
 * - Mette materiale_mancante: true sull'item
 */
export async function reportItemDamage(inventoryId, partyId, userId, tipo, valoreStimato, note) {
  try {
    const supabase = await createClient();

    const { error: lossError } = await supabase.from("inventory_losses").insert({
      inventory_id: inventoryId,
      party_id: partyId,
      check_id: null,
      tipo,
      quantita: 1,
      valore_stimato: valoreStimato || null,
      note: note || null,
      reported_by: userId,
      resolved: false,
    });

    if (lossError) throw lossError;

    const { error: itemError } = await supabase
      .from("inventory_items")
      .update({ materiale_mancante: true })
      .eq("id", inventoryId);

    if (itemError) throw itemError;

    console.log("[v0] Item damage reported and marked:", inventoryId, tipo);
    return { success: true };
  } catch (error) {
    console.error("[v0] Error reporting item damage:", error);
    return { error: error.message };
  }
}

/**
 * Salva le segnalazioni di materiale perso/danneggiato/rubato
 * nella tabella inventory_losses (fase post-check).
 */
export async function reportLosses(checkId, partyId, userId, losses) {
  try {
    const supabase = await createClient();

    if (!losses || losses.length === 0) return { success: true };

    const rows = losses.map((loss) => ({
      inventory_id: loss.inventoryId,
      party_id: partyId,
      check_id: checkId,
      tipo: loss.tipo,
      quantita: loss.quantita || 1,
      valore_stimato: loss.valoreStimato || null,
      note: loss.note || null,
      reported_by: userId,
      resolved: false,
    }));

    const { error } = await supabase.from("inventory_losses").insert(rows);

    if (error) throw error;

    console.log("[v0] Losses reported successfully:", rows.length);
    return { success: true };
  } catch (error) {
    console.error("[v0] Error reporting losses:", error);
    return { error: error.message };
  }
}