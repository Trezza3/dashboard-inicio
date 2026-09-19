"use client";

import { useCallback, useEffect, useState } from "react";
import { usePersistentState } from "@/lib/use-persistent-state";
import { useVisibleInterval } from "@/lib/use-visible-interval";
import { isRecord } from "@/lib/validate";

export type WeatherLocation = { name: string; lat: number; lon: number };

export type WeatherData = {
  lat: number;
  lon: number;
  fetchedAt: number;
  current: { temp: number; feels: number; humidity: number; rain: number; code: number };
  /** Próximas horas (ISO local, sin zona). */
  hours: { time: string; temp: number; rain: number }[];
  /** Hoy y los dos días siguientes (AAAA-MM-DD). */
  days: { date: string; code: number; max: number; min: number }[];
};

export const DEFAULT_LOCATION: WeatherLocation = { name: "Buenos Aires", lat: -34.61, lon: -58.38 };
export const WEATHER_LOCATION_KEY = "dash-weather-location";
// Última respuesta, para pintar al instante al abrir una pestaña. No va al respaldo.
export const WEATHER_CACHE_KEY = "dash-weather-cache-v1";

const REFRESH_MS = 15 * 60 * 1000;
const CACHE_MAX_AGE_MS = 3 * 60 * 60 * 1000;

export function parseLocation(value: unknown): WeatherLocation | null {
  if (!isRecord(value)) return null;
  const { name, lat, lon } = value;
  if (typeof name !== "string" || !name.trim()) return null;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { name: name.trim().slice(0, 60), lat, lon };
}

function sameSpot(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  return Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01;
}

function readCache(location: WeatherLocation): WeatherData | null {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as WeatherData;
    if (!data?.current || !sameSpot(data, location)) return null;
    if (Date.now() - data.fetchedAt > CACHE_MAX_AGE_MS) return null;
    return data;
  } catch {
    return null;
  }
}

// Una sola request compartida por todos los widgets de la pestaña.
const inflight = new Map<string, Promise<WeatherData>>();

async function requestWeather(location: WeatherLocation): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}` +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,precipitation_probability" +
    "&hourly=temperature_2m,precipitation_probability&forecast_hours=8" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=3&timezone=auto";

  const response = await fetch(url);
  if (!response.ok) throw new Error(`weather-http-${response.status}`);
  const d = await response.json();
  const c = d?.current;
  if (!c) throw new Error("weather-empty");

  const data: WeatherData = {
    lat: location.lat,
    lon: location.lon,
    fetchedAt: Date.now(),
    current: {
      temp: Math.round(c.temperature_2m),
      feels: Math.round(c.apparent_temperature),
      humidity: Math.round(c.relative_humidity_2m),
      rain: Math.round(c.precipitation_probability ?? 0),
      code: c.weather_code,
    },
    hours: (d.hourly?.time ?? []).map((time: string, i: number) => ({
      time,
      temp: Math.round(d.hourly.temperature_2m[i]),
      rain: Math.round(d.hourly.precipitation_probability[i] ?? 0),
    })),
    days: (d.daily?.time ?? []).map((date: string, i: number) => ({
      date,
      code: d.daily.weather_code[i],
      max: Math.round(d.daily.temperature_2m_max[i]),
      min: Math.round(d.daily.temperature_2m_min[i]),
    })),
  };

  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
  return data;
}

function fetchWeather(location: WeatherLocation): Promise<WeatherData> {
  const key = `${location.lat},${location.lon}`;
  const pending = inflight.get(key);
  if (pending) return pending;
  const promise = requestWeather(location).finally(() => {
    // Se libera un rato después para que los widgets que montan juntos compartan.
    window.setTimeout(() => inflight.delete(key), 5_000);
  });
  inflight.set(key, promise);
  return promise;
}

export function useWeatherLocation() {
  return usePersistentState<WeatherLocation>(WEATHER_LOCATION_KEY, {
    initial: DEFAULT_LOCATION,
    parse: parseLocation,
  });
}

/** Clima de la ubicación elegida, refrescado cada 15 min con la pestaña visible. */
export function useWeather() {
  const [location, , loaded] = useWeatherLocation();
  const [data, setData] = useState<WeatherData | null>(null);
  const { lat, lon, name } = location;

  // Pintado instantáneo con la última respuesta guardada.
  useEffect(() => {
    if (!loaded) return;
    const t = window.setTimeout(() => {
      const cached = readCache({ name, lat, lon });
      setData((prev) => (prev && sameSpot(prev, { lat, lon }) ? prev : cached));
    }, 0);
    return () => window.clearTimeout(t);
  }, [loaded, lat, lon, name]);

  const load = useCallback(() => {
    fetchWeather({ name, lat, lon })
      .then((next) => {
        if (sameSpot(next, { lat, lon })) setData(next);
      })
      .catch(() => {});
  }, [lat, lon, name]);

  useVisibleInterval(load, REFRESH_MS, loaded);

  return { location, data };
}

export type PlaceResult = WeatherLocation & { detail: string };

/** Busca ciudades con la API de geocoding de Open-Meteo (sin clave). */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=es&format=json`,
    { signal },
  );
  if (!response.ok) return [];
  const data = (await response.json()) as {
    results?: { name: string; latitude: number; longitude: number; admin1?: string; country?: string }[];
  };
  return (data.results ?? []).map((r) => ({
    name: r.name,
    lat: Math.round(r.latitude * 100) / 100,
    lon: Math.round(r.longitude * 100) / 100,
    detail: [r.admin1, r.country].filter(Boolean).join(", "),
  }));
}
