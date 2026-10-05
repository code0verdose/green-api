import { SharedApi, SharedLib } from '@shared';

/** The request may have reached GREEN-API even though no answer came back. */
const UNCONFIRMED_KINDS: ReadonlySet<SharedApi.GreenApiErrorKind> = new Set([
  'timeout',
  'network',
  'server',
]);

export const UNCONFIRMED_SEND_TEXT =
  'GREEN-API не подтвердил отправку — сообщение могло уйти. Если собеседник его не получил, повторите.';

/** Why a send failed, worded so a retry does not silently produce a duplicate. */
export function describeSendFailure(error: unknown): string {
  if (SharedApi.isGreenApiError(error) && UNCONFIRMED_KINDS.has(error.kind)) {
    return UNCONFIRMED_SEND_TEXT;
  }
  return SharedLib.getErrorMessage(error);
}
