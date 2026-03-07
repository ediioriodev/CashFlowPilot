export interface DailyStats {
  period_date: string; // YYYY-MM-DD
  total: number;
}

export interface CategoryStats {
  category: string;
  total: number;
  cnt: number;
}

export interface MerchantStats {
  merchant: string;
  total: number;
  cnt: number;
}

export type PeriodType = 'last7' | 'last30' | 'last90' | 'thisMonth' | 'thisYear' | 'custom';

export interface TrendStats {
  date: string;
  income: number;
  expense: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ReportFilterOptions {
  category?: string[];
  merchant?: string[];
  recurring?: boolean;
  confirmed?: boolean;
  userId?: string;
}
