const MAX_DETAIL_LENGTH = 300;

const pickMessage = (parsed: unknown): string | null => {
  if (typeof parsed === 'string') return parsed;
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  for (const key of ['message', 'reason', 'error', 'description']) {
    const value = record[key];
    if (typeof value === 'string' && value) return value;
  }
  return null;
};

/**
 * Extracts a human-readable reason from a GREEN-API error body (JSON or plain text)
 * and removes the token, since some upstream errors echo the request URL.
 */
export function readErrorDetail(body: string, secret: string): string {
  let detail = body;
  try {
    detail = pickMessage(JSON.parse(body)) ?? body;
  } catch {
    // Plain-text body — use as is.
  }
  const redacted = secret ? detail.split(secret).join('***') : detail;
  return redacted.trim().slice(0, MAX_DETAIL_LENGTH);
}
