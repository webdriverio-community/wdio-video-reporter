export const allureMocks = {
  addAttachment: jest.fn(),
};

export default {
  addAttachment(...args) { allureMocks.addAttachment(...args); },
};