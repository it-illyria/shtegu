"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/lib/i18n/context";

const BUCKET = "trail-photos";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_DISPLAY = 8;

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
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    // Reset so the same file can be re-selected after an error
    fileInputRef.current.value = "";
    if (!file || !supabase) return;

    setError(null);

    if (file.size > MAX_BYTES) {
      setError(t.photosErrorSize);
      return;
    }

    setUploading(true);

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

    const storagePath = `${trailSlug}/${Date.now()}-${file.name}`;
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
