import { z } from 'zod';

export const checkAccountResultSchema = z.object({
  exist: z.boolean(),
  chatId: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  username: z
    .string()
    .nullish()
    .transform((value) => value || null),
});

/** CheckAccount reports instance and rate-limit problems as `{ status: false, ... }` in the body. */
export const checkAccountFailureSchema = z.object({
  status: z.literal(false),
  reason: z.string().optional(),
  data: z.object({ reason: z.string().optional() }).optional(),
});

export const checkAccountResponseSchema = z.union([
  checkAccountResultSchema,
  checkAccountFailureSchema,
]);

export type CheckAccountResult = z.infer<typeof checkAccountResultSchema>;

export const sendMessageResponseSchema = z.object({ idMessage: z.string().min(1) });

export type SendMessageResult = z.infer<typeof sendMessageResponseSchema>;
