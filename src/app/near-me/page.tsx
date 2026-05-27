import type { Metadata } from "next";
import { getTrails } from "@/lib/trails-repo";
import NearMeClient from "./NearMeClient";

export const metadata: Metadata = {
  title: "Trails near me — Shtegu",
  description: "Find hiking trails closest to your current location.",
};

export default async function NearMePage() {
  const trails = await getTrails();
  return <NearMeClient trails={trails} />;
}
