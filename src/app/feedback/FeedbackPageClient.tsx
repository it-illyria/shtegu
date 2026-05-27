"use client";

import Link from "next/link";
import FeedbackForm from "@/components/FeedbackForm";
import { useT } from "@/lib/i18n/context";

export default function FeedbackPageClient() {
  const t = useT();
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <Link href="/" className="text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
        {t.feedbackBackLink}
      </Link>
      <header className="mt-3 mb-6">
        <h1
          className="font-display text-3xl font-bold tracking-[-0.02em]"
          style={{ color: "var(--text-primary)" }}
        >
          {t.feedbackHeading}
        </h1>
        <p className="mt-2 text-[15px]" style={{ color: "var(--text-muted)" }}>
          {t.feedbackSubheading}
        </p>
      </header>
      <FeedbackForm />
    </main>
  );
}
