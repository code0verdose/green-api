export type GreenApiErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'rate-limited'
  | 'quota-exceeded'
  | 'contact-check-limit'
  | 'webhook-configured'
  | 'instance-not-ready'
  | 'instance-expired'
  | 'bad-request'
  | 'server'
  | 'network'
  | 'timeout'
  | 'invalid-response'
  | 'unknown';

const RETRYABLE_KINDS: ReadonlySet<GreenApiErrorKind> = new Set([
  'rate-limited',
  'instance-not-ready',
  'server',
  'network',
  'timeout',
  'invalid-response',
]);

interface GreenApiErrorInit {
  status?: number | null;
  /** Server-provided reason, already stripped of credentials. For logs, not for UI. */
  detail?: string;
}

export class GreenApiError extends Error {
  override readonly name = 'GreenApiError';
  readonly kind: GreenApiErrorKind;
  readonly status: number | null;
  readonly detail: string;

  constructor(kind: GreenApiErrorKind, { status = null, detail = '' }: GreenApiErrorInit = {}) {
    super(`GREEN-API request failed: ${kind}${status === null ? '' : ` (HTTP ${status})`}`);
    this.kind = kind;
    this.status = status;
    this.detail = detail;
  }

  /** The credentials are wrong or revoked: retrying will not help, the session is over. */
  get isAuthError(): boolean {
    return this.kind === 'unauthorized' || this.kind === 'forbidden';
  }

  /** Transient failure: the same request may succeed later. */
  get isRetryable(): boolean {
    return RETRYABLE_KINDS.has(this.kind);
  }
}

export const isGreenApiError = (error: unknown): error is GreenApiError =>
  error instanceof GreenApiError;

/** Checks the name, not the prototype: DOMException does not extend Error in every runtime. */
export const isAbortError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
