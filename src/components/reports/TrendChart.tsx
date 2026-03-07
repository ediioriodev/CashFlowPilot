'use client';

import React from 'react';
import { TrendStats } from '@/types/reports';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDateLabel } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/formatUtils';

interface TrendChartProps {
  data: TrendStats[];
}

export default function TrendChart({ data }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 h-80 flex items-center justify-center text-gray-500">
        Nessun dato disponibile nel periodo selezionato
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-gray-100">Andamento Entrate/Uscite</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(val) => formatDateLabel(val)} 
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis 
              stroke="#9ca3af" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `€${val}`}
            />
            <Tooltip 
              formatter={(value: number | undefined) => formatCurrency(value || 0)}
              labelFormatter={(label) => formatDateLabel(label as string)}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line 
              type="monotone" 
              dataKey="income" 
              name="Entrate" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="expense" 
              name="Uscite" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
