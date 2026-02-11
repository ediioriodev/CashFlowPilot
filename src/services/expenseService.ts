import { supabase } from "@/lib/supabaseClient";
import { Spesa, Ambito, RecurringConfig } from "@/types/expenses";
import { groupService } from "./groupService";

export const expenseService = {
  // ----------------------------------------------------------------------
  // AMBITI (Categories)
  // ----------------------------------------------------------------------
  async getAmbiti(scope: 'C' | 'P' = 'C'): Promise<Ambito[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    if (scope === 'C') {
      // Shared: Fetch distinct 'ambito' from 'spese' table
      const groupId = await groupService.getGroupId();
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('spese')
        .select('ambito')
        .eq('group_id', groupId)
        .order('ambito');

      if (error) {
        console.error('Error fetching ambiti:', error);
        return [];
      }

      // Deduplicate
      const uniqueAmbiti = Array.from(new Set(data?.map((d) => d.ambito).filter(Boolean)));
      return uniqueAmbiti.map((name) => ({ code: name, name } as Ambito));
    } else {
      // Personal: Fetch distinct 'ambito' from 'spese_personali' table
      const { data, error } = await supabase
        .from('spese_personali')
        .select('ambito')
        .eq('user_id', user.id)
        .order('ambito');

      if (error) {
        console.error('Error fetching ambiti:', error);
        return [];
      }

      // Deduplicate
      const uniqueAmbiti = Array.from(new Set(data?.map((d) => d.ambito).filter(Boolean)));
      return uniqueAmbiti.map((name) => ({ code: name, name } as Ambito));
    }
  },

  // ----------------------------------------------------------------------
  // NEGOZI (Shops)
  // ----------------------------------------------------------------------
  async getNegozi(scope: 'C' | 'P' = 'C'): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    if (scope === 'C') {
      // Shared: 'spese' table
      const groupId = await groupService.getGroupId();
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('spese')
        .select('negozio')
        .eq('group_id', groupId)
        .order('negozio');

      if (error) {
        console.error('Error fetching negozi:', error);
        return [];
      }
      return Array.from(new Set(data?.map((d: any) => d.negozio).filter(Boolean)));
    } else {
      // Personal: 'spese_personali' table
      const { data, error } = await supabase
        .from('spese_personali')
        .select('negozio')
        .eq('user_id', user.id)
        .order('negozio');

      if (error) {
        console.error('Error fetching negozi:', error);
        return [];
      }
      return Array.from(new Set(data?.map((d: any) => d.negozio).filter(Boolean)));
    }
  },

  // ----------------------------------------------------------------------
  // GET EXPENSES (History)
  // ----------------------------------------------------------------------
  async getExpenses(startDate?: string, endDate?: string, scope: 'C' | 'P' = 'C'): Promise<Spesa[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    let query;
    if (scope === 'C') {
      // Shared: 'spese'
      const groupId = await groupService.getGroupId();
      if (!groupId) return [];

      query = supabase
        .rpc('get_spese_condivise', {
          p_data_da: startDate,
          p_data_a: endDate,
          p_group_id: groupId
        });
    }
    else {
      query = supabase
        .rpc('get_spese_personali', {
          p_data_da: startDate,
          p_data_a: endDate,
          p_user_id: user.id
        });

    }
    // // if (scope === 'C') {
    // //   // Shared: 'spese'
    // //   const groupId = await groupService.getGroupId();
    // //   if (!groupId) return [];

    // //   query = supabase
    // //     .from('spese')
    // //     .select('*')
    // //     .eq('group_id', groupId)
    // //     .eq('tipo_spesa', 'C');
    // // } else {
    // //   // Personal: 'spese_personali'
    // //   query = supabase
    // //     .from('spese_personali')
    // //     .select('*')
    // //     .eq('user_id', user.id)
    // //     .eq('tipo_spesa', 'P'); // Assuming column exists based on old service
    // // }

    // // Common Filters
    // query = query.is('deleted_at', null);

    // // Allow regular expenses (false) and old expenses (null)
    // // Exclude only the "Parent" templates (true)
    // query = query.neq('is_recurring_parent', true);

    // query = query.order('data_spesa', { ascending: false }).order('created_at', { ascending: false });

    // if (startDate) query = query.gte('data_spesa', startDate);
    // if (endDate) query = query.lte('data_spesa', endDate);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }
    return data || [];
  },

  // ----------------------------------------------------------------------
  // GET RECURRING TEMPLATES
  // ----------------------------------------------------------------------
  async getRecurringExpenses(scope: 'C' | 'P' = 'C'): Promise<Spesa[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query;

    if (scope === 'C') {
      const groupId = await groupService.getGroupId();
      if (!groupId) return [];
      query = supabase.from('spese').select('*').eq('group_id', groupId);
    } else {
      query = supabase.from('spese_personali').select('*').eq('user_id', user.id);
    }

    query = query
      .eq('is_recurring_parent', true) // Only parents
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching recurring:', error);
      return [];
    }
    return data || [];
  },

  // ----------------------------------------------------------------------
  // CREATE EXPENSE
  // ----------------------------------------------------------------------
  async createExpense(expense: Spesa) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const scope = expense.tipo_spesa || 'C';
    let tableName = 'spese';
    const payload: any = {
      user_id: user.id,
      importo: expense.importo,
      ambito: expense.ambito,
      negozio: expense.negozio,
      note_spese: expense.note_spese,
      data_spesa: expense.data_spesa,
      tipo_spesa: scope,
      tipo_transazione: expense.tipo_transazione || 'spesa',
      ricorrente: expense.ricorrente,
      confermata: (expense.is_recurring_parent && expense.recurring_config?.tipo_conferma === 'M') ? false : expense.confermata,
      // Logic for new recurring in existing DB tables
      is_recurring_parent: expense.is_recurring_parent,
      recurring_config: expense.recurring_config
    };

    if (scope === 'C') {
      const groupId = await groupService.getGroupId();
      if (!groupId) throw new Error("Group not found");
      tableName = 'spese';
      payload.group_id = groupId;
    } else {
      tableName = 'spese_personali';
      // Personal doesn't need group_id
    }

    // 0. Prevent Start Date for Weekly Custom if Invalid
    // If weekly recurrence with specific days, ensure the Parent (Start Date) itself matches one of the days.
    // If not, move the Start Date to the next valid day.
    if (expense.is_recurring_parent && expense.recurring_config) {
        const config = expense.recurring_config;
        if (config.ricorrenza === 'settimanale' && config.giorni_settimana && config.giorni_settimana.length > 0) {
            let startDt = new Date(expense.data_spesa);
            
            // Check if current start day is valid
            let dayIndex = startDt.getUTCDay();
            let isoDay = dayIndex === 0 ? 7 : dayIndex;

            if (!config.giorni_settimana.includes(isoDay)) {
                // Find next valid day
                // Limit search to 7 days to avoid infinite/long loops (should exist within a week)
                for(let i=0; i<7; i++) {
                    startDt.setUTCDate(startDt.getUTCDate() + 1);
                    dayIndex = startDt.getUTCDay();
                    isoDay = dayIndex === 0 ? 7 : dayIndex;
                    if (config.giorni_settimana.includes(isoDay)) {
                        // Found new start date
                        const newStartDate = startDt.toISOString().split('T')[0];
                        payload.data_spesa = newStartDate;
                        payload.recurring_config.data_inizio = newStartDate;
                        break;
                    }
                }
            }
        }
    }

    // 1. Insert Parent (The first occurrence)
    const { data: parentData, error } = await supabase
      .from(tableName)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    // 2. Generate and Insert ALL Future Child Transactions
    if (expense.is_recurring_parent && parentData && expense.recurring_config) {
      const childrenPayloads = [];
      const config = expense.recurring_config;

      let currentDate = new Date(payload.data_spesa);
      let endDate: Date | null = config.data_fine ? new Date(config.data_fine) : null;

      // Safety limit: 10 years or 500 entries to prevent infinite loops if data_fine is missing or too far
      const LIMIT_YEARS = 10;
      const hardLimit = new Date(currentDate);
      hardLimit.setFullYear(hardLimit.getFullYear() + LIMIT_YEARS);

      if (!endDate || endDate > hardLimit) {
        endDate = hardLimit;
      }

      // Custom logic for Weekly with specific days
      if (config.ricorrenza === 'settimanale' && config.giorni_settimana && config.giorni_settimana.length > 0) {
        
        // Advance 1 day from start to begin checking
        currentDate = new Date(currentDate);
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);

        while (currentDate <= endDate) {
          // Check if current day matches selected days
          // getUTCDay: 0=Sun, 1=Mon ... 6=Sat
          // Map to 1=Mon ... 7=Sun
          const dayIndex = currentDate.getUTCDay();
          const isoDay = dayIndex === 0 ? 7 : dayIndex;

          if (config.giorni_settimana.includes(isoDay)) {
             const isoDate = currentDate.toISOString().split('T')[0];
             const childPayload = {
               ...payload,
               data_spesa: isoDate,
               is_recurring_parent: false,
               recurring_parent_id: parentData.id,
               recurring_config: null,
               ricorrente: true,
               confermata: config.tipo_conferma === 'A',
             };
             delete childPayload.id;
             childrenPayloads.push(childPayload);
          }

          // Advance 1 day
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

      } else {
        // Standard recurrence logic
        const advanceDate = (date: Date, freq: string) => {
          const d = new Date(date);
          switch (freq) {
            case 'giornaliera': d.setUTCDate(d.getUTCDate() + 1); break;
            case 'settimanale': d.setUTCDate(d.getUTCDate() + 7); break;
            case 'mensile': d.setUTCMonth(d.getUTCMonth() + 1); break;
            case 'bimestrale': d.setUTCMonth(d.getUTCMonth() + 2); break;
            case 'trimestrale': d.setUTCMonth(d.getUTCMonth() + 3); break;
            case 'semestrale': d.setUTCMonth(d.getUTCMonth() + 6); break;
            case 'annuale': d.setUTCFullYear(d.getUTCFullYear() + 1); break;
          }
          return d;
        };

        // Start generating from the NEXT occurrence
        currentDate = advanceDate(currentDate, config.ricorrenza);

        while (currentDate <= endDate) {
          const isoDate = currentDate.toISOString().split('T')[0];

          const childPayload = {
            ...payload,
            data_spesa: isoDate,
            is_recurring_parent: false,
            recurring_parent_id: parentData.id,
            recurring_config: null, 
            ricorrente: true,
            confermata: config.tipo_conferma === 'A', 
          };

          delete childPayload.id;

          childrenPayloads.push(childPayload);
          currentDate = advanceDate(currentDate, config.ricorrenza);
        }
      }

      if (childrenPayloads.length > 0) {
        // Batch Insert
        const { error: batchError } = await supabase
          .from(tableName)
          .insert(childrenPayloads);

        if (batchError) {
          console.error("Failed to batch insert recurring children", batchError);
          // We don't rollback the parent here, but we log the error. 
          // Ideally, this should be a transaction/RPC but we work with client-side calls for now.
        }
      }
    }

    return parentData;
  },

  async deleteExpense(id: number, scope: 'C' | 'P' = 'C') {
    const tableName = scope === 'C' ? 'spese' : 'spese_personali';
    const { error } = await supabase
      .from(tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async getExpenseById(id: number, scope: 'C' | 'P' = 'C'): Promise<Spesa | null> {
    const tableName = scope === 'C' ? 'spese' : 'spese_personali';
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  },


  async updateExpense(
    id: number, 
    expense: Partial<Spesa>, 
    scope: 'C' | 'P' = 'C',
    updateFutureOccurrences: boolean = false
  ): Promise<void> {
    const tableName = scope === 'C' ? 'spese' : 'spese_personali';

    // Fields to update
    const updatePayload: any = {
      importo: expense.importo,
      ambito: expense.ambito,
      negozio: expense.negozio,
      note_spese: expense.note_spese,
      data_spesa: expense.data_spesa,
      tipo_transazione: expense.tipo_transazione,
      confermata: expense.confermata
    };

    // Remove undefined keys
    Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);

    // 1. Update the specific row
    const { error } = await supabase
      .from(tableName)
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;

    // 2. Handle future occurrences if requested
    if (updateFutureOccurrences && expense.recurring_parent_id && expense.data_spesa) {
        const { error: batchError } = await supabase
            .from(tableName)
            .update(updatePayload)
            .eq('recurring_parent_id', expense.recurring_parent_id)
            .gte('data_spesa', expense.data_spesa) 
            .neq('id', id);

        if (batchError) throw batchError;
    }
  },

  async confirmExpense(id: number, scope: 'C' | 'P' = 'C') {
     const tableName = scope === 'C' ? 'spese' : 'spese_personali';
     const { error } = await supabase
       .from(tableName)
       .update({ confermata: true })
       .eq('id', id);

     if (error) throw error;
  }
};
