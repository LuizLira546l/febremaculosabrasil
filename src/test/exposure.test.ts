import { describe, it, expect } from 'vitest';
import { attentionLevel, behavioralScore, recentCases, territorialScore } from '@/lib/exposure';

const none = { tickBite: false, ticksSeen: false, vegetation: false, water: false, capybara: false, horses: false };

describe('exposure check', () => {
  it('counts only 2021–2025', () => expect(recentCases([9,9,9,9,9,9,9,9,1,0,2,0,1])).toBe(4));
  it('territorial buckets', () => { expect(territorialScore(0)).toBe(0); expect(territorialScore(2)).toBe(1); expect(territorialScore(3)).toBe(2); });
  it('behavioral buckets', () => { expect(behavioralScore(none)).toBe(0); expect(behavioralScore({ ...none, vegetation: true })).toBe(1); expect(behavioralScore({ ...none, tickBite: true })).toBe(2); });
  it('no exposure is routine even with many local cases', () => expect(attentionLevel(2, 0)).toBe('rotina'));
  it('exposure in place without cases is moderate', () => expect(attentionLevel(0, 2)).toBe('moderada'));
  it('high territory + exposure is reinforced', () => expect(attentionLevel(2, 1)).toBe('reforcada'));
  it('tick bite where cases exist is reinforced', () => expect(attentionLevel(1, 1, true)).toBe('reforcada'));
});
