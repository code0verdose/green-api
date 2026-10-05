/**
 * Accepts only same-origin paths for the post-login redirect.
 * Anything else ("//evil.com", "https://evil.com", "javascript:") falls back to "/".
 */
export function resolveRedirect(redirect: string | undefined): string {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) return '/';
  if (/[\\\s]/.test(redirect)) return '/';
  return redirect;
}
