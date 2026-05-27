import type { Lang } from "./context";

const COOKIE_NAME = "shtegu_lang";

/** Read the lang preference from a Next.js RequestCookies store or raw cookie string. */
export function parseLangCookieServer(
  cookieHeader: string | null | undefined,
): Lang {
  if (!cookieHeader) return "sq";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return "sq";
  const value = match.slice(COOKIE_NAME.length + 1);
  return value === "en" || value === "sq" ? value : "sq";
}
