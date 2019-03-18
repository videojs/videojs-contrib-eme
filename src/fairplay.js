/**
 * The W3C Working Draft of 22 October 2013 seems to be the best match for
 * the ms-prefixed API. However, it should only be used as a guide; it is
 * doubtful the spec is 100% implemented as described.
 * @see https://www.w3.org/TR/2013/WD-encrypted-media-20131022
 */
import videojs from 'video.js';
import window from 'global/window';
import {stringToUint16Array, uint8ArrayToString, getHostnameFromUri, mergeAndRemoveNull} from './utils';

export const FAIRPLAY_KEY_SYSTEM = 'com.apple.fps.1_0';

const concatInitDataIdAndCertificate = ({initData, id, cert}) => {
  if (typeof id === 'string') {
    id = stringToUint16Array(id);
  }

  // layout:
  //   [initData]
  //   [4 byte: idLength]
  //   [idLength byte: id]
  //   [4 byte:certLength]
  //   [certLength byte: cert]
  let offset = 0;
  const buffer = new ArrayBuffer(
    initData.byteLength + 4 + id.byteLength + 4 + cert.byteLength);
  const dataView = new DataView(buffer);
  const initDataArray = new Uint8Array(buffer, offset, initData.byteLength);

  initDataArray.set(initData);
  offset += initData.byteLength;

  dataView.setUint32(offset, id.byteLength, true);
  offset += 4;

  const idArray = new Uint16Array(buffer, offset, id.length);

  idArray.set(id);
  offset += idArray.byteLength;

  dataView.setUint32(offset, cert.byteLength, true);
  offset += 4;

  const certArray = new Uint8Array(buffer, offset, cert.byteLength);

  certArray.set(cert);

  return new Uint8Array(buffer, 0, buffer.byteLength);
};

const addKey = ({video, contentId, initData, cert, options, getLicense, eventBus}) => {
  return new Promise((resolve, reject) => {
    if (!video.webkitKeys) {
      try {
        video.webkitSetMediaKeys(new window.WebKitMediaKeys(FAIRPLAY_KEY_SYSTEM));
      } catch (error) {
        reject('Could not create MediaKeys');
        return;
      }
    }

    let keySession;

    try {
      keySession = video.webkitKeys.createSession(
        'video/mp4',
        concatInitDataIdAndCertificate({id: contentId, initData, cert}));
    } catch (error) {
      reject('Could not create key session');
      return;
    }

    keySession.contentId = contentId;

    keySession.addEventListener('webkitkeymessage', (event) => {
      getLicense(options, contentId, event.message, (err, license) => {
        if (eventBus) {
          eventBus.trigger('licenserequestattempted');
        }
        if (err) {
          reject(err);
          return;
        }

        keySession.update(new Uint8Array(license));
      });
    });

    keySession.addEventListener('webkitkeyadded', () => {
      resolve();
    });

    // for testing purposes, adding webkitkeyerror must be the last item in this method
    keySession.addEventListener('webkitkeyerror', () => {
      const error = keySession.error;

      reject(`KeySession error: code ${error.code}, systemCode ${error.systemCode}`);
    });
  });
};

export const defaultGetCertificate = (fairplayOptions) => {
  return (emeOptions, callback) => {
    const headers = mergeAndRemoveNull(
      emeOptions.emeHeaders,
      fairplayOptions.certificateHeaders
    );

    videojs.xhr({
      uri: fairplayOptions.certificateUri,
      responseType: 'arraybuffer',
      headers
    }, (err, response, responseBody) => {
      if (err) {
        callback(err);
        return;
      }

      callback(null, new Uint8Array(responseBody));
    });
  };
};

const defaultGetContentId = (emeOptions, initData) => {
  return getHostnameFromUri(uint8ArrayToString(initData));
};

export const defaultGetLicense = (fairplayOptions) => {
  return (emeOptions, contentId, keyMessage, callback) => {
    const headers = mergeAndRemoveNull(
      {'Content-type': 'application/octet-stream'},
      emeOptions.emeHeaders,
      fairplayOptions.licenseHeaders
    );

    videojs.xhr({
      uri: fairplayOptions.licenseUri,
      method: 'POST',
      responseType: 'arraybuffer',
      body: keyMessage,
      headers
    }, (err, response, responseBody) => {
      if (err) {
        callback(err);
        return;
      }

      callback(null, responseBody);
    });
  };
};

const fairplay = ({video, initData, options, eventBus}) => {
  const fairplayOptions = options.keySystems[FAIRPLAY_KEY_SYSTEM];
  const getCertificate = fairplayOptions.getCertificate ||
    defaultGetCertificate(fairplayOptions);
  const getContentId = fairplayOptions.getContentId || defaultGetContentId;
  const getLicense = fairplayOptions.getLicense ||
    defaultGetLicense(fairplayOptions);

  return new Promise((resolve, reject) => {
    getCertificate(options, (err, cert) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(cert);
    });
  }).then((cert) => {
    return addKey({
      video,
      cert,
      initData,
      getLicense,
      options,
      contentId: getContentId(options, initData),
      eventBus
    });
  });
};

export default fairplay;
