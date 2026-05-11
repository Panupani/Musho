import { useState } from 'react';
import { X, RotateCcw, Trash2, Plus } from 'lucide-react';
import type { GrowStep } from '../types/grow';
import { saveSteps, resetSteps, getSteps } from '../lib/growCycles';
import { WOOD_EAR_STEPS } from '../types/grow';

interface Props {
  onClose: () => void;
  onSave: () => void;
}

export default function StepEditor({ onClose, onSave }: Props) {
  const [steps, setSteps] = useState<GrowStep[]>(() => getSteps());
  const [error, setError] = useState('');

  function update(idx: number, field: keyof GrowStep, raw: string) {
    setSteps(prev => {
      const next = prev.map((s, i) => {
        if (i !== idx) return s;
        if (field === 'name')          return { ...s, name: raw };
        if (field === 'durationDays')  return { ...s, durationDays: Math.max(1, parseInt(raw) || 1) };
        if (field === 'yieldPerBagKg') return { ...s, yieldPerBagKg: parseFloat(raw) || 0 };
        return s;
      });
      return next;
    });
  }

  function remove(idx: number) {
    if (steps.length <= 1) { setError('You need at least one step.'); return; }
    setSteps(prev => prev.filter((_, i) => i !== idx));
    setError('');
  }

  function handleSave() {
    for (const s of steps) {
      if (!s.name.trim()) { setError('Step name cannot be empty.'); return; }
      if (s.durationDays < 1) { setError('All durations must be at least 1 day.'); return; }
    }
    saveSteps(steps);
    onSave();
    onClose();
  }

  function handleReset() {
    if (!confirm('Reset all steps to default values?')) return;
    resetSteps();
    onSave();
    onClose();
  }

  const totalDays = steps.reduce((s, step) => s + step.durationDays, 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Edit Steps & Timing</h3>
            <p className="text-xs text-gray-400 mt-0.5">Total: {totalDays} days</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={22} />
          </button>
        </div>

        {/* Step list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {steps.map((step, idx) => (
            <div key={step.key} className="border-2 border-gray-100 rounded-xl p-3 space-y-2">
              {/* Step header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{step.emoji}</span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Step {idx + 1}
                  </span>
                </div>
                <button
                  onClick={() => remove(idx)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1"
                  aria-label={`Delete step ${idx + 1}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={step.name}
                  onChange={e => update(idx, 'name', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-mushroom-500"
                />
              </div>

              {/* Duration + optional yield on same row */}
              <div className={`grid gap-2 ${step.yieldPerBagKg !== undefined ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Duration (days)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={step.durationDays}
                    onChange={e => update(idx, 'durationDays', e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:border-mushroom-500"
                  />
                </div>

                {step.yieldPerBagKg !== undefined && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-500">Yield/bag (kg)</label>
                      <button
                        type="button"
                        onClick={() => setSteps(prev => prev.map((s, i) => {
                          if (i !== idx) return s;
                          const { yieldPerBagKg: _, ...rest } = s;
                          return rest as GrowStep;
                        }))}
                        className="text-xs text-red-400 hover:text-red-600 font-semibold leading-none"
                        title="Remove yield from this step"
                      >
                        ✕ Remove
                      </button>
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={step.yieldPerBagKg}
                      onChange={e => update(idx, 'yieldPerBagKg', e.target.value)}
                      className="w-full border-2 border-green-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:border-green-500"
                    />
                  </div>
                )}
              </div>

              {/* Add yield button — only shown when this step has no yield yet */}
              {step.yieldPerBagKg === undefined && (
                <button
                  type="button"
                  onClick={() => setSteps(prev => prev.map((s, i) =>
                    i === idx ? { ...s, yieldPerBagKg: 0.10 } : s
                  ))}
                  className="flex items-center gap-1.5 text-xs text-green-600 font-semibold bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-100 transition-colors"
                >
                  🌻 Add Yield
                </button>
              )}

              {/* Default reference */}
              {(() => {
                const def = WOOD_EAR_STEPS[idx];
                const changed =
                  def && (step.durationDays !== def.durationDays ||
                  (step.yieldPerBagKg !== undefined && step.yieldPerBagKg !== def.yieldPerBagKg));
                return changed ? (
                  <p className="text-xs text-amber-500">
                    Default: {def.durationDays}d{def.yieldPerBagKg !== undefined ? ` · ${def.yieldPerBagKg} kg/bag` : ''}
                  </p>
                ) : null;
              })()}
            </div>
          ))}

          {/* Add step */}
          <button
            onClick={() =>
              setSteps(prev => [
                ...prev,
                {
                  key: `custom_${Date.now()}`,
                  name: 'New Step',
                  emoji: '📌',
                  durationDays: 7,
                  description: '',
                  conditions: '',
                  tips: [],
                },
              ])
            }
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-mushroom-400 hover:text-mushroom-600 transition-colors"
          >
            <Plus size={16} />
            Add Step
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex-shrink-0 space-y-2">
          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">⚠️ {error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:border-red-300 hover:text-red-500 transition-colors"
            >
              <RotateCcw size={15} />
              Reset
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl bg-mushroom-600 text-white font-bold hover:bg-mushroom-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
