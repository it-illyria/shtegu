import { NextRequest } from "next/server";

// CSP violation reporting sink. Browsers POST here in two formats:
//   - Legacy `report-uri`:   application/csp-report  → { "csp-report": {...} }
//   - Modern `report-to`:    application/reports+json → [ { type, body, ... } ]
// We log via console.warn (picked up by Vercel runtime logs) and return 204.
// No DB write, no auth — endpoint is intentionally tiny and side-effect free.
//
// PRIVACY: CSP report URL fields can contain query strings or fragments that
// carry user-typed search terms, magic-link tokens, or other callback state.
// Operator-visible runtime logs must not retain that. We strip query + fragment
// from every URL field and cap field length before logging.

function sanitizeUrl(u: unknown): string {
  if (typeof u !== "string") return "";
  try {
    const p = new URL(u);
    return (p.origin + p.pathname).slice(0, 200);
  } catch {
    return u.replace(/[\x00-\x1f\x7f-\x9f]/g, "").slice(0, 60);
  }
}

type RawReport = Record<string, unknown>;

function sanitizeReport(r: RawReport | undefined): RawReport {
  if (!r || typeof r !== "object") return {};
  return {
    "document-uri": sanitizeUrl(r["document-uri"]),
    referrer: sanitizeUrl(r["referrer"]),
    "blocked-uri": sanitizeUrl(r["blocked-uri"]),
    "source-file": sanitizeUrl(r["source-file"]),
    "violated-directive": r["violated-directive"],
    "effective-directive": r["effective-directive"],
    disposition: r["disposition"],
    "status-code": r["status-code"],
    "line-number": r["line-number"],
    "column-number": r["column-number"],
  };
}

function sanitizeBody(body: unknown): unknown {
  // Modern `report-to`: array of { type, body, ... }
  if (Array.isArray(body)) {
    return body.map((entry) => {
      if (entry && typeof entry === "object") {
        const e = entry as Record<string, unknown>;
        return {
          type: e["type"],
          age: e["age"],
          url: sanitizeUrl(e["url"]),
          body: sanitizeReport(e["body"] as RawReport | undefined),
        };
      }
      return null;
    });
  }
  // Legacy `report-uri`: { "csp-report": {...} }
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (b["csp-report"]) {
      return { "csp-report": sanitizeReport(b["csp-report"] as RawReport) };
    }
    return sanitizeReport(b as RawReport);
  }
  return {};
}

export async function POST(request: NextRequest) {
  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > 32_768) return new Response(null, { status: 413 });
  try {
    const body = await request.json();
    console.warn("[CSP-Report]", sanitizeBody(body));
  } catch {
    // Some browsers send empty bodies on certain violations; ignore.
    console.warn("[CSP-Report]", "(unparseable body)");
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
