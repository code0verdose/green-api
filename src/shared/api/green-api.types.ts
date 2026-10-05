import type {
  CheckAccountResult,
  DeleteNotificationResult,
  InstanceSettings,
  InstanceState,
  ReceivedNotification,
  SendMessageResult,
} from './schemas';

export interface GreenApiCredentials {
  /** Host from the personal console, e.g. https://4100.api.green-api.com */
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export type CheckAccountTarget = { phoneNumber: number } | { username: string };

export interface SendMessagePayload {
  chatId: string;
  message: string;
}

export interface ReceiveNotificationParams {
  /** 5–60 seconds per the docs; the call returns null when nothing arrives in time. */
  receiveTimeoutSeconds: number;
}

/** The six GREEN-API methods this app uses. Every method rejects with GreenApiError or AbortError. */
export interface GreenApiClient {
  getStateInstance(signal?: AbortSignal): Promise<{ stateInstance: InstanceState }>;
  getSettings(signal?: AbortSignal): Promise<InstanceSettings>;
  checkAccount(target: CheckAccountTarget, signal?: AbortSignal): Promise<CheckAccountResult>;
  sendMessage(payload: SendMessagePayload, signal?: AbortSignal): Promise<SendMessageResult>;
  receiveNotification(
    params: ReceiveNotificationParams,
    signal?: AbortSignal,
  ): Promise<ReceivedNotification | null>;
  deleteNotification(receiptId: number, signal?: AbortSignal): Promise<DeleteNotificationResult>;
}
