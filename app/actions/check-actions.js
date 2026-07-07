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
  try {
    const supabase = await createClient();

    // ── LOGICA SCAFFALE VIRTUALE (Handoff) ──
    const isVirtual = typeof shelfId === 'string' && shelfId.toUpperCase().startsWith("V");
    const baseShelf = isVirtual ? shelfId.substring(1) : shelfId;

    const { data: parties, error: partyError } = await supabase
      .from("parties")
      .select(`
        *,
        animatore:animatore_id(nome, ruolo),
        magazziniere:magazziniere_id(nome, ruolo)
      `)
      .neq("stato", "scaricato_scaffale");

    if (partyError) throw partyError;

    const matchingParties = (parties || []).filter((p) => {
      const shelfList = (p.shelves || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      return shelfList.includes(baseShelf.toLowerCase());
    });

    if (matchingParties.length === 0) {
      return { error: "Nessuna festa trovata per questo scaffale" };
    }

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

    // ── FLAG DESTINAZIONE HANDOFF ──
    const { data: sourceParties } = await supabase
      .from("parties")
      .select("id")
      .eq("handoff_to_party_id", party.id)
      .neq("stato", "scaricato_scaffale");
      
    party._isHandoffDestination = sourceParties && sourceParties.length > 0;

    const { data: checks, error: checksError } = await supabase
      .from("checks")
      .select("*, check_items(inventory_id, stato)")
      .eq("party_id", party.id);

    if (checksError) throw checksError;

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

    const { data: existingLosses } = await supabase
      .from("inventory_losses")
      .select("inventory_id, tipo, note, valore_stimato")
      .eq("party_id", party.id)
      .eq("resolved", false);

    const allPartyShelves = (party.shelves || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

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

export async function duplicateInventoryItem(macroId, newMacroName, suffix = " v2") {
  const supabase = await createClient();

  const { data: macro, error: macroError } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", macroId)
    .single();

  if (macroError || !macro) return { error: "Macro non trovata." };

  const oldPrefix = extractPrefix(macro.name);
  const newPrefix = extractPrefix(newMacroName);
  const prefixChanged = oldPrefix && newPrefix && oldPrefix !== newPrefix;

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

  const { data: categories } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("parent_id", macroId)
    .eq("type", "categoria")
    .order("name");

  for (const cat of categories || []) {
    const newCatName = renameItem(cat.name, oldPrefix, newPrefix, suffix, prefixChanged);

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

function extractPrefix(name) {
  const match = name?.match(/\b([A-Z]{2,4}-(?:\d+)?)\s*$/i);
  return match ? match[1].toUpperCase() : null;
}

function renameItem(name, oldPrefix, newPrefix, suffix, prefixChanged) {
  if (prefixChanged && oldPrefix && name.toUpperCase().includes(oldPrefix.toUpperCase())) {
    const regex = new RegExp(oldPrefix.replace(/[-]/g, "\\-"), "gi");
    return name.replace(regex, newPrefix);
  }
  const codeMatch = name.match(/\s+([A-Z]{2,4}-\d+)\s*$/i);
  if (codeMatch) {
    return name.slice(0, name.lastIndexOf(codeMatch[0])) + suffix + codeMatch[0];
  }
  return name + suffix;
}

export async function updatePrefixForMacroAndChildren(macroId, oldPrefix, newPrefix) {
  const supabase = await createClient();

  if (!oldPrefix || !newPrefix || oldPrefix === newPrefix) {
    return { success: true, updated: 0 };
  }

  const prefixRegex = new RegExp(oldPrefix.replace(/[-]/g, "\\-"), "gi");

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

export async function duplicateSimpleItem(itemId, newName) {
  const supabase = await createClient();

  const { data: original, error: fetchErr } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (fetchErr || !original) return { error: "Elemento non trovato." };

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

  if (original.type === "categoria") {
    const { data: subs } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("parent_id", itemId)
      .eq("type", "sotto")
      .order("name");

    if (subs?.length) {
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
  itemsToMarkMissing = [],
  itemsResults = [],
  existingCheckId = null,
  isVirtualShelf = false // <-- NUOVO PARAMETRO PER SCAFFALE VIRTUALE
) {
  try {
    const supabase = await createClient();

    const allowedRoles = {
      deposito_scaffale: ["magazziniere", "amministratore", "animatore", "responsabile", "driver"],
      scaffale_furgone:  ["animatore", "magazziniere", "amministratore", "responsabile", "driver"],
      furgone_scaffale:  ["animatore", "magazziniere", "amministratore", "responsabile", "driver"],
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

    // ── BLOCCO CONTROLLO SEQUENZIALE ──
    if (currentIndex > 0) {
      const previousCheckType = checkSequence[currentIndex - 1];

      const { data: previousCheck, error: prevError } = await supabase
        .from("checks")
        .select("id")
        .eq("party_id", partyId)
        .eq("type", previousCheckType)
        .single();

      if (prevError || !previousCheck) {
        // HINT SPECIFICO PER HANDOFF
        if (checkType === "furgone_scaffale" && !isVirtualShelf) {
          const { data: isDest } = await supabase.from("parties").select("id").eq("handoff_to_party_id", partyId).maybeSingle();
          if (isDest) {
            return { error: `Prima di scaricare il materiale al deposito, devi confermare la ricezione dallo Scaffale Virtuale (es: V${shelfId})!` };
          }
        }
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

    if (existingCheck && !existingCheckId) {
      return { error: "Questo check è già stato completato" };
    }

    const { data: currentParty } = await supabase
      .from("parties")
      .select("animatore_id, magazziniere_id, luogo")
      .eq("id", partyId)
      .single();

    const partyUpdates = {};

    if (userRole === "animatore") {
      if (!currentParty?.animatore_id) {
        partyUpdates.animatore_id = userId;
      }
      const currentAnimatoriIds = currentParty?.animatori_ids || [];
      if (!currentAnimatoriIds.includes(userId)) {
        partyUpdates.animatori_ids = [...currentAnimatoriIds, userId];
      }
    }

    if (userRole === "magazziniere" && !currentParty?.magazziniere_id) {
      partyUpdates.magazziniere_id = userId;
    }

    if (materialSmarrito && itemsToMarkMissing.length > 0) {
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({ materiale_mancante: true })
        .in("id", itemsToMarkMissing);

      if (updateError) console.error("[v0] Error marking items as missing:", updateError);
    }

    // ── ASSEGNAZIONE NOTE DINAMICHE PER SCAFFALE VIRTUALE ──
    let checkNotes = existingCheckId 
      ? `Check aggiornato e sbloccato: ${checkedCount}/${totalItems} elementi verificati` 
      : `Check completato: ${checkedCount}/${totalItems} elementi verificati`;

    if (isVirtualShelf) {
      if (checkType === "furgone_scaffale") checkNotes = `Passaggio Materiale Uscita: ${checkedCount}/${totalItems}`;
      if (checkType === "deposito_scaffale") checkNotes = `Materiale Ricevuto (Handoff): ${checkedCount}/${totalItems}`;
    }

    let insertedCheck;

    if (existingCheckId) {
      const { data: updatedCheck, error: updateCheckError } = await supabase
        .from("checks")
        .update({
          user_id: userId,
          notes: checkNotes,
          materiale_smarrito: materialSmarrito,
        })
        .eq("id", existingCheckId)
        .select()
        .single();

      if (updateCheckError) throw updateCheckError;
      insertedCheck = updatedCheck;

      await supabase.from("check_items").delete().eq("check_id", existingCheckId);
    } else {
      const { data: newCheck, error: insertError } = await supabase
        .from("checks")
        .insert({
          party_id: partyId,
          user_id: userId,
          type: checkType,
          notes: checkNotes,
          materiale_smarrito: materialSmarrito,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      insertedCheck = newCheck;
    }

    if (itemsResults && itemsResults.length > 0) {
      const checkItemsRows = itemsResults.map((item) => ({
        check_id: insertedCheck.id,
        inventory_id: item.inventory_id,
        quantita_prevista: item.quantita_prevista || 1,
        quantita_trovata: item.quantita_trovata || 0,
        stato: item.stato || 'ok',
        note: item.note || null
      }));

      await supabase.from("check_items").insert(checkItemsRows);
    }

    // ── GESTIONE STATI E CHECK COMPLEMENTARI (Handoff Virtuale) ──
    let newStatus = null;
    if (isVirtualShelf) {
      if (checkType === "deposito_scaffale") { // FESTA B RICEVE IN HANDOFF
        newStatus = "caricato_furgone";
        if (!existingCheckId) {
          await supabase.from("checks").insert({
            party_id: partyId, user_id: userId, type: "scaffale_furgone", notes: "Check automatico (Ricezione Handoff completata)", materiale_smarrito: false
          });
        }
      } else if (checkType === "furgone_scaffale") { // FESTA A CEDE IN HANDOFF
        newStatus = "scaricato_scaffale";
        if (!existingCheckId) {
          await supabase.from("checks").insert({
            party_id: partyId, user_id: userId, type: "scaffale_deposito", notes: "Check automatico (Cessione Handoff completata)", materiale_smarrito: false
          });
        }
      }
    } else {
      if (checkType === "deposito_scaffale") newStatus = "caricato_scaffale";
      else if (checkType === "scaffale_furgone") newStatus = "caricato_furgone";
      else if (checkType === "furgone_scaffale") newStatus = "scaricato_furgone";
      else if (checkType === "scaffale_deposito") newStatus = "scaricato_scaffale";
    }

    if (newStatus) partyUpdates.stato = newStatus;

    if (Object.keys(partyUpdates).length > 0) {
      await supabase
        .from("parties")
        .update(partyUpdates)
        .eq("id", partyId);
    }

    const checkTypeNames = {
      deposito_scaffale: isVirtualShelf ? "Ricezione in Handoff" : "Carico dal Deposito allo Scaffale",
      scaffale_furgone: "Carico dallo Scaffale al Furgone",
      furgone_scaffale: isVirtualShelf ? "Cessione in Handoff" : "Scarico dal Furgone allo Scaffale",
      scaffale_deposito: "Scarico dallo Scaffale al Deposito",
    };

    await supabase.from("notifications").insert({
      titolo: existingCheckId ? `Check Aggiornato - ${checkTypeNames[checkType]}` : `Check Completato - ${checkTypeNames[checkType]}`,
      messaggio: `${userName} ha ${existingCheckId ? 'aggiornato' : 'completato'} il check per la festa "${partyName}" (Scaffale ${isVirtualShelf ? "Virtuale " : ""}${shelfId}). Elementi verificati: ${checkedCount}/${totalItems}${materialSmarrito ? " - MATERIALE SMARRITO" : ""}`,
      tipo: "check",
      letto: false,
    });

    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      await fetch(`${siteUrl}/api/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `${materialSmarrito ? "⚠️" : "✅"} Check ${existingCheckId ? 'aggiornato' : 'completato'}!\n\nFesta: ${partyName}\nLocation: ${currentParty?.luogo || "N/D"}\nScaffale: ${isVirtualShelf ? "Virtuale " : ""}${shelfId}\nTipo: ${checkTypeNames[checkType]}\nUtente: ${userName}\nCompletati: ${checkedCount}/${totalItems}${materialSmarrito ? "\n⚠️ MATERIALE SMARRITO" : ""}`,
        }),
      });
    } catch (telegramError) {
      console.error("[v0] Error sending Telegram notification:", telegramError);
    }

    revalidatePath(`/admin/check/${shelfId}`);

    return { message: "Check completato con successo!", checkId: insertedCheck?.id };
  } catch (error) {
    console.error("[v0] Error submitting check:", error);
    return { error: "Errore durante l'invio del check" };
  }
}

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

    return { success: true };
  } catch (error) {
    console.error("[v0] Error reporting item damage:", error);
    return { error: error.message };
  }
}

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

    return { success: true };
  } catch (error) {
    console.error("[v0] Error reporting losses:", error);
    return { error: error.message };
  }
}