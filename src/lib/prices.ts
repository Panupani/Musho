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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Holt-Winters Exponential Smoothing ─────────────────────────────────────────

/**
 * Holt's Double ETS (Level + Trend, no seasonality).
 * Returns an array of `horizon` forecasted values.
 */
function holtDouble(
  data: number[],
  alpha: number,
  beta: number,
  horizon: number,
): number[] {
  const n = data.length;
  if (n === 0) return Array(horizon).fill(0);

  let L = data[0];
  let B = n >= 2 ? data[1] - data[0] : 0;

  for (let t = 1; t < n; t++) {
    const Lp = L, Bp = B;
    L = alpha * data[t] + (1 - alpha) * (Lp + Bp);
    B = beta  * (L - Lp) + (1 - beta) * Bp;
  }

  return Array.from({ length: horizon }, (_, i) => Math.max(1, L + (i + 1) * B));
}

/**
 * Holt-Winters Triple ETS with additive seasonality (m = season length).
 * Requires n >= m. Falls back to holtDouble if insufficient data.
 * Returns an array of `horizon` forecasted values.
 */
function holtWinters(
  data: number[],
  m: number,
  alpha: number,
  beta: number,
  gamma: number,
  horizon: number,
): number[] {
  const n = data.length;
  if (n < m) return holtDouble(data, alpha, beta, horizon);

  // --- Initialise ---
  const firstSeason = data.slice(0, m);
  const L0 = firstSeason.reduce((a, b) => a + b, 0) / m;

  let B0: number;
  if (n >= 2 * m) {
    const secondMean = data.slice(m, 2 * m).reduce((a, b) => a + b, 0) / m;
    B0 = (secondMean - L0) / m;
  } else {
    const xs = firstSeason.map((_, i) => i);
    B0 = linReg(xs, firstSeason).slope;
  }

  // Additive seasonal components for first cycle
  const S = firstSeason.map(y => y - L0);

  let L = L0;
  let B = B0;

  // --- Train from t = m onwards ---
  for (let t = m; t < n; t++) {
    const si   = S[t % m];
    const Lp   = L, Bp = B;
    L          = alpha * (data[t] - si) + (1 - alpha) * (Lp + Bp);
    B          = beta  * (L - Lp)       + (1 - beta)  * Bp;
    S[t % m]   = gamma * (data[t] - L)  + (1 - gamma) * si;
  }

  // --- Forecast ---
  return Array.from({ length: horizon }, (_, i) => {
    const h    = i + 1;
    const sIdx = (n - 1 + h) % m;
    return Math.max(1, L + h * B + S[sIdx]);
  });
}

function calcRmse(actual: number[], predicted: number[]): number {
  const len = Math.min(actual.length, predicted.length);
  if (len === 0) return Infinity;
  const sse = actual.slice(0, len).reduce((s, a, i) => s + (a - predicted[i]) ** 2, 0);
  return Math.sqrt(sse / len);
}

/** Grid-search best α/β for Holt Double; validates on the last ~20% of data. */
function optimiseDouble(data: number[]): { alpha: number; beta: number; rmse: number } {
  const split  = Math.max(3, Math.floor(data.length * 0.2));
  const train  = data.slice(0, data.length - split);
  const actual = data.slice(data.length - split);

  let best = { alpha: 0.3, beta: 0.1, rmse: Infinity };
  const alphas = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
  const betas  = [0.05, 0.1, 0.2, 0.3, 0.4];

  for (const a of alphas) {
    for (const b of betas) {
      const fc   = holtDouble(train, a, b, split);
      const rmse = calcRmse(actual, fc);
      if (rmse < best.rmse) best = { alpha: a, beta: b, rmse };
    }
  }
  return best;
}

/** Grid-search best α/β/γ for Holt-Winters Triple; validates on the last ~20%. */
function optimiseTriple(
  data: number[],
  m: number,
): { alpha: number; beta: number; gamma: number; rmse: number } {
  const split  = Math.max(m, Math.floor(data.length * 0.2));
  const train  = data.slice(0, data.length - split);
  const actual = data.slice(data.length - split);

  let best = { alpha: 0.3, beta: 0.1, gamma: 0.2, rmse: Infinity };
  const params = [0.1, 0.2, 0.3, 0.4, 0.5];

  for (const a of params) {
    for (const b of params) {
      for (const g of params) {
        const fc   = holtWinters(train, m, a, b, g, split);
        const rmse = calcRmse(actual, fc);
        if (rmse < best.rmse) best = { alpha: a, beta: b, gamma: g, rmse };
      }
    }
  }
  return best;
}

// ── Backtest ───────────────────────────────────────────────────────────────────

export interface BacktestPoint {
  date: string;
  actual: number;
  forecast: number;
  errorPct: number;
}

export interface BacktestResult {
  horizon: number;
  points: BacktestPoint[];
  mae: number;
  mape: number;
  rmse: number;
  modelName: string;
}

export function buildBacktest(records: PriceRecord[], horizon = 14): BacktestResult {
  const empty: BacktestResult = { horizon, points: [], mae: 0, mape: 0, rmse: 0, modelName: '-' };
  if (records.length <= horizon + 2) return empty;

  const m      = 7;
  const cutoff = records.length - horizon;
  const train  = records.slice(0, cutoff);
  const test   = records.slice(cutoff);

  const trainMids = train.map(r => (r.price_low + r.price_high) / 2);
  let forecastValues: number[];
  let modelName: string;

  if (trainMids.length >= 3 * m) {
    const opt   = optimiseTriple(trainMids, m);
    forecastValues = holtWinters(trainMids, m, opt.alpha, opt.beta, opt.gamma, horizon);
    modelName = 'Holt-Winters';
  } else if (trainMids.length >= 4) {
    const opt   = optimiseDouble(trainMids);
    forecastValues = holtDouble(trainMids, opt.alpha, opt.beta, horizon);
    modelName = 'Holt Double';
  } else {
    const trainXs = train.map((_, i) => i);
    const { slope, intercept } = linReg(trainXs, trainMids);
    forecastValues = Array.from({ length: horizon }, (_, i) =>
      Math.max(1, slope * (cutoff + i) + intercept));
    modelName = 'Linear';
  }

  const points: BacktestPoint[] = test.map((r, i) => {
    const actual   = (r.price_low + r.price_high) / 2;
    const forecast = Math.max(1, forecastValues[i] ?? trainMids[trainMids.length - 1]);
    const errorPct = ((forecast - actual) / actual) * 100;
    return {
      date:     r.recorded_date,
      actual:   Math.round(actual   * 100) / 100,
      forecast: Math.round(forecast * 100) / 100,
      errorPct: Math.round(errorPct * 10)  / 10,
    };
  });

  const n    = points.length;
  const mae  = points.reduce((s, p) => s + Math.abs(p.forecast - p.actual), 0) / n;
  const mape = points.reduce((s, p) => s + Math.abs(p.errorPct),            0) / n;
  const rmse = Math.sqrt(points.reduce((s, p) => s + (p.forecast - p.actual) ** 2, 0) / n);

  return {
    horizon,
    points,
    mae:  Math.round(mae  * 100) / 100,
    mape: Math.round(mape * 10)  / 10,
    rmse: Math.round(rmse * 100) / 100,
    modelName,
  };
}

// ── Forecast ───────────────────────────────────────────────────────────────────

export interface ForecastPoint {
  date: string;
  mid?: number;
  low?: number;
  high?: number;
  forecastMid?: number;
  forecastBandLow?: number;
  forecastBandHigh?: number;
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
  modelName: string;
  modelRmse: number;
}

export function buildForecast(records: PriceRecord[]): PriceForecast {
  const empty: PriceForecast = {
    points: [], trend: 'stable', trendPct: 0,
    forecastNext7Low: 0, forecastNext7High: 0,
    forecastNext30Low: 0, forecastNext30High: 0,
    currentLow: 0, currentHigh: 0,
    avgMid: 0, minLow: 0, maxHigh: 0,
    modelName: '-', modelRmse: 0,
  };
  if (!records.length) return empty;

  const mids  = records.map(r => (r.price_low + r.price_high) / 2);
  const lows  = records.map(r => r.price_low);
  const highs = records.map(r => r.price_high);
  const n     = records.length;
  const m     = 7;           // weekly seasonality
  const HORIZON = 30;

  // ── Select and run model ──────────────────────────────────────────────────────
  let midFc: number[], lowFc: number[], highFc: number[];
  let modelName: string;
  let modelRmse: number;

  if (n >= 3 * m) {
    // Holt-Winters Triple ETS (weekly seasonality)
    const optM = optimiseTriple(mids,  m);
    const optL = optimiseTriple(lows,  m);
    const optH = optimiseTriple(highs, m);
    midFc  = holtWinters(mids,  m, optM.alpha, optM.beta, optM.gamma, HORIZON);
    lowFc  = holtWinters(lows,  m, optL.alpha, optL.beta, optL.gamma, HORIZON);
    highFc = holtWinters(highs, m, optH.alpha, optH.beta, optH.gamma, HORIZON);
    modelName = 'Holt-Winters Triple ETS';
    modelRmse = Math.round(optM.rmse * 100) / 100;
  } else if (n >= 4) {
    // Holt's Double ETS (level + trend, no seasonality)
    const optM = optimiseDouble(mids);
    const optL = optimiseDouble(lows);
    const optH = optimiseDouble(highs);
    midFc  = holtDouble(mids,  optM.alpha, optM.beta, HORIZON);
    lowFc  = holtDouble(lows,  optL.alpha, optL.beta, HORIZON);
    highFc = holtDouble(highs, optH.alpha, optH.beta, HORIZON);
    modelName = "Holt's Double ETS";
    modelRmse = Math.round(optM.rmse * 100) / 100;
  } else {
    // Linear Regression fallback
    const xs = records.map((_, i) => i);
    const { slope: sm, intercept: im } = linReg(xs, mids);
    const { slope: sl, intercept: il } = linReg(xs, lows);
    const { slope: sh, intercept: ih } = linReg(xs, highs);
    midFc  = Array.from({ length: HORIZON }, (_, i) => Math.max(1, sm * (n + i) + im));
    lowFc  = Array.from({ length: HORIZON }, (_, i) => Math.max(1, sl * (n + i) + il));
    highFc = Array.from({ length: HORIZON }, (_, i) => Math.max(1, sh * (n + i) + ih));
    modelName = 'Linear Regression';
    const res = mids.map((y, i) => y - (sm * i + im));
    modelRmse = Math.round(Math.sqrt(res.reduce((s, r) => s + r * r, 0) / res.length) * 100) / 100;
  }

  // ── Trend (based on last actual → 7-day forecast midpoint) ───────────────────
  const lastMid = mids[n - 1];
  const mid7    = midFc[6];
  const trendPct = ((mid7 - lastMid) / (lastMid || 1)) * 100;
  const trend: 'up' | 'down' | 'stable' =
    trendPct > 2 ? 'up' : trendPct < -2 ? 'down' : 'stable';

  // ── 7-day moving average ──────────────────────────────────────────────────────
  const ma7Map: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const w = mids.slice(Math.max(0, i - 6), i + 1);
    ma7Map[records[i].recorded_date] = w.reduce((a, b) => a + b, 0) / w.length;
  }

  // ── Actual points ─────────────────────────────────────────────────────────────
  const actualPoints: ForecastPoint[] = records.map((r, i) => ({
    date: r.recorded_date,
    mid:  Math.round(mids[i] * 100) / 100,
    low:  r.price_low,
    high: r.price_high,
    ma7:  Math.round(ma7Map[r.recorded_date] * 100) / 100,
    type: 'actual' as const,
  }));

  // ── Forecast points at days 1, 7, 14, 21, 30 ─────────────────────────────────
  const forecastDays = [1, 7, 14, 21, 30];
  const forecastPoints: ForecastPoint[] = forecastDays.map(d => ({
    date:             addDays(records[n - 1].recorded_date, d),
    forecastMid:      Math.max(1, Math.round(midFc[d - 1])),
    forecastBandLow:  Math.max(1, Math.round(lowFc[d - 1])),
    forecastBandHigh: Math.max(1, Math.round(highFc[d - 1])),
    type: 'forecast' as const,
  }));

  return {
    points: [...actualPoints, ...forecastPoints],
    trend,
    trendPct: Math.round(trendPct * 10) / 10,
    forecastNext7Low:   Math.max(1, Math.round(lowFc[6])),
    forecastNext7High:  Math.max(1, Math.round(highFc[6])),
    forecastNext30Low:  Math.max(1, Math.round(lowFc[29])),
    forecastNext30High: Math.max(1, Math.round(highFc[29])),
    currentLow:  records[n - 1].price_low,
    currentHigh: records[n - 1].price_high,
    avgMid: Math.round(mids.reduce((a, b) => a + b, 0) / n * 100) / 100,
    minLow:  Math.min(...lows),
    maxHigh: Math.max(...highs),
    modelName,
    modelRmse,
  };
}
