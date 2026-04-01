"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getPartyDataForShelf(shelfId) {
  try {
    const supabase = await createClient();

    console.log("[v0] Loading party for shelf:", shelfId);

    const { data: parties, error: partyError } = await supabase
      .from("parties")
      .select(
        `
        *,
        animatore:animatore_id(nome, ruolo),
        magazziniere:magazziniere_id(nome, ruolo)
      `
      )
      .neq("stato", "scaricato_scaffale");

    if (partyError) throw partyError;

    console.log("[v0] All parties loaded:", parties);

    const matchingParties =
      parties?.filter((party) => {
        if (!party.shelves) return false;
        const shelvesList = party.shelves.split(",").map((s) => s.trim().toUpperCase());
        return shelvesList.includes(shelfId.trim().toUpperCase());
      }) || [];

    console.log("[v0] Matching parties for shelf", shelfId, ":", matchingParties);

    if (matchingParties.length === 0) {
      return { error: "Nessuna festa trovata per questo scaffale" };
    }

    // Se ci sono più feste sullo stesso scaffale, seleziona quella del giorno stesso
    // oppure la più vicina alla data odierna (differenza assoluta minima).
    let party;
    if (matchingParties.length === 1) {
      party = matchingParties[0];
    } else {
      const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      const today = new Date(todayStr);

      // Prima cerca una festa di oggi
      const todayParty = matchingParties.find((p) => p.data === todayStr);
      if (todayParty) {
        party = todayParty;
      } else {
        // Seleziona quella con data più vicina a oggi (futura preferita su passata a parità)
        party = matchingParties.reduce((best, p) => {
          const diffBest = new Date(best.data) - today;
          const diffP    = new Date(p.data) - today;
          // Preferisci date future (diff >= 0) su passate; a parità di segno, prendi la minima distanza
          const absBest = Math.abs(diffBest);
          const absP    = Math.abs(diffP);
          if (diffBest < 0 && diffP >= 0) return p;   // p è futura, best è passata
          if (diffP < 0 && diffBest >= 0) return best; // best è futura, p è passata
          return absP < absBest ? p : best;             // stessa direzione: prendi la più vicina
        });
      }
    }

    console.log("[v0] Selected party:", party);

    const { data: checks, error: checksError } = await supabase
      .from("checks")
      .select("*")
      .eq("party_id", party.id);

    if (checksError) throw checksError;

    const { data: partyMaterial, error: materialError } = await supabase
      .from("party_inventory")
      .select(
        `
        inventory_items!inner(
          id,
          name,
          type,
          parent_id,
          materiale_mancante,
          image_url
        )
      `
      )
      .eq("party_id", party.id);

    if (materialError) throw materialError;

    console.log("[v0] Party material loaded:", partyMaterial);

    const macroCategories = partyMaterial
      .filter((item) => item.inventory_items.type === "macro")
      .map((item) => item.inventory_items);

    console.log("[v0] Macro categories:", macroCategories);

    const materialHierarchy = [];

    for (const macro of macroCategories) {
      const { data: categories, error: catError } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("parent_id", macro.id)
        .eq("type", "categoria");

      if (catError) throw catError;

      const macroData = {
        id: macro.id,
        name: macro.name,
        materiale_mancante: macro.materiale_mancante,
        categories: [],
      };

      for (const category of categories || []) {
        const { data: subcategories, error: subError } = await supabase
          .from("inventory_items")
          .select("*")
          .eq("parent_id", category.id)
          .eq("type", "sotto");

        if (subError) throw subError;

        macroData.categories.push({
          id: category.id,
          name: category.name,
          items: subcategories || [],
          materiale_mancante: category.materiale_mancante,
        });
      }

      materialHierarchy.push(macroData);
    }

    // Carica SOLO le segnalazioni NON risolte per questa festa.
    // Le segnalazioni resolved=true sono storico e non bloccano il check.
    const { data: existingLosses } = await supabase
      .from("inventory_losses")
      .select("inventory_id, tipo, note, valore_stimato")
      .eq("party_id", party.id)
      .eq("resolved", false);

    console.log("[v0] Final material hierarchy:", materialHierarchy);

    return {
      party,
      checks: checks || [],
      materialHierarchy,
      existingLosses: existingLosses || [],
    };
  } catch (error) {
    console.error("[v0] Error fetching party data:", error);
    return { error: "Errore nel caricamento dei dati" };
  }
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

    if (userRole === "animatore" && !currentParty?.animatore_id) {
      partyUpdates.animatore_id = userId;
      console.log("[v0] Auto-assigning animatore:", userId);
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