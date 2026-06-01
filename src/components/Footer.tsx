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
    </svg>
  );
}

/** Wave-shaped mountain silhouette divider for the top of the footer. */
function MountainWave({ fill, accent }: { fill: string; accent: string }) {
  return (
    <svg
      viewBox="0 0 1440 80"
      className="block h-10 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M0,80 L0,40 L120,20 L220,55 L340,15 L480,50 L600,10 L740,45 L880,18 L1020,52 L1160,22 L1290,48 L1440,18 L1440,80 Z"
        fill={fill}
      />
      <path
        d="M0,80 L0,55 L160,40 L300,65 L440,38 L580,60 L720,32 L860,58 L1000,40 L1140,62 L1280,42 L1440,55 L1440,80 Z"
        fill={accent}
        opacity="0.55"
      />
    </svg>
  );
}

export default function Footer() {
  const t = useT();
  const { resolved } = useTheme();
  const isDark = resolved === "dark";

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const bg          = isDark ? "#111714" : "#F1F4EF";
  const waveFill    = isDark ? "#0C1310" : "#E3EBE0";
  const waveAccent  = isDark ? "#1E2A24" : "#CFDBC9";
  const wordmark    = isDark ? "#ffffff" : "#243028";
  const tagline     = isDark ? "rgba(255,255,255,0.55)" : "#5E6A61";
  const colHead     = isDark ? "rgba(255,255,255,0.42)" : "#3E5048";
  const linkColor   = isDark ? "rgba(255,255,255,0.65)" : "#3E5048";
  const linkHover   = isDark ? "#E8B566" : "#2F4F3A";
  const divider     = isDark ? "rgba(255,255,255,0.08)" : "#D6DDD2";
  const bottomText  = isDark ? "rgba(255,255,255,0.35)" : "#7A857F";
  const emergencyBg = isDark ? "rgba(232,80,80,0.10)"  : "#FBE6E2";
  const emergencyBorder = isDark ? "rgba(232,80,80,0.30)" : "#E8B0A6";
  const emergencyText = isDark ? "#F4B5AD" : "#5A1818";
  const emergencyAccent = "#C0392B";

  return (
    <footer style={{ background: bg }}>
      {/* Decorative mountain wave */}
      <MountainWave fill={waveFill} accent={waveAccent} />

      <div className="mx-auto w-full px-6 pt-8 pb-10 sm:px-8 lg:px-12" style={{ maxWidth: 1440 }}>

        {/* Emergency callout */}
        <div
          className="mb-10 flex flex-col items-start gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:gap-5"
          style={{ background: emergencyBg, borderColor: emergencyBorder, color: emergencyText }}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
            style={{ background: emergencyAccent }}
            aria-hidden
          >
            112
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
              {t.footerEmergencyTag}
            </p>
            <p className="text-base font-semibold leading-tight">{t.footerEmergencyTitle}</p>
            <p className="text-xs leading-snug opacity-80">{t.footerEmergencyHint}</p>
          </div>
        </div>

        {/* 4-column grid */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-10">

          {/* Brand */}
          <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
            <div className="flex items-center gap-2.5">
              <MountainLogo />
              <span className="font-display text-[17px] font-bold tracking-[-0.02em]" style={{ color: wordmark }}>
                Shtegu
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: tagline, maxWidth: 240 }}>
              {t.appTagline}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: bottomText, maxWidth: 240 }}>
              {t.footerMadeWith}
            </p>
          </div>

          {/* Discover */}
          <div className="flex flex-col gap-2.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: colHead }}>
              {t.footerDiscoverHead}
            </p>
            <FooterLink href="/"         linkColor={linkColor} hoverColor={linkHover}>{t.navExplore}</FooterLink>
            <FooterLink href="/near-me"  linkColor={linkColor} hoverColor={linkHover}>{t.navNearMe}</FooterLink>
            <FooterLink href="/compare"  linkColor={linkColor} hoverColor={linkHover}>{t.navCompare}</FooterLink>
            <FooterLink href="/gear"     linkColor={linkColor} hoverColor={linkHover}>{t.navGear}</FooterLink>
            <FooterLink href="/saved"    linkColor={linkColor} hoverColor={linkHover}>{t.navSaved}</FooterLink>
            <FooterLink href="/activity" linkColor={linkColor} hoverColor={linkHover}>{t.navActivity}</FooterLink>
          </div>

          {/* Community */}
          <div className="flex flex-col gap-2.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: colHead }}>
              {t.footerCommunityHead}
            </p>
            <FooterLink href="/feedback" linkColor={linkColor} hoverColor={linkHover}>{t.feedbackLink}</FooterLink>
            <FooterLink href="/safety"   linkColor={linkColor} hoverColor={linkHover}>{t.footerSafetyLink}</FooterLink>
          </div>

          {/* About */}
          <div className="flex flex-col gap-2.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: colHead }}>
              {t.footerAboutHead}
            </p>
            <FooterLink href="/safety#mission" linkColor={linkColor} hoverColor={linkHover}>{t.footerAboutMission}</FooterLink>
            <FooterLink href="/safety#data"    linkColor={linkColor} hoverColor={linkHover}>{t.footerAboutSources}</FooterLink>
          </div>
        </div>

        {/* Disclaimer */}
        <p
          className="mt-10 text-xs leading-relaxed"
          style={{ color: tagline, maxWidth: 720 }}
        >
          {t.footerDisclaimer}
        </p>

        {/* Bottom bar */}
        <div
          className="mt-6 flex flex-col gap-2 pt-5 text-[11px] sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: `1px solid ${divider}`, color: bottomText }}
        >
          <span>© {new Date().getFullYear()} Shtegu · {t.homeCountryLabel}</span>
          <span className="opacity-80">{t.footerOpenSource}</span>
        </div>
      </div>
    </footer>
  );
}
