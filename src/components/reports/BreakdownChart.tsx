"use client";

import React from "react";
import { Store, Tag } from "lucide-react";
import { CategoryStats, MerchantStats } from "@/types/reports";
import { formatCurrency } from "@/lib/formatUtils";
import { Card, CardHeader, CatRow, EmptyState, Skeleton } from "@/components/ui/kit";
import { StackBar } from "@/components/ui/charts";

interface BreakdownChartProps {
  data: (CategoryStats | MerchantStats)[];
  title: string;
  type: "category" | "merchant";
  loading?: boolean;
}

/** Sfumature del solo accento: una scala, non dieci colori scorrelati. */
const shade = (i: number) => `color-mix(in srgb, var(--accent) ${Math.max(20, 100 - i * 12)}%, var(--surface-3))`;

export default function BreakdownChart({ data, title, type, loading }: BreakdownChartProps) {
  const rows = data.map((d) => ({
    name:
      (type === "category" ? (d as CategoryStats).category : (d as MerchantStats).merchant)?.trim() ||
      (type === "category" ? "Senza categoria" : "Senza negozio"),
    total: Number(d.total),
    count: Number(d.cnt ?? 0),
  }));
  const max = rows[0]?.total || 1;
  const Icon = type === "category" ? Tag : Store;

  return (
    <Card className="p-4 lg:p-5">
      <CardHeader title={title} hint={rows.length ? `${rows.length} ${rows.length === 1 ? "voce" : "voci"}` : undefined} />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Icon} title="Nessun dato nel periodo" body="Prova a cambiare intervallo o filtri." />
      ) : (
        <>
          <StackBar
            height={16}
            ariaLabel={`Composizione: ${title}`}
            items={rows.slice(0, 8).map((r, i) => ({ label: r.name, value: r.total, color: shade(i) }))}
          />
          <div className="mt-4 flex flex-col">
            {rows.slice(0, 12).map((r, i) => (
              <CatRow
                key={r.name}
                icon={Icon}
                name={r.name}
                sub={r.count ? `${r.count} ${r.count === 1 ? "movimento" : "movimenti"}` : undefined}
                percent={(r.total / max) * 100}
                tone={shade(i)}
                value={formatCurrency(r.total)}
              />
            ))}
          </div>

          <details className="mt-4">
            <summary className="min-h-10 cursor-pointer text-xs font-semibold text-accent">
              Mostra i dati in tabella
            </summary>
            <table className="mt-2 w-full border-collapse text-xs">
              <caption className="sr-only">{title}</caption>
              <thead>
                <tr>
                  <th scope="col" className="border-b border-line py-2 text-left font-semibold text-faint">
                    {type === "category" ? "Categoria" : "Negozio"}
                  </th>
                  <th scope="col" className="border-b border-line py-2 text-right font-semibold text-faint">Totale</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name}>
                    <td className="border-b border-line py-2 text-muted">{r.name}</td>
                    <td className="tnum border-b border-line py-2 text-right">{formatCurrency(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </Card>
  );
}
