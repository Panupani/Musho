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
        <p className="text-sm font-bold text-mushroom-500 uppercase tracking-widest mb-0.5">รายงานประจำปี</p>
        <h2 className="text-3xl font-extrabold text-gray-900">{year}</h2>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl p-4 font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Year totals — large, clear */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-24" />)}</div>
      ) : (
        <div className="space-y-3">
          {/* Net profit hero */}
          <div className={`rounded-3xl p-5 text-white shadow-lg ${totalProfit >= 0 ? 'bg-mushroom-700' : 'bg-orange-600'}`}>
            <p className="text-sm font-bold opacity-75 mb-1">กำไรสุทธิทั้งปี</p>
            <p className="text-4xl font-extrabold tracking-tight">
              {totalProfit >= 0 ? '+' : ''}{fmt(totalProfit)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-green-600 mb-1">📈 รายรับทั้งปี</p>
              <p className="text-2xl font-extrabold text-green-700">{fmt(totalIncome)}</p>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-red-600 mb-1">📉 รายจ่ายทั้งปี</p>
              <p className="text-2xl font-extrabold text-red-700">{fmt(totalExpense)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-base font-bold text-gray-800 mb-4">รายรับ vs รายจ่าย รายเดือน</h3>
        {loading ? (
          <div className="h-56 bg-gray-100 animate-pulse rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `฿${(v/1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value, name) => [
                  `฿${Number(value).toLocaleString('th-TH')}`,
                  name === 'income' ? 'รายรับ' : 'รายจ่าย',
                ]}
                contentStyle={{ fontSize: 14, borderRadius: 12 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 14, fontWeight: 600 }}
                formatter={v => v === 'income' ? 'รายรับ' : 'รายจ่าย'}
              />
              <Bar dataKey="income"  name="income"  fill="#22c55e" radius={[6,6,0,0]} />
              <Bar dataKey="expense" name="expense" fill="#ef4444" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Monthly profit bars */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-base font-bold text-gray-800 mb-4">กำไรสุทธิรายเดือน</h3>
        {loading ? (
          <div className="h-40 bg-gray-100 animate-pulse rounded-xl" />
        ) : (
          <div className="space-y-3">
            {data.map(d => (
              <div key={d.month} className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-600 w-10 flex-shrink-0">{d.month}</span>
                <div className="flex-1 bg-gray-100 rounded-xl h-9 overflow-hidden">
                  {d.income + d.expense > 0 ? (
                    <div
                      className={`h-full rounded-xl flex items-center px-3 text-sm font-bold text-white transition-all ${
                        d.profit >= 0 ? 'bg-mushroom-600' : 'bg-orange-500'
                      }`}
                      style={{
                        width: `${Math.max(8, Math.min(100, Math.abs(d.profit) / Math.max(...data.map(x => Math.abs(x.profit)), 1) * 100))}%`,
                      }}
                    >
                      {fmt(d.profit)}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 px-3 leading-9 block">—</span>
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
