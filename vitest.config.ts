import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      thresholds: {
        statements: 27,
        branches: 72,
        functions: 42,
        lines: 27,
      }
    }
  }
})
