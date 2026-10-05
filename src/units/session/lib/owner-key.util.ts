import type { Session } from '../model/validation/credentials.schema';

/** Identifies whose chat history is stored: another instance or messenger starts clean. */
export const toOwnerKey = ({ messenger, idInstance }: Pick<Session, 'messenger' | 'idInstance'>) =>
  `${messenger}:${idInstance}`;
