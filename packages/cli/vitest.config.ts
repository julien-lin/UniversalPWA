import { defineConfig } from 'vitest/config'

export default defineConfig({
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
        'src/prompts.ts',
      ],
      thresholds: {
        lines: 75,
        functions: 80,
        branches: 70, // CLI a beaucoup de branches conditionnelles
        statements: 75,
      },
    },
  },
})

