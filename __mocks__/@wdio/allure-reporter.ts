import { vi } from 'vitest'

export const allureMocks = {
  addAttachment: vi.fn(),
  addArgument: vi.fn()
}

export default {
  addAttachment(...args: []) { allureMocks.addAttachment(...args) },
  addArgument(...args: []) { allureMocks.addArgument(...args) }
};
