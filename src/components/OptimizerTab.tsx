import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PlayCircle } from 'lucide-react';
import { runOptimizer } from '../lib/optimizer';
import type { OptimizeResult, PhaseType } from '../lib/optimizer';
import { getSteps } from '../lib/growCycles';

// ── phase colour map ──────────────────────────────────────────────────────────
const PHASE: Record<PhaseType, { bg: string; label: string; dot: string }> = {
  idle:     { bg: 'bg-gray-50',     label: 'Not started', dot: 'bg-gray-200'   },
  prep:     { bg: 'bg-amber-100',   label: 'Preparing',   dot: 'bg-amber-400'  },
  fruiting: { bg: 'bg-sky-200',     label: 'Fruiting',    dot: 'bg-sky-500'    },
  harvest:  { bg: 'bg-green-400',   label: 'Harvesting',  dot: 'bg-green-500'  },
  rest:     { bg: 'bg-gray-200',    label: 'Resting',     dot: 'bg-gray-400'   },
};

// ── small legend ──────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
      {(Object.keys(PHASE) as PhaseType[]).filter(k => k !== 'idle').map(k => (
        <span key={k} className="flex items-center gap-1">
          <span className={`w-3 h-3 rounded-sm ${PHASE[k].dot}`} />
          {PHASE[k].label}
        </span>
      ))}
    </div>
  );
}

// ── Gantt chart ───────────────────────────────────────────────────────────────
function GanttChart({ result }: { result: OptimizeResult }) {
  const { gantt, weekLabels } = result;

  // Group weeks into months for the header
  const monthGroups: { label: string; count: number }[] = [];
  for (const wl of weekLabels) {
    if (wl.isFirstOfMonth) monthGroups.push({ label: wl.monthLabel, count: 1 });
    else monthGroups[monthGroups.length - 1].count++;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="border-collapse text-xs" style={{ minWidth: weekLabels.length * 28 + 60 }}>
        <thead>
          {/* Month row */}
          <tr className="bg-gray-50">
            <th className="sticky left-0 bg-gray-50 z-10 w-14 px-2 py-1 text-left text-gray-400 font-medium border-b border-gray-200" />
            {monthGroups.map((mg, i) => (
              <th
                key={i}
                colSpan={mg.count}
                className="py-1 text-center font-semibold text-mushroom-700 border-b border-gray-200 border-r border-gray-100"
              >
                {mg.label}
              </th>
            ))}
          </tr>
          {/* Week-number row */}
          <tr className="bg-gray-50">
            <th className="sticky left-0 bg-gray-50 z-10 px-2 py-0.5 text-left text-gray-300 font-normal border-b border-gray-200" />
            {weekLabels.map(wl => (
              <th
                key={wl.idx}
                className={`w-7 text-center font-normal text-gray-300 border-b border-gray-200 ${wl.isFirstOfMonth ? 'border-l border-gray-200' : ''}`}
              >
                {wl.idx + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gantt.map((row, h) => (
            <tr key={h} className={h % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
              {/* House label */}
              <td className="sticky left-0 bg-inherit z-10 px-2 py-1 font-semibold text-gray-500 whitespace-nowrap border-r border-gray-100">
                H{h + 1}
              </td>
              {row.map((cell, w) => (
                <td
                  key={w}
                  title={`House ${h + 1} · Week ${w + 1} · ${cell.stepName || 'Idle'}`}
                  className={`w-7 h-7 ${PHASE[cell.type].bg} ${weekLabels[w].isFirstOfMonth ? 'border-l border-white' : ''}`}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function OptimizerTab() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const totalCycleDays = getSteps().reduce((s, st) => s + st.durationDays, 0);

  const [numHouses,  setNumHouses]  = useState(3);
  const [bags,       setBags]       = useState(100);
  const [pricePerKg, setPricePerKg] = useState(120);
  const [startDate,  setStartDate]  = useState(today);
  const [simWeeks,   setSimWeeks]   = useState(26);
  const [ran,        setRan]        = useState(false);

  const result = useMemo<OptimizeResult | null>(() => {
    if (!ran) return null;
    return runOptimizer({ numHouses, bagsPerHouse: bags, pricePerKg, startDate, simulationWeeks: simWeeks });
  }, [ran, numHouses, bags, pricePerKg, startDate, simWeeks]);

  function simulate() { setRan(false); setTimeout(() => setRan(true), 0); }

  const maxRevenue = result ? Math.max(...result.monthlyRevenue.map(m => m.revenue), 1) : 1;

  return (
    <div className="space-y-6">
      {/* ── Inputs ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-base font-bold text-gray-800">Simulation Parameters</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Growing Houses</label>
            <input
              type="number" inputMode="numeric" min="1" max="30"
              value={numHouses}
              onChange={e => setNumHouses(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-lg font-bold text-center focus:outline-none focus:border-mushroom-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Bags per House</label>
            <input
              type="number" inputMode="numeric" min="1"
              value={bags}
              onChange={e => setBags(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-lg font-bold text-center focus:outline-none focus:border-mushroom-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Price per kg (฿)</label>
            <input
              type="number" inputMode="numeric" min="1"
              value={pricePerKg}
              onChange={e => setPricePerKg(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-lg font-bold text-center focus:outline-none focus:border-mushroom-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Simulate (months)</label>
            <select
              value={simWeeks}
              onChange={e => setSimWeeks(Number(e.target.value))}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-base font-bold focus:outline-none focus:border-mushroom-500"
            >
              <option value={13}>3 months</option>
              <option value={26}>6 months</option>
              <option value={52}>12 months</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">First House Planting Date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:border-mushroom-500"
          />
        </div>

        <button
          onClick={simulate}
          className="w-full flex items-center justify-center gap-2 bg-mushroom-600 text-white py-4 rounded-2xl text-base font-bold hover:bg-mushroom-700 transition-colors"
        >
          <PlayCircle size={20} />
          Run Simulation
        </button>
      </div>

      {/* ── Results ── */}
      {result && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-mushroom-50 border-2 border-mushroom-200 rounded-2xl p-4">
              <p className="text-xs text-mushroom-600 font-semibold">Stagger Interval</p>
              <p className="text-2xl font-bold text-mushroom-800">{result.staggerDays} days</p>
              <p className="text-xs text-gray-400 mt-0.5">between each house start</p>
            </div>
            <div className={`border-2 rounded-2xl p-4 ${
              result.harvestWeekPct >= 90 ? 'bg-green-50 border-green-200'
              : result.harvestWeekPct >= 60 ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
            }`}>
              <p className={`text-xs font-semibold ${
                result.harvestWeekPct >= 90 ? 'text-green-600'
                : result.harvestWeekPct >= 60 ? 'text-yellow-600'
                : 'text-red-600'
              }`}>Harvest Coverage</p>
              <p className={`text-2xl font-bold ${
                result.harvestWeekPct >= 90 ? 'text-green-700'
                : result.harvestWeekPct >= 60 ? 'text-yellow-700'
                : 'text-red-700'
              }`}>{result.harvestWeekPct}%</p>
              <p className="text-xs text-gray-400 mt-0.5">{result.harvestWeekCount}/{simWeeks} weeks</p>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
              <p className="text-xs text-blue-600 font-semibold">Avg Monthly Income</p>
              <p className="text-xl font-bold text-blue-800">
                ฿{result.avgMonthlyRevenue.toLocaleString('th-TH')}
              </p>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
              <p className="text-xs text-green-600 font-semibold">Total Projected</p>
              <p className="text-xl font-bold text-green-800">
                ฿{result.totalRevenue.toLocaleString('th-TH')}
              </p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-700">Recommendations</h3>
            {[
              { goal: 'Monthly income (no 30-day gap)',  needed: result.recommendForMonthly, icon: '📅' },
              { goal: 'Weekly harvest (no 7-day gap)',   needed: result.recommendForWeekly,  icon: '📆' },
            ].map(({ goal, needed, icon }) => {
              const ok = numHouses >= needed;
              return (
                <div key={goal} className={`flex items-center justify-between rounded-xl px-4 py-3 ${ok ? 'bg-green-50' : 'bg-amber-50'}`}>
                  <div>
                    <p className={`text-xs font-semibold ${ok ? 'text-green-700' : 'text-amber-700'}`}>{icon} {goal}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {ok ? `✅ Your ${numHouses} houses is enough`
                           : `Need ${needed} houses (add ${needed - numHouses} more)`}
                    </p>
                  </div>
                  <span className={`text-lg font-bold flex-shrink-0 ${ok ? 'text-green-600' : 'text-amber-600'}`}>
                    {needed}🏠
                  </span>
                </div>
              );
            })}
          </div>

          {/* Planting schedule */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              Planting Schedule
              <span className="ml-2 text-xs text-gray-400 font-normal">
                one cycle = {totalCycleDays} days
              </span>
            </h3>
            <div className="space-y-2">
              {result.plantingDates.map((date, h) => (
                <div key={h} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-mushroom-700 w-8">H{h + 1}</span>
                    <span className="text-sm font-semibold text-gray-700">
                      {format(parseISO(date), 'dd MMM yyyy')}
                    </span>
                  </div>
                  {h > 0 && (
                    <span className="text-xs text-gray-400">+{result.staggerDays * h} days</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Gantt */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-700">Weekly Phase Chart</h3>
            <Legend />
            <GanttChart result={result} />
          </div>

          {/* Monthly revenue bar chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-700">Monthly Revenue</h3>

            {/* Simple horizontal bars (no chart lib needed, more readable on mobile) */}
            <div className="space-y-2">
              {result.monthlyRevenue.map(m => (
                <div key={m.label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16 flex-shrink-0">{m.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden">
                    {m.revenue > 0 && (
                      <div
                        className="h-full bg-green-400 rounded-full flex items-center px-2 transition-all"
                        style={{ width: `${Math.max(10, (m.revenue / maxRevenue) * 100)}%` }}
                      >
                        <span className="text-xs font-bold text-white truncate">
                          ฿{m.revenue.toLocaleString('th-TH')}
                        </span>
                      </div>
                    )}
                    {m.revenue === 0 && (
                      <span className="absolute inset-0 flex items-center px-2 text-xs text-gray-400">
                        No harvest
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 w-14 text-right">
                    {m.yieldKg} kg
                  </span>
                </div>
              ))}
            </div>

            {/* Recharts version for a clean overview */}
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={result.monthlyRevenue} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={36} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`฿${Number(v).toLocaleString('th-TH')}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#4ade80" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {!ran && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📊</p>
          <p className="text-sm">Fill in the parameters above and tap <strong>Run Simulation</strong></p>
        </div>
      )}
    </div>
  );
}
