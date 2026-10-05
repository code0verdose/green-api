import { z } from 'zod';

/** `/login?redirect=…` — malformed values are dropped, never thrown. */
export const signInSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
});
