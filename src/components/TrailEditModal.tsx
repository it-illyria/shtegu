"use client";

import { useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useI18n, interp } from "@/lib/i18n/context";
import { parseRouteFile } from "@/lib/gpx-parser";
import type { Trail, Difficulty } from "@/lib/types";
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

interface Props {
  trail: Trail;
  onClose: () => void;
}

export default function TrailEditModal({ trail, onClose }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();

  const [name,       setName]       = useState(trail.name);
  const [nameSq,     setNameSq]     = useState(trail.sq?.name ?? "");
  const [region,     setRegion]     = useState(trail.region);
  const [summary,    setSummary]    = useState(trail.summary);
  const [difficulty, setDifficulty] = useState<Difficulty>(trail.difficulty);
  const [distanceKm, setDistanceKm] = useState(String(trail.distanceKm));
  const [ascentM,    setAscentM]    = useState(String(trail.ascentM));
  const [durationH,  setDurationH]  = useState(String(trail.durationHours));
  const [bestMonths, setBestMonths] = useState(trail.bestMonths);
  const [logistics,  setLogistics]  = useState(trail.logistics.join("\n"));
  const [message,    setMessage]    = useState("");

  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [fileName,    setFileName]    = useState<string | null>(null);
  const [fileError,   setFileError]   = useState(false);

  const [status,   setStatus]   = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const signedIn = Boolean(user && !user.is_anonymous);
  const contributorName =
    signedIn && user?.email ? user.email.split("@")[0] : "Anonymous";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(false);
    setFileName(null);
    setRouteCoords(null);
    const coords = await parseRouteFile(file);
    if (!coords || coords.length < 2) {
      setFileError(true);
    } else {
      setFileName(file.name);
      setRouteCoords(coords);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setStatus("saving");
    setErrorMsg(null);

    const patch: Record<string, unknown> = {
      trail_slug:       trail.slug,
      contributor_id:   user?.id ?? null,
      contributor_name: contributorName,
      message:          message.trim() || null,
    };

    if (name.trim() !== trail.name)              patch.name       = name.trim();
    if (nameSq.trim() !== (trail.sq?.name ?? "")) patch.name_sq   = nameSq.trim() || null;
    if (region.trim() !== trail.region)           patch.region    = region.trim();
    if (summary.trim() !== trail.summary)         patch.summary   = summary.trim();
    if (difficulty !== trail.difficulty)          patch.difficulty = difficulty;

    const dkm = parseFloat(distanceKm);
    if (!isNaN(dkm) && dkm !== trail.distanceKm) patch.distance_km = dkm;
    const am = parseInt(ascentM, 10);
    if (!isNaN(am) && am !== trail.ascentM)       patch.ascent_m  = am;
    const dh = parseFloat(durationH);
    if (!isNaN(dh) && dh !== trail.durationHours) patch.duration_h = dh;

    if (bestMonths.trim() !== trail.bestMonths)   patch.best_months = bestMonths.trim();

    const logArr = logistics.split("\n").map((s) => s.trim()).filter(Boolean);
    if (JSON.stringify(logArr) !== JSON.stringify(trail.logistics)) patch.logistics = logArr;

    if (routeCoords) {
      patch.route_geojson = { type: "LineString", coordinates: routeCoords };
    }

    const { error } = await supabase.from("trail_contributions").insert(patch);
    if (error) {
      setErrorMsg(t.editErrorFail);
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
              <DialogTitle>{t.editModalTitle}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{t.editNoConfig}</p>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>{t.editCancel}</Button>
            </DialogFooter>
          </>
        ) : status === "done" ? (
          <>
            <DialogHeader>
              <DialogTitle>{t.editModalTitle}</DialogTitle>
            </DialogHeader>
            <p className="text-sm">{t.editSuccess}</p>
            <DialogFooter>
              <Button onClick={onClose}>{t.editCancel}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t.editModalTitle}</DialogTitle>
              <DialogDescription>{t.editModalDesc}</DialogDescription>
            </DialogHeader>

            <form onSubmit={submit} className="mt-2 flex flex-col gap-4">
              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-name">{t.editNameLabel}</Label>
                  <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-name-sq">{t.editNameSqLabel}</Label>
                  <Input id="edit-name-sq" value={nameSq} onChange={(e) => setNameSq(e.target.value)} />
                </div>
              </div>

              {/* Region */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-region">{t.editRegionLabel}</Label>
                <Input id="edit-region" value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>

              {/* Summary */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-summary">{t.editSummaryLabel}</Label>
                <Textarea id="edit-summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex flex-col gap-1.5">
                  <Label>{t.editDifficultyLabel}</Label>
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
                  <Label htmlFor="edit-dist">{t.editDistanceLabel}</Label>
                  <Input id="edit-dist" type="number" step="0.1" min="0" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-asc">{t.editAscentLabel}</Label>
                  <Input id="edit-asc" type="number" min="0" value={ascentM} onChange={(e) => setAscentM(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-dur">{t.editDurationLabel}</Label>
                  <Input id="edit-dur" type="number" step="0.5" min="0" value={durationH} onChange={(e) => setDurationH(e.target.value)} />
                </div>
              </div>

              {/* Best months */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-months">{t.editBestMonthsLabel}</Label>
                <Input id="edit-months" value={bestMonths} onChange={(e) => setBestMonths(e.target.value)} />
              </div>

              {/* Logistics */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-logistics">{t.editLogisticsLabel}</Label>
                <Textarea id="edit-logistics" value={logistics} onChange={(e) => setLogistics(e.target.value)} rows={4} className="font-mono" />
              </div>

              {/* Route file */}
              <div className="flex flex-col gap-1.5">
                <Label>{t.editRouteLabel}</Label>
                <p className="text-xs text-muted-foreground">{t.editRouteHint}</p>
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

              {/* Reason */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-message">{t.editMessageLabel}</Label>
                <Textarea
                  id="edit-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t.editMessagePlaceholder}
                  rows={2}
                  maxLength={2000}
                />
              </div>

              {status === "error" && (
                <p className="text-xs text-destructive">{errorMsg ?? t.editErrorFail}</p>
              )}

              <DialogFooter className="pt-1">
                <Button type="button" variant="ghost" onClick={onClose}>{t.editCancel}</Button>
                <Button type="submit" disabled={status === "saving"}>
                  {status === "saving" ? t.editSubmitting : t.editSubmit}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
