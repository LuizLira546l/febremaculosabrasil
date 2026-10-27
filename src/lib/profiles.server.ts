import raw from '@/data/profiles.server.json';
import { computeProfiles, type ProfileFilters, type ProfileRow } from './profiles';
export function readProfiles(filters: ProfileFilters) { return computeProfiles(raw as ProfileRow[], filters); }