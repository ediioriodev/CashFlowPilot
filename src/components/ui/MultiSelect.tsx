"use client";

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(query.toLowerCase())
  )

  const toggleOption = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option]
    onChange(newSelected)
  }

  const handleRemove = (e: React.MouseEvent, option: string) => {
    e.stopPropagation()
    onChange(selected.filter((item) => item !== option))
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex min-h-[40px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
          open && "ring-2 ring-ring ring-offset-2"
        )}
        onClick={() => setOpen(!open)}
      >
        <div className="flex flex-wrap gap-1">
          {selected.length > 0 ? (
            selected.map((item) => (
              <span
                key={item}
                className="bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-md text-xs flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {item}
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, item)}
                  className="text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 bg-white dark:bg-zinc-950">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search..."
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground text-center">
                No results found.
              </p>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  className={cn(
                    "relative flex refresh-start cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer",
                    selected.includes(option) && "bg-accent"
                  )}
                  onClick={() => toggleOption(option)}
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selected.includes(option)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className={cn("h-4 w-4")} />
                  </div>
                  <span>{option}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
