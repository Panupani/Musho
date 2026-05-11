import { supabase } from './supabase';
import { WOOD_EAR_STEPS } from '../types/grow';
import type { GrowPlan, GrowStep } from '../types/grow';

const STEPS_KEY = 'musho_grow_steps';

// ── Step settings (keep in localStorage — device preference) ──────────────────
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

// ── Plans CRUD (Supabase) ─────────────────────────────────────────────────────

// Map Supabase snake_case row → GrowPlan camelCase
function rowToPlan(row: Record<string, unknown>): GrowPlan {
  return {
    id:          row.id          as string,
    label:       row.label       as string,
    startDate:   row.start_date  as string,
    bags:        row.bags        as number,
    pricePerKg:  row.price_per_kg as number,
    createdAt:   row.created_at  as string,
  };
}

export async function fetchPlans(): Promise<GrowPlan[]> {
  const { data, error } = await supabase
    .from('grow_plans')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(rowToPlan);
}

export async function savePlan(
  plan: Omit<GrowPlan, 'id' | 'createdAt'>,
): Promise<GrowPlan> {
  const { data, error } = await supabase
    .from('grow_plans')
    .insert([{
      label:        plan.label,
      start_date:   plan.startDate,
      bags:         plan.bags,
      price_per_kg: plan.pricePerKg,
    }])
    .select()
    .single();
  if (error) throw error;
  return rowToPlan(data as Record<string, unknown>);
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await supabase.from('grow_plans').delete().eq('id', id);
  if (error) throw error;
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
