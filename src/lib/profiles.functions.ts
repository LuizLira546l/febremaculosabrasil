import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { readProfiles, readProfileComparison } from './profiles.server';
const schema = z.object({ region:z.string(), uf:z.string(), mu:z.string(), from:z.number().int(), to:z.number().int(), categories:z.record(z.number().int()), joint:z.array(z.string()).min(1).max(4) });
export const getProfiles = createServerFn({ method:'GET' }).inputValidator(input => schema.parse(input)).handler(({ data }) => readProfiles(data));
const territorySchema = z.object({ region: z.string(), uf: z.string(), mu: z.string() });
export const getProfileComparison = createServerFn({ method: 'GET' })
  .inputValidator(input => z.object({ filters: schema, a: territorySchema, b: territorySchema }).parse(input))
  .handler(({ data }) => readProfileComparison(data));