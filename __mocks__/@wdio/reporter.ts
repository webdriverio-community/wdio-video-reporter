import { vi } from 'vitest'

export let writeMock: Function

export const resetWriteMock = () => {
  writeMock = vi.fn();
};

resetWriteMock();

export default class Reporter {
  optionsSetInConstructor: any;
  constructor(options: any) {
    this.optionsSetInConstructor = options;
  }

  write(msg: any) {
    writeMock(msg);
  }
}
