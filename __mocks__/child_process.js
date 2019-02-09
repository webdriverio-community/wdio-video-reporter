export const cpMocks = {
  spawn: jest.fn(),
};

export const spawn = (...args) => { cpMocks.spawn(...args); };
