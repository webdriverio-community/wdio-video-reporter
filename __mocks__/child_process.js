export const cpMocks = {
  spawn: jest.fn().mockReturnValue({ on: jest.fn() }),
};

export const spawn = (...args) => { return cpMocks.spawn(...args); };
