'use client';

import React, { useEffect, useState } from 'react';
import { PeriodType, DateRange, ReportFilterOptions } from '@/types/reports';
import ScopeToggle from '@/components/ui/ScopeToggle';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { getRangeForPeriod } from '@/lib/dateUtils';
import { useScope } from '@/context/ScopeContext';
import { groupService } from '@/services/groupService';
import { statsService } from '@/services/statsService';

interface ReportFiltersProps {
  period: PeriodType;
  setPeriod: (period: PeriodType) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  filters: ReportFilterOptions;
  setFilters: (filters: ReportFilterOptions) => void;
}

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

  // Update date range when period changes
  useEffect(() => {
    if (period !== 'custom') {
      const newRange = getRangeForPeriod(period);
      setDateRange(newRange);
    }
  }, [period, setDateRange]);

  // Fetch filter options (categories, merchants)
  useEffect(() => {
    async function fetchOptions() {
      const { categories, merchants } = await statsService.getFilterOptions(scope, 'spesa');
      setCategoryOptions(categories);
      setMerchantOptions(merchants);
    }
    fetchOptions();
  }, [scope]);

  // Fetch group members if shared scope
  useEffect(() => {
    async function fetchMembers() {
      if (scope === 'C') {
        const groupId = await groupService.getGroupId();
        if (groupId) {
          const fetchedMembers = await groupService.getGroupMembers(groupId);
          setMembers(fetchedMembers);
        }
      } else {
        // Clear member filter when switching to personal
        if (filters.userId) {
            setFilters({ ...filters, userId: undefined });
        }
        setMembers([]);
      }
    }
    fetchMembers();
  }, [scope]);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 mb-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        
        {/* Scope Selector */}
        <div className="flex-shrink-0">
          <ScopeToggle />
        </div>

        {/* Period Selector */}
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-center">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-auto"
          >
            <option value="last7">Ultimi 7 giorni</option>
            <option value="last30">Ultimi 30 giorni</option>
            <option value="last90">Ultimi 3 mesi</option>
            <option value="thisMonth">Questo Mese</option>
            <option value="thisYear">Quest'anno</option>
            <option value="custom">Personalizzato</option>
          </select>

          {period === 'custom' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-2 text-sm bg-white dark:bg-gray-700 w-full"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-2 text-sm bg-white dark:bg-gray-700 w-full"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Advanced Filters */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {scope === 'C' && members.length > 0 && (
          <select
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-full outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.userId || ''}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value || undefined })}
          >
            <option value="">Tutti gli Utenti</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.firstName} {member.lastName}
              </option>
            ))}
          </select>
        )}

        <div className="w-full">
          <MultiSelect
            options={categoryOptions}
            selected={filters.category || []}
            onChange={(selected) => setFilters({ ...filters, category: selected.length > 0 ? selected : undefined })}
            placeholder="Filtra per Categoria..."
          />
        </div>

        <div className="w-full">
          <MultiSelect
            options={merchantOptions}
            selected={filters.merchant || []}
            onChange={(selected) => setFilters({ ...filters, merchant: selected.length > 0 ? selected : undefined })}
            placeholder="Filtra per Negozio..."
          />
        </div>

        <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={!!filters.recurring}
            onChange={(e) => setFilters({ ...filters, recurring: e.target.checked ? true : undefined })}
          />
          <span>Solo Ricorrenti</span>
        </label>
        <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={!!filters.confirmed}
            onChange={(e) => setFilters({ ...filters, confirmed: e.target.checked ? true : undefined })}
          />
          <span>Solo Confermate</span>
        </label>
      </div>
    </div>
  );
};
