import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Inizializza Supabase (usa le tue variabili d'ambiente)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(request) {
  try {
    const { itemId, userId, userRole } = await request.json();

    if (!itemId || !userId) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    // 1. TROVARE IL CHECK ATTIVO
    // Cerchiamo un check creato oggi (o recente), associato all'utente, che NON sia ancora chiuso/finito?
    // O più semplicemente: cerchiamo nella tabella check_items un record che corrisponde a questo inventory_id
    // collegato a un check che appartiene a questo userId (o alla festa assegnata).
    
    // Strategia: Trova l'item dentro check_items che appartiene a un check 'attivo' (creato nelle ultime 24h per esempio)
    const { data: checks, error: searchError } = await supabase
      .from('check_items')
      .select(`
        id, 
        quantita_trovata,
        inventory_items (name),
        checks!inner (
           id,
           user_id,
           created_at,
           party_id,
           shelves  -- Se hai bisogno di tornare allo scaffale
        )
      `)
      .eq('inventory_id', itemId)
      .eq('checks.user_id', userId) // Assicura che sia il check dell'utente loggato
      .order('created_at', { ascending: false, foreignTable: 'checks' })
      .limit(1);

    if (searchError) throw searchError;
    if (!checks || checks.length === 0) {
        return NextResponse.json({ error: 'Nessun check attivo trovato per questo oggetto e questo utente.' }, { status: 404 });
    }

    const targetItem = checks[0];

    // 2. AGGIORNARE IL CHECK
    // Se è già checkato, avvisa
    if (targetItem.quantita_trovata >= 1) {
         return NextResponse.json({ 
            message: 'Oggetto già scansionato in precedenza.',
            itemName: targetItem.inventory_items.name,
            shelfId: targetItem.checks.shelves // Assumendo che salvi lo shelf ID qui o nel party
         });
    }

    // Altrimenti aggiorna
    const { error: updateError } = await supabase
      .from('check_items')
      .update({ 
          quantita_trovata: 1,
          stato: 'ok' // o quello che è logicamente corretto
      })
      .eq('id', targetItem.id);

    if (updateError) throw updateError;

    return NextResponse.json({ 
        success: true, 
        itemName: targetItem.inventory_items.name,
        shelfId: targetItem.checks.shelves // Utile per il redirect
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}