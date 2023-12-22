import { vi } from 'vitest'

export const cpMocks = {
  spawn: vi.fn().mockReturnValue({ on: vi.fn() }),
};

export const spawn = (...args: any[]) => { return cpMocks.spawn(...args); };
