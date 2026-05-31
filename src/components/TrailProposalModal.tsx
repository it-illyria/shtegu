"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useI18n, interp } from "@/lib/i18n/context";
import { parseRouteFile } from "@/lib/gpx-parser";
import type { Difficulty } from "@/lib/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const REGIONS = [
  "Rajoni Verior & Verilindor",
  "Rajoni Perëndimor",
  "Rajoni Juglindor",
  "Rajoni Jugor",
] as const;

interface Props {
  onClose: () => void;
}

export default function TrailProposalModal({ onClose }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();

  const [name,       setName]       = useState("");
  const [nameSq,     setNameSq]     = useState("");
  const [region,     setRegion]     = useState<string>(REGIONS[0]);
  const [summary,    setSummary]    = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("moderate");
  const [distanceKm, setDistanceKm] = useState("");
  const [ascentM,    setAscentM]    = useState("");
  const [durationH,  setDurationH]  = useState("");
  const [bestMonths, setBestMonths] = useState("");
  const [logistics,  setLogistics]  = useState("");
  const [notes,      setNotes]      = useState("");
  const [authorName, setAuthorName] = useState("");

  // Seed username from localStorage (any device). Never derive from email — that
  // would leak PII into the public trail_proposals row.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("shtegu_username");
      if (saved) setAuthorName(saved);
    } catch {}
  }, []);

  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [fileName,    setFileName]    = useState<string | null>(null);
  const [fileError,   setFileError]   = useState(false);

  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(false);
    setFileName(null);
    setRouteCoords(null);
    let coords: [number, number][] | null = null;
    try {
      coords = await parseRouteFile(file);
    } catch {
      // Includes "file too large" (>5 MB). Surface via existing error state;
      // user sees t.editRouteError ("Couldn't read this file — try a .gpx…").
      setFileError(true);
      return;
    }
    if (!coords || coords.length < 2) {
      setFileError(true);
    } else {
      setFileName(file.name);
      setRouteCoords(coords);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !name.trim()) return;
    setStatus("saving");

    const contributorName = authorName.trim() || t.reviewsAnonymous;
    try { localStorage.setItem("shtegu_username", contributorName); } catch {}

    const logArr = logistics.split("\n").map((s) => s.trim()).filter(Boolean);

    // Auto-translate name and summary to Albanian if not provided
    let resolvedNameSq = nameSq.trim();
    let resolvedSummarySq = "";
    const toTranslate: string[] = [];
    const needsName    = !resolvedNameSq && !!name.trim();
    const needsSummary = !!summary.trim();

    if (needsName)    toTranslate.push(name.trim());
    if (needsSummary) toTranslate.push(summary.trim());

    if (toTranslate.length > 0) {
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: toTranslate }),
        });
        const data = await res.json() as { translations: string[] };
        let idx = 0;
        if (needsName    && data.translations[idx]) resolvedNameSq    = data.translations[idx++];
        if (needsSummary && data.translations[idx]) resolvedSummarySq = data.translations[idx];
      } catch {
        // translation failed — continue without sq fields
      }
    }

    const row: Record<string, unknown> = {
      contributor_id:   user?.id ?? null,
      contributor_name: contributorName,
      name:             name.trim(),
      region:           region.trim(),
      difficulty,
      notes:            notes.trim() || null,
    };

    if (resolvedNameSq)         row.name_sq     = resolvedNameSq;
    if (summary.trim())         row.summary     = summary.trim();
    if (resolvedSummarySq)      row.summary_sq  = resolvedSummarySq;
    if (bestMonths.trim())      row.best_months = bestMonths.trim();
    if (logArr.length)          row.logistics   = logArr;

    const dkm = parseFloat(distanceKm);
    if (!isNaN(dkm) && dkm > 0) row.distance_km = dkm;
    const am = parseInt(ascentM, 10);
    if (!isNaN(am) && am > 0)   row.ascent_m    = am;
    const dh = parseFloat(durationH);
    if (!isNaN(dh) && dh > 0)   row.duration_h  = dh;

    if (routeCoords) {
      row.route_geojson = { type: "LineString", coordinates: routeCoords };
    }

    const { error } = await supabase.from("trail_proposals").insert(row);
    if (error) {
      setStatus("error");
      return;
    }
    setStatus("done");
  }

  const noConfig = !isSupabaseConfigured || !supabase;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {noConfig ? (
          <>
            <DialogHeader>
              <DialogTitle>{t.proposeModalTitle}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{t.editNoConfig}</p>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>{t.editCancel}</Button>
            </DialogFooter>
          </>
        ) : status === "done" ? (
          <>
            <DialogHeader>
              <DialogTitle>{t.proposeModalTitle}</DialogTitle>
            </DialogHeader>
            <p className="text-sm">{t.proposeSuccess}</p>
            <DialogFooter>
              <Button onClick={onClose}>{t.editCancel}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t.proposeModalTitle}</DialogTitle>
              <DialogDescription>{t.proposeModalDesc}</DialogDescription>
            </DialogHeader>

            <form onSubmit={submit} className="mt-2 flex flex-col gap-4">
              {/* Your name (saved locally; never derived from email) */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prop-author">{t.reviewsNamePlaceholder}</Label>
                <Input
                  id="prop-author"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder={t.reviewsNamePlaceholder}
                  maxLength={60}
                />
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prop-name">{t.editNameLabel} *</Label>
                  <Input id="prop-name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prop-name-sq">{t.editNameSqLabel}</Label>
                  <Input id="prop-name-sq" value={nameSq} onChange={(e) => setNameSq(e.target.value)} />
                </div>
              </div>

              {/* Region */}
              <div className="flex flex-col gap-1.5">
                <Label>{t.editRegionLabel} *</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Summary */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prop-summary">{t.editSummaryLabel}</Label>
                <Textarea id="prop-summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex flex-col gap-1.5">
                  <Label>{t.editDifficultyLabel} *</Label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">{t.easy}</SelectItem>
                      <SelectItem value="moderate">{t.moderate}</SelectItem>
                      <SelectItem value="hard">{t.hard}</SelectItem>
                      <SelectItem value="expert">{t.expert}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prop-dist">{t.editDistanceLabel}</Label>
                  <Input id="prop-dist" type="number" step="0.1" min="0" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prop-asc">{t.editAscentLabel}</Label>
                  <Input id="prop-asc" type="number" min="0" value={ascentM} onChange={(e) => setAscentM(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prop-dur">{t.editDurationLabel}</Label>
                  <Input id="prop-dur" type="number" step="0.5" min="0" value={durationH} onChange={(e) => setDurationH(e.target.value)} />
                </div>
              </div>

              {/* Best months */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prop-months">{t.editBestMonthsLabel}</Label>
                <Input id="prop-months" value={bestMonths} onChange={(e) => setBestMonths(e.target.value)} />
              </div>

              {/* Logistics */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prop-logistics">{t.editLogisticsLabel}</Label>
                <Textarea id="prop-logistics" value={logistics} onChange={(e) => setLogistics(e.target.value)} rows={3} className="font-mono" />
              </div>

              {/* Route file */}
              <div className="flex flex-col gap-1.5">
                <Label>{t.editRouteLabel}</Label>
                <p className="text-xs text-muted-foreground">{t.proposeRouteHint}</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".gpx,.kml,.kmz,.tcx,.fit,.geojson,.json"
                  onChange={handleFile}
                  className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary-foreground"
                />
                {fileName && !fileError && (
                  <p className="text-xs text-primary">
                    {interp(t.editRouteParsed, { n: routeCoords?.length ?? 0 })}{" "}
                    {interp(t.editRouteSelected, { name: fileName })}
                  </p>
                )}
                {fileError && (
                  <p className="text-xs text-destructive">{t.editRouteError}</p>
                )}
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prop-notes">{t.proposeNotes}</Label>
                <Textarea
                  id="prop-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.proposeNotesPlaceholder}
                  rows={2}
                  maxLength={2000}
                />
              </div>

              {status === "error" && (
                <p className="text-xs text-destructive">{t.proposeErrorFail}</p>
              )}

              <DialogFooter className="pt-1">
                <Button type="button" variant="ghost" onClick={onClose}>{t.editCancel}</Button>
                <Button type="submit" disabled={status === "saving" || !name.trim()}>
                  {status === "saving" ? t.proposeSubmitting : t.proposeSubmit}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
