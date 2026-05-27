"use client";

import { useEffect, useState } from "react";
import { getTrailheadWeather, type TrailheadWeather } from "@/lib/weather";
import { useI18n, interp } from "@/lib/i18n/context";

export default function WeatherWidget({ trailhead }: { trailhead: [number, number] }) {
  const { lang, t } = useI18n();
  const [weather, setWeather] = useState<TrailheadWeather | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    void (async () => {
      const result = await getTrailheadWeather(trailhead, controller.signal);
      if (controller.signal.aborted) return;
      if (result) { setWeather(result); setStatus("ready"); }
      else setStatus("error");
    })();
    return () => controller.abort();
  }, [trailhead]);

  if (status === "loading" || status === "error" || !weather) {
    return (
      <div
        className="mt-2 rounded-xl border p-4 text-sm"
        style={{ borderColor: "var(--card-border)", color: "var(--text-muted)" }}
      >
        {status === "loading" ? t.loadingWeather : t.weatherUnavailable}
      </div>
    );
  }

  const { current, daily } = weather;

  function dayName(iso: string, index: number): string {
    if (index === 0) return t.weatherToday;
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang === "sq" ? "sq-AL" : "en-GB", { weekday: "short" });
  }

  function weatherLabel(item: { label: string; labelSq: string }): string {
    return lang === "sq" ? item.labelSq : item.label;
  }

  return (
    <div
      className="mt-2 rounded-xl border p-4"
      style={{ borderColor: "var(--card-border)" }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-2xl leading-none" aria-hidden>{current.emoji}</span>
        <span className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          {Math.round(current.temperatureC)}°C
        </span>
        <span className="text-sm" style={{ color: "var(--text-primary)" }}>
          {weatherLabel(current)}
        </span>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          · {interp(t.weatherWind, { kph: Math.round(current.windKph) })}
        </span>
      </div>

      <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {daily.map((day, i) => (
          <li
            key={day.date}
            className="rounded-lg p-2 text-center"
            style={{ background: "var(--surface-inset)" }}
          >
            <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              {dayName(day.date, i)}
            </div>
            <div className="mt-1 text-2xl leading-none" aria-hidden>{day.emoji}</div>
            <div className="mt-1 text-sm">
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                {Math.round(day.maxC)}°
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                {" / "}{Math.round(day.minC)}°
              </span>
            </div>
            <div className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
              {day.precipMm.toFixed(1)} mm
            </div>
            <div className="sr-only">{weatherLabel(day)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
