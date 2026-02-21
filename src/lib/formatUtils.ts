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

/**
 * Translates common Supabase Auth error messages to Italian.
 */
export const translateAuthError = (message: string): string => {
  const m = message?.toLowerCase() ?? "";

  if (m.includes("invalid login credentials") || m.includes("invalid credentials"))
    return "Credenziali non valide. Controlla email e password.";
  if (m.includes("email not confirmed"))
    return "Email non ancora confermata. Controlla la tua casella di posta.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Esiste già un account con questa email.";
  if (m.includes("password should be at least"))
    return "La password deve contenere almeno 6 caratteri.";
  if (m.includes("new password should be different") || m.includes("same_password") || m.includes("different from the old"))
    return "La nuova password deve essere diversa da quella attuale.";
  if (m.includes("token has expired") || m.includes("token is invalid") || m.includes("otp expired"))
    return "Il link è scaduto o non valido. Richiedine uno nuovo.";
  if (m.includes("email rate limit") || m.includes("rate limit"))
    return "Troppi tentativi. Attendi qualche minuto e riprova.";
  if (m.includes("unable to validate email") || m.includes("invalid format"))
    return "Formato email non valido.";
  if (m.includes("user not found"))
    return "Nessun account trovato con questa email.";
  if (m.includes("signup_disabled") || m.includes("signups not allowed"))
    return "Le registrazioni sono momentaneamente disabilitate.";
  if (m.includes("network") || m.includes("fetch"))
    return "Errore di rete. Controlla la connessione e riprova.";
  if (m.includes("for security purposes"))
    return "Per motivi di sicurezza, attendi qualche secondo prima di riprovare.";

  // Fallback: return the original message as-is
  return message;
};

