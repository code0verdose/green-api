import { z } from 'zod';

import { SharedApi } from '@shared';

/** Only the fields this app reads; Zod strips the rest. Shapes follow the GREEN-API docs. */
export const notificationEnvelopeSchema = z.object({ typeWebhook: z.string() });

export const MESSAGE_WEBHOOK_TYPES = [
  'incomingMessageReceived',
  'outgoingMessageReceived',
  'outgoingAPIMessageReceived',
] as const;

const optionalText = z.string().nullish();

export const senderDataSchema = z.object({
  chatId: z.string().min(1),
  chatType: optionalText,
  chatName: optionalText,
  senderName: optionalText,
  senderContactName: optionalText,
  senderPhoneNumber: z.union([z.number(), z.string()]).nullish(),
});

export const messageNotificationSchema = z.object({
  typeWebhook: z.enum(MESSAGE_WEBHOOK_TYPES),
  timestamp: z.number(),
  idMessage: z.string().min(1),
  senderData: senderDataSchema,
  messageData: z.object({
    typeMessage: z.string(),
    textMessageData: z.object({ textMessage: z.string() }).nullish(),
    extendedTextMessageData: z.object({ text: z.string() }).nullish(),
  }),
});

export const statusNotificationSchema = z.object({
  typeWebhook: z.literal('outgoingMessageStatus'),
  chatId: z.string().min(1),
  idMessage: z.string().min(1),
  status: z.string(),
  description: optionalText,
});

export const stateNotificationSchema = z.object({
  typeWebhook: z.literal('stateInstanceChanged'),
  stateInstance: SharedApi.instanceStateSchema,
});

export const quotaNotificationSchema = z.object({
  typeWebhook: z.literal('quotaExceeded'),
  quotaData: z.object({ description: optionalText }).nullish(),
});

export type MessageNotificationBody = z.infer<typeof messageNotificationSchema>;
export type StatusNotificationBody = z.infer<typeof statusNotificationSchema>;
