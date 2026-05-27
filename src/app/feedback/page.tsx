import type { Metadata } from "next";
import FeedbackPageClient from "./FeedbackPageClient";

// Keep metadata in English for SEO.
export const metadata: Metadata = {
  title: "Feedback — Shtegu",
  description: "Send a complaint or suggestion about Shtegu.",
};

export default function FeedbackPage() {
  return <FeedbackPageClient />;
}
