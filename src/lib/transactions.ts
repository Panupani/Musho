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
