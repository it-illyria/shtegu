"use client";

const MONTH_NAMES = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
];
const MONTH_LABELS = ["J","F","M","A","M","J","J","A","S","O","N","D"];

function parseSeasonMonths(bestMonths: string): Set<number> {
  if (!bestMonths || bestMonths === "TODO") return new Set();
  const lower = bestMonths.toLowerCase();
  if (lower.includes("year-round") || lower.includes("all year")) {
    return new Set([0,1,2,3,4,5,6,7,8,9,10,11]);
  }
  // Only look at the primary range, ignore parenthetical exceptions
  const main = lower.split("(")[0];
  const found: number[] = [];
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (main.includes(MONTH_NAMES[i])) found.push(i);
  }
  if (found.length === 0) return new Set();
  if (found.length === 1) return new Set(found);
  const start = found[0];
  const end = found[found.length - 1];
  const active = new Set<number>();
  if (start <= end) {
    for (let i = start; i <= end; i++) active.add(i);
  } else {
    // Wrap-around range, e.g. November–March
    for (let i = start; i <= 11; i++) active.add(i);
    for (let i = 0; i <= end; i++) active.add(i);
  }
  return active;
}

export default function SeasonCalendar({ bestMonths }: { bestMonths: string }) {
  const active = parseSeasonMonths(bestMonths);
  if (active.size === 0) {
    const isPlaceholder = !bestMonths || /^todo$/i.test(bestMonths.trim());
    return <span className="text-sm" style={{ color: "var(--text-muted)" }}>{isPlaceholder ? "—" : bestMonths}</span>;
  }
  return (
    <div className="grid grid-cols-12 gap-0.5 w-full" aria-label={`Season: ${bestMonths}`}>
      {MONTH_LABELS.map((label, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 min-w-0">
          <div
            className="aspect-square w-full rounded-sm"
            style={{
              background: active.has(i) ? "var(--summit-green)" : "var(--surface-inset)",
              opacity: active.has(i) ? 1 : 0.5,
            }}
          />
          <span
            className="text-[9px] font-medium leading-none"
            style={{ color: active.has(i) ? "var(--summit-green)" : "var(--text-muted)" }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
