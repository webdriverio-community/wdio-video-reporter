import { vi } from 'vitest'
export let fsMocks: any

export const resetFsMocks = () => {
  fsMocks = {
    copy: vi.fn(),
    copySync: vi.fn(),
    removeSync: vi.fn(),
    writeFile: vi.fn(),
    existsSync: vi.fn().mockReturnValue('MOCK'),
    mkdirsSync: vi.fn(),
    readFileSync: vi.fn()
      .mockReturnValueOnce('outputDir/MOCK-VIDEO-1.webm')
      .mockReturnValueOnce('outputDir/MOCK-VIDEO-1.webm')
      .mockReturnValueOnce('outputDir/MOCK-VIDEO-1.webm')
      .mockReturnValueOnce('outputDir/MOCK-VIDEO-2.webm')
      .mockReturnValueOnce('outputDir/MOCK-VIDEO-2.webm')
      .mockReturnValueOnce('outputDir/MOCK-VIDEO-2.webm'),
    readdirSync: vi.fn().mockReturnValue(['MOCK-ALLURE-1.webm', 'MOCK-ALLURE-2.webm']),
    statSync: vi.fn().mockReturnValue(({ size: 128 })),
  };
};

resetFsMocks();

export default {
  copy(...args: any[]) { fsMocks.copy(...args); },
  copySync(...args: any[]) { fsMocks.copySync(...args); },
  removeSync(...args: any[]) { fsMocks.removeSync(...args); },
  existsSync(...args: any[]) { return fsMocks.existsSync(...args); },
  mkdirsSync(...args: any[]) { fsMocks.mkdirsSync(...args); },
  readFileSync(...args: any[]) { return fsMocks.readFileSync(...args); },
  readdirSync(...args: any[]) { return fsMocks.readdirSync(...args); },
  statSync(...args: any[]) { return fsMocks.statSync(...args); },
  writeFile(...args: any[]) { return fsMocks.writeFile(...args); },
};
