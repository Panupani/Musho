import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Settings2, CheckCircle } from 'lucide-react';
import { addTransaction } from '../lib/transactions';
import { getCategories } from '../lib/categories';
import type { TransactionType } from '../types';
import CategoryManager from '../components/CategoryManager';

export default function AddTransaction() {
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [type, setType]               = useState<TransactionType>('income');
  const [amount, setAmount]           = useState('');
  const [category, setCategory]       = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate]               = useState(today);
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState('');
  const [showManager, setShowManager] = useState(false);

  const [categories, setCategories] = useState<string[]>(() => getCategories('income'));

  function switchType(t: TransactionType) {
    setType(t);
    setCategory('');
    setCategories(getCategories(t));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !category || !date) {
      setError('Please fill in Amount, Category, and Date.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await addTransaction({ type, amount: parsedAmount, category, description, date });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setAmount('');
        setCategory('');
        setDescription('');
        setDate(today);
        navigate('/');
      }, 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-green-600">
        <CheckCircle size={72} />
        <p className="text-2xl font-bold">Saved!</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Add New Record</h2>

      {/* Type Toggle */}
      <div className="flex rounded-2xl overflow-hidden border-2 border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => switchType('income')}
          className={`flex-1 py-4 text-lg font-semibold transition-colors ${
            type === 'income'
              ? 'bg-green-500 text-white'
              : 'bg-white text-gray-500 hover:bg-green-50'
          }`}
        >
          📈 Income
        </button>
        <button
          type="button"
          onClick={() => switchType('expense')}
          className={`flex-1 py-4 text-lg font-semibold transition-colors ${
            type === 'expense'
              ? 'bg-red-500 text-white'
              : 'bg-white text-gray-500 hover:bg-red-50'
          }`}
        >
          🛒 Expense
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Amount */}
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">
            Amount (฿) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-2xl font-bold text-gray-800 focus:outline-none focus:border-mushroom-500 transition-colors"
          />
        </div>

        {/* Category */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-base font-semibold text-gray-700">
              Category <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowManager(true)}
              className="flex items-center gap-1 text-sm text-mushroom-600 font-medium hover:text-mushroom-700"
            >
              <Settings2 size={15} />
              Manage
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
              No categories yet.{' '}
              <button
                type="button"
                onClick={() => setShowManager(true)}
                className="text-mushroom-600 font-medium underline"
              >
                Add one
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                    category === cat
                      ? type === 'income'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">
            Note (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Sold 5 kg oyster mushroom to market"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 focus:outline-none focus:border-mushroom-500 transition-colors"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 focus:outline-none focus:border-mushroom-500 transition-colors"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-5 rounded-2xl text-xl font-bold text-white transition-all ${
            type === 'income'
              ? 'bg-green-500 hover:bg-green-600 active:bg-green-700'
              : 'bg-red-500 hover:bg-red-600 active:bg-red-700'
          } disabled:opacity-50 shadow-lg`}
        >
          {loading ? 'Saving…' : `Save ${type === 'income' ? 'Income' : 'Expense'}`}
        </button>
      </form>

      {/* Category Manager Modal */}
      {showManager && (
        <CategoryManager
          type={type}
          onClose={() => setShowManager(false)}
          onSave={updated => {
            setCategories(updated);
            if (!updated.includes(category)) setCategory('');
          }}
        />
      )}
    </div>
  );
}
