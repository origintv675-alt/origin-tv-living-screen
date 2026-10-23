import { useQuery } from "@tanstack/react-query";
import { useOs } from "./store";
import { fetchWeather } from "./weather";

export function useWeather() {
  const { weatherLat, weatherLon, weatherCity } = useOs((s) => s.settings);
  return useQuery({
    queryKey: ["weather", weatherLat, weatherLon, weatherCity],
    queryFn: () => fetchWeather(weatherLat, weatherLon, weatherCity),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}
