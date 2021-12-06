export let fsMocks;

export const resetFsMocks = () => {
  fsMocks = {
    copySync: jest.fn(),
    removeSync: jest.fn(),
    writeFile: jest.fn(),
    existsSync: jest.fn().mockReturnValue('MOCK'),
    mkdirsSync: jest.fn(),
    readFileSync: jest.fn()
      .mockReturnValueOnce('outputDir/MOCK-VIDEO-1.mp4')
      .mockReturnValueOnce('outputDir/MOCK-VIDEO-1.mp4')
      .mockReturnValueOnce('outputDir/MOCK-VIDEO-1.mp4')
      .mockReturnValueOnce('outputDir/MOCK-VIDEO-2.mp4')
      .mockReturnValueOnce('outputDir/MOCK-VIDEO-2.mp4')
      .mockReturnValueOnce('outputDir/MOCK-VIDEO-2.mp4'),
    readdirSync: jest.fn().mockReturnValue(['MOCK-ALLURE-1.mp4', 'MOCK-ALLURE-2.mp4']),
    statSync: jest.fn().mockReturnValue(({ size: 128 })),
  };
};

resetFsMocks();

export default {
  copySync(...args) { fsMocks.copySync(...args); },
  removeSync(...args) { fsMocks.removeSync(...args); },
  existsSync(...args) { return fsMocks.existsSync(...args); },
  mkdirsSync(...args) { fsMocks.mkdirsSync(...args); },
  readFileSync(...args) { return fsMocks.readFileSync(...args); },
  readdirSync(...args) { return fsMocks.readdirSync(...args); },
  statSync(...args) { return fsMocks.statSync(...args); },
  writeFile(...args) { return fsMocks.writeFile(...args); },
};
