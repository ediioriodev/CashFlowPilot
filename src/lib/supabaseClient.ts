import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Errore volutamente esplicito: senza chiavi l'app non può funzionare,
  // ma il messaggio deve dire cosa fare invece di lasciare uno stack vuoto.
  const mancanti = [
    !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
    !supabaseAnonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ')

  throw new Error(
    `Configurazione Supabase mancante (${mancanti}).\n\n` +
      'Crea il file .env.local nella cartella del progetto:\n' +
      '  cp .env.example .env.local\n' +
      'Poi incolla i valori da Supabase → Project Settings → API ' +
      '(Project URL e la chiave "anon / public", non la service_role).\n' +
      'Infine riavvia npm run dev: Next legge le variabili solo all\'avvio.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    flowType: 'implicit',
  }
})
