import { supabase } from "@/lib/supabaseClient";
import { groupService } from "./groupService";
import { Spesa } from "@/types/expenses";

export interface ExpenseStats {
  ambito: string; // The category name
  totale: number; // Total amount
  count: number;
}

export const statsService = {
  async getStatsByAmbito(startDate: string, endDate: string, type: 'spesa' | 'entrata' = 'spesa', scope: 'C' | 'P' = 'C'): Promise<ExpenseStats[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query;

    if (scope === 'C') {
      const groupId = await groupService.getGroupId();
      if (!groupId) return []; // No group, no stats

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

    const { data, error } = await query;
    const expenses = data as Spesa[] | null;

    if (error || !expenses) {
      console.error(error);
      return [];
    }

    // Filter by type (since RPC returns all transactions for the period)
    const filtered = expenses.filter(e => e.tipo_transazione === type);

    // Group locally
    const statsMap = filtered.reduce((acc: Record<string, ExpenseStats>, curr: Spesa) => {
      const key = curr.ambito || 'Altro';
      if (!acc[key]) {
        acc[key] = { ambito: key, totale: 0, count: 0 };
      }
      acc[key].totale += Number(curr.importo);
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, ExpenseStats>);

    // Convert to array and sort by total descending
    return Object.values(statsMap).sort((a, b) => b.totale - a.totale);
  }
  };
