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
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-5">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg ${
          type === 'income' ? 'bg-green-100' : 'bg-red-100'
        }`}>
          <CheckCircle size={56} className={type === 'income' ? 'text-green-600' : 'text-red-600'} />
        </div>
        <p className="text-3xl font-extrabold text-gray-800">บันทึกแล้ว!</p>
        <p className="text-base text-gray-500">กลับสู่หน้าหลัก…</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h2 className="text-2xl font-extrabold text-gray-900">บันทึกรายการ</h2>

      {/* Type Toggle — very large, thumb-friendly */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => switchType('income')}
          className={`py-5 rounded-2xl text-lg font-bold transition-all border-3 ${
            type === 'income'
              ? 'bg-green-500 text-white shadow-md border-green-500'
              : 'bg-white text-gray-500 border-2 border-gray-200 hover:border-green-300 hover:bg-green-50'
          }`}
        >
          📈 รายรับ
        </button>
        <button
          type="button"
          onClick={() => switchType('expense')}
          className={`py-5 rounded-2xl text-lg font-bold transition-all ${
            type === 'expense'
              ? 'bg-red-500 text-white shadow-md border-2 border-red-500'
              : 'bg-white text-gray-500 border-2 border-gray-200 hover:border-red-300 hover:bg-red-50'
          }`}
        >
          🛒 รายจ่าย
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Amount — hero input, very large */}
        <div className={`rounded-2xl border-3 p-4 ${
          type === 'income' ? 'border-2 border-green-200 bg-green-50' : 'border-2 border-red-200 bg-red-50'
        }`}>
          <label className={`block text-sm font-bold mb-2 ${type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
            จำนวนเงิน (฿) <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className={`text-3xl font-extrabold ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>฿</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className={`flex-1 bg-transparent border-none outline-none text-4xl font-extrabold tracking-tight ${
                type === 'income' ? 'text-green-700' : 'text-red-700'
              } placeholder:text-gray-300`}
            />
          </div>
        </div>

        {/* Category — 2-column grid, large tap targets */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-base font-bold text-gray-800">
              หมวดหมู่ <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowManager(true)}
              className="flex items-center gap-1.5 text-sm text-mushroom-600 font-semibold bg-mushroom-50 px-3 py-2 rounded-xl hover:bg-mushroom-100 transition-colors"
            >
              <Settings2 size={15} />
              จัดการ
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
              <p className="text-base font-medium">ยังไม่มีหมวดหมู่</p>
              <button
                type="button"
                onClick={() => setShowManager(true)}
                className="text-mushroom-600 font-semibold underline mt-1 text-base"
              >
                เพิ่มหมวดหมู่
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-4 rounded-2xl border-2 text-base font-semibold transition-all text-left ${
                    category === cat
                      ? type === 'income'
                        ? 'border-green-500 bg-green-500 text-white shadow-md'
                        : 'border-red-500 bg-red-500 text-white shadow-md'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Note */}
        <div>
          <label className="block text-base font-bold text-gray-800 mb-2">
            หมายเหตุ (ไม่บังคับ)
          </label>
          <input
            type="text"
            placeholder="เช่น ขายเห็ดหูหนู 5 กก."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base text-gray-800 focus:outline-none focus:border-mushroom-500 transition-colors bg-white"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-base font-bold text-gray-800 mb-2">
            วันที่ <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base text-gray-800 focus:outline-none focus:border-mushroom-500 transition-colors bg-white"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl p-4 text-base font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Submit — very large, clear CTA */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-5 rounded-2xl text-xl font-extrabold text-white transition-all shadow-lg active:scale-[0.98] ${
            type === 'income'
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-red-500 hover:bg-red-600'
          } disabled:opacity-50`}
        >
          {loading ? 'กำลังบันทึก…' : `💾 บันทึก${type === 'income' ? 'รายรับ' : 'รายจ่าย'}`}
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
