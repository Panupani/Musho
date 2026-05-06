import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fetchTransactions, deleteTransaction } from '../lib/transactions';
import type { Transaction, TransactionType } from '../types';
import TransactionRow from '../components/TransactionRow';

export default function History() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [filterType, setFilterType]     = useState<TransactionType | 'all'>('all');
  const [filterMonth, setFilterMonth]   = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    load();
  }, [filterType, filterMonth]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTransactions({
        type: filterType !== 'all' ? filterType : undefined,
        month: filterMonth || undefined,
      });
      setTransactions(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this record?')) return;
    try {
      await deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t)  => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Transaction History</h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-mushroom-500 flex-1"
        />
        <div className="flex rounded-xl overflow-hidden border-2 border-gray-200 bg-white flex-1">
          {(['all', 'income', 'expense'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${
                filterType === t
                  ? t === 'income'
                    ? 'bg-green-500 text-white'
                    : t === 'expense'
                    ? 'bg-red-500 text-white'
                    : 'bg-mushroom-600 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Quick totals */}
      {!loading && transactions.length > 0 && (
        <div className="flex gap-3 text-sm">
          <span className="text-green-600 font-semibold">
            Income: ฿{totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-red-600 font-semibold">
            Expense: ฿{totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl bg-gray-100 animate-pulse h-20" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📋</p>
          <p className="text-lg">No records found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map(tx => (
            <TransactionRow key={tx.id} tx={tx} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
