import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  fetchTransactions, deleteTransaction,
  fetchMonthlyTrend, fetchCategoryBreakdown,
} from '../lib/transactions';
import { fetchPrices, buildForecast } from '../lib/prices';
import type { Transaction } from '../types';
import type { MonthTrend, CategoryTotal } from '../lib/transactions';
import TransactionRow from '../components/TransactionRow';

// ── helpers ───────────────────────────────────────────────────────────────────
function thb(n: number, compact = false) {
  if (compact && Math.abs(n) >= 1000)
    return `฿${(n / 1000).toFixed(1)}k`;
  return `฿${Math.abs(n).toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function TrendTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const order = ['income', 'expense', 'profit'];
  const sorted = [...payload].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  const thaiName: Record<string, string> = { income: 'รายรับ', expense: 'รายจ่าย', profit: 'กำไร' };
  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl shadow-xl p-4 min-w-[160px]">
      <p className="text-sm font-bold text-gray-600 mb-2">{label}</p>
      {sorted.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="text-sm font-semibold" style={{ color: p.color }}>{thaiName[p.name] ?? p.name}</span>
          <span className="text-sm font-extrabold" style={{ color: p.color }}>
            {p.name === 'profit' && p.value >= 0 ? '+' : ''}{thb(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
const PERIODS = [
  { label: '3 เดือน', months: 3 },
  { label: '6 เดือน', months: 6 },
  { label: '12 เดือน', months: 12 },
];

export default function Dashboard() {
  const currentMonth = format(new Date(), 'yyyy-MM');

  // period state
  const [period, setPeriod] = useState(6);

  // current month transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading]       = useState(true);

  // trend chart data
  const [trend, setTrend]           = useState<MonthTrend[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  // category breakdown
  const [categories, setCategories]     = useState<CategoryTotal[]>([]);
  const [catLoading, setCatLoading]     = useState(true);

  // price snapshot
  const [priceRange, setPriceRange]   = useState<{ low: number; high: number; mid: number } | null>(null);
  const [priceDir, setPriceDir]       = useState<'up' | 'down' | 'stable'>('stable');

  const [error, setError] = useState('');

  useEffect(() => { loadTransactions(); }, []);
  useEffect(() => { loadTrend(); loadCategories(); }, [period]);
  useEffect(() => { loadPrice(); }, []);

  async function loadTransactions() {
    setTxLoading(true);
    try {
      const data = await fetchTransactions({ month: currentMonth });
      setTransactions(data);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setTxLoading(false); }
  }

  async function loadTrend() {
    setTrendLoading(true);
    try { setTrend(await fetchMonthlyTrend(period)); }
    catch { /* silent */ }
    finally { setTrendLoading(false); }
  }

  async function loadCategories() {
    setCatLoading(true);
    try { setCategories(await fetchCategoryBreakdown(period)); }
    catch { /* silent */ }
    finally { setCatLoading(false); }
  }

  async function loadPrice() {
    try {
      const records = await fetchPrices(30);
      if (!records.length) return;
      const fc = buildForecast(records);
      const last = records[records.length - 1];
      setPriceRange({ low: last.price_low, high: last.price_high, mid: last.price });
      setPriceDir(fc.trend);
    } catch { /* silent */ }
  }

  async function handleDelete(id: string) {
    if (!confirm('ลบรายการนี้?')) return;
    try {
      await deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'ลบไม่สำเร็จ'); }
  }

  // current month KPIs
  const totalIncome  = transactions.filter(t => t.type === 'income') .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const netProfit    = totalIncome - totalExpense;
  const recent       = transactions.slice(0, 5);

  // trend KPIs
  const trendIncome  = trend.reduce((s, d) => s + d.income,  0);
  const trendExpense = trend.reduce((s, d) => s + d.expense, 0);
  const trendProfit  = trendIncome - trendExpense;
  const prevHalf     = trend.slice(0, Math.floor(trend.length / 2));
  const currHalf     = trend.slice(Math.floor(trend.length / 2));
  const prevProfit   = prevHalf.reduce((s, d) => s + d.profit, 0);
  const currProfit   = currHalf.reduce((s, d) => s + d.profit, 0);
  const trendDir     = currProfit > prevProfit * 1.05 ? 'up'
                     : currProfit < prevProfit * 0.95 ? 'down' : 'stable';

  const PriceIcon = priceDir === 'up' ? TrendingUp : priceDir === 'down' ? TrendingDown : Minus;
  const TrendIcon = trendDir  === 'up' ? TrendingUp : trendDir  === 'down' ? TrendingDown : Minus;

  return (
    <div className="space-y-5 max-w-lg mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-mushroom-500 uppercase tracking-widest">สรุปรายเดือน</p>
          <h2 className="text-2xl font-extrabold text-gray-900 leading-tight mt-0.5">
            {format(new Date(), 'MMMM yyyy')}
          </h2>
        </div>
        <span className="text-4xl leading-none">🍄</span>
      </div>

      {/* ── This month KPI hero ── */}
      {txLoading ? (
        <div className="rounded-3xl bg-gray-200 animate-pulse h-32" />
      ) : (
        <div className={`rounded-3xl p-5 text-white shadow-lg ${netProfit >= 0 ? 'bg-mushroom-700' : 'bg-red-600'}`}>
          <p className="text-sm font-semibold opacity-75">กำไรสุทธิเดือนนี้</p>
          <p className="text-5xl font-extrabold tracking-tight mt-1">
            {netProfit >= 0 ? '+' : '-'}{thb(netProfit)}
          </p>
          <div className="flex gap-4 mt-3 text-sm opacity-80">
            <span>📈 {thb(totalIncome)} รับ</span>
            <span>📉 {thb(totalExpense)} จ่าย</span>
          </div>
        </div>
      )}

      {/* ── Period selector ── */}
      <div className="flex gap-2">
        {PERIODS.map(p => (
          <button key={p.months} onClick={() => setPeriod(p.months)}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
              period === p.months
                ? 'bg-mushroom-700 text-white border-mushroom-700 shadow-md'
                : 'bg-white text-gray-600 border-gray-200 hover:border-mushroom-300'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Trend KPI row ── */}
      {!trendLoading && trend.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-3 text-center">
            <p className="text-xs font-bold text-green-600">รายรับรวม</p>
            <p className="text-lg font-extrabold text-green-700 mt-0.5">{thb(trendIncome, true)}</p>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-3 text-center">
            <p className="text-xs font-bold text-red-600">รายจ่ายรวม</p>
            <p className="text-lg font-extrabold text-red-700 mt-0.5">{thb(trendExpense, true)}</p>
          </div>
          <div className={`border-2 rounded-2xl p-3 text-center ${
            trendProfit >= 0 ? 'bg-mushroom-50 border-mushroom-200' : 'bg-orange-50 border-orange-200'
          }`}>
            <p className={`text-xs font-bold ${trendProfit >= 0 ? 'text-mushroom-700' : 'text-orange-600'}`}>กำไรรวม</p>
            <p className={`text-lg font-extrabold mt-0.5 ${trendProfit >= 0 ? 'text-mushroom-800' : 'text-orange-700'}`}>
              {thb(trendProfit, true)}
            </p>
          </div>
        </div>
      )}

      {/* ── Trend Line Chart ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-gray-800">แนวโน้มรายรับ-รายจ่าย</h3>
          <div className={`flex items-center gap-1 text-sm font-bold ${
            trendDir === 'up' ? 'text-green-600' : trendDir === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            <TrendIcon size={16} />
            {trendDir === 'up' ? 'ดีขึ้น' : trendDir === 'down' ? 'ลดลง' : 'คงที่'}
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-3">🟢 รายรับ · 🔴 รายจ่าย · — กำไร</p>

        {trendLoading ? (
          <div className="h-48 bg-gray-100 animate-pulse rounded-xl" />
        ) : trend.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400">
            <p className="text-base">ยังไม่มีข้อมูล</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={trend} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              {/* SVG gradient defs — plain SVG elements, valid inside Recharts */}
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.20} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fontWeight: 600, fill: '#6b7280' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={v => `฿${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`}
                axisLine={false} tickLine={false} width={44}
              />
              <Tooltip content={<TrendTooltip />} />

              {/* Income area */}
              <Area
                type="monotone" dataKey="income" name="income"
                stroke="#22c55e" strokeWidth={2.5}
                fill="url(#incomeGrad)" dot={false} activeDot={{ r: 6, fill: '#22c55e' }}
              />
              {/* Expense area */}
              <Area
                type="monotone" dataKey="expense" name="expense"
                stroke="#ef4444" strokeWidth={2.5}
                fill="url(#expenseGrad)" dot={false} activeDot={{ r: 6, fill: '#ef4444' }}
              />
              {/* Profit line */}
              <Line
                type="monotone" dataKey="profit" name="profit"
                stroke="#7d5c37" strokeWidth={3}
                dot={{ r: 4, fill: '#fff', stroke: '#7d5c37', strokeWidth: 2 }}
                activeDot={{ r: 7 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Category Breakdown ── */}
      {!catLoading && categories.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-base font-bold text-gray-800 mb-3">หมวดหมู่ยอดนิยม ({period} เดือน)</h3>
          <div className="space-y-3">
            {categories.map(cat => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700 truncate max-w-[60%]">{cat.category}</span>
                  <span className={`text-sm font-extrabold ${cat.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {cat.type === 'income' ? '+' : '-'}{thb(cat.total, true)}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      cat.type === 'income' ? 'bg-green-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${cat.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Price Snapshot ── */}
      {priceRange && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-amber-600 mb-0.5">ราคาเห็ดหูหนูวันนี้</p>
            <p className="text-2xl font-extrabold text-amber-800">
              {thb(priceRange.low)} – {thb(priceRange.high)}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">ต่อกิโลกรัม</p>
          </div>
          <div className={`flex flex-col items-center gap-1 ${
            priceDir === 'up' ? 'text-green-600' : priceDir === 'down' ? 'text-red-500' : 'text-gray-500'
          }`}>
            <PriceIcon size={28} />
            <span className="text-xs font-bold">
              {priceDir === 'up' ? 'ขาขึ้น' : priceDir === 'down' ? 'ขาลง' : 'คงที่'}
            </span>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl p-4 font-medium">⚠️ {error}</div>
      )}

      {/* ── Recent Transactions ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-800">รายการล่าสุด (เดือนนี้)</h3>
          {transactions.length > 5 && (
            <span className="text-sm text-mushroom-600 font-semibold">ทั้งหมด {transactions.length} →</span>
          )}
        </div>

        {txLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-20" />)}
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-5xl mb-3">🍄</p>
            <p className="text-xl font-semibold">ยังไม่มีรายการเดือนนี้</p>
            <p className="text-base mt-1">กด <strong className="text-mushroom-600">บันทึก</strong> เพื่อเพิ่มรายการ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map(tx => (
              <TransactionRow key={tx.id} tx={tx} onDelete={handleDelete} />
            ))}
            {transactions.length > 5 && (
              <div className="text-center py-1">
                <span className="text-sm text-mushroom-600 font-semibold bg-mushroom-50 px-4 py-2 rounded-xl">
                  +{transactions.length - 5} รายการ — ดูที่แท็บ ประวัติ
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
