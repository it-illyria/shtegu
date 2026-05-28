import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Fraunces, Inter, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import AuthProvider from "@/components/AuthProvider";
import AuthButton from "@/components/AuthButton";
import Footer from "@/components/Footer";
import LanguageToggle from "@/components/LanguageToggle";
import { LanguageProvider } from "@/lib/i18n/context";
import { parseLangCookieServer } from "@/lib/i18n/server";
import FeedbackNavLink from "@/components/FeedbackNavLink";
import { ThemeProvider } from "@/lib/theme/context";
import { parseThemeCookieServer } from "@/lib/theme/server";
import AppSidebar from "@/components/AppSidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import AlertBanner from "@/components/AlertBanner";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "600"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Shtegu — Hiking in Albania",
  description:
    "Discover, plan, and navigate hiking trails across Albania — from the Accursed Mountains to the Ionian Riviera.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieStr = cookieStore.toString();
  const initialLang = parseLangCookieServer(cookieStr);
  const initialTheme = parseThemeCookieServer(cookieStr);

  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${sourceSans.variable} h-full antialiased`}
    >
      <body className="flex h-screen overflow-hidden">
        <ThemeProvider initialTheme={initialTheme}>
        <LanguageProvider initialLang={initialLang}>
          <AuthProvider>
            {/* ── Desktop sidebar ── */}
            <AppSidebar />

            {/* ── Main scroll area ── */}
            <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
              <AlertBanner />

              {/* Mobile top bar (hidden on lg+) */}
              <header
                className="flex lg:hidden items-center justify-between gap-3 border-b px-4 py-3"
                style={{ borderColor: "var(--card-border)" }}
              >
                <Link
                  href="/"
                  className="flex items-baseline gap-1.5 font-display text-xl font-bold tracking-[-0.02em]"
                  style={{ color: "var(--text-primary)" }}
                >
                  Shtegu
                  <span
                    className="text-sm font-normal tracking-normal"
                    style={{ color: "var(--text-muted)" }}
                  >
                    · AL
                  </span>
                </Link>
                <div className="flex items-center gap-2">
                  <LanguageToggle />
                  <FeedbackNavLink />
                  <AuthButton compact />
                </div>
              </header>

              <div className="flex flex-1 flex-col pb-16 lg:pb-0">
                {children}
              </div>
              <Footer />
              <MobileBottomNav />
            </div>
          </AuthProvider>
        </LanguageProvider>
        </ThemeProvider>
        <ServiceWorkerRegistrar />
        <Analytics />
      </body>
    </html>
  );
}
