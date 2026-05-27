import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { texts } = await request.json() as { texts: string[] };

  if (!Array.isArray(texts) || texts.length === 0) {
    return NextResponse.json({ translations: [] });
  }

  const results = await Promise.all(
    texts.map(async (text) => {
      if (!text?.trim()) return "";
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|sq`;
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json() as { responseData?: { translatedText?: string } };
        return data?.responseData?.translatedText ?? "";
      } catch {
        return "";
      }
    })
  );

  return NextResponse.json({ translations: results });
}
