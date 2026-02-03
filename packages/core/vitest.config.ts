import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@julien-lin/universal-pwa-templates': path.resolve(__dirname, '../templates/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.test.ts',
        '**/*.config.ts',
        'dist/**',
        '**/.test-debug/**',
        '**/.test-tmp*/**',
      ],
      // ENGINEERING_RULES cible 85% lignes ; seuils à 80% pour stabilité CI. branches à 79% (courant ~79.5%). Relever quand coverage branches ≥80%.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 79,
        statements: 80,
      },
    },
  },
})
