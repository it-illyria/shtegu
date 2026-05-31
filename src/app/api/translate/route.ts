import { NextResponse } from "next/server";

const MAX_TEXTS = 20;
const MAX_LEN = 500;
const CONCURRENCY = 5;

async function mapLimit<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const texts = (body as { texts?: unknown })?.texts;

  if (!Array.isArray(texts)) {
    return NextResponse.json({ error: "texts must be an array" }, { status: 400 });
  }

  if (texts.length === 0) {
    return NextResponse.json({ translations: [] });
  }

  if (texts.length > MAX_TEXTS) {
    return NextResponse.json({ error: "too many strings" }, { status: 413 });
  }

  for (const t of texts) {
    if (typeof t !== "string") {
      return NextResponse.json({ error: "all entries must be strings" }, { status: 400 });
    }
    if (t.length > MAX_LEN) {
      return NextResponse.json({ error: "string too long" }, { status: 413 });
    }
  }

  const results = await mapLimit(texts as string[], CONCURRENCY, async (text) => {
    if (!text?.trim()) return "";
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|sq`;
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as { responseData?: { translatedText?: string } };
      return data?.responseData?.translatedText ?? "";
    } catch {
      return "";
    }
  });

  return NextResponse.json({ translations: results });
}
