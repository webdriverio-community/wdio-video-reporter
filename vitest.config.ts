import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      exclude: [
        '__mocks__', 'node_modules', '.github', 'allure-report', 'demo', 'src/types.ts', '.eslintrc.cjs'
      ],
      thresholds: {
        statements: 77,
        branches: 87,
        functions: 83,
        lines: 77,
      }
    }
  }
})
