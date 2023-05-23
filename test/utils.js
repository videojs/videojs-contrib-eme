export const stringToArrayBuffer = (string) => {
  const buffer = new ArrayBuffer(string.length * 2);
  const typedArray = new Uint16Array(buffer);

  for (let i = 0; i < string.length; i++) {
    typedArray[i] = string.charCodeAt(i);
  }

  return buffer;
};

export const getMockEventBus = () => {
  const calls = [];
  const mockEventBus = {
    calls,
    trigger: (event) => {
      calls.push(event);
    }
  };

  return mockEventBus;
};
