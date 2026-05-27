import type { Metadata } from "next";
import { getTrails } from "@/lib/trails-repo";
import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare Trails — Shtegu",
  description: "Compare two hiking trails in Albania side by side.",
};

export default async function ComparePage() {
  const trails = await getTrails();
  return <CompareClient trails={trails} />;
}
