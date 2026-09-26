"use client";

import React from "react";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet } from "lucide-react";
import { TrendStats } from "@/types/reports";
import { formatCurrency } from "@/lib/formatUtils";
import { Card, Eyebrow, Skeleton } from "@/components/ui/kit";

interface StatsCardsProps {
  trendData: TrendStats[];
  loading?: boolean;
}

export default function StatsCards({ trendData, loading }: StatsCardsProps) {
  const stats = trendData.reduce(
    (acc, curr) => {
      acc.income += Number(curr.income);
      acc.expense += Number(curr.expense);
      return acc;
    },
    { income: 0, expense: 0 }
  );
  const balance = stats.income - stats.expense;
  const perDay = trendData.length ? stats.expense / trendData.length : 0;

  const cards = [
    { label: "Entrate", value: stats.income, icon: ArrowDownLeft, color: "var(--pos)", soft: "var(--pos-soft)" },
    { label: "Uscite", value: stats.expense, icon: ArrowUpRight, color: "var(--neg)", soft: "var(--neg-soft)" },
    {
      label: "Saldo del periodo",
      value: balance,
      icon: Wallet,
      color: balance >= 0 ? "var(--pos)" : "var(--neg)",
      soft: balance >= 0 ? "var(--pos-soft)" : "var(--neg-soft)",
    },
    { label: "Media uscite al giorno", value: perDay, icon: TrendingUp, color: "var(--text)", soft: "var(--surface-3)" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <Eyebrow className="leading-tight">{c.label}</Eyebrow>
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md"
              style={{ background: c.soft, color: c.color }}
            >
              <c.icon className="h-4 w-4" aria-hidden />
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <p className="tnum text-xl font-bold" style={{ color: c.color }}>
              {formatCurrency(c.value)}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
