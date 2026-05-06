import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fetchTransactions } from '../lib/transactions';
import type { Transaction } from '../types';
import SummaryCard from '../components/SummaryCard';
import TransactionRow from '../components/TransactionRow';
import { deleteTransaction } from '../lib/transactions';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTransactions({ month: currentMonth });
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

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const netProfit    = totalIncome - totalExpense;

  const recent = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Month Title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          {format(new Date(), 'MMMM yyyy')}
        </h2>
        <p className="text-gray-500 text-sm">Monthly Summary</p>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard label="Total Income"   amount={totalIncome}  icon="📈" color="green" />
          <SummaryCard label="Total Expense"  amount={totalExpense} icon="📉" color="red"   />
          <SummaryCard label="Net Profit"     amount={netProfit}    icon="💵" color="blue"  />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          ⚠️ {error}
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Recent Records</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl bg-gray-100 animate-pulse h-20" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🍄</p>
            <p className="text-lg">No records this month yet</p>
            <p className="text-sm">Tap <strong>Add Record</strong> to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map(tx => (
              <TransactionRow key={tx.id} tx={tx} onDelete={handleDelete} />
            ))}
            {transactions.length > 5 && (
              <p className="text-center text-sm text-mushroom-600 font-medium py-2">
                +{transactions.length - 5} more — see History tab
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
