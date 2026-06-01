/**
 * Creates the Supabase Storage bucket required for trail photos.
 *
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/setup-storage.mjs
 *
 * Requires the service-role key (not the anon key) so it can bypass RLS.
 * Never commit or expose the service-role key.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running."
  );
  process.exit(1);
}

const supabase = createClient(url, key);

const BUCKET = "trail-photos";

const { data: existing } = await supabase.storage.getBucket(BUCKET);
if (existing) {
  console.log(`Bucket "${BUCKET}" already exists — nothing to do.`);
  process.exit(0);
}

// SVG and HEIC excluded — SVG carries XSS (script execution at *.supabase.co
// origin), HEIC has had image-parser CVEs (CVE-2023-4863 family). iOS Safari
// transcodes HEIC → JPEG on upload by default, so excluding it doesn't hurt UX.
const { error } = await supabase.storage.createBucket(BUCKET, {
  public: true,             // allow public GET (anyone can view photos)
  fileSizeLimit: 5_242_880, // 5 MB per file
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
});

if (error) {
  console.error("Failed to create bucket:", error.message);
  process.exit(1);
}

console.log(`Bucket "${BUCKET}" created successfully.`);
console.log("");
console.log("Next step: in Supabase Storage → Policies, add a policy:");
console.log('  INSERT: authenticated users (auth.role() = \'authenticated\')');
console.log('  SELECT: public (true)');
