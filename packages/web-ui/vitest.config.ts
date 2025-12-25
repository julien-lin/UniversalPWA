import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Relaxed coverage requirements for showcase website
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.config.ts', 'dist/**', 'vite.config.ts', 'src/main.tsx'],
      // No coverage thresholds for showcase website
      thresholds: undefined,
    },
  },
})

