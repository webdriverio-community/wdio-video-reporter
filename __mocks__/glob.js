export let globMocks;

export const resetGlobMocks = () => {
  globMocks = {
    glob: jest.fn((pattern, options, cb) => cb(null, [])),
  }
}

resetGlobMocks();

export default (...args) => globMocks.glob(...args);
