"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT, useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/components/AuthProvider";

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
  icon: React.ReactNode;
}

const TrailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
    <path d="M2 16 L2 11 L7 5 L10 9 L13 3 L18 9 L18 16 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);
const MapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
    <path d="M1 4l6-2 6 2 6-2v14l-6 2-6-2-6 2V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M7 2v14M13 4v14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
const SavedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
    <path d="M4 2h12a1 1 0 0 1 1 1v14l-7-4-7 4V3a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);
const PlanIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
    <rect x="2" y="3" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6 2v3M14 2v3M2 9h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6 13h3M6 16h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
const ActivityIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 6v4.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const GearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
    <rect x="3" y="2" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <path d="M7 8h6M7 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M7 5h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
const CompareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
    <path d="M4 4h5v12H4zM11 4h5v12h-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);
const CommunityIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
    <circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path d="M2 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="15" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M18 17c0-2.8-1.3-5-3.5-5.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

function MountainLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 64 64" fill="none" aria-hidden>
      {/* Main mountain — dark green fill + outline */}
      <polygon points="32,4 6,54 58,54" fill="#2D5438" />
      <polyline points="6,54 32,4 58,54" fill="none" stroke="#1B3626" strokeWidth="2" strokeLinejoin="round" />

      {/* Secondary peak (right) — darker slate-green */}
      <polygon points="48,18 36,54 62,54" fill="#1E3D2A" />
      <polyline points="36,54 48,18 62,54" fill="none" stroke="#152B1E" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Orange arrow going up through the mountain */}
      <polyline points="24,46 30,34 36,40 42,26 48,14" fill="none" stroke="#E8801A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="48,14 44,20 52,20" fill="#E8801A" />

      {/* Hiker 1 (left, female silhouette) */}
      <circle cx="20" cy="38" r="2.5" fill="#4A7C54" />
      <path d="M20 41 Q18 46 17 50 M20 41 Q22 46 22 50 M20 43 Q17 44 15 43 M20 43 Q23 43 24 42" stroke="#4A7C54" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* Hiker 2 (right, male silhouette) */}
      <circle cx="27" cy="40" r="2.5" fill="#3F6B46" />
      <path d="M27 43 Q25 48 24 52 M27 43 Q29 48 29 52 M27 45 Q24 46 22 45 M27 45 Q30 44 31 43" stroke="#3F6B46" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function AppSidebar() {
  const t = useT();
  const pathname = usePathname();
  const { lang, setLang } = useI18n();
  const { user } = useAuth();

  const signedIn = Boolean(user && !user.is_anonymous);
  const displayName = signedIn && user?.email ? user.email.split("@")[0] : "Explorer";

  const sidebarBg     = "#F7F6F2";
  const sidebarBorder = "1px solid #E4E7E1";
  const textDefault   = "#2B332E";
  const iconDefault   = "#516055";
  const iconActive    = "#2F4F3A";
  const profileBorder = "1px solid #E4E7E1";
  const userNameColor = "#1B2620";
  const roleColor     = "#8A9690";

  const activeStyle   = { background: "linear-gradient(90deg, #DDE8DB, #EDF3EC)", color: "#2F4F3A" };
  const inactiveStyle = { color: textDefault, background: "transparent" };

  const navItems: NavItem[] = [
    { href: "/",         label: t.navExplore,   exact: true, icon: <TrailIcon /> },
    { href: "/near-me",  label: t.navNearMe,               icon: <MapIcon /> },
    { href: "/saved",    label: t.navSaved,                icon: <SavedIcon /> },
    { href: "/activity", label: t.navActivity,             icon: <ActivityIcon /> },
    { href: "/gear",     label: t.navGear,                 icon: <GearIcon /> },
    { href: "/compare",  label: t.navCompare,              icon: <CompareIcon /> },
    { href: "/safety",   label: t.navSafety,               icon: <PlanIcon /> },
    { href: "/feedback", label: t.navCommunity,            icon: <CommunityIcon /> },
  ];

  function isActive(item: NavItem) {
    return item.exact ? pathname === item.href : pathname === item.href;
  }

  return (
    <nav
      className="hidden lg:flex h-screen w-60 shrink-0 flex-col"
      style={{ background: sidebarBg, borderRight: sidebarBorder }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <MountainLogo />
        <span
          className="font-display text-[18px] font-bold tracking-[-0.02em]"
          style={{ color: "#1B2620" }}
        >
          Shtegu
        </span>
      </div>

      {/* Nav */}
      <ul className="flex flex-col gap-0.5 px-3 mt-2">
        {navItems.map((item, i) => {
          const active = isActive(item);
          return (
            <li key={`${item.href}-${i}`}>
              <Link
                href={item.href}
                className="flex h-13 items-center gap-3 rounded-2xl px-4 text-[14px] font-medium transition-all duration-150"
                style={active ? activeStyle : inactiveStyle}
              >
                <span style={{ color: active ? iconActive : iconDefault }} className="transition-colors">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Admin link — only for the admin email */}
      {user?.email === "juni.93.juni@gmail.com" && (
        <ul className="px-3 pb-2">
          <li>
            <Link
              href="/admin"
              className="flex h-[44px] items-center gap-3 rounded-[16px] px-4 text-[13px] font-medium transition-all duration-150"
              style={
                pathname === "/admin"
                  ? activeStyle
                  : inactiveStyle
              }
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
                <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 17c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M14 2l1.5 1.5M15.5 3.5L17 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Admin
            </Link>
          </li>
        </ul>
      )}

      {/* User profile + language toggle */}
      <div
        className="flex items-center justify-between gap-2 px-4 pb-5 pt-3"
        style={{ borderTop: profileBorder }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #3F6B46, #2D5438)" }}
          >
            {displayName[0]?.toUpperCase() ?? "E"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium" style={{ color: userNameColor }}>
              {displayName}
            </p>
            <p className="text-[10px]" style={{ color: roleColor }}>Explorer</p>
          </div>
        </div>
        <div
          className="flex items-center gap-0.5 rounded-full border text-xs font-medium"
          style={{ borderColor: "#E4E7E1" }}
        >
          {(["sq", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className="rounded-full px-2.5 py-1 transition-colors"
              style={lang === l
                ? { background: "#2F4F3A", color: "#ffffff" }
                : { color: "#516055" }
              }
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
