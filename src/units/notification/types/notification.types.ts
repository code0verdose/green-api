import type { SharedApi } from '@shared';

export type NotificationMessageKind = 'text' | 'unsupported';

/** A text (or unsupported) message seen in a private chat, in either direction. */
export interface MessageNotificationEvent {
  type: 'message';
  direction: 'incoming' | 'outgoing';
  chatId: string;
  /** Best available display name of the chat partner, if the notification carries one. */
  chatName: string | null;
  /** Digits of the partner's phone for incoming messages; null when unknown. */
  phone: string | null;
  idMessage: string;
  /** Milliseconds since epoch. */
  timestamp: number;
  kind: NotificationMessageKind;
  text: string;
  /** outgoingAPIMessageReceived: the echo of a message sent through the API with this token. */
  viaApi: boolean;
}

export type DeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface StatusNotificationEvent {
  type: 'status';
  chatId: string;
  idMessage: string;
  status: DeliveryStatus;
  /** User-facing explanation for `failed`, otherwise null. */
  reason: string | null;
}

export interface InstanceStateNotificationEvent {
  type: 'instance-state';
  state: SharedApi.InstanceState;
}

export interface QuotaNotificationEvent {
  type: 'quota-exceeded';
  description: string;
}

/** Valid but irrelevant for this app (groups, reactions, unknown types) — acknowledged and dropped. */
export interface IgnoredNotificationEvent {
  type: 'ignored';
  reason: string;
}

export type NotificationEvent =
  | MessageNotificationEvent
  | StatusNotificationEvent
  | InstanceStateNotificationEvent
  | QuotaNotificationEvent
  | IgnoredNotificationEvent;
