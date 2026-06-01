"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/lib/i18n/context";

const BUCKET = "trail-photos";
// Client-side cap. This is advisory only — an attacker can bypass it via
// DevTools, so the *real* enforcement lives in the Supabase Storage bucket
// settings ("Max file size: 5 MB", "Allowed MIME types: image/*") and in the
// DB CHECK constraint that bounds storage_path extension (migration 0015).
// 4 MB matches typical mobile-camera JPEGs and keeps uploads fast.
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const MAX_DISPLAY = 8;

function safeRandomId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().slice(0, 12);
    }
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
    }
  } catch {}
  // Last-ditch fallback (non-cryptographic). Acceptable here because the path
  // also includes the user's auth uid + sanitized filename; this is only a
  // bucket-key uniqueness aid, not a security boundary.
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 12);
}

class ExifStripUnsupportedError extends Error {
  constructor() { super("ExifStripUnsupported"); this.name = "ExifStripUnsupportedError"; }
}

interface PhotoRow {
  id: string;
  storage_path: string;
  uploader_name: string;
  caption: string | null;
  created_at: string;
}

function photoUrl(path: string): string {
  if (!supabase) return "";
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Sanitize uploaded filename before composing the storage path. Strips path
// separators, C0/C1 controls, bidi/zero-width codepoints, and anything outside
// a safe ASCII filename charset. Forces a known image extension if missing.
// Prevents bidi/RTL spoofing, NUL truncation, and traversal via "../" in the
// filename portion of trail_photos.storage_path.
// Strip EXIF (including GPS) metadata by re-encoding through a canvas before
// upload. The bitmap pipeline drops all non-pixel metadata. If decoding fails
// (e.g. unsupported format on older browsers), throw ExifStripUnsupportedError
// so the caller can surface a clear message rather than silently uploading
// metadata-bearing originals.
async function stripExif(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ExifStripUnsupportedError();
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), file.type, 0.92),
    );
    if (!blob) throw new ExifStripUnsupportedError();
    return new File([blob], file.name, { type: file.type, lastModified: Date.now() });
  } catch {
    throw new ExifStripUnsupportedError();
  }
}

function sanitizeFilename(name: string): string {
  const ext = (name.match(/\.(jpe?g|png|webp)$/i)?.[0] || ".jpg").toLowerCase();
  const base = name
    .replace(/\.(jpe?g|png|webp)$/i, "")                // drop ext
    .normalize("NFKC")                                   // fold compat chars
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "")               // C0/C1 controls
    .replace(/[؜‎‏‪-‮⁦-⁩​-‍﻿]/g, "") // bidi/ZW
    .replace(/[^A-Za-z0-9._-]+/g, "_")                   // ASCII filename only
    .replace(/_+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")                     // trim
    .slice(0, 64);                                       // length cap
  const safe = base || "photo";
  return `${safe}${ext}`;
}

export default function TrailPhotos({ trailSlug }: { trailSlug: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seed the uploader name from a saved username (any device). Users can edit
  // it freely before uploading. We never use the email prefix here, since
  // photos are public and the email prefix is PII.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("shtegu_username");
      if (saved) setName(saved);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("trail_photos")
      .select("id,storage_path,uploader_name,caption,created_at")
      .eq("trail_slug", trailSlug)
      .order("created_at", { ascending: false })
      .limit(MAX_DISPLAY);
    if (data) setPhotos(data as PhotoRow[]);
  }, [trailSlug]);

  useEffect(() => { void load(); }, [load]);

  if (!isSupabaseConfigured || !supabase) return null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFile = e.target.files?.[0];
    if (!fileInputRef.current) return;
    // Reset so the same file can be re-selected after an error
    fileInputRef.current.value = "";
    if (!rawFile || !supabase) return;

    setError(null);

    if (rawFile.size > MAX_BYTES) {
      setError(t.photosErrorSize);
      return;
    }

    setUploading(true);

    // Strip EXIF (GPS, camera serial, timestamps) before anything touches the
    // network. Done first so the sanitized name + size both reflect the
    // re-encoded file. If the browser can't re-encode, fail loudly rather than
    // upload an original with embedded GPS.
    let file: File;
    try {
      file = await stripExif(rawFile);
    } catch (err) {
      if (err instanceof ExifStripUnsupportedError) {
        setError(t.photoExifStripUnsupported);
      } else {
        setError(t.photosErrorUpload);
      }
      setUploading(false);
      return;
    }

    // Ensure we have a session (anonymous if needed)
    let userId = user?.id;
    if (!userId) {
      const { data: sessionData } = await supabase.auth.getSession();
      userId = sessionData.session?.user?.id;
    }
    if (!userId) {
      const { data, error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError || !data.user) {
        setError(t.photosErrorUpload);
        setUploading(false);
        return;
      }
      userId = data.user.id;
    }

    const cleanName = sanitizeFilename(file.name);
    // Random suffix (not Date.now()) so storage paths aren't enumerable by
    // guessing timestamps. 12 hex chars from a UUID = ~48 bits of entropy.
    const randomId = safeRandomId();
    const storagePath = `${trailSlug}/${randomId}-${cleanName}`;
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { upsert: false });

    if (storageError) {
      setError(t.photosErrorUpload);
      setUploading(false);
      return;
    }

    const uploaderName = name.trim() || t.reviewsAnonymous;
    try { localStorage.setItem("shtegu_username", uploaderName); } catch {}

    const { error: dbError } = await supabase.from("trail_photos").insert({
      trail_slug: trailSlug,
      uploader_id: userId,
      uploader_name: uploaderName,
      storage_path: storagePath,
    });

    if (dbError) {
      // Best-effort: remove the orphaned storage object
      void supabase.storage.from(BUCKET).remove([storagePath]);
      setError(t.photosErrorUpload);
      setUploading(false);
      return;
    }

    setUploading(false);
    await load();
  }

  return (
    <div className="mt-3">
      {/* Uploader name (saved to localStorage; never derived from email) */}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t.reviewsNamePlaceholder}
        maxLength={60}
        className="mb-2 w-full rounded-lg border px-3 py-1.5 text-sm sm:max-w-xs"
        style={{
          borderColor: "var(--input-border)",
          background: "var(--input-bg)",
          color: "var(--input-text)",
        }}
      />

      {/* Upload row */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
          disabled={uploading}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
          style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}
          onMouseEnter={(e) => {
            if (!uploading)
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--btn-primary-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--btn-primary)";
          }}
        >
          {uploading ? t.photosUploading : `+ ${t.photosUpload}`}
        </button>
        {error && (
          <span className="text-xs" style={{ color: "var(--danger-text)" }}>
            {error}
          </span>
        )}
      </div>

      {/* Photo grid / empty state */}
      {photos.length === 0 ? (
        <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
          {t.photosNone}
        </p>
      ) : (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative flex-shrink-0"
              style={{ width: 140, height: 140 }}
              onMouseEnter={() => setHoveredId(photo.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl(photo.storage_path)}
                alt={photo.caption ?? photo.uploader_name}
                className="h-full w-full rounded-xl object-cover"
                loading="lazy"
              />
              {/* Hover overlay */}
              {hoveredId === photo.id && (
                <div
                  className="absolute inset-0 flex flex-col justify-end rounded-xl p-2"
                  style={{ background: "rgba(0,0,0,0.55)" }}
                >
                  <p
                    className="truncate text-[11px] font-semibold leading-tight text-white"
                  >
                    {photo.uploader_name}
                  </p>
                  {photo.caption && (
                    <p
                      className="mt-0.5 line-clamp-2 text-[10px] leading-tight"
                      style={{ color: "rgba(255,255,255,0.85)" }}
                    >
                      {photo.caption}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
