"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  /** l'opzione è un id: questa funzione ne dà l'etichetta leggibile */
  renderLabel?: (value: string) => string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Tutti",
  className,
  renderLabel,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const labelOf = React.useCallback((v: string) => renderLabel?.(v) ?? v, [renderLabel]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        containerRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    searchRef.current?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = options.filter((o) => labelOf(o).toLowerCase().includes(query.toLowerCase()));

  const toggle = (option: string) =>
    onChange(selected.includes(option) ? selected.filter((i) => i !== option) : [...selected, option]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-2 rounded-md border bg-surface px-3 py-2 text-left text-sm transition-colors",
          open ? "border-accent" : "border-line hover:bg-surface-2"
        )}
      >
        <span className="flex flex-wrap items-center gap-1">
          {selected.length === 0 ? (
            <span className="text-faint">{placeholder}</span>
          ) : (
            selected.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent"
              >
                {labelOf(item)}
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Togli ${labelOf(item)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(selected.filter((i) => i !== item));
                  }}
                  className="grid h-4 w-4 place-items-center rounded-full hover:bg-accent hover:text-accent-ink"
                >
                  <X className="h-3 w-3" aria-hidden />
                </span>
              </span>
            ))
          )}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-faint" aria-hidden />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable
          className="anim-pop absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-line bg-surface shadow-pop"
        >
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
            <input
              ref={searchRef}
              type="text"
              placeholder="Cerca…"
              aria-label="Filtra le opzioni"
              className="min-h-10 w-full bg-transparent text-sm outline-none placeholder:text-faint"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="p-3 text-center text-xs text-faint">Nessun risultato.</p>
            ) : (
              filtered.map((option) => {
                const isOn = selected.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={isOn}
                    onClick={() => toggle(option)}
                    className={cn(
                      "flex min-h-10 w-full items-center gap-2.5 rounded-sm px-2 text-left text-sm transition-colors",
                      isOn ? "bg-accent-soft text-accent" : "hover:bg-surface-3"
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-4 w-4 shrink-0 place-items-center rounded-sm border",
                        isOn ? "border-accent bg-accent text-accent-ink" : "border-line-strong"
                      )}
                    >
                      {isOn && <Check className="h-3 w-3" aria-hidden />}
                    </span>
                    <span className="truncate">{labelOf(option)}</span>
                  </button>
                );
              })
            )}
          </div>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="min-h-10 w-full border-t border-line text-xs font-semibold text-neg"
            >
              Azzera selezione
            </button>
          )}
        </div>
      )}
    </div>
  );
}
