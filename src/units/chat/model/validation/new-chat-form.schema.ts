import { z } from 'zod';

import type { SharedConfig } from '@shared';

import { createRecipientSchema } from './recipient.schema';

export const createNewChatFormSchema = (messenger: SharedConfig.Messenger) =>
  z.object({ recipient: createRecipientSchema(messenger) });

export interface NewChatFormValues {
  recipient: string;
}
