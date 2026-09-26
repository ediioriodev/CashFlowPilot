"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, X } from "lucide-react";

/* ============================================================
   PRIMITIVE — tutte basate sui token, nessun colore grezzo.
   ============================================================ */

export function Card({
  className,
  children,
  as: Tag = "section",
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return (
    <Tag
      className={cn("rounded-card border border-line bg-surface shadow-card", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  hint,
  action,
  className,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-faint">{hint}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-bold uppercase tracking-[0.07em] text-faint", className)}>
      {children}
    </p>
  );
}

/** Riga di contesto sotto un grafico: una sola, con icona. */
export function Note({
  icon: Icon,
  children,
  className,
}: {
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("mt-3 flex items-center justify-center gap-2 text-center text-xs leading-relaxed text-faint", className)}>
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      <span>{children}</span>
    </p>
  );
}

/* ---------------- Button ---------------- */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "pos";

const BTN: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110 border border-transparent",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-2",
  ghost: "bg-transparent text-muted border border-transparent hover:bg-surface-3 hover:text-ink",
  danger: "bg-neg text-white hover:brightness-110 border border-transparent dark:text-[#2B1917]",
  pos: "bg-pos-soft text-pos border border-transparent hover:brightness-95 dark:hover:brightness-125",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon: Icon,
  className,
  children,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ElementType;
}) {
  const sizes = {
    sm: "min-h-9 px-3 text-xs rounded-md gap-1.5",
    md: "min-h-11 px-4 text-sm rounded-md gap-2",
    lg: "min-h-13 px-5 text-[15px] rounded-md gap-2",
  }[size];

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-[background,border,filter,transform] duration-150 active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-50",
        sizes,
        BTN[variant],
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : (
        Icon && <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
      )}
      {children}
    </button>
  );
}

/** Bottone di sola icona: obbligatorio aria-label, area minima 44px. */
export function IconButton({
  label,
  icon: Icon,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: React.ElementType }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-3 hover:text-ink",
        className
      )}
      {...rest}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

/* ---------------- Pill / badge ---------------- */
export function Pill({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: "neutral" | "pos" | "neg" | "warn" | "accent";
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-3 text-muted",
    pos: "bg-pos-soft text-pos",
    neg: "bg-neg-soft text-neg",
    warn: "bg-warn-soft text-warn",
    accent: "bg-accent-soft text-accent",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-pill px-2 py-1 text-[11px] font-semibold", tones, className)}>
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden />}
      {children}
    </span>
  );
}

/* ---------------- Segmented tabs ---------------- */
export function SegTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: { value: T; label: string; tone?: "pos" | "neg" }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn("flex gap-0.5 rounded-md bg-surface-3 p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-9 flex-1 rounded-sm px-3 text-xs font-semibold transition-colors",
              active
                ? cn("bg-surface shadow-card", o.tone === "pos" ? "text-pos" : o.tone === "neg" ? "text-neg" : "text-ink")
                : "text-faint hover:text-ink"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Chip (filtri) ---------------- */
export function Chip({
  active,
  icon: Icon,
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; icon?: React.ElementType }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-pill border px-3 text-xs font-semibold transition-colors",
        active
          ? "border-accent bg-accent text-accent-ink"
          : "border-line bg-surface text-muted hover:bg-surface-2 hover:text-ink",
        className
      )}
      {...rest}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </button>
  );
}

/* ---------------- Toggle ---------------- */
export function Toggle({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-pill border transition-colors",
        checked ? "border-accent bg-accent" : "border-line bg-surface-3",
        className
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-card transition-[left] duration-200",
          checked ? "left-[22px] bg-white" : "left-0.5"
        )}
      />
    </button>
  );
}

/* ---------------- Campo di form ---------------- */
export function Field({
  label,
  required,
  error,
  help,
  htmlFor,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  help?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-muted">
        {label}
        {required && <span className="ml-1 text-neg" aria-hidden>*</span>}
        {required && <span className="sr-only"> (obbligatorio)</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-neg">{error}</p>
      ) : (
        help && <p className="text-xs leading-snug text-faint">{help}</p>
      )}
    </div>
  );
}

export const inputClass =
  "min-h-12 w-full rounded-md border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-faint " +
  "transition-colors focus:border-accent";

/* ---------------- Skeleton ---------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/* ---------------- Empty state ---------------- */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: React.ElementType;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <span className="grid h-14 w-14 place-items-center rounded-card bg-accent-soft text-accent">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <h4 className="text-[15px] font-semibold">{title}</h4>
      {body && <p className="max-w-[260px] text-xs leading-relaxed text-faint">{body}</p>}
      {action}
    </div>
  );
}

/* ---------------- Avatar membro ---------------- */
const AVATAR_TONES = [
  "bg-[#2E6F9E]",
  "bg-[#A8553A]",
  "bg-[#4F7A4A]",
  "bg-[#6B5B9E]",
  "bg-[#1F7A6B]",
  "bg-[#9E5B7B]",
];

/** Colore stabile per utente: stesso id → stesso colore ovunque. */
export function avatarTone(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function Avatar({
  name,
  id,
  size = 28,
  className,
}: {
  name: string;
  id: string;
  size?: number;
  className?: string;
}) {
  const initials = (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full font-bold text-white", avatarTone(id), className)}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={name}
      aria-label={name}
      role="img"
    >
      {initials}
    </span>
  );
}

export function AvatarStack({
  people,
  size = 26,
}: {
  people: { id: string; name: string }[];
  size?: number;
}) {
  return (
    <span className="flex items-center">
      {people.map((p, i) => (
        <Avatar
          key={p.id}
          id={p.id}
          name={p.name}
          size={size}
          className={cn("ring-2 ring-surface", i > 0 && "-ml-2")}
        />
      ))}
    </span>
  );
}

/* ---------------- Riga compatta: icona · nome · barra · importo ---------------- */
export function CatRow({
  icon: Icon,
  name,
  sub,
  percent,
  tone = "var(--accent)",
  value,
  onClick,
  className,
}: {
  icon?: React.ElementType;
  name: string;
  sub?: React.ReactNode;
  percent?: number;
  tone?: string;
  value: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "flex w-full min-h-14 items-center gap-3 border-line py-2.5 text-left [&+&]:border-t",
        onClick && "transition-colors hover:bg-surface-2",
        className
      )}
    >
      {Icon && (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-3 text-muted">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      )}
      {/* Il nome ha uno spazio minimo e la barra si restringe prima di lui:
          in una colonna stretta la barra fissa lasciava «T.» al posto del nome. */}
      <span className="flex min-w-[5.5rem] flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold">{name}</span>
        {sub && <span className="truncate text-xs font-normal text-faint">{sub}</span>}
      </span>
      {percent !== undefined && (
        <span className="hidden h-2 w-28 min-w-8 shrink overflow-hidden rounded-pill bg-surface-3 sm:block">
          <span className="block h-full rounded-pill" style={{ width: `${Math.min(100, percent)}%`, background: tone }} />
        </span>
      )}
      <span className="tnum shrink-0 text-right text-sm font-bold">{value}</span>
      {onClick && <ChevronRight className="h-4 w-4 shrink-0 text-faint" aria-hidden />}
    </Tag>
  );
}

/* ============================================================
   MODAL accessibile — ESC, click sul fondo, focus trap,
   ripristino del focus all'elemento che l'ha aperto.
   ============================================================ */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "sm",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  /* onClose in una ref: i chiamanti la passano quasi sempre come funzione
     inline, quindi cambia identità a ogni render del genitore — cioè a ogni
     carattere digitato in un campo. Se gli effetti qui sotto dipendessero da
     lei si rimonterebbero a ogni battuta, e il fuoco tornerebbe al primo
     elemento del pannello: il bottone di chiusura. */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const trap = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    const focusables = panelRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  /* Ascolto della tastiera e blocco dello scorrimento: dipendono solo
     dall'apertura, mai dalle prop che cambiano mentre si scrive. */
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", trap, true);
    return () => {
      document.removeEventListener("keydown", trap, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, trap]);

  /* Fuoco iniziale: una volta sola, all'apertura. Si preferisce il primo
     CAMPO al primo bottone — in ordine di documento il primo bottone è la X
     dell'intestazione, che non è dove si vuole cominciare a scrivere. */
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement;
    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      const target =
        panel?.querySelector<HTMLElement>("input:not([type='hidden']), textarea, select") ??
        panel?.querySelector<HTMLElement>("button:not([disabled]), a[href]") ??
        panel;
      target?.focus();
    }, 0);
    return () => {
      window.clearTimeout(t);
      openerRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }[size];

  return (
    <div
      className="anim-fade fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby={description ? "cfp-modal-desc" : undefined}
        tabIndex={-1}
        className={cn(
          "anim-up w-full rounded-t-card border border-line bg-surface p-5 shadow-modal outline-none sm:rounded-card",
          widths
        )}
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-base font-bold tracking-tight">{title}</h2>
          <IconButton label="Chiudi" icon={X} onClick={onClose} className="-mr-2 -mt-1 h-9 w-9" />
        </div>
        {description && (
          <p id="cfp-modal-desc" className="mb-4 text-sm leading-relaxed text-muted">
            {description}
          </p>
        )}
        {children}
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
