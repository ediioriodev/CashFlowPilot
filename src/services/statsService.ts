import { supabase } from "@/lib/supabaseClient";
import { groupService } from "./groupService";
import { Spesa } from "@/types/expenses";
import { DailyStats, CategoryStats, MerchantStats, ReportFilterOptions } from "@/types/reports";

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
  },

  async getTrendStats(
    startDate: string,
    endDate: string,
    scope: 'C' | 'P' = 'C',
    type: 'spesa' | 'entrata' = 'spesa',
    filters?: ReportFilterOptions
  ): Promise<DailyStats[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let p_group_id = null;
    if (scope === 'C') {
      const groupId = await groupService.getGroupId();
      if (!groupId) return [];
      p_group_id = groupId;
    }

    const { data, error } = await supabase.rpc('get_monthly_trend', {
      p_scope: scope === 'C' ? 'shared' : 'personal',
      p_group_id: p_group_id,
      p_user_id: user.id,
      p_start_date: startDate,
      p_end_date: endDate,
      p_type: type,
      p_ambito: filters?.category || null,
      p_negozio: filters?.merchant || null,
      p_ricorrente: filters?.recurring ?? null,
      p_confermata: filters?.confirmed ?? null,
      p_filter_user_id: filters?.userId || null
    });

    if (error) {
      console.error('Error fetching trend stats:', JSON.stringify(error, null, 2));
      return [];
    }
    return data || [];
  },

  async getCategoryStats(
    startDate: string,
    endDate: string,
    scope: 'C' | 'P' = 'C',
    type: 'spesa' | 'entrata' = 'spesa',
    filters?: ReportFilterOptions
  ): Promise<CategoryStats[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let p_group_id = null;
    if (scope === 'C') {
      const groupId = await groupService.getGroupId();
      if (!groupId) return [];
      p_group_id = groupId;
    }

    const { data, error } = await supabase.rpc('get_category_breakdown', {
      p_scope: scope === 'C' ? 'shared' : 'personal',
      p_group_id: p_group_id,
      p_user_id: user.id,
      p_start_date: startDate,
      p_end_date: endDate,
      p_type: type,
      p_ambito: filters?.category || null,
      p_negozio: filters?.merchant || null,
      p_ricorrente: filters?.recurring ?? null,
      p_confermata: filters?.confirmed ?? null,
      p_filter_user_id: filters?.userId || null
    });

    if (error) {
      console.error('Error fetching category stats:', JSON.stringify(error, null, 2));
      return [];
    }
    return data || [];
  },

  async getMerchantStats(
    startDate: string,
    endDate: string,
    scope: 'C' | 'P' = 'C',
    type: 'spesa' | 'entrata' = 'spesa',
    filters?: ReportFilterOptions
  ): Promise<MerchantStats[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let p_group_id = null;
    if (scope === 'C') {
      const groupId = await groupService.getGroupId();
      if (!groupId) return [];
      p_group_id = groupId;
    }

    const { data, error } = await supabase.rpc('get_merchant_breakdown', {
      p_scope: scope === 'C' ? 'shared' : 'personal',
      p_group_id: p_group_id,
      p_user_id: user.id,
      p_start_date: startDate,
      p_end_date: endDate,
      p_type: type,
      p_ambito: filters?.category || null,
      p_negozio: filters?.merchant || null,
      p_ricorrente: filters?.recurring ?? null,
      p_confermata: filters?.confirmed ?? null,
      p_filter_user_id: filters?.userId || null
    });

    if (error) {
      console.error('Error fetching merchant stats:', JSON.stringify(error, null, 2));
      return [];
    }
    return data || [];
  },

  async getFilterOptions(
    scope: 'C' | 'P' = 'C',
    type: 'spesa' | 'entrata' = 'spesa'
  ): Promise<{ categories: string[]; merchants: string[] }> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { categories: [], merchants: [] };

    let p_group_id = null;
    if (scope === 'C') {
      const groupId = await groupService.getGroupId();
      if (!groupId) return { categories: [], merchants: [] };
      p_group_id = groupId;
    }

    const [categoriesResult, merchantsResult] = await Promise.all([
      supabase.rpc('get_filter_values', {
        p_scope: scope === 'C' ? 'shared' : 'personal',
        p_group_id: p_group_id,
        p_user_id: user.id,
        p_field: 'ambito',
        p_type: type,
      }),
      supabase.rpc('get_filter_values', {
        p_scope: scope === 'C' ? 'shared' : 'personal',
        p_group_id: p_group_id,
        p_user_id: user.id,
        p_field: 'negozio',
        p_type: type,
      }),
    ]);

    if (categoriesResult.error) console.error('Error fetching categories:', categoriesResult.error);
    if (merchantsResult.error) console.error('Error fetching merchants:', merchantsResult.error);

    return {
      categories: (categoriesResult.data || []).map((i: any) => i.value),
      merchants: (merchantsResult.data || []).map((i: any) => i.value),
    };
  },
};
