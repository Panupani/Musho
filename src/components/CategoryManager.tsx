import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { getCategories, saveCategories } from '../lib/categories';

interface Props {
  type: 'income' | 'expense';
  onClose: () => void;
  onSave: (cats: string[]) => void;
}

export default function CategoryManager({ type, onClose, onSave }: Props) {
  const [cats, setCats] = useState<string[]>(() => getCategories(type));
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  function add() {
    const name = newName.trim();
    if (!name) return;
    if (cats.some(c => c.toLowerCase() === name.toLowerCase())) {
      setError('Category already exists.');
      return;
    }
    setCats(prev => [...prev, name]);
    setNewName('');
    setError('');
  }

  function remove(index: number) {
    setCats(prev => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (cats.length === 0) {
      setError('You need at least one category.');
      return;
    }
    saveCategories(type, cats);
    onSave(cats);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">
            {type === 'income' ? '📈 Income' : '🛒 Expense'} Categories
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>
        </div>

        {/* Category list */}
        <div className="px-5 py-3 max-h-64 overflow-y-auto space-y-2">
          {cats.map((cat, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
            >
              <span className="text-sm font-medium text-gray-700">{cat}</span>
              <button
                onClick={() => remove(i)}
                className="text-gray-300 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
                aria-label={`Remove ${cat}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {cats.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">No categories yet</p>
          )}
        </div>

        {/* Add new */}
        <div className="px-5 py-3 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New category name"
              value={newName}
              onChange={e => { setNewName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && add()}
              className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-mushroom-500"
            />
            <button
              onClick={add}
              className="bg-mushroom-600 text-white rounded-xl px-4 flex items-center gap-1 text-sm font-semibold hover:bg-mushroom-700 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>

        {/* Save */}
        <div className="px-5 pb-5 pt-2">
          <button
            onClick={handleSave}
            className="w-full bg-mushroom-600 text-white rounded-2xl py-4 text-base font-bold hover:bg-mushroom-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
