import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import type { TrailProposal, TrailContribution } from "@/lib/types";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: "Admin — Shtegu",
};

const ADMIN_EMAILS = ["juni.93.juni@gmail.com"];

export default async function AdminPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <div
          className="rounded-2xl p-8 text-center max-w-md w-full"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            Supabase not configured
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your <code>.env.local</code> to
            use the admin panel.
          </p>
        </div>
      </main>
    );
  }

  const supabase = createClient(url, anonKey);

  // Get the current user's session from cookies. Since this is a server component
  // and we only have the anon client, we rely on client-side auth state being
  // refreshed. For the auth check we use getUser() which validates via the
  // Supabase auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <div
          className="rounded-2xl p-8 text-center max-w-md w-full"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            403 — Not authorized
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            You do not have permission to access this page.
          </p>
        </div>
      </main>
    );
  }

  // Fetch pending proposals
  const { data: proposals } = await supabase
    .from("trail_proposals")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Fetch pending contributions
  const { data: contributions } = await supabase
    .from("trail_contributions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Map snake_case DB rows to camelCase TS types
  function mapProposal(row: Record<string, unknown>): TrailProposal {
    return {
      id: row.id as string,
      contributorId: row.contributor_id as string | null,
      contributorName: row.contributor_name as string,
      status: row.status as TrailProposal["status"],
      notes: row.notes as string | null,
      name: row.name as string,
      nameSq: row.name_sq as string | null,
      region: row.region as string,
      difficulty: row.difficulty as TrailProposal["difficulty"],
      summary: row.summary as string | null,
      distanceKm: row.distance_km as number | null,
      ascentM: row.ascent_m as number | null,
      durationH: row.duration_h as number | null,
      bestMonths: row.best_months as string | null,
      logistics: row.logistics as string[] | null,
      routeGeojson: row.route_geojson as TrailProposal["routeGeojson"],
      createdAt: row.created_at as string,
    };
  }

  function mapContribution(row: Record<string, unknown>): TrailContribution {
    return {
      id: row.id as string,
      trailSlug: row.trail_slug as string,
      contributorId: row.contributor_id as string | null,
      contributorName: row.contributor_name as string,
      status: row.status as TrailContribution["status"],
      message: row.message as string | null,
      name: row.name as string | null,
      nameSq: row.name_sq as string | null,
      region: row.region as string | null,
      summary: row.summary as string | null,
      difficulty: row.difficulty as TrailContribution["difficulty"],
      distanceKm: row.distance_km as number | null,
      ascentM: row.ascent_m as number | null,
      durationH: row.duration_h as number | null,
      bestMonths: row.best_months as string | null,
      logistics: row.logistics as string[] | null,
      routeGeojson: row.route_geojson as TrailContribution["routeGeojson"],
      createdAt: row.created_at as string,
    };
  }

  const mappedProposals: TrailProposal[] = (proposals ?? []).map(mapProposal);
  const mappedContributions: TrailContribution[] = (contributions ?? []).map(mapContribution);

  return (
    <AdminClient
      initialProposals={mappedProposals}
      initialContributions={mappedContributions}
    />
  );
}
