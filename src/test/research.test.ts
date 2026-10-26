import { describe, it, expect } from 'vitest';
import { evidence, filteredGroups, buildCsv, validateFilters, research } from '@/lib/research';
const all = { uf: '', mu: '', from: 2013, to: 2025 };
describe('research data filters', () => {
  it('restricts data to 2013–2025 confirmed cases', () => { expect(evidence(all).total).toBe(3034); expect(evidence({ ...all, to: 2013 }).total).toBe(129); expect(evidence(all).obitos).toBe(884); });
  it('applies state municipality and inclusive period together', () => { const row = research.rows.find(r => r[1] === 2013); if (!row) throw new Error('fixture missing'); const f = { uf: row[0].slice(0, 2), mu: row[0], from: 2013, to: 2013 }; expect(filteredGroups(f)).toEqual([row]); expect(evidence(f).total).toBe(row[2]); });
  it('rejects invalid periods and incompatible municipality', () => { expect(() => validateFilters({ ...all, from: 2012 })).toThrow(); expect(() => validateFilters({ ...all, from: 2025, to: 2013 })).toThrow(); expect(() => validateFilters({ ...all, mu: '350950', uf: '33' })).toThrow(); });
  it('accounts for absent zone separately, never as no', () => { const zone = evidence(all).variables.find(v => v.codigo === 'ZONA'); expect(zone?.valores.map(v => v.fichas)).toEqual([0, 0, 0, 3034]); });
  it('exports only filtered annual municipality groups', () => { const f = { ...all, uf: '35', from: 2025 }; const csv = buildCsv(f); expect(csv.split('\r\n').length - 1).toBe(filteredGroups(f).length); expect(filteredGroups(f).every(r => r[0].startsWith('35') && r[1] === 2025)).toBe(true); });
});