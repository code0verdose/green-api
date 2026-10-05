import type { Plugin } from 'vite';

/**
 * The API token lives in the browser, so the production build ships a strict CSP:
 * scripts only from our origin and network calls only to GREEN-API hosts.
 * Applied to the build only: Vite's dev server relies on inline scripts for HMR.
 * `style-src 'unsafe-inline'` is required by Mantine, which injects CSS variables at runtime.
 */
const POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.green-api.com https://*.greenapi.com",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
].join('; ');

export function contentSecurityPolicy(): Plugin {
  return {
    name: 'green-api-chat:csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler: () => [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: POLICY },
          injectTo: 'head-prepend',
        },
      ],
    },
  };
}
