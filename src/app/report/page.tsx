'use client';

import React, { useState, useEffect } from 'react';
import { useScope } from '@/context/ScopeContext';
import { statsService } from '@/services/statsService';
import { PeriodType, DateRange, TrendStats, CategoryStats, MerchantStats, DailyStats, ReportFilterOptions } from '@/types/reports';
import { ReportFilters } from '@/components/reports/ReportFilters';
import TrendChart from '@/components/reports/TrendChart';
import BreakdownChart from '@/components/reports/BreakdownChart';
import StatsCards from '@/components/reports/StatsCards'; // Fixed default import
import { getRangeForPeriod } from '@/lib/dateUtils';
import { Loader2 } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function ReportsPage() {
  const { scope } = useScope();
  const [period, setPeriod] = useState<PeriodType>('last30');
  const [dateRange, setDateRange] = useState<DateRange>(getRangeForPeriod('last30'));
  const [filters, setFilters] = useState<ReportFilterOptions>({});
  
  const [trendData, setTrendData] = useState<TrendStats[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryStats[]>([]);
  const [merchantData, setMerchantData] = useState<MerchantStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { startDate, endDate } = dateRange;
        
        // Fetch Income and Expenses Trends separately
        const [incomeTrend, expenseTrend] = await Promise.all([
          statsService.getTrendStats(startDate, endDate, scope, 'entrata', filters),
          statsService.getTrendStats(startDate, endDate, scope, 'spesa', filters)
        ]);

        // Merge trends
        const mergedTrend = mergeTrends(incomeTrend, expenseTrend, startDate, endDate);
        setTrendData(mergedTrend);

        // Fetch Distributions (Expenses only usually preferred for breakdown)
        const [cats, merchs] = await Promise.all([
          statsService.getCategoryStats(startDate, endDate, scope, 'spesa', filters),
          statsService.getMerchantStats(startDate, endDate, scope, 'spesa', filters)
        ]);
        
        setCategoryData(cats);
        setMerchantData(merchs);

      } catch (error) {
        console.error("Failed to load report data", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [dateRange, scope, filters]);

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">Report Avanzati</h1>
        
        <ReportFilters 
          period={period} 
          setPeriod={setPeriod} 
          dateRange={dateRange} 
          setDateRange={setDateRange}
          filters={filters}
          setFilters={setFilters} 
        />

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            <StatsCards trendData={trendData} />
            
            <div className="mb-8">
              <TrendChart data={trendData} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <BreakdownChart data={categoryData} title="Spese per Categoria" type="category" />
              <BreakdownChart data={merchantData} title="Top Negozi" type="merchant" />
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

// Helper to merge income and expense streams
function mergeTrends(income: DailyStats[], expense: DailyStats[], start: string, end: string): TrendStats[] {
  const map = new Map<string, TrendStats>();
  
  // Fill from data
  income.forEach(i => {
    const d = String(i.period_date).split('T')[0]; 
    if (!map.has(d)) map.set(d, { date: d, income: 0, expense: 0 });
    map.get(d)!.income += Number(i.total);
  });

  expense.forEach(e => {
    const d = String(e.period_date).split('T')[0];
    if (!map.has(d)) map.set(d, { date: d, income: 0, expense: 0 });
    map.get(d)!.expense += Number(e.total);
  });

  // Sort by date
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}
