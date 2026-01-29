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
      ],
      thresholds: {
        lines: 75,
        functions: 72, // prompts.ts + all commands = ~73%
        branches: 70, // CLI a beaucoup de branches conditionnelles
        statements: 75,
      },
    },
  },
})
