"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/context";

export default function SafetyPageClient() {
  const t = useT();

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <Link href="/" className="text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
        {t.safetyBackHome}
      </Link>
      <h1
        className="mt-3 font-display text-3xl font-bold tracking-[-0.02em]"
        style={{ color: "var(--text-primary)" }}
      >
        {t.safetyHeading}
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: "var(--text-muted)" }}>
        {t.safetyIntro}
      </p>

      <div className="mt-6 space-y-6 text-sm leading-6" style={{ color: "var(--text-primary)" }}>
        {[
          [t.safetyPlanningTitle, t.safetyPlanningBody] as const,
          [t.safetyDataTitle,     t.safetyDataBody]     as const,
        ].map(([title, body]) => (
          <section key={title}>
            <h2 className="font-display text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              {title}
            </h2>
            <p className="mt-2">{body}</p>
          </section>
        ))}

        <section>
          <h2 className="font-display text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {t.safetyRiskTitle}
          </h2>
          <p className="mt-2">{t.safetyRiskBody}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {t.safetyRiskList.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        {[
          [t.safetyEmergencyTitle,   t.safetyEmergencyBody]   as const,
          [t.safetyLiabilityTitle,   t.safetyLiabilityBody]   as const,
          [t.safetyAttributionTitle, t.safetyAttributionBody] as const,
        ].map(([title, body]) => (
          <section key={title}>
            <h2 className="font-display text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              {title}
            </h2>
            <p className="mt-2">{body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
