import { describe, it, expect } from "vitest";
import { forecastNext, riskLevel, lethality } from "@/lib/forecast";

describe("forecast", () => {
  it("projects a linear trend to 2019", () => {
    expect(forecastNext([1, 2, 3, 4, 5, 6])).toBe(7);
  });
  it("never forecasts negative cases", () => {
    expect(forecastNext([10, 8, 6, 4, 2, 0])).toBe(0);
  });
  it("classifies risk by peer thirds", () => {
    const peers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect(riskLevel(9, peers)).toBe("alto");
    expect(riskLevel(5, peers)).toBe("médio");
    expect(riskLevel(1, peers)).toBe("baixo");
    expect(riskLevel(0, peers)).toBe("baixo");
  });
  it("computes lethality as deaths over cases", () => {
    expect(lethality(1, 4)).toBe(25);
    expect(lethality(0, 0)).toBe(0);
  });
});
