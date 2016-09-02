import videojs from 'video.js';
import window from 'global/window';
import {stringToUint16Array, uint8ArrayToString, getHostnameFromUri} from './utils';

const FAIRPLAY_KEY_SYSTEM = 'com.apple.fps.1_0';

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
  let buffer = new ArrayBuffer(
    initData.byteLength + 4 + id.byteLength + 4 + cert.byteLength);
  let dataView = new DataView(buffer);
  let initDataArray = new Uint8Array(buffer, offset, initData.byteLength);

  initDataArray.set(initData);
  offset += initData.byteLength;

  dataView.setUint32(offset, id.byteLength, true);
  offset += 4;

  let idArray = new Uint16Array(buffer, offset, id.length);

  idArray.set(id);
  offset += idArray.byteLength;

  dataView.setUint32(offset, cert.byteLength, true);
  offset += 4;

  let certArray = new Uint8Array(buffer, offset, cert.byteLength);

  certArray.set(cert);

  return new Uint8Array(buffer, 0, buffer.byteLength);
};

const addKey = ({video, contentId, initData, cert, options, getLicense}) => {
  return new Promise((resolve, reject) => {
    if (!video.webkitKeys) {
      video.webkitSetMediaKeys(new window.WebKitMediaKeys(FAIRPLAY_KEY_SYSTEM));
    }

    if (!video.webkitKeys) {
      reject('Could not create MediaKeys');
      return;
    }

    let keySession = video.webkitKeys.createSession(
      'video/mp4',
      concatInitDataIdAndCertificate({id: contentId, initData, cert}));

    if (!keySession) {
      reject('Could not create key session');
      return;
    }

    keySession.contentId = contentId;

    keySession.addEventListener('webkitkeymessage', (event) => {
      getLicense(options, contentId, event.message, (err, license) => {
        if (err) {
          reject(err);
          return;
        }

        keySession.update(new Uint8Array(license));
      });
    });

    keySession.addEventListener('webkitkeyadded', (event) => {
      resolve(event);
    });

    // for testing purposes, adding webkitkeyerror must be the last item in this method
    keySession.addEventListener('webkitkeyerror', (event) => {
      reject(event);
    });
  });
};

const defaultGetCertificate = (certificateUri) => {
  return (emeOptions, callback) => {
    videojs.xhr({
      uri: certificateUri,
      responseType: 'arraybuffer'
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

const defaultGetLicense = (licenseUri) => {
  return (emeOptions, contentId, keyMessage, callback) => {
    videojs.xhr({
      uri: licenseUri,
      method: 'POST',
      responseType: 'arraybuffer',
      body: keyMessage,
      headers: {
        'Content-type': 'application/octet-stream'
      }
    }, (err, response, responseBody) => {
      if (err) {
        callback(err);
        return;
      }

      callback(null, responseBody);
    });
  };
};

const fairplay = ({video, initData, options}) => {
  let fairplayOptions = options.keySystems[FAIRPLAY_KEY_SYSTEM];
  let getCertificate = fairplayOptions.getCertificate ||
    defaultGetCertificate(fairplayOptions.certificateUri);
  let getContentId = fairplayOptions.getContentId || defaultGetContentId;
  let getLicense = fairplayOptions.getLicense ||
    defaultGetLicense(fairplayOptions.licenseUri);

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
      contentId: getContentId(options, initData)
    });
  }).catch(videojs.log.error.bind(videojs.log.error));
};

export default fairplay;
