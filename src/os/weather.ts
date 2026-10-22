export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  wind: number;
  code: number;
  isDay: boolean;
  uv: number;
  fetchedAt: number;
  city: string;
}

const CACHE_KEY = "origintv-weather-cache";
const CACHE_TTL = 10 * 60 * 1000;

export async function fetchWeather(
  lat: number,
  lon: number,
  city: string,
): Promise<WeatherData> {
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as WeatherData;
        if (
          Date.now() - cached.fetchedAt < CACHE_TTL &&
          cached.city === city
        ) {
          return cached;
        }
      }
    } catch {
      /* cache miss */
    }
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m` +
    `&hourly=uv_index&forecast_days=2&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather unavailable");
  const json = await res.json();

  const nowHour = new Date();
  const times: string[] = json.hourly?.times ?? [];
  let uv = 0;
  const stamp = `${nowHour.getFullYear()}-${String(nowHour.getMonth() + 1).padStart(2, "0")}-${String(nowHour.getDate()).padStart(2, "0")}T${String(nowHour.getHours()).padStart(2, "0")}:00`;
  const idx = times.indexOf(stamp);
  if (idx >= 0) uv = Math.round((json.hourly?.uv_index?.[idx] ?? 0) * 10) / 10;

  const data: WeatherData = {
    temp: Math.round(json.current?.temperature_2m ?? 0),
    feelsLike: Math.round(json.current?.apparent_temperature ?? 0),
    humidity: Math.round(json.current?.relative_humidity_2m ?? 0),
    wind: Math.round(json.current?.wind_speed_10m ?? 0),
    code: json.current?.weather_code ?? 0,
    isDay: (json.current?.is_day ?? 1) === 1,
    uv,
    fetchedAt: Date.now(),
    city,
  };

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }
  return data;
}

export async function geocodeCity(query: string): Promise<{
  name: string;
  lat: number;
  lon: number;
} | null> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`,
  );
  if (!res.ok) return null;
  const json = await res.json();
  const hit = json.results?.[0];
  if (!hit) return null;
  return { name: hit.name, lat: hit.latitude, lon: hit.longitude };
}
