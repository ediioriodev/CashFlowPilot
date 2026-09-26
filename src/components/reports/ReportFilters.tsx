"use client";

import React, { useEffect, useState } from "react";
import { PeriodType, DateRange, ReportFilterOptions } from "@/types/reports";
import ScopeSwitch from "@/components/ui/ScopeSwitch";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Card, Chip, Field, inputClass } from "@/components/ui/kit";
import { getRangeForPeriod } from "@/lib/dateUtils";
import { useScope } from "@/context/ScopeContext";
import { groupService } from "@/services/groupService";
import { statsService } from "@/services/statsService";

interface ReportFiltersProps {
  period: PeriodType;
  setPeriod: (period: PeriodType) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  filters: ReportFilterOptions;
  setFilters: (filters: ReportFilterOptions) => void;
}

const PERIODI: { value: PeriodType; label: string }[] = [
  { value: "last7", label: "7 giorni" },
  { value: "last30", label: "30 giorni" },
  { value: "last90", label: "3 mesi" },
  { value: "thisMonth", label: "Questo mese" },
  { value: "thisYear", label: "Quest'anno" },
  { value: "custom", label: "Personalizzato" },
];

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  period,
  setPeriod,
  dateRange,
  setDateRange,
  filters,
  setFilters,
}) => {
  const { scope } = useScope();
  const [members, setMembers] = useState<{ userId: string; firstName: string; lastName: string }[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [merchantOptions, setMerchantOptions] = useState<string[]>([]);

  useEffect(() => {
    if (period !== "custom") setDateRange(getRangeForPeriod(period));
  }, [period, setDateRange]);

  useEffect(() => {
    let alive = true;
    statsService
      .getFilterOptions(scope, "spesa")
      .then(({ categories, merchants }) => {
        if (!alive) return;
        setCategoryOptions(categories);
        setMerchantOptions(merchants);
      })
      .catch(console.error);
    return () => {
      alive = false;
    };
  }, [scope]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (scope !== "C") {
        if (alive) setMembers([]);
        return;
      }
      const groupId = await groupService.getGroupId();
      if (!groupId || !alive) return;
      const list = await groupService.getGroupMembers(groupId);
      if (alive) setMembers(list);
    })();
    return () => {
      alive = false;
    };
  }, [scope]);

  const activeCount =
    (filters.category?.length ?? 0) +
    (filters.merchant?.length ?? 0) +
    (filters.userId ? 1 : 0) +
    (filters.recurring ? 1 : 0) +
    (filters.confirmed ? 1 : 0);

  return (
    <Card className="p-4 lg:p-5">
      <div className="flex flex-col gap-4">
        <ScopeSwitch />

        <div className="no-bar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {PERIODI.map((p) => (
            <Chip key={p.value} active={period === p.value} onClick={() => setPeriod(p.value)}>
              {p.label}
            </Chip>
          ))}
        </div>

        {period === "custom" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Dal" htmlFor="rep-da">
              <input
                id="rep-da"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Al" htmlFor="rep-a">
              <input
                id="rep-a"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
        )}

        <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Categoria">
            <MultiSelect
              options={categoryOptions}
              selected={filters.category || []}
              onChange={(s) => setFilters({ ...filters, category: s.length ? s : undefined })}
              placeholder="Tutte"
            />
          </Field>

          <Field label="Negozio">
            <MultiSelect
              options={merchantOptions}
              selected={filters.merchant || []}
              onChange={(s) => setFilters({ ...filters, merchant: s.length ? s : undefined })}
              placeholder="Tutti"
            />
          </Field>

          {/* Filtra su spese.paid_by (migrazione 20260101000800, OP-045): chi ha
              anticipato. Le spese del fondo comune non compaiono filtrando per un membro. */}
          {scope === "C" && members.length > 0 && (
            <Field label="Chi ha pagato" htmlFor="rep-membro" help="Solo gli anticipi: il fondo comune è escluso.">
              <select
                id="rep-membro"
                className={inputClass}
                value={filters.userId || ""}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value || undefined })}
              >
                <option value="">Tutti</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {[m.firstName, m.lastName].filter(Boolean).join(" ")}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip
            active={!!filters.recurring}
            onClick={() => setFilters({ ...filters, recurring: filters.recurring ? undefined : true })}
          >
            Solo ricorrenti
          </Chip>
          <Chip
            active={!!filters.confirmed}
            onClick={() => setFilters({ ...filters, confirmed: filters.confirmed ? undefined : true })}
          >
            Solo confermate
          </Chip>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters({})}
              className="ml-auto min-h-9 px-2 text-xs font-semibold text-neg"
            >
              Azzera {activeCount} {activeCount === 1 ? "filtro" : "filtri"}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};
