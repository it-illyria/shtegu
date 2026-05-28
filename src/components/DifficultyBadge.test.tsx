import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DifficultyBadge from "./DifficultyBadge";
import { LanguageProvider } from "@/lib/i18n/context";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider initialLang="en">{children}</LanguageProvider>;
}

describe("DifficultyBadge", () => {
  it("renders the difficulty label", () => {
    render(<DifficultyBadge level="hard" />, { wrapper: Wrapper });
    expect(screen.getByText("Hard")).toBeInTheDocument();
  });

  it("applies a distinct background per level", () => {
    const { rerender } = render(<DifficultyBadge level="easy" />, {
      wrapper: Wrapper,
    });
    const easyBg = screen.getByText("Easy").style.background;
    rerender(<DifficultyBadge level="expert" />);
    const expertBg = screen.getByText("Expert").style.background;
    expect(easyBg).not.toEqual(expertBg);
    expect(easyBg).toContain("badge-easy");
    expect(expertBg).toContain("badge-expert");
  });
});
