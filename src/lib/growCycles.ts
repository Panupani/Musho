import { WOOD_EAR_STEPS } from '../types/grow';
import type { GrowPlan, GrowStep } from '../types/grow';

const PLANS_KEY = 'musho_grow_plans_v2';
const STEPS_KEY = 'musho_grow_steps';

// ── Step settings ──────────────────────────────────────────────────────────────
export function getSteps(): GrowStep[] {
  try {
    const raw = localStorage.getItem(STEPS_KEY);
    if (raw) return JSON.parse(raw) as GrowStep[];
  } catch { /* ignore */ }
  return WOOD_EAR_STEPS.map(s => ({ ...s }));
}

export function saveSteps(steps: GrowStep[]): void {
  localStorage.setItem(STEPS_KEY, JSON.stringify(steps));
}

export function resetSteps(): void {
  localStorage.removeItem(STEPS_KEY);
}

// ── Plans CRUD ─────────────────────────────────────────────────────────────────
export function getPlans(): GrowPlan[] {
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    return raw ? (JSON.parse(raw) as GrowPlan[]) : [];
  } catch {
    return [];
  }
}

export function savePlan(plan: Omit<GrowPlan, 'id' | 'createdAt'>): GrowPlan {
  const plans = getPlans();
  const newPlan: GrowPlan = {
    ...plan,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(PLANS_KEY, JSON.stringify([newPlan, ...plans]));
  return newPlan;
}

export function deletePlan(id: string): void {
  localStorage.setItem(PLANS_KEY, JSON.stringify(getPlans().filter(p => p.id !== id)));
}

// ── Timeline calculation ───────────────────────────────────────────────────────
export function buildTimeline(plan: GrowPlan): {
  step: GrowStep;
  startDate: Date;
  endDate: Date;
  status: 'done' | 'active' | 'upcoming';
  daysLeft: number;
}[] {
  const steps = getSteps();
  const msPerDay = 86_400_000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let cursor = new Date(plan.startDate);
  cursor.setHours(0, 0, 0, 0);

  return steps.map(step => {
    const startDate = new Date(cursor);
    const endDate   = new Date(cursor.getTime() + step.durationDays * msPerDay - msPerDay);
    const daysLeft  = Math.ceil((endDate.getTime() - today.getTime()) / msPerDay) + 1;

    let status: 'done' | 'active' | 'upcoming';
    if (today > endDate)                          status = 'done';
    else if (today >= startDate && today <= endDate) status = 'active';
    else                                          status = 'upcoming';

    cursor = new Date(endDate.getTime() + msPerDay);
    return { step, startDate, endDate, status, daysLeft };
  });
}

export function planSummary(plan: GrowPlan) {
  const steps    = getSteps();
  const timeline = buildTimeline(plan);
  const activeIdx = timeline.findIndex(t => t.status === 'active');
  const current   = activeIdx >= 0 ? timeline[activeIdx] : null;

  const harvests    = timeline.filter(t => t.step.yieldPerBagKg !== undefined);
  const nextHarvest = harvests.find(t => t.status === 'upcoming' || t.status === 'active') ?? null;

  const totalYieldKg = steps
    .filter(s => s.yieldPerBagKg)
    .reduce((s, step) => s + (step.yieldPerBagKg ?? 0) * plan.bags, 0);

  const isComplete = timeline[timeline.length - 1]?.status === 'done';

  return { timeline, current, activeIdx, nextHarvest, totalYieldKg, isComplete };
}
