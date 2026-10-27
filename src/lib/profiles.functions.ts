import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { readProfiles } from './profiles.server';
const schema = z.object({ region:z.string(), uf:z.string(), mu:z.string(), from:z.number().int(), to:z.number().int(), categories:z.record(z.number().int()), joint:z.array(z.string()).min(1).max(4) });
export const getProfiles = createServerFn({ method:'GET' }).inputValidator(input => schema.parse(input)).handler(({ data }) => readProfiles(data));