/**
 * Talaad Thai — Wood Ear Mushroom price scraper
 *
 * Usage:
 *   node scripts/scrape-price.mjs           → fetch today's price only
 *   node scripts/scrape-price.mjs --history → import full history (last 365 days)
 *
 * Requires .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Load .env ─────────────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const lines = readFileSync(resolve(__dir, '../.env'), 'utf8').split('\n');
    for (const line of lines) {
      const eq = line.indexOf('=');
      if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
  } catch { /* no .env, use existing env */ }
}
loadEnv();

// ── Config ────────────────────────────────────────────────────────────────────
const PRODUCT_ID  = 257;          // Wood Ear / เห็ดหูหนู
const API_BASE    = 'https://svc-center-ext-tlt-corp-prod-service.talaadthai.com/v1/ext/product';
const HEADERS     = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept':     'application/json',
  'Referer':    'https://talaadthai.com/',
  'Origin':     'https://talaadthai.com',
};

const supabase = process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  : null;

// ── Fetch price data from API ─────────────────────────────────────────────────
async function fetchPriceRange(fromMs, toMs, sumBy = 'day') {
  const url = `${API_BASE}/ProductPricingGraphSummary?productId=${PRODUCT_ID}&dateFrom=${fromMs}&dateTo=${toMs}&sumBy=${sumBy}`;
  const res  = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const json = await res.json();
  return json.data?.items ?? [];
}

// Parse "dd/MM/yyyy" → "yyyy-MM-dd"
function parseDate(str) {
  const [d, m, y] = str.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// ── Save rows to Supabase ─────────────────────────────────────────────────────
async function saveRows(rows) {
  if (!supabase) {
    console.warn('⚠️  No Supabase credentials — data not saved.');
    return { saved: 0, skipped: 0 };
  }
  const { data, error } = await supabase
    .from('price_records')
    .upsert(rows, { onConflict: 'recorded_date', ignoreDuplicates: false })
    .select('id');
  if (error) throw new Error(error.message);
  return { saved: data?.length ?? rows.length, skipped: 0 };
}

// ── Main ──────────────────────────────────────────────────────────────────────
const historyMode = process.argv.includes('--history');
const now         = Date.now();

let fromMs, label;
if (historyMode) {
  fromMs = now - 365 * 24 * 60 * 60 * 1000;
  label  = 'last 365 days';
} else {
  fromMs = now - 7 * 24 * 60 * 60 * 1000;   // fetch last 7 days to catch today
  label  = 'last 7 days';
}

console.log(`\n🍄 Wood Ear price scraper — ${label}`);
console.log(`📡 API: ${API_BASE}`);
console.log(`🆔 Product ID: ${PRODUCT_ID}\n`);

try {
  const items = await fetchPriceRange(fromMs, now);
  console.log(`✅ Fetched ${items.length} daily records`);

  if (!items.length) { console.log('No data returned.'); process.exit(0); }

  // Preview
  const latest = items[items.length - 1];
  console.log(`\nLatest: ${latest.date}  Low: ฿${latest.low}  High: ฿${latest.high}  Mid: ฿${((latest.low + latest.high) / 2).toFixed(2)}`);

  // Map to Supabase rows
  const rows = items.map(item => ({
    recorded_date: parseDate(item.date),
    price_low:     item.low,
    price_high:    item.high,
    source:        'talaadthai.com (auto)',
    notes:         '',
  }));

  // Show sample
  console.log(`\nSample rows (last 5):`);
  rows.slice(-5).forEach(r =>
    console.log(`  ${r.recorded_date}  ฿${r.price_low} – ฿${r.price_high}`)
  );

  // Save
  const { saved } = await saveRows(rows);
  console.log(`\n✅ Upserted ${saved} rows to Supabase`);

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
