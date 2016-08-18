import videojs from 'video.js';
import window from 'global/window';
import {stringToUint8Array} from './utils';

const FAIRPLAY_KEY_SYSTEM = 'com.apple.fps.1_0';

const concatInitDataIdAndCertificate = ({initData, id, cert}) => {
  if (typeof id === 'string') {
    id = stringToUint8Array(id);
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

const addKey = ({video, contentId, initData, cert, getKey}) => {
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
      getKey({
        contentId,
        webKitKeyMessage: event.message
      }, (err, key) => {
        if (err) {
          reject(err);
          return;
        }

        keySession.update(new Uint8Array(key));
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

const fairplay = ({video, initData, options}) => {
  let fairplayOptions = options.keySystems[FAIRPLAY_KEY_SYSTEM];

  return new Promise((resolve, reject) => {
    fairplayOptions.getCertificate({}, (err, cert) => {
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
      contentId: fairplayOptions.getContentId(initData),
      getKey: fairplayOptions.getKey
    });
  }).catch(videojs.log.error.bind(videojs.log.error));
};

export default fairplay;
