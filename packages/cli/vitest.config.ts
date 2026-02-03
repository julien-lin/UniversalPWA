import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@julien-lin/universal-pwa-templates': path.resolve(__dirname, '../templates/src/index.ts'),
      '@julien-lin/universal-pwa-core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.test.ts',
        '**/*.config.ts',
        'dist/**',
        'src/index.ts',
        'src/utils/ui-utils.ts', // Affichage pur (banner, prompts) — non critique pour coverage
      ],
      // ENGINEERING_RULES cible 80%. lines/statements/functions >80% (ui-utils exclu). branches à 74% (init/remove branches conditionnelles).
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 74,
      },
    },
  },
})
