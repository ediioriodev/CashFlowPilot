export type ExpenseType = 'spesa' | 'entrata';

export interface Spesa {
  id?: number;
  user_id?: string;
  group_id?: number | null;
  importo: number;
  ambito: string;
  negozio: string;
  note_spese?: string;
  data_spesa: string; // ISO date string
  tipo_spesa?: string; // e.g. 'C'
  tipo_transazione: ExpenseType;
  ricorrente: boolean;
  confermata: boolean;
  created_at?: string;
  
  // Recurring specific fields
  is_recurring_parent?: boolean;
  recurring_parent_id?: number | null;
  recurring_config?: RecurringConfig | null;
}

export interface RecurringConfig {
  ricorrenza: 'giornaliera' | 'settimanale' | 'mensile' | 'bimestrale' | 'trimestrale' | 'semestrale' | 'annuale';
  data_inizio: string;
  data_fine: string | null;
  tipo_conferma: 'A' | 'M'; // Automatico | Manuale
  giorni_settimana?: number[];
}


export interface Ambito {
  code: string;
  name: string;
  group_id?: number;
}
