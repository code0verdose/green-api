import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const NO_DEFAULT_EXPORT = {
  selector: 'ExportDefaultDeclaration',
  message: 'Use named exports only.',
};
const NO_INLINE_STYLE = {
  selector: "JSXAttribute[name.name='style']",
  message: 'Use a CSS module next to the component instead of inline styles.',
};
const NO_DIRECT_QUERIES = [
  {
    selector: "CallExpression[callee.name='useQuery']",
    message: 'Pages and widgets consume unit hooks (service/hooks), not useQuery directly.',
  },
  {
    selector: "CallExpression[callee.name='useMutation']",
    message: 'Pages and widgets consume unit hooks (service/hooks), not useMutation directly.',
  },
];

const deepImport = (layer) => ({
  group: [`@${layer}/*/*`],
  message: `Import the public namespace: import { XxxService } from '@${layer}/<slice>'.`,
});
const upperLayers = (...layers) => ({
  group: layers.flatMap((layer) => [`@${layer}`, `@${layer}/*`]),
  message:
    'FSD: a layer may only import from layers below it (app → pages → widgets → units → shared).',
});
const sharedNamespace = {
  group: ['@shared/*'],
  message: "Use the shared namespaces: import { SharedApi, SharedLib } from '@shared'.",
};
const noParentEscape = {
  group: ['../../../*'],
  message: 'Use an @-alias instead of a deep relative path.',
};
const restrictImports = (...patterns) => ({
  'no-restricted-imports': ['error', { patterns: [noParentEscape, ...patterns] }],
});

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'src/app/route-tree.gen.ts'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: { 'no-restricted-syntax': ['error', NO_DEFAULT_EXPORT, NO_INLINE_STYLE] },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/api/**', 'src/**/*.test.{ts,tsx}', 'src/shared/test/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Network calls go through the GREEN-API client in @shared/api.' },
      ],
    },
  },
  // Layer boundaries
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: restrictImports(upperLayers('app', 'pages', 'widgets', 'units')),
  },
  {
    files: ['src/units/**/*.{ts,tsx}'],
    rules: restrictImports(
      upperLayers('app', 'pages', 'widgets'),
      deepImport('units'),
      sharedNamespace,
    ),
  },
  {
    files: ['src/widgets/**/*.{ts,tsx}'],
    rules: {
      ...restrictImports(
        upperLayers('app', 'pages'),
        deepImport('units'),
        deepImport('widgets'),
        sharedNamespace,
      ),
      'no-restricted-syntax': ['error', NO_DEFAULT_EXPORT, NO_INLINE_STYLE, ...NO_DIRECT_QUERIES],
    },
  },
  {
    files: ['src/pages/**/*.{ts,tsx}'],
    rules: {
      ...restrictImports(
        upperLayers('app'),
        deepImport('units'),
        deepImport('widgets'),
        sharedNamespace,
      ),
      'no-restricted-syntax': ['error', NO_DEFAULT_EXPORT, NO_INLINE_STYLE, ...NO_DIRECT_QUERIES],
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: restrictImports(
      deepImport('units'),
      deepImport('widgets'),
      deepImport('pages'),
      sharedNamespace,
    ),
  },
  {
    // TanStack Router's API is `throw redirect(...)` / `throw notFound()` in beforeLoad.
    files: ['src/app/routes/**/*.tsx'],
    rules: { '@typescript-eslint/only-throw-error': 'off' },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/shared/test/**'],
    rules: {
      // Tests reach into test utilities (@shared/test/*) and the module under test directly.
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['e2e/**/*.ts', '*.config.ts', 'build/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{js,cjs}'],
    languageOptions: { globals: globals.node },
  },
);
