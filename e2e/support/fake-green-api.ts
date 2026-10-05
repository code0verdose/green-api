import type { Page, Route } from '@playwright/test';

type Messenger = 'max' | 'telegram';

interface FakeGreenApiOptions {
  messenger: Messenger;
  /** phone digits or @username → chatId, as CheckAccount would resolve them. */
  accounts?: Record<string, string>;
  /** What the other person answers to a message, if anything. */
  autoReply?: (text: string) => string | null;
}

interface QueuedNotification {
  receiptId: number;
  body: Record<string, unknown>;
}

const INSTANCE = {
  max: { apiUrl: 'https://3100.api.green-api.com', idInstance: '3100000001', typeInstance: 'v3' },
  telegram: {
    apiUrl: 'https://4100.api.green-api.com',
    idInstance: '4100000001',
    typeInstance: 'telegram',
  },
} as const;

export const FAKE_TOKEN = 'e2e-token-0123456789abcdef';
const PARTNER = { name: 'Василиса Премудрая', phone: 79991234567 };

/**
 * In-memory GREEN-API with the semantics from the docs: ReceiveNotification returns the oldest
 * notification until DeleteNotification acknowledges it; an empty queue answers `null`.
 */
export class FakeGreenApi {
  readonly instance: (typeof INSTANCE)[Messenger];
  readonly sent: Array<{ chatId: string; message: string }> = [];
  readonly deletedReceipts: number[] = [];
  private queue: QueuedNotification[] = [];
  private nextReceipt = 1;
  private nextMessage = 1;

  constructor(
    private readonly page: Page,
    private readonly options: FakeGreenApiOptions,
  ) {
    this.instance = INSTANCE[options.messenger];
  }

  async install() {
    await this.page.route(`${this.instance.apiUrl}/**`, (route) => this.handle(route));
  }

  get pendingNotifications() {
    return this.queue.length;
  }

  /** A message from someone, as an incomingMessageReceived notification. */
  pushIncoming(chatId: string, text: string, sender = PARTNER) {
    this.enqueue({
      typeWebhook: 'incomingMessageReceived',
      instanceData: this.instanceData(),
      timestamp: Math.floor(Date.now() / 1000),
      idMessage: `in-${this.nextMessage++}`,
      senderData: {
        chatId,
        chatType: 'user',
        sender: chatId,
        chatName: sender.name,
        senderName: sender.name,
        senderContactName: sender.name,
        senderPhoneNumber: sender.phone,
      },
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: text } },
    });
  }

  private instanceData() {
    return {
      idInstance: Number(this.instance.idInstance),
      wid: '79876543210@c.us',
      typeInstance: this.instance.typeInstance,
    };
  }

  private enqueue(body: Record<string, unknown>) {
    this.queue.push({ receiptId: this.nextReceipt++, body });
  }

  private status(chatId: string, idMessage: string, status: string) {
    this.enqueue({
      typeWebhook: 'outgoingMessageStatus',
      chatId,
      instanceData: this.instanceData(),
      timestamp: Math.floor(Date.now() / 1000),
      idMessage,
      status,
    });
  }

  private async handle(route: Route) {
    const request = route.request();
    const [, , method, token, receiptId] = new URL(request.url()).pathname.split('/');
    if (token !== FAKE_TOKEN) {
      return route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
    }

    switch (method) {
      case 'getStateInstance':
        return route.fulfill({ json: { stateInstance: 'authorized' } });
      case 'getSettings':
        return route.fulfill({
          json: {
            webhookUrl: '',
            incomingWebhook: 'yes',
            outgoingWebhook: 'yes',
            outgoingMessageWebhook: 'yes',
            outgoingAPIMessageWebhook: 'yes',
            stateWebhook: 'yes',
          },
        });
      case 'checkAccount': {
        const body = request.postDataJSON() as { phoneNumber?: number; username?: string };
        const key = body.username ?? String(body.phoneNumber);
        const chatId = this.options.accounts?.[key];
        return route.fulfill({ json: { exist: Boolean(chatId), chatId: chatId ?? '' } });
      }
      case 'sendMessage': {
        const body = request.postDataJSON() as { chatId: string; message: string };
        const idMessage = `api-${this.nextMessage++}`;
        this.sent.push(body);
        this.status(body.chatId, idMessage, 'delivered');
        const reply = this.options.autoReply?.(body.message);
        if (reply) {
          this.status(body.chatId, idMessage, 'read');
          this.pushIncoming(body.chatId, reply);
        }
        return route.fulfill({ json: { idMessage } });
      }
      case 'receiveNotification': {
        // A real long poll: hold the request until something is queued (or a short timeout).
        for (let waited = 0; waited < 2000; waited += 50) {
          const next = this.queue[0];
          if (next) {
            return route
              .fulfill({ json: { receiptId: next.receiptId, body: next.body } })
              .catch(() => {});
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return route.fulfill({ body: 'null', contentType: 'application/json' }).catch(() => {});
      }
      case 'deleteNotification': {
        const id = Number(receiptId);
        const existed = this.queue.some((item) => item.receiptId === id);
        this.queue = this.queue.filter((item) => item.receiptId !== id);
        if (existed) this.deletedReceipts.push(id);
        return route.fulfill({ json: { result: existed, reason: existed ? '' : 'not found' } });
      }
      default:
        return route.fulfill({ status: 404, body: 'Not Found' });
    }
  }
}
