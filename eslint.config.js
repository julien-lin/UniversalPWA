import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default [
  { ignores: ['dist', 'node_modules', '**/*.config.js', '**/*.config.ts', '**/vitest.setup.ts'] },
  js.configs.recommended,
  // Config Node.js (core, cli, templates)
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['packages/core/**/*.ts', 'packages/cli/**/*.ts', 'packages/templates/**/*.ts'],
  })),
  {
    files: ['packages/core/**/*.ts', 'packages/cli/**/*.ts', 'packages/templates/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
      parserOptions: {
        project: [
          './packages/core/tsconfig.json',
          './packages/cli/tsconfig.json',
          './packages/templates/tsconfig.json',
        ],
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // Config Web/React (web-ui)
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['packages/web-ui/**/*.{ts,tsx}'],
  })),
  {
    files: ['packages/web-ui/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./packages/web-ui/tsconfig.app.json'],
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    ...reactHooks.configs.recommended,
    ...reactRefresh.configs.vite,
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // Désactiver certaines règles pour les fichiers de test
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]
