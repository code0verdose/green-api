import { z } from 'zod';

import { SharedConfig } from '@shared';

/**
 * Only GREEN-API API hosts (a subdomain, default port): the token must never be sent elsewhere.
 * Kept in line with the production CSP `connect-src https://*.green-api.com https://*.greenapi.com`.
 */
const GREEN_API_HOST = /^([a-z0-9-]+\.)+(green-api|greenapi)\.com$/i;

export const API_URL_ERROR =
  'Укажите адрес GREEN-API из личного кабинета, например https://4100.api.green-api.com';

const parseUrl = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

export const apiUrlSchema = z
  .string()
  .trim()
  .min(1, { error: 'Введите apiUrl', abort: true })
  .transform((value, context) => {
    const url = parseUrl(value);
    const isValid =
      url !== null &&
      url.protocol === 'https:' &&
      GREEN_API_HOST.test(url.hostname) &&
      !url.port &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash;
    if (!isValid) {
      context.addIssue({ code: 'custom', message: API_URL_ERROR });
      return z.NEVER;
    }
    // A path such as /v3 is allowed: the MAX docs keep it as an optional compatibility prefix.
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  });

export const credentialsFormSchema = z.object({
  idInstance: z
    .string()
    .trim()
    .min(1, { error: 'Введите idInstance', abort: true })
    .regex(/^\d{1,20}$/, { error: 'idInstance состоит только из цифр' }),
  apiTokenInstance: z
    .string()
    .trim()
    .min(1, { error: 'Введите apiTokenInstance', abort: true })
    .regex(/^[\w-]+$/, {
      error: 'apiTokenInstance — латинские буквы, цифры, «-» и «_», без пробелов',
    }),
  apiUrl: apiUrlSchema,
});

export type CredentialsFormValues = z.input<typeof credentialsFormSchema>;

/** What is stored for a signed-in tab; re-validated when read back from sessionStorage. */
export const sessionSchema = z.object({
  messenger: z.enum(SharedConfig.MESSENGER_IDS),
  idInstance: z.string().regex(/^\d{1,20}$/),
  apiTokenInstance: z.string().min(1),
  // Re-checked on read: a session planted in sessionStorage must not point the token elsewhere.
  apiUrl: apiUrlSchema,
});

export type Session = z.infer<typeof sessionSchema>;
