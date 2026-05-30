import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTrail, getTrails } from "@/lib/trails-repo";
import TrailView from "@/components/TrailView";

// Cache trail detail pages — trail data rarely changes.
export const revalidate = 3600;

// Prerender known trails at build time; unknown slugs render on demand.
export async function generateStaticParams() {
  const trails = await getTrails();
  return trails.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const trail = await getTrail(slug);
  if (!trail) return { title: "Trail not found — Shtegu" };
  return { title: `${trail.name} — Shtegu`, description: trail.summary };
}

export default async function TrailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trail = await getTrail(slug);
  if (!trail) notFound();
  return <TrailView trail={trail} />;
}
