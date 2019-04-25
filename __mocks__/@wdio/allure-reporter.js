export const allureMocks = {
  addAttachment: jest.fn(),
  addArgument: jest.fn(),
};

export default {
  addAttachment(...args) { allureMocks.addAttachment(...args); },
  addArgument(...args) { allureMocks.addArgument(...args); },
};
