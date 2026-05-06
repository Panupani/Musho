import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { fetchPrices, addPrice, deletePrice, buildForecast } from '../lib/prices';
import type { PriceRecord, PriceForecast } from '../lib/prices';

// ── constants ─────────────────────────────────────────────────────────────────
const TALAADTHAI_URL = 'https://talaadthai.com/products/jelly-ear-mushroom-9600-2451';

const TREND_STYLE = {
  up:     { icon: TrendingUp,   color: 'text-green-600', bg: 'bg-green-50 border-green-200',  label: 'Rising'  },
  down:   { icon: TrendingDown, color: 'text-red-600',   bg: 'bg-red-50 border-red-200',      label: 'Falling' },
  stable: { icon: Minus,        color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200',    label: 'Stable'  },
};

function thb(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string) { return format(parseISO(d), 'dd MMM'); }

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-gray-600">{label}</p>
      {payload.map((p, i) => p.value != null && (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {thb(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PriceTracker() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const [records,  setRecords]  = useState<PriceRecord[]>([]);
  const [forecast, setForecast] = useState<PriceForecast | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [days,     setDays]     = useState(90);

  // form
  const [priceLow,  setPriceLow]  = useState('');
  const [priceHigh, setPriceHigh] = useState('');
  const [date,      setDate]      = useState(today);
  const [notes,     setNotes]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const [formErr,   setFormErr]   = useState('');
  const [showForm,  setShowForm]  = useState(false);

  useEffect(() => { load(); }, [days]);

  async function load() {
    setLoading(true); setError('');
    try {
      const data = await fetchPrices(days);
      setRecords(data);
      setForecast(buildForecast(data));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const lo = parseFloat(priceLow);
    const hi = parseFloat(priceHigh);
    if (isNaN(lo) || lo <= 0)    { setFormErr('Enter a valid low price.'); return; }
    if (isNaN(hi) || hi < lo)    { setFormErr('High price must be ≥ low price.'); return; }
    if (!date)                   { setFormErr('Select a date.'); return; }
    setSaving(true); setFormErr('');
    try {
      await addPrice(lo, hi, date, notes);
      setPriceLow(''); setPriceHigh(''); setNotes(''); setDate(today); setShowForm(false);
      await load();
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this price record?')) return;
    try { await deletePrice(id); await load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Delete failed'); }
  }

  // Build chart data: show band (area) for actual, line for forecast + MA7
  const chartData = forecast?.points.map(p => ({
    date: fmtDate(p.date),
    ...(p.type === 'actual' ? {
      band:        [p.low ?? 0, p.high ?? 0],   // for Area range
      low:         p.low,
      high:        p.high,
      mid:         p.mid,
      ma7:         p.ma7,
    } : {
      forecastMid: p.forecastMid,
    }),
  })) ?? [];

  // stitch last actual → first forecast
  const lastActualIdx = forecast?.points.findLastIndex(p => p.type === 'actual') ?? -1;
  if (lastActualIdx >= 0 && lastActualIdx + 1 < (chartData.length)) {
    chartData[lastActualIdx + 1] = {
      ...chartData[lastActualIdx + 1],
      forecastMid: chartData[lastActualIdx].mid,
    };
  }

  const trendInfo = forecast ? TREND_STYLE[forecast.trend] : null;
  const TrendIcon = trendInfo?.icon;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Price Tracker</h2>
          <p className="text-sm text-gray-500">เห็ดหูหนู · Wood Ear</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <a href={TALAADTHAI_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 border-2 border-gray-200 bg-white text-gray-600 px-3 py-3 rounded-xl text-sm font-semibold hover:border-mushroom-400 hover:text-mushroom-600 transition-colors"
            title="Open talaadthai.com">
            <ExternalLink size={16} />
          </a>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-mushroom-600 text-white px-4 py-3 rounded-xl font-semibold text-sm hover:bg-mushroom-700 transition-colors">
            <Plus size={18} />
            Record
          </button>
        </div>
      </div>

      {/* Manual entry form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold text-gray-700">Manual Price Entry</p>
            <a href={TALAADTHAI_URL} target="_blank" rel="noopener noreferrer"
              className="text-xs text-mushroom-600 underline flex items-center gap-1">
              Check talaadthai.com <ExternalLink size={11} />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Low ฿/kg <span className="text-red-500">*</span></label>
              <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="60"
                value={priceLow} onChange={e => setPriceLow(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-xl font-bold focus:outline-none focus:border-mushroom-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">High ฿/kg <span className="text-red-500">*</span></label>
              <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="80"
                value={priceHigh} onChange={e => setPriceHigh(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-xl font-bold focus:outline-none focus:border-mushroom-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-mushroom-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Note</label>
              <input type="text" placeholder="optional" value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-mushroom-500" />
            </div>
          </div>

          {formErr && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">⚠️ {formErr}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-xl bg-mushroom-600 text-white font-bold hover:bg-mushroom-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Scraper hint */}
      <div className="bg-mushroom-50 border border-mushroom-200 rounded-xl px-4 py-3 text-xs text-mushroom-700">
        <p className="font-semibold mb-0.5">Auto-import from Talaad Thai</p>
        <p className="font-mono bg-white/70 rounded px-2 py-1 mt-1 select-all">
          node scripts/scrape-price.mjs --history
        </p>
        <p className="mt-1 text-mushroom-500">Run once to backfill 365 days · then daily for today's price</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">⚠️ {error}</div>}

      {/* Window tabs */}
      <div className="flex gap-2">
        {[{l:'30d',v:30},{l:'90d',v:90},{l:'180d',v:180},{l:'1yr',v:365}].map(o => (
          <button key={o.v} onClick={() => setDays(o.v)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
              days === o.v ? 'bg-mushroom-600 text-white border-mushroom-600'
                           : 'bg-white text-gray-500 border-gray-200 hover:border-mushroom-300'
            }`}>{o.l}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">📈</p>
          <p className="text-lg font-medium">No price data yet</p>
          <p className="text-sm">Run the scraper or tap <strong>Record</strong> to add manually</p>
        </div>
      ) : forecast && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-4">
              <p className="text-xs text-gray-500 font-semibold">Today's Range</p>
              <p className="text-xl font-bold text-gray-800 mt-0.5">
                {thb(forecast.currentLow)} – {thb(forecast.currentHigh)}
              </p>
              <p className="text-xs text-gray-400">per kg (low – high)</p>
            </div>
            <div className={`border-2 rounded-2xl p-4 ${trendInfo?.bg}`}>
              <p className={`text-xs font-semibold ${trendInfo?.color}`}>Trend ({days}d)</p>
              <div className={`flex items-center gap-1 mt-0.5 ${trendInfo?.color}`}>
                {TrendIcon && <TrendIcon size={20} />}
                <p className="text-xl font-bold">{trendInfo?.label}</p>
              </div>
              <p className={`text-xs mt-0.5 ${trendInfo?.color}`}>
                {forecast.trendPct > 0 ? '+' : ''}{forecast.trendPct}%
              </p>
            </div>
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-4">
              <p className="text-xs text-gray-500 font-semibold">Period Avg / Range</p>
              <p className="text-base font-bold text-gray-800 mt-0.5">{thb(forecast.avgMid)}</p>
              <p className="text-xs text-gray-400">{thb(forecast.minLow)} – {thb(forecast.maxHigh)}</p>
            </div>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
              <p className="text-xs text-amber-600 font-semibold">Forecast</p>
              <p className="text-sm font-bold text-amber-800 mt-0.5">
                7d: {thb(forecast.forecastNext7Low)}–{thb(forecast.forecastNext7High)}
              </p>
              <p className="text-xs text-amber-600">
                30d: {thb(forecast.forecastNext30Low)}–{thb(forecast.forecastNext30High)}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-1">Price History & Forecast</h3>
            <p className="text-xs text-gray-400 mb-3">Green band = market range · Brown = midpoint · Orange = MA7 · Dashed = forecast</p>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `฿${v}`} domain={['auto', 'auto']} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {/* Price band */}
                <Area type="monotone" dataKey="high" name="High" stroke="none" fill="#bbf7d0" fillOpacity={0.6} legendType="none" />
                <Area type="monotone" dataKey="low"  name="Low"  stroke="none" fill="#f5f5f0" fillOpacity={1}   legendType="none" />
                {/* Midpoint */}
                <Line type="monotone" dataKey="mid" name="Mid" stroke="#7d5c37" strokeWidth={2} dot={false} connectNulls={false} />
                {/* MA7 */}
                <Line type="monotone" dataKey="ma7" name="MA7" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls />
                {/* Forecast */}
                <Line type="monotone" dataKey="forecastMid" name="Forecast" stroke="#7d5c37"
                  strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: '#fff', stroke: '#7d5c37' }} connectNulls={false} />
                {records.length > 0 && (
                  <ReferenceLine x={fmtDate(records[records.length - 1].recorded_date)}
                    stroke="#d1d5db" strokeDasharray="4 2"
                    label={{ value: 'Latest', fontSize: 9, fill: '#9ca3af', position: 'top' }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* History list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              History <span className="text-xs text-gray-400 font-normal">{records.length} records</span>
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...records].reverse().map(r => (
                <div key={r.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">
                      {thb(r.price_low)} – {thb(r.price_high)}
                      <span className="text-gray-400 font-normal text-xs"> /kg</span>
                    </p>
                    <p className="text-xs text-gray-400">{r.source}{r.notes ? ` · ${r.notes}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-gray-400 flex-shrink-0">
                      {format(parseISO(r.recorded_date), 'dd MMM yy')}
                    </p>
                    <button onClick={() => handleDelete(r.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
