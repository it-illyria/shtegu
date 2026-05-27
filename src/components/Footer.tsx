"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";

function FooterLink({ href, children, linkColor, hoverColor }: {
  href: string;
  children: React.ReactNode;
  linkColor: string;
  hoverColor: string;
}) {
  return (
    <Link
      href={href}
      className="block text-sm transition-colors"
      style={{ color: linkColor }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = hoverColor; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = linkColor; }}
    >
      {children}
    </Link>
  );
}

function MountainLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none" aria-hidden>
      <polygon points="32,4 6,54 58,54" fill="#2D5438" />
      <polyline points="6,54 32,4 58,54" fill="none" stroke="#1B3626" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="48,18 36,54 62,54" fill="#1E3D2A" />
      <polyline points="36,54 48,18 62,54" fill="none" stroke="#152B1E" strokeWidth="1.5" strokeLinejoin="round" />
      <polyline points="24,46 30,34 36,40 42,26 48,14" fill="none" stroke="#E8801A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="48,14 44,20 52,20" fill="#E8801A" />
      <circle cx="20" cy="38" r="2.5" fill="#4A7C54" />
      <path d="M20 41 Q18 46 17 50 M20 41 Q22 46 22 50 M20 43 Q17 44 15 43 M20 43 Q23 43 24 42" stroke="#4A7C54" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="27" cy="40" r="2.5" fill="#3F6B46" />
      <path d="M27 43 Q25 48 24 52 M27 43 Q29 48 29 52 M27 45 Q24 46 22 45 M27 45 Q30 44 31 43" stroke="#3F6B46" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function Footer() {
  const t = useT();
  const { resolved } = useTheme();
  const isDark = resolved === "dark";

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const bg          = isDark ? "#111714"          : "#F1F4EF";
  const borderTop   = isDark ? "none"             : "1px solid #E2E6E0";
  const wordmark    = isDark ? "#ffffff"           : "#243028";
  const tagline     = isDark ? "rgba(255,255,255,0.38)" : "#8A9690";
  const colHead     = isDark ? "rgba(255,255,255,0.30)" : "#5E6A61";
  const linkColor   = isDark ? "rgba(255,255,255,0.50)" : "#5E6A61";
  const linkHover   = isDark ? "#ffffff"           : "#2F4F3A";
  const divider     = isDark ? "rgba(255,255,255,0.08)" : "#E2E6E0";
  const bottomText  = isDark ? "rgba(255,255,255,0.22)" : "#9AA4A0";
  const disclaimer  = isDark ? "rgba(255,255,255,0.28)" : "#8A9690";

  return (
    <footer style={{ background: bg, borderTop }}>
      <div className="mx-auto w-full px-8 py-10 lg:px-12" style={{ maxWidth: 1440 }}>

        {/* 3-column grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">

          {/* Left — logo + tagline */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <MountainLogo />
              <span className="font-display text-[17px] font-bold tracking-[-0.02em]" style={{ color: wordmark }}>
                Shtegu
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: tagline, maxWidth: 200 }}>
              {t.appTagline}
            </p>
          </div>

          {/* Center — discover links */}
          <div className="flex gap-12">
            <div className="flex flex-col gap-2.5">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: colHead }}>
                Discover
              </p>
              <FooterLink href="/"        linkColor={linkColor} hoverColor={linkHover}>Explore</FooterLink>
              <FooterLink href="/near-me" linkColor={linkColor} hoverColor={linkHover}>Near Me</FooterLink>
              <FooterLink href="/saved"   linkColor={linkColor} hoverColor={linkHover}>Saved</FooterLink>
              <FooterLink href="/activity" linkColor={linkColor} hoverColor={linkHover}>Activity</FooterLink>
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: colHead }}>
                Community
              </p>
              <FooterLink href="/feedback" linkColor={linkColor} hoverColor={linkHover}>Feedback</FooterLink>
              <FooterLink href="/safety"   linkColor={linkColor} hoverColor={linkHover}>{t.footerSafetyLink}</FooterLink>
            </div>
          </div>

          {/* Right — disclaimer */}
          <div className="flex flex-col gap-3 sm:items-end sm:text-right">
            <p className="text-xs leading-relaxed" style={{ color: disclaimer, maxWidth: 240 }}>
              {t.footerDisclaimer}
            </p>
            <p className="text-xs" style={{ color: tagline }}>{t.footerMadeWith}</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-8 flex flex-wrap items-center justify-between gap-2 pt-5 text-[11px]"
          style={{ borderTop: `1px solid ${divider}`, color: bottomText }}
        >
          <span>© {new Date().getFullYear()} Shtegu</span>
          <span style={{ color: disclaimer }}>{t.homeCountryLabel}</span>
        </div>
      </div>
    </footer>
  );
}
