export type Risk = "baixo" | "médio" | "alto";

/** Linear trend over yearly counts (2013..2018), projected one year ahead. Never negative. */
export function forecastNext(counts: number[]): number {
  const n = counts.length;
  if (n === 0) return 0;
  const xs = counts.map((_, i) => i);
  const mx = (n - 1) / 2;
  const my = counts.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (counts[i] - my);
    den += (x - mx) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  const pred = my + slope * (n - mx);
  return Math.max(0, Math.round(pred * 10) / 10);
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Risk relative to peers (same level): top third = alto, middle = médio, bottom = baixo. */
export function riskLevel(value: number, peers: number[]): Risk {
  const s = [...peers].sort((a, b) => a - b);
  const p33 = quantile(s, 1 / 3);
  const p66 = quantile(s, 2 / 3);
  if (value <= 0) return "baixo";
  if (value >= p66) return "alto";
  if (value > p33) return "médio";
  return "baixo";
}

export function lethality(deaths: number, cases: number): number {
  return cases === 0 ? 0 : (deaths / cases) * 100;
}
