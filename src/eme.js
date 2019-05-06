import videojs from 'video.js';
import { requestPlayreadyLicense } from './playready';
import window from 'global/window';
import {mergeAndRemoveNull} from './utils';
import {defaultGetCertificate as defaultFairplayGetCertificate,
  defaultGetLicense as defaultFairplayGetLicense } from './fairplay';

export const getSupportedKeySystem = (keySystems) => {
  // As this happens after the src is set on the video, we rely only on the set src (we
  // do not change src based on capabilities of the browser in this plugin).

  let promise;

  Object.keys(keySystems).forEach((keySystem) => {
    // TODO use initDataTypes when appropriate
    const systemOptions = {};
    const initDataTypes = keySystems[keySystem].initDataTypes;
    const audioContentType = keySystems[keySystem].audioContentType;
    const videoContentType = keySystems[keySystem].videoContentType;

    if (audioContentType) {
      systemOptions.audioCapabilities = [{
        contentType: audioContentType
      }];
    }
    if (videoContentType) {
      systemOptions.videoCapabilities = [{
        contentType: videoContentType
      }];
    }
    if (initDataTypes) {
      systemOptions.initDataTypes = initDataTypes;
    }

    if (!promise) {
      promise = window.navigator.requestMediaKeySystemAccess(keySystem, [systemOptions]);
    } else {
      promise = promise.catch(
        (e) => window.navigator.requestMediaKeySystemAccess(keySystem, [systemOptions]));
    }
  });

  return promise;
};

export const makeNewRequest = ({
  mediaKeys,
  initDataType,
  initData,
  options,
  getLicense,
  removeSession,
  eventBus
}) => {
  const keySession = mediaKeys.createSession();

  return new Promise((resolve, reject) => {
    keySession.addEventListener('message', (event) => {
      getLicense(options, event.message)
        .then((license) => {
          resolve(keySession.update(license));
        })
        .catch((err) => {
          reject(err);
        });
    }, false);

    keySession.addEventListener('keystatuseschange', (event) => {
      let expired = false;

      // based on https://www.w3.org/TR/encrypted-media/#example-using-all-events
      keySession.keyStatuses.forEach((status, keyId) => {
        // Trigger an event so that outside listeners can take action if appropriate.
        // For instance, the `output-restricted` status should result in an
        // error being thrown.
        eventBus.trigger({
          keyId,
          status,
          target: keySession,
          type: 'keystatuschange'
        });
        switch (status) {
        case 'expired':
          // If one key is expired in a session, all keys are expired. From
          // https://www.w3.org/TR/encrypted-media/#dom-mediakeystatus-expired, "All other
          // keys in the session must have this status."
          expired = true;
          break;
        case 'internal-error':
          // "This value is not actionable by the application."
          // https://www.w3.org/TR/encrypted-media/#dom-mediakeystatus-internal-error
          videojs.log.warn(
            'Key status reported as "internal-error." Leaving the session open since we ' +
            'don\'t have enough details to know if this error is fatal.', event);
          break;
        }
      });

      if (expired) {
        // Close session and remove it from the session list to ensure that a new
        // session can be created.
        //
        // TODO convert to videojs.log.debug and add back in
        // https://github.com/videojs/video.js/pull/4780
        // videojs.log.debug('Session expired, closing the session.');
        keySession.close().then(() => {
          removeSession(initData);
        });
      }
    }, false);

    keySession.generateRequest(initDataType, initData).catch(() => {
      reject('Unable to create or initialize key session');
    });
  });
};

const addSession = ({
  video,
  initDataType,
  initData,
  options,
  getLicense,
  removeSession,
  eventBus
}) => {
  if (video.mediaKeysObject) {
    return makeNewRequest({
      mediaKeys: video.mediaKeysObject,
      initDataType,
      initData,
      options,
      getLicense,
      removeSession,
      eventBus
    });
  }

  video.pendingSessionData.push({initDataType, initData});
  return Promise.resolve();
};

const setMediaKeys = ({
  video,
  certificate,
  createdMediaKeys,
  options,
  getLicense,
  removeSession,
  eventBus
}) => {
  video.mediaKeysObject = createdMediaKeys;
  const promises = [];

  if (certificate) {
    promises.push(createdMediaKeys.setServerCertificate(certificate));
  }

  for (let i = 0; i < video.pendingSessionData.length; i++) {
    const data = video.pendingSessionData[i];

    promises.push(makeNewRequest({
      mediaKeys: video.mediaKeysObject,
      initDataType: data.initDataType,
      initData: data.initData,
      options,
      getLicense,
      removeSession,
      eventBus
    }));
  }

  video.pendingSessionData = [];

  promises.push(video.setMediaKeys(createdMediaKeys));

  return Promise.all(promises);
};

const defaultPlayreadyGetLicense = (keySystemOptions) => (emeOptions, keyMessage, callback) => {
  requestPlayreadyLicense(keySystemOptions, keyMessage, emeOptions, callback);
};

const defaultGetLicense = (keySystemOptions) => (emeOptions, keyMessage, callback) => {
  const headers = mergeAndRemoveNull(
    {'Content-type': 'application/octet-stream'},
    emeOptions.emeHeaders,
    keySystemOptions.licenseHeaders
  );

  videojs.xhr({
    uri: keySystemOptions.url,
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

const promisifyGetLicense = (keySystem, getLicenseFn, eventBus) => {
  return (emeOptions, keyMessage) => {
    return new Promise((resolve, reject) => {
      const callback = (err, license) => {
        if (eventBus) {
          eventBus.trigger('licenserequestattempted');
        }
        if (err) {
          reject(err);
          return;
        }

        resolve(license);
      };

      if (keySystem.startsWith('com.apple.fps')) {
        getLicenseFn(emeOptions, null, keyMessage, callback);
      } else {
        getLicenseFn(emeOptions, keyMessage, callback);
      }
    });
  };
};

const standardizeKeySystemOptions = (keySystem, keySystemOptions) => {
  if (typeof keySystemOptions === 'string') {
    keySystemOptions = { url: keySystemOptions };
  }
  if (typeof keySystemOptions.licenseUri !== 'undefined') {
    keySystemOptions = { url: keySystemOptions.licenseUri };
  }

  if (!keySystemOptions.url && !keySystemOptions.getLicense) {
    throw new Error('Neither URL nor getLicense function provided to get license');
  }

  if (typeof keySystemOptions.certificateUri !== 'undefined') {
    keySystemOptions.getCertificate = defaultFairplayGetCertificate(keySystemOptions);
  }

  if (keySystemOptions.url && !keySystemOptions.getLicense) {
    if (keySystem === 'com.microsoft.playready') {
      keySystemOptions.getLicense = defaultPlayreadyGetLicense(keySystemOptions);
    } else if (keySystem.startsWith('com.apple.fps')) {
      keySystemOptions.getLicense = defaultFairplayGetLicense(keySystemOptions);
    } else {
      keySystemOptions.getLicense = defaultGetLicense(keySystemOptions);
    }
  }

  if (keySystem.startsWith('com.apple.fps') && !keySystemOptions.getCertificate) {
    throw new Error('Neither URL nor getCertificate provided');
  }

  return keySystemOptions;
};

export const standard5July2016 = ({
  video,
  initDataType,
  initData,
  keySystemAccess,
  options,
  removeSession,
  eventBus
}) => {
  let keySystemPromise = Promise.resolve();
  const keySystem = keySystemAccess.keySystem;

  if (typeof video.mediaKeysObject === 'undefined') {
    // Prevent entering this path again.
    video.mediaKeysObject = null;

    // Will store all initData until the MediaKeys is ready.
    video.pendingSessionData = [];

    let certificate;
    let keySystemOptions;

    keySystemPromise = new Promise((resolve, reject) => {
      // save key system for adding sessions
      video.keySystem = keySystem;

      keySystemOptions = standardizeKeySystemOptions(
        keySystem,
        options.keySystems[keySystem]);

      if (!keySystemOptions.getCertificate) {
        resolve();
        return;
      }

      keySystemOptions.getCertificate(options, (err, cert) => {
        if (err) {
          reject(err);
          return;
        }

        certificate = cert;

        resolve();
      });
    }).then(() => {
      return keySystemAccess.createMediaKeys();
    }).then((createdMediaKeys) => {
      return setMediaKeys({
        video,
        certificate,
        createdMediaKeys,
        options,
        getLicense: promisifyGetLicense(keySystem, keySystemOptions.getLicense, eventBus),
        removeSession,
        eventBus
      });
    }).catch((err) => {
      // if we have a specific error message, use it, otherwise show a more
      // generic one
      if (err) {
        return Promise.reject(err);
      }
      return Promise.reject('Failed to create and initialize a MediaKeys object');
    });
  }

  return keySystemPromise.then(() => {
    let getLicenseFn;

    // addSession only needs getLicense if a key system has been determined
    if (video.keySystem) {
      getLicenseFn = standardizeKeySystemOptions(keySystem,
        options.keySystems[keySystem]).getLicense;
      // promisify the function
      getLicenseFn = promisifyGetLicense(keySystem, getLicenseFn, eventBus);
    }

    return addSession({
      video,
      initDataType,
      initData,
      options,
      getLicense: getLicenseFn,
      removeSession,
      eventBus
    });
  });
};
