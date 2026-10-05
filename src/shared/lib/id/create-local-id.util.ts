/**
 * Client-side id for optimistic messages. `randomUUID` exists only in secure contexts,
 * so plain-http dev hosts (e.g. a phone on the LAN) fall back to getRandomValues.
 */
export function createLocalId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
