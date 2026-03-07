import { PeriodType, DateRange } from '@/types/reports';

export function getRangeForPeriod(period: PeriodType): DateRange {
  const today = new Date();
  let start = new Date(today);
  const end = new Date(today);

  switch (period) {
    case 'last7':
      start.setDate(today.getDate() - 6);
      break;
    case 'last30':
      start.setDate(today.getDate() - 29);
      break;
    case 'last90':
      start.setDate(today.getDate() - 89);
      break;
    case 'thisMonth':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'thisYear':
      start = new Date(today.getFullYear(), 0, 1);
      break;
    case 'custom':
      // Return defaults, these will usually be overridden by date pickers
      start.setDate(today.getDate() - 30);
      break;
  }

  return {
    startDate: formatDate(start),
    endDate: formatDate(end)
  };
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateLabel(dateStr: string): string {
  // Converts YYYY-MM-DD to DD/MM
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return `${parts[2]}/${parts[1]}`;
}
