"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PageHeader, { PageBody } from "@/components/layout/PageHeader";
import { ReportFilters } from "@/components/reports/ReportFilters";
import BreakdownChart from "@/components/reports/BreakdownChart";
import StatsCards from "@/components/reports/StatsCards";
import { Skeleton } from "@/components/ui/kit";
import { useScope } from "@/context/ScopeContext";
import { raggruppamentoDi, serieCompleta } from "@/lib/reportSeries";
import { statsService } from "@/services/statsService";
import { getRangeForPeriod } from "@/lib/dateUtils";
import type {
  CategoryStats,
  DateRange,
  MerchantStats,
  PeriodType,
  ReportFilterOptions,
  TrendStats,
} from "@/types/reports";

/** Recharts pesa: entra nel bundle solo su questa pagina, e solo lato client. */
const TrendChart = dynamic(() => import("@/components/reports/TrendChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full rounded-card" />,
});

export default function ReportPage() {
  const { scope } = useScope();
  const [period, setPeriod] = useState<PeriodType>("last30");
  const [dateRange, setDateRange] = useState<DateRange>(getRangeForPeriod("last30"));
  const [filters, setFilters] = useState<ReportFilterOptions>({});

  const [trendData, setTrendData] = useState<TrendStats[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryStats[]>([]);
  const [merchantData, setMerchantData] = useState<MerchantStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { startDate, endDate } = dateRange;
        const [incomeTrend, expenseTrend, cats, merchs] = await Promise.all([
          statsService.getTrendStats(startDate, endDate, scope, "entrata", filters),
          statsService.getTrendStats(startDate, endDate, scope, "spesa", filters),
          statsService.getCategoryStats(startDate, endDate, scope, "spesa", filters),
          statsService.getMerchantStats(startDate, endDate, scope, "spesa", filters),
        ]);
        if (!alive) return;
        setTrendData(serieCompleta(incomeTrend, expenseTrend, startDate, endDate));
        setCategoryData(cats);
        setMerchantData(merchs);
      } catch (error) {
        console.error("Caricamento report non riuscito", error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [dateRange, scope, filters]);

  return (
    <ProtectedRoute>
      <PageHeader title="Report" subtitle="Confronti e andamenti su intervalli liberi" />

      <PageBody
        main={
          <>
            <ReportFilters
              period={period}
              setPeriod={setPeriod}
              dateRange={dateRange}
              setDateRange={setDateRange}
              filters={filters}
              setFilters={setFilters}
            />

            <StatsCards trendData={trendData} loading={loading} />

            <TrendChart data={trendData} raggruppamento={raggruppamentoDi(dateRange)} loading={loading} />

            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              <BreakdownChart data={categoryData} title="Uscite per categoria" type="category" loading={loading} />
              <BreakdownChart data={merchantData} title="Dove spendi di più" type="merchant" loading={loading} />
            </div>
          </>
        }
      />
    </ProtectedRoute>
  );
}
