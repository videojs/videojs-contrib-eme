export const stringToUint16Array = (string) => {
  // 2 bytes for each char
  let buffer = new ArrayBuffer(string.length * 2);
  let array = new Uint16Array(buffer);

  for (let i = 0; i < string.length; i++) {
    array[i] = string.charCodeAt(i);
  }

  return array;
};

export const uint8ArrayToString = (array) => {
  return String.fromCharCode.apply(null, new Uint16Array(array.buffer));
};

export const getHostnameFromUri = (uri) => {
  let link = document.createElement('a');

  link.href = uri;
  return link.hostname;
};
