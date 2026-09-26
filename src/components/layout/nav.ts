import {
  Home,
  List,
  PieChart,
  BarChart3,
  Users,
  Repeat,
  Bell,
  Settings,
  Target,
  PiggyBank,
  UserPlus,
  User,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** descrizione usata nella pagina "Altro" */
  desc?: string;
}

/** Destinazioni principali — visibili nella sidebar desktop. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Oggi", icon: Home, desc: "Quanto puoi ancora spendere" },
  { href: "/spese", label: "Movimenti", icon: List, desc: "Tutte le entrate e le uscite" },
  { href: "/budget", label: "Budget", icon: Target, desc: "I tetti che ti sei dato" },
  { href: "/obiettivi", label: "Obiettivi", icon: PiggyBank, desc: "Quanto stai mettendo da parte" },
  { href: "/analisi", label: "Analisi", icon: PieChart, desc: "Dove vanno i soldi" },
  { href: "/report", label: "Report", icon: BarChart3, desc: "Confronti e andamenti nel tempo" },
  { href: "/famiglia", label: "Famiglia", icon: Users, desc: "Chi ha pagato e conguaglio" },
  { href: "/ricorrenti", label: "Fisse e abbonamenti", icon: Repeat, desc: "Le spese che si ripetono" },
];

/** Secondarie — sotto il separatore nella sidebar, dentro "Altro" su mobile. */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/promemoria", label: "Promemoria", icon: Bell, desc: "Scadenze e avvisi" },
  { href: "/inviti", label: "Invita membri", icon: UserPlus, desc: "Aggiungi qualcuno al gruppo" },
  { href: "/account", label: "Profilo", icon: User, desc: "Nome, email, password" },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings, desc: "Periodo, notifiche, tema" },
];

/**
 * Le 4 destinazioni della barra in basso (il + è un'azione, non una tab).
 * Budget ha preso il posto di Analisi: il tetto è la domanda di ogni
 * giorno, l'analisi si guarda ogni tanto e passa sotto «Altro».
 */
export const BOTTOM_NAV: NavItem[] = [
  { href: "/", label: "Oggi", icon: Home },
  { href: "/spese", label: "Movimenti", icon: List },
  { href: "/budget", label: "Budget", icon: Target },
  { href: "/altro", label: "Altro", icon: MoreHorizontal },
];

/** Percorsi che, su mobile, illuminano la voce "Altro". */
const UNDER_ALTRO = [
  "/altro",
  "/analisi",
  "/obiettivi",
  "/report",
  "/famiglia",
  "/ricorrenti",
  "/promemoria",
  "/impostazioni",
  "/account",
  "/inviti",
];

export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/altro") return UNDER_ALTRO.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (href === "/") return pathname === "/";
  if (href === "/spese") return pathname.startsWith("/spese") && !pathname.startsWith("/spese/nuova");
  return pathname === href || pathname.startsWith(href + "/");
}

export const AUTH_ROUTES = ["/login", "/register", "/reset-password"];
