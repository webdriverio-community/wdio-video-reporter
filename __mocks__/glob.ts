import { vi } from 'vitest'

export let globMocks: { glob: Function };

export const resetGlobMocks = () => {
  globMocks = {
    glob: vi.fn((_, cb) => cb(null, [])),
  }
}

resetGlobMocks();

export default (...args: any[]) => globMocks.glob(...args);
