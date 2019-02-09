export let writeMock;

export const resetWriteMock = () => {
  writeMock = jest.fn();
};

resetWriteMock();

export default class Reporter {
  constructor(options) {
    this.optionsSetInConstructor = options;
  }

  write(msg) {
    writeMock(msg);
  }
}