import raw from '@/data/profiles.server.json';
import { computeProfiles, computeProfileComparison, type ProfileComparisonFilters, type ProfileFilters, type ProfileRow } from './profiles';
export function readProfiles(filters: ProfileFilters) { return computeProfiles(raw as ProfileRow[], filters); }
export function readProfileComparison(input: ProfileComparisonFilters) { return computeProfileComparison(raw as ProfileRow[], input); }