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
        const shelvesList = party.shelves.split(",").map((s) => s.trim());
        return shelvesList.includes(shelfId);
      }) || [];

    console.log(
      "[v0] Matching parties for shelf",
      shelfId,
      ":",
      matchingParties
    );

    if (matchingParties.length === 0) {
      return { error: "Nessuna festa trovata per questo scaffale" };
    }

    const party = matchingParties[0];
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
          parent_id
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
        });
      }

      materialHierarchy.push(macroData);
    }

    console.log("[v0] Final material hierarchy:", materialHierarchy);

    return {
      party,
      checks: checks || [],
      materialHierarchy,
    };
  } catch (error) {
    console.error("[v0] Error fetching party data:", error);
    return { error: "Errore nel caricamento dei dati" };
  }
}

export async function authenticateUser(name, code) {
  try {
    const supabase = await createClient();

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("nome", name)
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
  partyName
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

    const { error: insertError } = await supabase.from("checks").insert({
      party_id: partyId,
      user_id: userId,
      type: checkType,
      notes: `Check completato: ${checkedCount}/${totalItems} elementi verificati`,
    });

    if (insertError) throw insertError;

    let newStatus = null;
    if (checkType === "deposito_scaffale") {
      newStatus = "caricato_scaffale";
    } else if (checkType === "scaffale_furgone") {
      newStatus = "caricato_furgone";
    } else if (checkType === "furgone_scaffale") {
      newStatus = "scaricato_furgone";
    } else if (checkType === "scaffale_deposito") {
      newStatus = "scaricato_scaffale";
    }

    if (newStatus) {
      partyUpdates.stato = newStatus;
    }

    if (Object.keys(partyUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from("parties")
        .update(partyUpdates)
        .eq("id", partyId);

      if (updateError) {
        console.error("[v0] Error updating party:", updateError);
      } else {
        console.log("[v0] Party updated with:", partyUpdates);
      }
    }

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        titolo: `Check Completato - ${checkType.replace(/_/g, " ")}`,
        messaggio: `${userName} ha completato il check per la festa "${partyName}" (Scaffale ${shelfId}). Elementi verificati: ${checkedCount}/${totalItems}`,
        tipo: "check",
        letto: false,
      });

    if (notificationError)
      console.error("[v0] Error creating notification:", notificationError);

    const checkTypeNames = {
      deposito_scaffale: "Carico dal Deposito allo Scaffale",
      scaffale_furgone: "Carico dallo Scaffale al Furgone",
      furgone_scaffale: "Scarico dal Furgone allo Scaffale",
      scaffale_deposito: "Scarico dallo Scaffale al Deposito",
    };

    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.SITE_URL ||
        "http://movida-manager.vercel.app";
      await fetch(`${siteUrl}/api/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `✅ Check completato!\n\nFesta: ${partyName}\nScaffale: ${shelfId}\nTipo: ${checkTypeNames[checkType]}\nUtente: ${userName}\nCompletati: ${checkedCount}/${totalItems}`,
        }),
      });
      console.log("[v0] Telegram notification sent successfully");
    } catch (telegramError) {
      console.error("[v0] Error sending Telegram notification:", telegramError);
    }

    revalidatePath(`/check/${shelfId}`);

    return { message: "Check completato con successo!" };
  } catch (error) {
    console.error("[v0] Error submitting check:", error);
    return { error: "Errore durante l'invio del check" };
  }
}
