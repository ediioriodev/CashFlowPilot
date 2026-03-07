'use client';

import React from 'react';
import { TrendStats } from '@/types/reports';
import { formatCurrency } from '@/lib/formatUtils';
import { ArrowUp, ArrowDown, TrendingUp, Wallet } from 'lucide-react';

interface StatsCardsProps {
  trendData: TrendStats[];
}

export default function StatsCards({ trendData }: StatsCardsProps) {
  const defaults = { income: 0, expense: 0, balance: 0 };
  
  const stats = trendData.reduce((acc, curr) => {
    acc.income += Number(curr.income);
    acc.expense += Number(curr.expense);
    return acc;
  }, { ...defaults });
  
  stats.balance = stats.income - stats.expense;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard 
        label="Entrate Totali" 
        value={stats.income} 
        icon={<ArrowUp className="w-5 h-5 text-green-500" />}
        color="text-green-600"
      />
      <StatCard 
        label="Uscite Totali" 
        value={stats.expense} 
        icon={<ArrowDown className="w-5 h-5 text-red-500" />}
        color="text-red-600"
      />
      <StatCard 
        label="Saldo Periodo" 
        value={stats.balance} 
        icon={<Wallet className="w-5 h-5 text-blue-500" />}
        color={stats.balance >= 0 ? "text-blue-600" : "text-red-500"}
      />
      <StatCard 
        label="Media Spese (giorno)" 
        value={trendData.length ? stats.expense / trendData.length : 0} 
        icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
        color="text-gray-600 dark:text-gray-300"
      />
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 font-medium">
      <div className="flex justify-between items-start mb-2">
        <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">{label}</span>
        <div className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded-md">
          {icon}
        </div>
      </div>
      <div className={`text-xl font-bold ${color}`}>
        {formatCurrency(value)}
      </div>
    </div>
  )
}
