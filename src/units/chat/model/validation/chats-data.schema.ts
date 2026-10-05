import { z } from 'zod';

/** localStorage is a trust boundary: an edited or outdated value must not crash rendering. */
export const storedMessageSchema = z.object({
  localId: z.string(),
  idMessage: z.string().nullable(),
  chatId: z.string(),
  direction: z.enum(['incoming', 'outgoing']),
  kind: z.enum(['text', 'unsupported']),
  text: z.string(),
  timestamp: z.number(),
  status: z.enum(['pending', 'sent', 'delivered', 'read', 'failed']).nullable(),
  error: z.string().nullable(),
  // Histories saved before revisions existed (or a garbled value) start from zero.
  rev: z.number().int().nonnegative().catch(0),
});

export const storedChatSchema = z.object({
  id: z.string(),
  title: z.string(),
  phone: z.string().nullable(),
  username: z.string().nullable(),
  unread: z.number().int().nonnegative(),
  lastActivityAt: z.number(),
});

/** Outer shape only: entries are validated one by one, so one bad record costs one record. */
export const storedHistoryShapeSchema = z.object({
  chats: z.record(z.string(), z.unknown()),
  messages: z.record(z.string(), z.array(z.unknown())),
});
