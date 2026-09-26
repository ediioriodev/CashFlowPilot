"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendStats } from "@/types/reports";
import { formatDateLabel } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/formatUtils";
import { Card, CardHeader, EmptyState, Skeleton } from "@/components/ui/kit";
import { useTokenColors } from "@/hooks/useTokenColors";
import { TrendingUp } from "lucide-react";

interface TrendChartProps {
  data: TrendStats[];
  /** come sono raggruppate le barre: va detto, non lasciato indovinare */
  raggruppamento?: "giorno" | "settimana" | "mese";
  loading?: boolean;
}

const PASSO: Record<NonNullable<TrendChartProps["raggruppamento"]>, string> = {
  giorno: "Una barra per giorno",
  settimana: "Una barra per settimana, da lunedì a domenica",
  mese: "Una barra per mese",
};

/**
 * L'unico grafico dell'app che usa Recharts.
 *
 * A BARRE, non a linee: entrate e uscite sono eventi, esistono solo
 * quando accadono. Una curva interpolata fra due movimenti disegna
 * importi nei giorni in cui non è successo niente — un'entrata del 15
 * diventava una campana che saliva dal 14 e scendeva fino al 16. La
 * linea continua resta la forma giusta per il saldo, che esiste in
 * ogni istante.
 *
 * I colori arrivano dai token, non da hex fissi, così il tema scuro
 * non resta indietro.
 */
export default function TrendChart({ data, raggruppamento = "giorno", loading }: TrendChartProps) {
  const c = useTokenColors();
  const etichetta = (v: string) =>
    raggruppamento === "mese"
      ? new Date(v + "T00:00:00").toLocaleDateString("it-IT", { month: "short", year: "2-digit" })
      : formatDateLabel(v);

  return (
    <Card className="p-4 lg:p-5">
      <CardHeader title="Entrate e uscite nel tempo" hint={PASSO[raggruppamento]} />

      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Nessun dato nel periodo"
          body="Cambia l'intervallo o rimuovi qualche filtro."
        />
      ) : (
        <>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c["--line"]} />
                <XAxis
                  dataKey="date"
                  tickFormatter={etichetta}
                  stroke={c["--faint"]}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                />
                <YAxis
                  stroke={c["--faint"]}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) => `€${Math.round(v)}`}
                />
                <Tooltip
                  formatter={(value: number | undefined) => formatCurrency(value || 0)}
                  labelFormatter={(label) => etichetta(label as string)}
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${c["--line"]}`,
                    background: c["--surface"],
                    color: c["--text"],
                    boxShadow: "var(--shadow-md)",
                  }}
                  itemStyle={{ color: c["--text"] }}
                  labelStyle={{ color: c["--faint"], fontSize: 12 }}
                />
                <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12, color: c["--muted"] }} />
                <Bar dataKey="income" name="Entrate" fill={c["--pos"]} radius={[3, 3, 0, 0]} maxBarSize={22} />
                <Bar dataKey="expense" name="Uscite" fill={c["--neg"]} radius={[3, 3, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <details className="mt-3">
            <summary className="min-h-10 cursor-pointer text-xs font-semibold text-accent">
              Mostra i dati in tabella
            </summary>
            <div className="mt-2 max-h-64 overflow-y-auto">
              <table className="w-full border-collapse text-xs">
                <caption className="sr-only">Entrate e uscite, {PASSO[raggruppamento].toLowerCase()}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="border-b border-line py-2 text-left font-semibold text-faint">
                      {raggruppamento === "giorno" ? "Data" : raggruppamento === "settimana" ? "Settimana dal" : "Mese"}
                    </th>
                    <th scope="col" className="border-b border-line py-2 text-right font-semibold text-faint">Entrate</th>
                    <th scope="col" className="border-b border-line py-2 text-right font-semibold text-faint">Uscite</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d) => (
                    <tr key={d.date}>
                      <td className="border-b border-line py-2 text-muted">{etichetta(d.date)}</td>
                      <td className="tnum border-b border-line py-2 text-right">{formatCurrency(d.income)}</td>
                      <td className="tnum border-b border-line py-2 text-right">{formatCurrency(d.expense)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </Card>
  );
}
