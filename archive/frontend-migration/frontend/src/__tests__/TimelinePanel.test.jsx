import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TimelinePanel from "../TimelinePanel";

describe("TimelinePanel", () => {
  it("renders agent events", () => {
    const events = [
      { id: "1", action: "Decoy", confidence: 0.9, result: "ok" },
    ];
    render(<TimelinePanel events={events} />);
    expect(screen.getByText(/Decoy/)).toBeInTheDocument();
  });
});
