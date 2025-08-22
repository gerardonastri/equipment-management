import { supabase } from "./supabase/client";

export async function createNotification(title, message, userId) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        title,
        message,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("[v0] Error creating notification:", error);
    return { data: null, error };
  }
}

export const NotificationTemplates = {
  checkCompleted: (shelfId, checkType, userName) => ({
    title: `Check ${checkType} completato`,
    message: `${userName} ha completato il check "${checkType}" per lo scaffale ${shelfId}`,
  }),

  partyAssigned: (partyName, shelfId, userName) => ({
    title: "Festa assegnata",
    message: `La festa "${partyName}" è stata assegnata allo scaffale ${shelfId} da ${userName}`,
  }),

  materialMissing: (itemName, shelfId) => ({
    title: "Materiale mancante",
    message: `Segnalato materiale mancante: ${itemName} nello scaffale ${shelfId}`,
  }),
};
