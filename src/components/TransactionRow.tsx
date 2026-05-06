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
    <div className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      {/* Type indicator */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${
          isIncome ? 'bg-green-100' : 'bg-red-100'
        }`}
      >
        {isIncome ? '💰' : '🛒'}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 truncate">{tx.category}</p>
        {tx.description && (
          <p className="text-sm text-gray-500 truncate">{tx.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {format(parseISO(tx.date), 'dd MMM yyyy')}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p className={`text-lg font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
          {isIncome ? '+' : '-'}฿{Number(tx.amount).toLocaleString('th-TH', {
            minimumFractionDigits: 2,
          })}
        </p>
        <button
          onClick={() => onDelete(tx.id)}
          className="mt-1 text-gray-300 hover:text-red-500 transition-colors"
          aria-label="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
