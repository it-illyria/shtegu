import type { Theme } from "./context";

export function parseThemeCookieServer(
  _cookieHeader: string | null | undefined,
): Theme {
  return "light";
}
