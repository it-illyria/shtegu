import type { Metadata } from "next";
import SafetyPageClient from "./SafetyPageClient";

// Keep metadata in English for SEO.
export const metadata: Metadata = {
  title: "Safety & Disclaimer — Shtegu",
  description:
    "Important safety information and data disclaimer for using Shtegu to plan and navigate hikes in Albania.",
};

export default function SafetyPage() {
  return <SafetyPageClient />;
}
