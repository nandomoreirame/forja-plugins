import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    include: ['apps/**/src/__tests__/**/*.test.ts', 'packages/**/src/__tests__/**/*.test.ts'],
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@forja/sdk': resolve(new URL('.', import.meta.url).pathname, 'packages/forja-plugin-sdk/src/index.ts'),
    },
  },
})
