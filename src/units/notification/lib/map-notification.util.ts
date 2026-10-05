import {
  FAILED_STATUS_REASONS,
  IGNORED_MESSAGE_TYPES,
  QUOTA_FALLBACK_DESCRIPTION,
  UNSUPPORTED_MESSAGE_FALLBACK_LABEL,
  UNSUPPORTED_MESSAGE_LABELS,
  UNSUPPORTED_MESSAGE_SUFFIX,
} from '../model/constants/notification-texts.constant';
import {
  type MessageNotificationBody,
  messageNotificationSchema,
  notificationEnvelopeSchema,
  quotaNotificationSchema,
  stateNotificationSchema,
  type StatusNotificationBody,
  statusNotificationSchema,
} from '../model/validation/notification-body.schema';
import type { NotificationEvent } from '../types/notification.types';

const ignored = (reason: string): NotificationEvent => ({ type: 'ignored', reason });

const firstNonEmpty = (...values: Array<string | null | undefined>) =>
  values.find((value): value is string => Boolean(value?.trim())) ?? null;

const isGroupChat = ({ chatId, chatType }: MessageNotificationBody['senderData']) =>
  (chatType !== null && chatType !== undefined && chatType !== 'user') || chatId.startsWith('-');

const readPhone = (value: number | string | null | undefined) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits && digits !== '0' ? digits : null;
};

function mapMessage(body: MessageNotificationBody): NotificationEvent {
  const { senderData, messageData } = body;
  if (isGroupChat(senderData)) return ignored('group chat');
  if (IGNORED_MESSAGE_TYPES.has(messageData.typeMessage)) {
    return ignored(`not a new message: ${messageData.typeMessage}`);
  }

  const incoming = body.typeWebhook === 'incomingMessageReceived';
  const text =
    messageData.textMessageData?.textMessage ?? messageData.extendedTextMessageData?.text;
  const label =
    UNSUPPORTED_MESSAGE_LABELS[messageData.typeMessage] ?? UNSUPPORTED_MESSAGE_FALLBACK_LABEL;

  return {
    type: 'message',
    direction: incoming ? 'incoming' : 'outgoing',
    chatId: senderData.chatId,
    // In outgoing notifications the sender is the instance owner, so only chatName describes the partner.
    chatName: incoming
      ? firstNonEmpty(senderData.senderContactName, senderData.chatName, senderData.senderName)
      : firstNonEmpty(senderData.chatName),
    phone: incoming ? readPhone(senderData.senderPhoneNumber) : null,
    idMessage: body.idMessage,
    timestamp: body.timestamp * 1000,
    viaApi: body.typeWebhook === 'outgoingAPIMessageReceived',
    ...(text === undefined
      ? { kind: 'unsupported', text: `${label} — ${UNSUPPORTED_MESSAGE_SUFFIX}` }
      : { kind: 'text', text }),
  };
}

function failureReason({ status, description }: StatusNotificationBody): string {
  if (status === 'noAccount') return FAILED_STATUS_REASONS.noAccount;
  if (status === 'notInGroup') return FAILED_STATUS_REASONS.notInGroup;
  if (description && /unresolvable/i.test(description)) {
    return FAILED_STATUS_REASONS.unresolvableChat;
  }
  return description
    ? `${FAILED_STATUS_REASONS.failed} ${description}`
    : FAILED_STATUS_REASONS.failed;
}

function mapStatus(body: StatusNotificationBody): NotificationEvent {
  const base = { type: 'status', chatId: body.chatId, idMessage: body.idMessage } as const;
  switch (body.status) {
    case 'sent':
    case 'delivered':
    case 'read':
      return { ...base, status: body.status, reason: null };
    case 'failed':
    case 'noAccount':
    case 'notInGroup':
      return { ...base, status: 'failed', reason: failureReason(body) };
    default:
      return ignored(`untracked status: ${body.status}`);
  }
}

/**
 * Turns a raw ReceiveNotification body into a domain event. Never throws:
 * anything unexpected becomes `ignored`, so a format drift cannot jam the queue.
 */
export function mapNotification(body: unknown): NotificationEvent {
  const envelope = notificationEnvelopeSchema.safeParse(body);
  if (!envelope.success) return ignored('not a notification');

  switch (envelope.data.typeWebhook) {
    case 'incomingMessageReceived':
    case 'outgoingMessageReceived':
    case 'outgoingAPIMessageReceived': {
      const parsed = messageNotificationSchema.safeParse(body);
      return parsed.success ? mapMessage(parsed.data) : ignored('malformed message');
    }
    case 'outgoingMessageStatus': {
      const parsed = statusNotificationSchema.safeParse(body);
      return parsed.success ? mapStatus(parsed.data) : ignored('malformed status');
    }
    case 'stateInstanceChanged': {
      const parsed = stateNotificationSchema.safeParse(body);
      return parsed.success
        ? { type: 'instance-state', state: parsed.data.stateInstance }
        : ignored('malformed state');
    }
    case 'quotaExceeded': {
      const parsed = quotaNotificationSchema.safeParse(body);
      const description = parsed.success ? parsed.data.quotaData?.description : null;
      return { type: 'quota-exceeded', description: description || QUOTA_FALLBACK_DESCRIPTION };
    }
    default:
      return ignored(`unknown typeWebhook: ${envelope.data.typeWebhook}`);
  }
}
