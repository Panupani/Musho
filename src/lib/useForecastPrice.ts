import { useEffect, useState } from 'react';
import { fetchPrices, buildForecast } from './prices';

export interface ForecastPriceInfo {
  mid: number;        // rounded midpoint of 7-day forecast
  low: number;
  high: number;
  loading: boolean;
}

const FALLBACK = 120;

export function useForecastPrice(): ForecastPriceInfo {
  const [info, setInfo] = useState<ForecastPriceInfo>({ mid: FALLBACK, low: FALLBACK, high: FALLBACK, loading: true });

  useEffect(() => {
    fetchPrices(90)
      .then(records => {
        const fc = buildForecast(records);
        const low  = fc.forecastNext7Low;
        const high = fc.forecastNext7High;
        const mid  = Math.round((low + high) / 2);
        setInfo({ mid: mid > 0 ? mid : FALLBACK, low, high, loading: false });
      })
      .catch(() => setInfo({ mid: FALLBACK, low: FALLBACK, high: FALLBACK, loading: false }));
  }, []);

  return info;
}
