import type { Metadata } from "next";
import GearClient from "./GearClient";

export const metadata: Metadata = {
  title: "Gear Checklist — Shtegu",
  description: "Interactive hiking gear checklist for the Albanian mountains. Make sure you're prepared before you go.",
};

export default function GearPage() {
  return <GearClient />;
}
