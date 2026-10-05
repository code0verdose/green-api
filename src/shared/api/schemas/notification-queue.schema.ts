import { z } from 'zod';

/**
 * ReceiveNotification returns `null` on timeout or one queued notification.
 * The body is validated later by the notification unit, which knows every `typeWebhook`.
 */
export const receiveNotificationResponseSchema = z
  .object({ receiptId: z.number().int(), body: z.unknown() })
  .nullable();

export type ReceivedNotification = NonNullable<z.infer<typeof receiveNotificationResponseSchema>>;

export const deleteNotificationResponseSchema = z.object({ result: z.boolean() });

export type DeleteNotificationResult = z.infer<typeof deleteNotificationResponseSchema>;
