import document from 'global/document';
import videojs from 'video.js';

export const stringToUint16Array = (string) => {
  // 2 bytes for each char
  const buffer = new ArrayBuffer(string.length * 2);
  const array = new Uint16Array(buffer);

  for (let i = 0; i < string.length; i++) {
    array[i] = string.charCodeAt(i);
  }

  return array;
};

export const uint8ArrayToString = (array) => {
  return String.fromCharCode.apply(null, new Uint16Array(array.buffer));
};

export const getHostnameFromUri = (uri) => {
  const link = document.createElement('a');

  link.href = uri;
  return link.hostname;
};

export const arrayBuffersEqual = (arrayBuffer1, arrayBuffer2) => {
  if (arrayBuffer1 === arrayBuffer2) {
    return true;
  }

  if (arrayBuffer1.byteLength !== arrayBuffer2.byteLength) {
    return false;
  }

  const dataView1 = new DataView(arrayBuffer1);
  const dataView2 = new DataView(arrayBuffer2);

  for (let i = 0; i < dataView1.byteLength; i++) {
    if (dataView1.getUint8(i) !== dataView2.getUint8(i)) {
      return false;
    }
  }

  return true;
};

export const arrayBufferFrom = (bufferOrTypedArray) => {
  if (bufferOrTypedArray instanceof Uint8Array ||
      bufferOrTypedArray instanceof Uint16Array) {
    return bufferOrTypedArray.buffer;
  }

  return bufferOrTypedArray;
};

export const mergeAndRemoveNull = (...args) => {
  const result = videojs.mergeOptions(...args);

  // Any header whose value is `null` will be removed.
  Object.keys(result).forEach(k => {
    if (result[k] === null) {
      delete result[k];
    }
  });

  return result;
};
