import type { SharedApi } from '@shared';

export const sendTextMessage = (
  client: SharedApi.GreenApiClient,
  { chatId, text }: { chatId: string; text: string },
) => client.sendMessage({ chatId, message: text });
