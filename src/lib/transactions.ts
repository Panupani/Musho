import { supabase } from './supabase';
import type { Transaction, TransactionType } from '../types';

export async function fetchTransactions(filters?: {
  type?: TransactionType;
  month?: string; // 'YYYY-MM'
}): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.month) {
    const [year, month] = filters.month.split('-');
    const start = `${year}-${month}-01`;
    const end = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];
    query = query.gte('date', start).lte('date', end);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Transaction[];
}

export async function addTransaction(tx: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert([tx])
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

// ── Monthly trend (last N months, for dashboard charts) ───────────────────────
export interface MonthTrend {
  month: string;   // YYYY-MM
  label: string;   // Thai short label e.g. "พ.ค. 68"
  income:  number;
  expense: number;
  profit:  number;
}

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

export async function fetchMonthlyTrend(months: number): Promise<MonthTrend[]> {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount, date')
    .gte('date', start.toISOString().split('T')[0])
    .lte('date', end.toISOString().split('T')[0]);
  if (error) throw error;

  const map: Record<string, { income: number; expense: number }> = {};
  for (let i = 0; i < months; i++) {
    const d   = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[key]  = { income: 0, expense: 0 };
  }
  for (const row of data as { type: string; amount: number; date: string }[]) {
    const key = row.date.slice(0, 7);
    if (map[key]) map[key][row.type as 'income' | 'expense'] += Number(row.amount);
  }

  return Object.entries(map).map(([month, v]) => {
    const [y, m] = month.split('-');
    return {
      month,
      label:   `${THAI_MONTHS[Number(m) - 1]} ${String(Number(y) + 543).slice(2)}`,
      income:  Math.round(v.income),
      expense: Math.round(v.expense),
      profit:  Math.round(v.income - v.expense),
    };
  });
}

// ── Category breakdown (last N months) ────────────────────────────────────────
export interface CategoryTotal {
  category: string;
  type: TransactionType;
  total: number;
  pct: number;
}

export async function fetchCategoryBreakdown(months: number): Promise<CategoryTotal[]> {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const { data, error } = await supabase
    .from('transactions')
    .select('category, type, amount')
    .gte('date', start.toISOString().split('T')[0]);
  if (error) throw error;

  const map: Record<string, { type: TransactionType; total: number }> = {};
  for (const row of data as { category: string; type: TransactionType; amount: number }[]) {
    if (!map[row.category]) map[row.category] = { type: row.type, total: 0 };
    map[row.category].total += Number(row.amount);
  }

  const list = Object.entries(map)
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 7);

  const maxTotal = list[0]?.total ?? 1;
  return list.map(item => ({ ...item, pct: Math.round((item.total / maxTotal) * 100) }));
}

export async function fetchMonthlySummary(year: number): Promise<
  { month: string; income: number; expense: number }[]
> {
  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount, date')
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`);

  if (error) throw error;

  const map: Record<string, { income: number; expense: number }> = {};
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, '0')}`;
    map[key] = { income: 0, expense: 0 };
  }

  for (const row of data as { type: string; amount: number; date: string }[]) {
    const key = row.date.slice(0, 7);
    if (map[key]) {
      map[key][row.type as 'income' | 'expense'] += Number(row.amount);
    }
  }

  return Object.entries(map).map(([month, vals]) => ({ month, ...vals }));
}
