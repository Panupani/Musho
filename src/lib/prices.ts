import { supabase } from './supabase';

export interface PriceRecord {
  id: string;
  price_low: number;
  price_high: number;
  price: number;            // computed midpoint by Supabase
  unit: string;
  source: string;
  recorded_date: string;   // YYYY-MM-DD
  notes: string;
  created_at: string;
}

// ── CRUD ───────────────────────────────────────────────────────────────────────

export async function fetchPrices(limitDays = 90): Promise<PriceRecord[]> {
  const since = new Date();
  since.setDate(since.getDate() - limitDays);
  const { data, error } = await supabase
    .from('price_records')
    .select('*')
    .gte('recorded_date', since.toISOString().split('T')[0])
    .order('recorded_date', { ascending: true });
  if (error) throw error;
  return data as PriceRecord[];
}

export async function addPrice(
  price_low: number,
  price_high: number,
  recorded_date: string,
  notes = '',
): Promise<PriceRecord> {
  const { data, error } = await supabase
    .from('price_records')
    .upsert([{ price_low, price_high, recorded_date, notes, source: 'manual' }], {
      onConflict: 'recorded_date',
    })
    .select()
    .single();
  if (error) throw error;
  return data as PriceRecord;
}

export async function deletePrice(id: string): Promise<void> {
  const { error } = await supabase.from('price_records').delete().eq('id', id);
  if (error) throw error;
}

// ── Forecast ───────────────────────────────────────────────────────────────────

export interface ForecastPoint {
  date: string;
  mid?: number;
  low?: number;
  high?: number;
  forecastMid?: number;
  ma7?: number;
  type: 'actual' | 'forecast';
}

export interface PriceForecast {
  points: ForecastPoint[];
  trend: 'up' | 'down' | 'stable';
  trendPct: number;
  forecastNext7Low: number;
  forecastNext7High: number;
  forecastNext30Low: number;
  forecastNext30High: number;
  currentLow: number;
  currentHigh: number;
  avgMid: number;
  minLow: number;
  maxHigh: number;
}

function linReg(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 };
  const sx  = xs.reduce((a, b) => a + b, 0);
  const sy  = ys.reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sx2 = xs.reduce((a, x) => a + x * x, 0);
  const slope     = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

function addDays(dateStr: string, d: number) {
  const dt = new Date(dateStr + 'T00:00:00');
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().split('T')[0];
}

export function buildForecast(records: PriceRecord[]): PriceForecast {
  const empty: PriceForecast = {
    points: [], trend: 'stable', trendPct: 0,
    forecastNext7Low: 0, forecastNext7High: 0,
    forecastNext30Low: 0, forecastNext30High: 0,
    currentLow: 0, currentHigh: 0,
    avgMid: 0, minLow: 0, maxHigh: 0,
  };
  if (!records.length) return empty;

  const mids  = records.map(r => (r.price_low + r.price_high) / 2);
  const lows  = records.map(r => r.price_low);
  const highs = records.map(r => r.price_high);
  const xs    = records.map((_, i) => i);
  const n     = records.length;

  const { slope: sm, intercept: im } = linReg(xs, mids);
  const { slope: sl, intercept: il } = linReg(xs, lows);
  const { slope: sh, intercept: ih } = linReg(xs, highs);

  const trendPct = n >= 2 ? ((sm * (n - 1)) / (im || 1)) * 100 : 0;
  const trend: 'up' | 'down' | 'stable' =
    trendPct > 2 ? 'up' : trendPct < -2 ? 'down' : 'stable';

  // 7-day moving average of midpoints
  const ma7Map: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const w = mids.slice(Math.max(0, i - 6), i + 1);
    ma7Map[records[i].recorded_date] = w.reduce((a, b) => a + b, 0) / w.length;
  }

  // Actual points
  const actualPoints: ForecastPoint[] = records.map((r, i) => ({
    date: r.recorded_date,
    mid:  mids[i],
    low:  r.price_low,
    high: r.price_high,
    ma7:  ma7Map[r.recorded_date],
    type: 'actual' as const,
  }));

  // Forecast points
  const forecastPoints: ForecastPoint[] = [7, 14, 21, 30].map(d => ({
    date: addDays(records[n - 1].recorded_date, d),
    forecastMid: Math.max(1, Math.round(sm * (n - 1 + d) + im)),
    type: 'forecast' as const,
  }));

  const proj = (s: number, b: number, d: number) => Math.max(1, Math.round(s * (n - 1 + d) + b));

  return {
    points: [...actualPoints, ...forecastPoints],
    trend,
    trendPct: Math.round(trendPct * 10) / 10,
    forecastNext7Low:   proj(sl, il, 7),
    forecastNext7High:  proj(sh, ih, 7),
    forecastNext30Low:  proj(sl, il, 30),
    forecastNext30High: proj(sh, ih, 30),
    currentLow:  records[n - 1].price_low,
    currentHigh: records[n - 1].price_high,
    avgMid: Math.round(mids.reduce((a, b) => a + b, 0) / n * 100) / 100,
    minLow:  Math.min(...lows),
    maxHigh: Math.max(...highs),
  };
}
