import { Trash2 } from 'lucide-react';
import type { Transaction } from '../types';
import { format, parseISO } from 'date-fns';

interface Props {
  tx: Transaction;
  onDelete: (id: string) => void;
}

export default function TransactionRow({ tx, onDelete }: Props) {
  const isIncome = tx.type === 'income';

  return (
    <div className={`flex items-center gap-4 bg-white rounded-2xl px-4 py-4 shadow-sm border-2 ${
      isIncome ? 'border-green-100' : 'border-red-100'
    }`}>
      {/* Type indicator */}
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
        isIncome ? 'bg-green-100' : 'bg-red-100'
      }`}>
        {isIncome ? '💰' : '🛒'}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-gray-900 truncate">{tx.category}</p>
        {tx.description && (
          <p className="text-sm text-gray-500 truncate mt-0.5">{tx.description}</p>
        )}
        <p className="text-sm text-gray-400 mt-1 font-medium">
          {format(parseISO(tx.date), 'dd MMM yyyy')}
        </p>
      </div>

      {/* Amount + delete */}
      <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
        <p className={`text-xl font-extrabold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
          {isIncome ? '+' : '-'}฿{Number(tx.amount).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
        </p>
        <button
          onClick={() => onDelete(tx.id)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          aria-label="ลบรายการ"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
