import { z } from 'zod';

import { SharedLib, type SharedConfig } from '@shared';

export type Recipient = { kind: 'phone'; phone: string } | { kind: 'username'; username: string };

/** CheckAccount for MAX: 11 digits starting with 7 (RU) or 12 digits starting with 375 (BY). */
const MAX_PHONE = /^(7\d{10}|375\d{9})$/;
/** E.164 allows up to 15 digits; anything shorter than 10 is not a full international number. */
const INTERNATIONAL_PHONE = /^\d{10,15}$/;
/** Telegram usernames: 5–32 characters, Latin letters, digits and underscores, starting with a letter. */
const TELEGRAM_USERNAME = /^@?([a-zA-Z][a-zA-Z0-9_]{4,31})$/;
const LOOKS_LIKE_PHONE = /^[\d\s()+-]+$/;

const maxRecipientSchema = z
  .string()
  .trim()
  .min(1, { error: 'Введите номер телефона', abort: true })
  .refine((value) => LOOKS_LIKE_PHONE.test(value), { error: 'Введите номер телефона' })
  .transform((value) => SharedLib.normalizePhoneDigits(value))
  .refine((phone) => MAX_PHONE.test(phone), {
    error: 'MAX: только номера России (+7) и Беларуси (+375)',
  })
  .transform((phone): Recipient => ({ kind: 'phone', phone }));

const telegramRecipientSchema = z
  .string()
  .trim()
  .min(1, { error: 'Введите номер телефона или @username' })
  .transform((value, context): Recipient => {
    const username = TELEGRAM_USERNAME.exec(value)?.[1];
    if (username) return { kind: 'username', username: `@${username}` };

    const phone = SharedLib.normalizePhoneDigits(value);
    if (LOOKS_LIKE_PHONE.test(value) && INTERNATIONAL_PHONE.test(phone)) {
      return { kind: 'phone', phone };
    }

    context.addIssue({
      code: 'custom',
      message: 'Введите номер в международном формате или @username',
    });
    return z.NEVER;
  });

export const createRecipientSchema = (messenger: SharedConfig.Messenger) =>
  messenger === 'max' ? maxRecipientSchema : telegramRecipientSchema;
