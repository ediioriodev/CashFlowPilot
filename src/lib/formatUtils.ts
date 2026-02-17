export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

export const formatDateForAPI = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month
  
  return {
    start: formatDateForAPI(start),
    end: formatDateForAPI(end)
  };
};

/**
 * Helper to create a date while clamping the day to the last day of the month
 * to avoid rollover (e.g., Feb 30 -> Mar 2).
 */
export const createDateWithClamp = (year: number, month: number, day: number): Date => {
  // Create date at the 1st of the month
  const date = new Date(year, month, 1);
  // Get the last day of the target month
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  // Clamp the day
  const validDay = Math.min(day, lastDayOfMonth);
  date.setDate(validDay);
  return date;
};

/**
 * Calculates the start and end dates for a custom period.
 * 
 * @param year The target year
 * @param month The target month index (0-11) where the period ends.
 * @param startDay The day of the month the period usually starts on (e.g., 27).
 * @param isActive Whether custom period logic is active.
 */
export const getCustomPeriodRange = (year: number, month: number, startDay: number = 1, isActive: boolean = false) => {
  // Standard logic if not active or startDay is 1
  if (!isActive || startDay === 1) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      start: formatDateForAPI(start),
      end: formatDateForAPI(end)
    };
  }

  // Custom Logic: 
  // If startDay is 20, and we are looking at Month X (e.g., Feb):
  // The period is: (Jan) 20th to (Feb) 19th.
  
  // Start Date: Month - 1, clamped startDay
  const startDate = createDateWithClamp(year, month - 1, startDay);

  // End Date: Month, clamped (startDay - 1)
  const endDate = createDateWithClamp(year, month, startDay - 1);
  
  return {
    start: formatDateForAPI(startDate),
    end: formatDateForAPI(endDate)
  };
};

