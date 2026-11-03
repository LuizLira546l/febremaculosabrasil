/** Educational exposure check. Not an individual probability of infection.
 * Territorial component: confirmed cases by residence in the last 5 years (2021–2025).
 * Behavioral component: tick and host-animal exposure. Sex/age never change the level. */
export type AttentionLevel = 'rotina' | 'moderada' | 'reforcada';

export interface ExposureAnswers {
  tickBite: boolean;     // carrapato preso ao corpo
  ticksSeen: boolean;    // viu carrapatos em si/roupa/animais
  vegetation: boolean;   // mata, pasto, trilha, área rural
  water: boolean;        // margens de rios, lagos, represas
  capybara: boolean;     // capivaras no local
  horses: boolean;       // cavalos/gado
}

/** Index of the first of the last 5 years in a 2013–2025 series. */
export const RECENT_FROM_INDEX = 8;

export function recentCases(y: number[]): number {
  return y.slice(RECENT_FROM_INDEX).reduce((a, b) => a + b, 0);
}

/** 0 = no recent cases, 1 = 1–2 cases, 2 = 3 or more cases in the last 5 years. */
export function territorialScore(recent: number): 0 | 1 | 2 {
  if (recent <= 0) return 0;
  return recent < 3 ? 1 : 2;
}

/** Points: tick bite 3, ticks seen 2, others 1. Bucketed 0 / 1–2 → 1 / 3+ → 2. */
export function behavioralScore(a: ExposureAnswers): 0 | 1 | 2 {
  const pts = (a.tickBite ? 3 : 0) + (a.ticksSeen ? 2 : 0) + (a.vegetation ? 1 : 0) + (a.water ? 1 : 0) + (a.capybara ? 1 : 0) + (a.horses ? 1 : 0);
  if (pts === 0) return 0;
  return pts < 3 ? 1 : 2;
}

export function attentionLevel(territorial: number, behavioral: number, tickBite = false): AttentionLevel {
  if (behavioral === 0) return 'rotina';
  if (territorial + behavioral >= 3 || (tickBite && territorial >= 1)) return 'reforcada';
  return 'moderada';
}
