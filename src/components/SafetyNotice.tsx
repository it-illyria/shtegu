"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/context";

export default function SafetyNotice() {
  const t = useT();
  return (
    <p
      className="mt-4 rounded-lg border px-3 py-2 text-xs"
      style={{
        background: "var(--warning-bg)",
        borderColor: "var(--warning-border)",
        color: "var(--warning-text)",
      }}
    >
      {t.safetyShort}{" "}
      <Link href="/safety" className="font-medium underline">
        {t.safetyDisclaimerLink}
      </Link>
      .
    </p>
  );
}
