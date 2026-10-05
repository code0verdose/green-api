import { z } from 'zod';

/** `stateInstance` values documented for MAX (v3) and Telegram. */
export const INSTANCE_STATES = [
  'authorized',
  'notAuthorized',
  'blocked',
  'starting',
  'suspended',
  'pendingPassword',
] as const;

export type KnownInstanceState = (typeof INSTANCE_STATES)[number];
export type InstanceState = KnownInstanceState | 'unknown';

const isKnownState = (value: string): value is KnownInstanceState =>
  (INSTANCE_STATES as readonly string[]).includes(value);

/** A state the docs do not list must not break the app — it degrades to "unknown". */
export const instanceStateSchema = z
  .string()
  .transform((value): InstanceState => (isKnownState(value) ? value : 'unknown'));

export const stateInstanceResponseSchema = z.object({ stateInstance: instanceStateSchema });

/** "yes"/"no" switches from GetSettings; a missing field means "unknown", not "off". */
const settingFlagSchema = z
  .enum(['yes', 'no'])
  .nullish()
  .transform((value) => (value === undefined || value === null ? null : value === 'yes'));

export const instanceSettingsSchema = z.object({
  webhookUrl: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  incomingWebhook: settingFlagSchema,
  outgoingWebhook: settingFlagSchema,
  outgoingMessageWebhook: settingFlagSchema,
  outgoingAPIMessageWebhook: settingFlagSchema,
  stateWebhook: settingFlagSchema,
});

export type InstanceSettings = z.infer<typeof instanceSettingsSchema>;
