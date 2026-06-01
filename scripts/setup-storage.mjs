/**
 * Creates or UPDATES the Supabase Storage bucket required for trail photos.
 *
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/setup-storage.mjs
 *
 * Pass --yes (or --force) for non-interactive (CI) runs.
 *
 * Requires the service-role key (not the anon key) so it can bypass RLS.
 * Never commit or expose the service-role key.
 */

import readline from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing env vars. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY before running."
  );
  process.exit(1);
}

// --- Env-target confirmation (RT5-H1) -------------------------------------
// Mutating the live bucket's MIME allowlist / size cap is destructive in the
// sense that it overrides whatever was last set via the Supabase dashboard.
// Force the operator to eyeball the target URL before proceeding. CI/scripted
// callers can bypass with --yes or --force.
const argv = new Set(process.argv.slice(2));
const skipConfirm = argv.has("--yes") || argv.has("--force");

if (!skipConfirm) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = await rl.question(`Target Supabase URL: ${url}\nType 'yes' to continue: `);
  rl.close();
  if (ans.trim().toLowerCase() !== "yes") {
    console.log("Aborted.");
    process.exit(1);
  }
}

const supabase = createClient(url, key);

const BUCKET = "trail-photos";

// SVG and HEIC excluded — SVG carries XSS (script execution at *.supabase.co
// origin), HEIC has had image-parser CVEs (CVE-2023-4863 family). iOS Safari
// transcodes HEIC → JPEG on upload by default, so excluding it doesn't hurt UX.
const BUCKET_CONFIG = {
  public: true,             // allow public GET (anyone can view photos)
  fileSizeLimit: 5_242_880, // 5 MB per file
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
};

const { data: existing } = await supabase.storage.getBucket(BUCKET);

if (existing) {
  // Bucket already exists — UPDATE it so the live MIME allowlist / size cap
  // match this script's intent. Without this step, an older dashboard config
  // (e.g. one that still permits image/svg+xml or image/heic) would silently
  // remain in effect.
  const { error } = await supabase.storage.updateBucket(BUCKET, BUCKET_CONFIG);
  if (error) {
    console.error("Failed to update bucket:", error.message);
    process.exit(1);
  }
  console.log(`Bucket "${BUCKET}" updated — MIME allowlist and size cap synced.`);
  process.exit(0);
}

const { error } = await supabase.storage.createBucket(BUCKET, BUCKET_CONFIG);

if (error) {
  console.error("Failed to create bucket:", error.message);
  process.exit(1);
}

console.log(`Bucket "${BUCKET}" created successfully.`);
console.log("");
console.log("Next step: in Supabase Storage → Policies, add a policy:");
console.log('  INSERT: authenticated users (auth.role() = \'authenticated\')');
console.log('  SELECT: public (true)');
