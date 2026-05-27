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

  it("applies a distinct colour class per level", () => {
    const { rerender } = render(<DifficultyBadge level="easy" />, {
      wrapper: Wrapper,
    });
    const easy = screen.getByText("Easy").className;
    rerender(<DifficultyBadge level="expert" />);
    const expert = screen.getByText("Expert").className;
    expect(easy).not.toEqual(expert);
    expect(easy).toContain("green");
    expect(expert).toContain("red");
  });
});
