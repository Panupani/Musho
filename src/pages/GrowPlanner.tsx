import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, Loader, Circle, Settings2 } from 'lucide-react';
import { fetchPlans, savePlan, deletePlan, buildTimeline, planSummary, getSteps } from '../lib/growCycles';
import type { GrowPlan } from '../types/grow';
import StepEditor from '../components/StepEditor';
import OptimizerTab from '../components/OptimizerTab';
import { useForecastPrice } from '../lib/useForecastPrice';

// ── helpers ────────────────────────────────────────────────────────────────────
function fmt(d: Date) { return format(d, 'dd MMM yyyy'); }

function StatusIcon({ status }: { status: 'done' | 'active' | 'upcoming' }) {
  if (status === 'done')    return <CheckCircle size={20} className="text-gray-400 flex-shrink-0" />;
  if (status === 'active')  return <Loader      size={20} className="text-mushroom-600 animate-spin flex-shrink-0" />;
  return                           <Circle      size={20} className="text-gray-200 flex-shrink-0" />;
}

// ── Plan Card ──────────────────────────────────────────────────────────────────
function PlanCard({ plan, onDelete }: { plan: GrowPlan; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const { timeline, current, nextHarvest, totalYieldKg, isComplete } = planSummary(plan);

  const doneCount = timeline.filter(t => t.status === 'done').length;
  const progress  = Math.round((doneCount / timeline.length) * 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Progress bar */}
      <div className="h-2 bg-gray-100">
        <div
          className={`h-2 transition-all ${isComplete ? 'bg-gray-400' : 'bg-mushroom-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-gray-800 text-base">👂 {plan.label || 'Wood Ear Batch'}</p>
            <p className="text-xs text-gray-400">
              Started: {fmt(parseISO(plan.startDate))} · {plan.bags} bags
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
            isComplete
              ? 'bg-gray-100 text-gray-500'
              : current
              ? 'bg-mushroom-100 text-mushroom-700'
              : 'bg-blue-50 text-blue-600'
          }`}>
            {isComplete ? '✅ Completed' : current ? `Step ${timeline.findIndex(t => t.status === 'active') + 1}/10` : '⏳ Upcoming'}
          </span>
        </div>

        {/* Current step callout */}
        {current && (
          <div className="bg-mushroom-50 border-l-4 border-mushroom-500 rounded-r-xl px-4 py-3">
            <p className="text-xs text-mushroom-600 font-semibold uppercase tracking-wide mb-0.5">Now doing</p>
            <p className="text-base font-bold text-mushroom-800">
              {current.step.emoji} {current.step.name}
            </p>
            <p className="text-xs text-mushroom-600 mt-0.5">
              Until {fmt(current.endDate)} · {current.daysLeft} day{current.daysLeft !== 1 ? 's' : ''} left
            </p>
          </div>
        )}

        {/* Next harvest callout */}
        {nextHarvest && !isComplete && (
          <div className="bg-green-50 rounded-xl px-4 py-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 font-semibold">Next harvest</p>
              <p className="text-sm font-bold text-green-700">{fmt(nextHarvest.startDate)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-green-600 font-semibold">Est. yield</p>
              <p className="text-sm font-bold text-green-700">
                ~{((nextHarvest.step.yieldPerBagKg ?? 0) * plan.bags).toFixed(1)} kg
              </p>
            </div>
          </div>
        )}

        {/* Total income estimate */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 rounded-xl px-3 py-2 text-center">
            <p className="text-sm font-bold text-blue-700">
              ~{totalYieldKg.toFixed(1)} kg
            </p>
            <p className="text-xs text-gray-400">Total 3-flush yield</p>
          </div>
          <div className="bg-green-50 rounded-xl px-3 py-2 text-center">
            <p className="text-sm font-bold text-green-700">
              ฿{(totalYieldKg * plan.pricePerKg).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-400">Est. income (฿{plan.pricePerKg}/kg)</p>
          </div>
        </div>

        {/* Expand / collapse timeline */}
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-mushroom-600 font-semibold hover:text-mushroom-700"
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {open ? 'Hide' : 'Show'} full timeline
        </button>

        {/* Timeline */}
        {open && (
          <div className="border-t border-gray-100 pt-3 space-y-0">
            {buildTimeline(plan).map((item, idx) => (
              <div key={item.step.key} className="flex gap-3">
                {/* Left: icon + line */}
                <div className="flex flex-col items-center">
                  <div className="mt-0.5">
                    <StatusIcon status={item.status} />
                  </div>
                  {idx < timeline.length - 1 && (
                    <div className={`w-0.5 flex-1 my-1 ${item.status === 'done' ? 'bg-gray-200' : 'bg-gray-100'}`} />
                  )}
                </div>

                {/* Right: content */}
                <div className={`flex-1 pb-4 ${item.status === 'upcoming' ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-bold ${item.status === 'active' ? 'text-mushroom-700' : 'text-gray-700'}`}>
                      {item.step.emoji} {item.step.name}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{item.step.durationDays}d</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fmt(item.startDate)} → {fmt(item.endDate)}
                  </p>

                  {/* Conditions pill */}
                  <p className="text-xs bg-gray-50 text-gray-500 rounded-lg px-2 py-1 mt-1.5 leading-snug">
                    📋 {item.step.conditions}
                  </p>

                  {/* Tips — show for active + done steps */}
                  {(item.status === 'active' || item.status === 'done') && item.step.tips.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {item.step.tips.map((tip, i) => (
                        <li key={i} className="flex gap-1.5 text-xs text-gray-500">
                          <span className="text-mushroom-400 flex-shrink-0">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Yield badge for harvest steps */}
                  {item.step.yieldPerBagKg && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                      🌻 ~{(item.step.yieldPerBagKg * plan.bags).toFixed(1)} kg
                      · ฿{(item.step.yieldPerBagKg * plan.bags * plan.pricePerKg).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete */}
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-400 hover:text-red-500 transition-colors border-t border-gray-50"
        >
          <Trash2 size={14} />
          Remove this batch
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function GrowPlanner() {
  const [tab, setTab]               = useState<'plans' | 'optimizer'>('plans');
  const [plans, setPlans]           = useState<GrowPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError]     = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [stepVer, setStepVer]       = useState(0); // bumped after step edits

  const forecastPrice = useForecastPrice();
  const totalDays = getSteps().reduce((s, step) => s + step.durationDays, 0);

  async function loadPlans() {
    setPlansLoading(true); setPlansError('');
    try {
      setPlans(await fetchPlans());
    } catch (e: unknown) {
      setPlansError(e instanceof Error ? e.message : 'Failed to load plans');
    } finally {
      setPlansLoading(false);
    }
  }

  useEffect(() => { loadPlans(); }, []);

  function onStepsSaved() {
    setStepVer(v => v + 1);   // re-mounts OptimizerTab so it reads fresh steps
    loadPlans();               // refresh plan timelines
  }

  const [label,            setLabel]            = useState('');
  const [startDate,        setStartDate]        = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bags,             setBags]             = useState('50');
  const [pricePerKg,       setPricePerKg]       = useState('');
  const [userEditedPrice,  setUserEditedPrice]  = useState(false);
  const [formError,        setFormError]        = useState('');

  // pre-fill price from forecast once loaded
  if (!forecastPrice.loading && !userEditedPrice && !pricePerKg) {
    setPricePerKg(String(forecastPrice.mid));
  }

  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    const b  = parseInt(bags);
    const pp = parseFloat(pricePerKg);
    if (!startDate)           { setFormError('Please select the date you have your cap.'); return; }
    if (isNaN(b) || b <= 0)   { setFormError('Enter a valid number of bags.'); return; }
    if (isNaN(pp) || pp <= 0) { setFormError('Enter a valid price per kg.'); return; }

    setSaving(true); setFormError('');
    try {
      await savePlan({ label: label.trim() || `Batch ${plans.length + 1}`, startDate, bags: b, pricePerKg: pp });
      await loadPlans();
      setShowForm(false);
      setLabel('');
      setBags('50');
      setPricePerKg('');
      setUserEditedPrice(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this grow plan?')) return;
    try {
      await deletePlan(id);
      await loadPlans();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete plan');
    }
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Persistent header — always visible */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Wood Ear Planner</h2>
          <p className="text-sm text-gray-500">Cap to 3rd harvest · ~{totalDays} days</p>
        </div>
        <button
          onClick={() => setShowEditor(true)}
          title="Edit steps & timing"
          className="flex items-center gap-1.5 border-2 border-gray-200 bg-white text-gray-600 px-3 py-3 rounded-xl text-sm font-semibold hover:border-mushroom-400 hover:text-mushroom-600 transition-colors flex-shrink-0"
        >
          <Settings2 size={18} />
          Steps
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-2xl overflow-hidden border-2 border-gray-200 bg-white">
        {(['plans', 'optimizer'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === t
                ? 'bg-mushroom-600 text-white'
                : 'text-gray-500 hover:bg-mushroom-50'
            }`}
          >
            {t === 'plans' ? '🌱 My Plans' : '📊 Optimizer'}
          </button>
        ))}
      </div>

      {/* Optimizer tab — key forces remount when steps change */}
      {tab === 'optimizer' && (
        <OptimizerTab key={stepVer} forecastPrice={forecastPrice.loading ? undefined : forecastPrice} />
      )}

      {/* Plans tab */}
      {tab === 'plans' && (<>
      <div className="flex items-center justify-end">
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-mushroom-600 text-white px-4 py-3 rounded-xl font-semibold text-sm hover:bg-mushroom-700 transition-colors"
          >
            <Plus size={18} />
            New Plan
          </button>
      </div>

      {/* Quick guide strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {[
          { e: '🔬', l: 'Culture',    d: '14d' },
          { e: '🌾', l: 'Spawn',      d: '14d' },
          { e: '🛍️', l: 'Bags',       d: '2d'  },
          { e: '🌑', l: 'Incubation', d: '25d' },
          { e: '💧', l: 'Fruiting',   d: '7d'  },
          { e: '🌻', l: 'Harvest×3',  d: '~41d'},
        ].map(s => (
          <div key={s.l} className="flex-shrink-0 flex flex-col items-center bg-white rounded-xl px-3 py-2 border border-gray-100 text-center min-w-[60px]">
            <span className="text-lg">{s.e}</span>
            <span className="text-xs font-medium text-gray-600 leading-tight">{s.l}</span>
            <span className="text-xs text-mushroom-500 font-semibold">{s.d}</span>
          </div>
        ))}
        <div className="flex-shrink-0 flex flex-col items-center bg-mushroom-50 rounded-xl px-3 py-2 border border-mushroom-200 text-center min-w-[60px]">
          <span className="text-lg">📅</span>
          <span className="text-xs font-medium text-mushroom-700 leading-tight">Total</span>
          <span className="text-xs text-mushroom-600 font-semibold">~{totalDays}d</span>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-base font-bold text-gray-800">🔬 Start New Plan</h3>
          <p className="text-sm text-gray-500 -mt-2">
            Enter the date you have your Wood Ear cap ready. All step dates are calculated automatically.
          </p>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Batch Label (optional)</label>
            <input
              type="text"
              placeholder="e.g. House A — May 2026"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-mushroom-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Cap Ready Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-mushroom-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Number of Bags</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={bags}
                onChange={e => setBags(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-mushroom-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-gray-600">Sale Price per kg (฿)</label>
              {!forecastPrice.loading && (
                <span className="text-xs text-mushroom-600 bg-mushroom-50 border border-mushroom-200 rounded-full px-2 py-0.5 font-semibold">
                  📈 {forecastPrice.low}–{forecastPrice.high} forecast
                </span>
              )}
            </div>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={pricePerKg}
              onChange={e => { setUserEditedPrice(true); setPricePerKg(e.target.value); }}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-mushroom-500"
            />
          </div>

          {formError && (
            <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">⚠️ {formError}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setShowForm(false); setFormError(''); setUserEditedPrice(false); setPricePerKg(''); }}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-mushroom-600 text-white font-bold hover:bg-mushroom-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Create Plan'}
            </button>
          </div>
        </div>
      )}

      {/* Plan list */}
      {plansError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">⚠️ {plansError}</div>
      )}
      {plansLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : plans.length === 0 && !showForm ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">👂</p>
          <p className="text-lg font-medium">No plans yet</p>
          <p className="text-sm">Tap <strong>New Plan</strong> to simulate your grow</p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onDelete={() => handleDelete(plan.id)}
            />
          ))}
        </div>
      )}

      </>)}  {/* end tab === 'plans' */}

      {/* Step editor modal (available from both tabs) */}
      {showEditor && (
        <StepEditor
          onClose={() => setShowEditor(false)}
          onSave={onStepsSaved}
        />
      )}
    </div>
  );
}
