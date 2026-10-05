import { fileURLToPath, URL } from 'node:url';

import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import { contentSecurityPolicy } from './build/csp.plugin.ts';

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

export default defineConfig({
  // Optional sub-path hosting (VITE_BASE_PATH=/green-api/); by default the site root.
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/app/routes',
      generatedRouteTree: './src/app/route-tree.gen.ts',
    }),
    react(),
    contentSecurityPolicy(),
  ],
  resolve: {
    alias: {
      '@app': src('app'),
      '@pages': src('pages'),
      '@widgets': src('widgets'),
      '@units': src('units'),
      '@shared': src('shared'),
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/shared/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    // Generous for loaded machines (parallel agents, CI): failures must mean bugs, not slowness.
    testTimeout: 15_000,
    env: { TZ: 'UTC' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/index.ts',
        'src/**/*.types.ts',
        'src/shared/test/**',
        'src/app/main.tsx',
        'src/app/route-tree.gen.ts',
        'src/vite-env.d.ts',
      ],
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 85 },
    },
  },
});
