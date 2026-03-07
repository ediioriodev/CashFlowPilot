'use client';

import React from 'react';
import { CategoryStats, MerchantStats } from '@/types/reports';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/lib/formatUtils';

interface BreakdownChartProps {
  data: (CategoryStats | MerchantStats)[];
  title: string;
  type: 'category' | 'merchant';
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', '#84cc16'];

export default function BreakdownChart({ data, title, type }: BreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 h-80 flex items-center justify-center text-gray-500">
        Nessun dato disponibile
      </div>
    );
  }

  const dataKey = type === 'category' ? 'category' : 'merchant';
  const valueKey = 'total';

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-gray-100">{title}</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            layout="vertical" 
            data={data} 
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis 
              dataKey={dataKey} 
              type="category" 
              width={100} 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <Tooltip 
              formatter={(value: number | undefined) => formatCurrency(value || 0)}
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey={valueKey} name="Totale" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
