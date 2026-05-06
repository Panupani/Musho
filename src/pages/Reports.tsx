import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { fetchMonthlySummary } from '../lib/transactions';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface MonthData {
  month: string;
  income: number;
  expense: number;
  profit: number;
}

export default function Reports() {
  const year = new Date().getFullYear();
  const [data, setData]       = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetchMonthlySummary(year)
      .then(rows => {
        setData(rows.map(r => ({
          ...r,
          month: MONTH_LABELS[Number(r.month.split('-')[1]) - 1],
          profit: r.income - r.expense,
        })));
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  }, []);

  const totalIncome  = data.reduce((s, d) => s + d.income,  0);
  const totalExpense = data.reduce((s, d) => s + d.expense, 0);
  const totalProfit  = totalIncome - totalExpense;

  const fmt = (n: number) =>
    '฿' + n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Annual Report {year}</h2>
        <p className="text-gray-500 text-sm">Income vs Expense overview</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          ⚠️ {error}
        </div>
      )}

      {/* Year totals */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 text-center">
            <p className="text-xs text-green-600 font-medium mb-1">Year Income</p>
            <p className="text-base font-bold text-green-700">{fmt(totalIncome)}</p>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-center">
            <p className="text-xs text-red-600 font-medium mb-1">Year Expense</p>
            <p className="text-base font-bold text-red-700">{fmt(totalExpense)}</p>
          </div>
          <div className={`border-2 rounded-2xl p-4 text-center ${
            totalProfit >= 0
              ? 'bg-blue-50 border-blue-200'
              : 'bg-orange-50 border-orange-200'
          }`}>
            <p className={`text-xs font-medium mb-1 ${totalProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              Net Profit
            </p>
            <p className={`text-base font-bold ${totalProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              {fmt(totalProfit)}
            </p>
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-base font-semibold text-gray-700 mb-4">Monthly Income vs Expense</h3>
        {loading ? (
          <div className="h-56 bg-gray-100 animate-pulse rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `฿${(v/1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value, name) => [
                  `฿${Number(value).toLocaleString('th-TH')}`,
                  String(name).charAt(0).toUpperCase() + String(name).slice(1),
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income"  name="Income"  fill="#4ade80" radius={[4,4,0,0]} />
              <Bar dataKey="expense" name="Expense" fill="#f87171" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Profit line */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-base font-semibold text-gray-700 mb-3">Monthly Net Profit</h3>
        {loading ? (
          <div className="h-40 bg-gray-100 animate-pulse rounded-xl" />
        ) : (
          <div className="space-y-2">
            {data.map(d => (
              <div key={d.month} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500 w-8">{d.month}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  {d.income + d.expense > 0 && (
                    <div
                      className={`h-full rounded-full flex items-center px-2 text-xs font-bold text-white transition-all ${
                        d.profit >= 0 ? 'bg-blue-400' : 'bg-orange-400'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.abs(d.profit) / Math.max(...data.map(x => Math.abs(x.profit)), 1) * 100)}%`,
                        minWidth: d.profit !== 0 ? '2rem' : 0,
                      }}
                    >
                      {fmt(d.profit)}
                    </div>
                  )}
                  {d.income === 0 && d.expense === 0 && (
                    <span className="text-xs text-gray-400 px-2 leading-6 block">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
