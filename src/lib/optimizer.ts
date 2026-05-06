import { format } from 'date-fns';
import { getSteps } from './growCycles';
import type { GrowStep } from '../types/grow';

export type PhaseType = 'idle' | 'prep' | 'fruiting' | 'harvest' | 'rest';

export interface CellPhase {
  type: PhaseType;
  stepName: string;
}

export interface WeekLabel {
  idx: number;
  startDate: Date;
  monthLabel: string;        // 'May'
  isFirstOfMonth: boolean;
}

export interface MonthRevenue {
  label: string;             // 'May 2026'
  revenue: number;
  yieldKg: number;
}

export interface OptimizeResult {
  staggerDays: number;
  plantingDates: string[];           // YYYY-MM-DD per house
  gantt: CellPhase[][];              // [houseIdx][weekIdx]
  weekLabels: WeekLabel[];
  monthlyRevenue: MonthRevenue[];
  harvestWeekCount: number;
  harvestWeekPct: number;
  totalRevenue: number;
  avgMonthlyRevenue: number;
  recommendForMonthly: number;       // min houses for no 30-day gap
  recommendForWeekly: number;        // min houses for no 7-day gap
}

// ── helpers ────────────────────────────────────────────────────────────────────

function classifyStep(step: GrowStep): PhaseType {
  if (step.yieldPerBagKg !== undefined) return 'harvest';
  if (step.key.startsWith('rest'))      return 'rest';
  if (step.key === 'fruiting_induction') return 'fruiting';
  return 'prep';
}

function getPhaseForCycleDay(cycleDay: number, steps: GrowStep[]): CellPhase {
  let d = 0;
  for (const step of steps) {
    if (cycleDay < d + step.durationDays) {
      return { type: classifyStep(step), stepName: step.name };
    }
    d += step.durationDays;
  }
  return { type: 'idle', stepName: '' };
}

// Find minimum houses so that no gap between harvest days exceeds maxGap
function findMinHouses(maxGap: number, steps: GrowStep[]): number {
  const totalDays = steps.reduce((s, st) => s + st.durationDays, 0);
  for (let n = 1; n <= 60; n++) {
    const stagger = Math.round(totalDays / n);
    // Simulate 2 full cycles to capture repeating pattern
    const harvestSet = new Set<number>();
    for (let h = 0; h < n; h++) {
      for (let rep = 0; rep < 2; rep++) {
        let d = 0;
        for (const step of steps) {
          if (step.yieldPerBagKg !== undefined) {
            for (let i = 0; i < step.durationDays; i++) {
              harvestSet.add(h * stagger + rep * totalDays + d + i);
            }
          }
          d += step.durationDays;
        }
      }
    }
    const sorted = Array.from(harvestSet).sort((a, b) => a - b);
    if (!sorted.length) continue;
    let worstGap = sorted[0]; // gap from day 0 to first harvest
    for (let i = 1; i < sorted.length; i++) {
      worstGap = Math.max(worstGap, sorted[i] - sorted[i - 1]);
    }
    if (worstGap <= maxGap) return n;
  }
  return 60;
}

// ── main export ────────────────────────────────────────────────────────────────

export function runOptimizer(params: {
  numHouses: number;
  bagsPerHouse: number;
  pricePerKg: number;
  startDate: string;
  simulationWeeks: number;
}): OptimizeResult {
  const steps = getSteps();
  const totalCycleDays = steps.reduce((s, st) => s + st.durationDays, 0);
  const staggerDays = Math.max(1, Math.round(totalCycleDays / params.numHouses));
  const MS = 86_400_000;

  const start = new Date(params.startDate + 'T00:00:00');

  // Planting date per house
  const plantingDates = Array.from({ length: params.numHouses }, (_, h) =>
    format(new Date(start.getTime() + h * staggerDays * MS), 'yyyy-MM-dd'),
  );

  // Gantt: [house][week] — phase at midpoint of week
  const gantt: CellPhase[][] = Array.from({ length: params.numHouses }, (_, h) =>
    Array.from({ length: params.simulationWeeks }, (_, w) => {
      const dayOffset = w * 7 + 3 - h * staggerDays; // midpoint relative to plant date
      if (dayOffset < 0) return { type: 'idle' as PhaseType, stepName: 'Not started yet' };
      return getPhaseForCycleDay(dayOffset % totalCycleDays, steps);
    }),
  );

  // Week labels with month grouping
  const weekLabels: WeekLabel[] = Array.from({ length: params.simulationWeeks }, (_, w) => {
    const d = new Date(start.getTime() + w * 7 * MS);
    const prev = w > 0 ? new Date(start.getTime() + (w - 1) * 7 * MS) : null;
    return {
      idx: w,
      startDate: d,
      monthLabel: format(d, 'MMM'),
      isFirstOfMonth: !prev || format(d, 'MMM') !== format(prev, 'MMM'),
    };
  });

  // Monthly revenue — day-by-day accumulation for accuracy
  const monthMap: Record<string, { revenue: number; yieldKg: number }> = {};
  const simDays = params.simulationWeeks * 7;

  for (let day = 0; day < simDays; day++) {
    const monthKey = format(new Date(start.getTime() + day * MS), 'MMM yyyy');
    for (let h = 0; h < params.numHouses; h++) {
      const daysSincePlant = day - h * staggerDays;
      if (daysSincePlant < 0) continue;
      const cycleDay = daysSincePlant % totalCycleDays;
      let d = 0;
      for (const step of steps) {
        if (cycleDay >= d && cycleDay < d + step.durationDays) {
          if (step.yieldPerBagKg) {
            const dailyYieldKg = (step.yieldPerBagKg / step.durationDays) * params.bagsPerHouse;
            if (!monthMap[monthKey]) monthMap[monthKey] = { revenue: 0, yieldKg: 0 };
            monthMap[monthKey].yieldKg  += dailyYieldKg;
            monthMap[monthKey].revenue  += dailyYieldKg * params.pricePerKg;
          }
          break;
        }
        d += step.durationDays;
      }
    }
  }

  const monthlyRevenue: MonthRevenue[] = Object.entries(monthMap).map(([label, v]) => ({
    label,
    revenue: Math.round(v.revenue),
    yieldKg: Math.round(v.yieldKg * 10) / 10,
  }));

  // Harvest week coverage
  const harvestWeekCount = Array.from({ length: params.simulationWeeks }, (_, w) =>
    gantt.some(row => row[w].type === 'harvest'),
  ).filter(Boolean).length;

  const totalRevenue = monthlyRevenue.reduce((s, m) => s + m.revenue, 0);
  const monthCount   = Math.max(monthlyRevenue.length, 1);

  return {
    staggerDays,
    plantingDates,
    gantt,
    weekLabels,
    monthlyRevenue,
    harvestWeekCount,
    harvestWeekPct: Math.round((harvestWeekCount / params.simulationWeeks) * 100),
    totalRevenue: Math.round(totalRevenue),
    avgMonthlyRevenue: Math.round(totalRevenue / monthCount),
    recommendForMonthly: findMinHouses(30, steps),
    recommendForWeekly:  findMinHouses(7,  steps),
  };
}
