export const stringToUint8Array = (string) => {
  // 2 bytes for each char
  let buffer = new ArrayBuffer(string.length * 2);
  let array = new Uint16Array(buffer);

  for (let i = 0; i < string.length; i++) {
    array[i] = string.charCodeAt(i);
  }

  return array;
};

