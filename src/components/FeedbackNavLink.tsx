"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/context";

export default function FeedbackNavLink() {
  const t = useT();

  return (
    <Link
      href="/feedback"
      className="hidden text-sm font-medium hover:underline sm:block"
      style={{ color: "var(--text-nav)" }}
    >
      💬 {t.feedbackLink}
    </Link>
  );
}
