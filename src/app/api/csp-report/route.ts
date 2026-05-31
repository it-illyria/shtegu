import { NextRequest } from "next/server";

// CSP violation reporting sink. Browsers POST here in two formats:
//   - Legacy `report-uri`:   application/csp-report  → { "csp-report": {...} }
//   - Modern `report-to`:    application/reports+json → [ { type, body, ... } ]
// We log via console.warn (picked up by Vercel runtime logs) and return 204.
// No DB write, no auth — endpoint is intentionally tiny and side-effect free.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.warn("[CSP-Report]", body);
  } catch {
    // Some browsers send empty bodies on certain violations; ignore.
    console.warn("[CSP-Report]", "(unparseable body)");
  }
  return new Response(null, { status: 204 });
}
