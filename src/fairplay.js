/**
 * The W3C Working Draft of 22 October 2013 seems to be the best match for
 * the ms-prefixed API. However, it should only be used as a guide; it is
 * doubtful the spec is 100% implemented as described.
 *
 * @see https://www.w3.org/TR/2013/WD-encrypted-media-20131022
 */
import videojs from 'video.js';
import window from 'global/window';
import {stringToUint16Array, uint16ArrayToString, getHostnameFromUri, mergeAndRemoveNull} from './utils';
import {httpResponseHandler} from './http-handler.js';
import EmeError from './consts/errors';
import { safeTriggerOnEventBus } from './eme.js';

export const LEGACY_FAIRPLAY_KEY_SYSTEM = 'com.apple.fps.1_0';

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
  const buffer = new ArrayBuffer(initData.byteLength + 4 + id.byteLength + 4 + cert.byteLength);
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

const addKey = ({video, contentId, initData, cert, options, getLicense, eventBus, emeError}) => {
  return new Promise((resolve, reject) => {
    if (!video.webkitKeys) {
      try {
        video.webkitSetMediaKeys(new window.WebKitMediaKeys(LEGACY_FAIRPLAY_KEY_SYSTEM));
      } catch (error) {
        const metadata = {
          errorType: EmeError.EMEFailedToCreateMediaKeys,
          keySystem: LEGACY_FAIRPLAY_KEY_SYSTEM
        };

        emeError(error, metadata);
        reject('Could not create MediaKeys');
        return;
      }
    }

    let keySession;

    try {
      keySession = video.webkitKeys.createSession(
        'video/mp4',
        concatInitDataIdAndCertificate({id: contentId, initData, cert})
      );
    } catch (error) {
      const metadata = {
        errorType: EmeError.EMEFailedToCreateMediaKeySession,
        keySystem: LEGACY_FAIRPLAY_KEY_SYSTEM
      };

      emeError(error, metadata);
      reject('Could not create key session');
      return;
    }

    safeTriggerOnEventBus(eventBus, {
      type: 'keysessioncreated',
      keySession
    });

    keySession.contentId = contentId;

    keySession.addEventListener('webkitkeymessage', (event) => {
      safeTriggerOnEventBus(eventBus, {
        type: 'keymessage',
        messageEvent: event
      });
      getLicense(options, contentId, event.message, (err, license) => {
        if (eventBus) {

          safeTriggerOnEventBus(eventBus, { type: 'licenserequestattempted' });
        }
        if (err) {
          const metadata = {
            errortype: EmeError.EMEFailedToGenerateLicenseRequest,
            keySystem: LEGACY_FAIRPLAY_KEY_SYSTEM
          };

          emeError(err, metadata);
          reject(err);
          return;
        }

        keySession.update(new Uint8Array(license));

        safeTriggerOnEventBus(eventBus, {
          type: 'keysessionupdated',
          keySession
        });
      });
    });

    keySession.addEventListener('webkitkeyadded', () => {
      resolve();
    });

    // for testing purposes, adding webkitkeyerror must be the last item in this method
    keySession.addEventListener('webkitkeyerror', () => {
      const error = keySession.error;
      const metadata = {
        errorType: EmeError.EMEFailedToUpdateSessionWithReceivedLicenseKeys,
        keySystem: LEGACY_FAIRPLAY_KEY_SYSTEM
      };

      emeError(error, metadata);
      reject(`KeySession error: code ${error.code}, systemCode ${error.systemCode}`);
    });
  });
};

export const defaultGetCertificate = (keySystem, fairplayOptions) => {
  return (emeOptions, callback) => {
    const headers = mergeAndRemoveNull(
      emeOptions.emeHeaders,
      fairplayOptions.certificateHeaders
    );

    videojs.xhr({
      uri: fairplayOptions.certificateUri,
      responseType: 'arraybuffer',
      requestType: 'license',
      metadata: { keySystem },
      headers
    }, httpResponseHandler((err, license) => {
      if (err) {
        callback(err);
        return;
      }

      // in this case, license is still the raw ArrayBuffer,
      // (we don't want httpResponseHandler to decode it)
      // convert it into Uint8Array as expected
      callback(null, new Uint8Array(license));
    }));
  };
};

export const defaultGetContentId = (emeOptions, initDataString) => {
  return getHostnameFromUri(initDataString);
};

export const defaultGetLicense = (keySystem, fairplayOptions) => {
  return (emeOptions, contentId, keyMessage, callback) => {
    const headers = mergeAndRemoveNull(
      {'Content-type': 'application/octet-stream'},
      emeOptions.emeHeaders,
      fairplayOptions.licenseHeaders
    );

    videojs.xhr({
      uri: fairplayOptions.licenseUri || fairplayOptions.url,
      method: 'POST',
      responseType: 'arraybuffer',
      requestType: 'license',
      metadata: { keySystem, contentId },
      body: keyMessage,
      headers
    }, httpResponseHandler(callback, true));
  };
};

const fairplay = ({video, initData, options, eventBus, emeError}) => {
  const fairplayOptions = options.keySystems[LEGACY_FAIRPLAY_KEY_SYSTEM];
  const getCertificate = fairplayOptions.getCertificate ||
    defaultGetCertificate(LEGACY_FAIRPLAY_KEY_SYSTEM, fairplayOptions);
  const getContentId = fairplayOptions.getContentId || defaultGetContentId;
  const getLicense = fairplayOptions.getLicense ||
    defaultGetLicense(LEGACY_FAIRPLAY_KEY_SYSTEM, fairplayOptions);

  return new Promise((resolve, reject) => {
    getCertificate(options, (err, cert) => {
      if (err) {
        const metadata = {
          errorType: EmeError.EMEFailedToSetServerCertificate,
          keySystem: LEGACY_FAIRPLAY_KEY_SYSTEM
        };

        emeError(err, metadata);
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
      contentId: getContentId(options, uint16ArrayToString(initData)),
      eventBus,
      emeError
    });
  });
};

export default fairplay;
