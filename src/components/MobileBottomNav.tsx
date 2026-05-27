"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TrailIcon = () => (
  <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
    <path d="M2 16 L2 11 L7 5 L10 9 L13 3 L18 9 L18 16 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);
const MapIcon = () => (
  <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
    <path d="M1 4l6-2 6 2 6-2v14l-6 2-6-2-6 2V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M7 2v14M13 4v14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
const SavedIcon = () => (
  <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
    <path d="M4 2h12a1 1 0 0 1 1 1v14l-7-4-7 4V3a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);
const ActivityIcon = () => (
  <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 6v4.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CommunityIcon = () => (
  <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
    <circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path d="M2 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="15" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M18 17c0-2.8-1.3-5-3.5-5.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

interface MobileNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

const navItems: MobileNavItem[] = [
  { href: "/",         label: "Explore",   icon: <TrailIcon />,    exact: true },
  { href: "/near-me",  label: "Near Me",   icon: <MapIcon /> },
  { href: "/saved",    label: "Saved",     icon: <SavedIcon /> },
  { href: "/activity", label: "Activity",  icon: <ActivityIcon /> },
  { href: "/feedback", label: "Community", icon: <CommunityIcon /> },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  function isActive(item: MobileNavItem) {
    return item.exact ? pathname === item.href : pathname === item.href;
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
      style={{
        background: "var(--card-bg)",
        borderTop: "1px solid var(--card-border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="Mobile navigation"
    >
      {navItems.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors"
            style={{
              color: active ? "var(--summit-green, #2F4F3A)" : "var(--text-muted)",
              minHeight: "56px",
            }}
          >
            <span
              style={{ color: active ? "var(--summit-green, #2F4F3A)" : "var(--text-muted)" }}
              className="transition-colors"
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
