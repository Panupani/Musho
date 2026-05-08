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

  const FILTER_LABELS: Record<string, string> = { all: 'ทั้งหมด', income: 'รายรับ', expense: 'รายจ่าย' };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-extrabold text-gray-900">ประวัติรายการ</h2>

      {/* Month picker */}
      <div>
        <label className="block text-sm font-bold text-gray-600 mb-2">เลือกเดือน</label>
        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base font-semibold text-gray-800 focus:outline-none focus:border-mushroom-500 bg-white"
        />
      </div>

      {/* Type filter — large buttons */}
      <div className="grid grid-cols-3 gap-2">
        {(['all', 'income', 'expense'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`py-4 rounded-2xl text-base font-bold transition-all border-2 ${
              filterType === t
                ? t === 'income'  ? 'bg-green-500 text-white border-green-500 shadow-md'
                : t === 'expense' ? 'bg-red-500   text-white border-red-500   shadow-md'
                                  : 'bg-mushroom-600 text-white border-mushroom-600 shadow-md'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t === 'income' ? '📈 ' : t === 'expense' ? '🛒 ' : '📋 '}
            {FILTER_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Totals banner */}
      {!loading && transactions.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 text-center">
            <p className="text-xs font-bold text-green-600 mb-1">รายรับ</p>
            <p className="text-xl font-extrabold text-green-700">
              ฿{totalIncome.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-center">
            <p className="text-xs font-bold text-red-600 mb-1">รายจ่าย</p>
            <p className="text-xl font-extrabold text-red-700">
              ฿{totalExpense.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl p-4 font-medium">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-20" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <p className="text-5xl mb-3">📋</p>
          <p className="text-xl font-semibold">ไม่พบรายการ</p>
          <p className="text-base mt-1">ลองเปลี่ยนตัวกรองด้านบน</p>
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
