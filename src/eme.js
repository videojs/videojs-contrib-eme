import videojs from 'video.js';
import { requestPlayreadyLicense } from './playready';
import window from 'global/window';

export const getSupportedKeySystem = (keySystems) => {
  // As this happens after the src is set on the video, we rely only on the set src (we
  // do not change src based on capabilities of the browser in this plugin).

  let promise;

  Object.keys(keySystems).forEach((keySystem) => {
    // TODO use initDataTypes when appropriate
    const systemOptions = {};
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

  keySession.addEventListener('message', (event) => {
    getLicense(options, event.message)
      .then((license) => {
        return keySession.update(license);
      })
      .catch(videojs.log.error.bind(videojs.log.error, 'failed to get and set license'));
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

  keySession.generateRequest(initDataType, initData).catch(
    videojs.log.error.bind(videojs.log.error,
      'Unable to create or initialize key session')
  );
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
    makeNewRequest({
      mediaKeys: video.mediaKeysObject,
      initDataType,
      initData,
      options,
      getLicense,
      removeSession,
      eventBus
    });
  } else {
    video.pendingSessionData.push({initDataType, initData});
  }
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

  if (certificate) {
    createdMediaKeys.setServerCertificate(certificate);
  }

  for (let i = 0; i < video.pendingSessionData.length; i++) {
    const data = video.pendingSessionData[i];

    makeNewRequest({
      mediaKeys: video.mediaKeysObject,
      initDataType: data.initDataType,
      initData: data.initData,
      options,
      getLicense,
      removeSession,
      eventBus
    });
  }

  video.pendingSessionData = [];

  return video.setMediaKeys(createdMediaKeys);
};

const defaultPlayreadyGetLicense = (url) => (emeOptions, keyMessage, callback) => {
  requestPlayreadyLicense(url, keyMessage, (err, response, responseBody) => {
    if (err) {
      callback(err);
      return;
    }

    callback(null, responseBody);
  });
};

const defaultGetLicense = (url) => (emeOptions, keyMessage, callback) => {
  videojs.xhr({
    uri: url,
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

const promisifyGetLicense = (getLicenseFn, eventBus) => {
  return (emeOptions, keyMessage) => {
    return new Promise((resolve, reject) => {
      getLicenseFn(emeOptions, keyMessage, (err, license) => {
        if (eventBus) {
          eventBus.trigger('licenserequestattempted');
        }
        if (err) {
          reject(err);
        }

        resolve(license);
      });
    });
  };
};

const standardizeKeySystemOptions = (keySystem, keySystemOptions) => {
  if (typeof keySystemOptions === 'string') {
    keySystemOptions = { url: keySystemOptions };
  }

  if (!keySystemOptions.url && !keySystemOptions.getLicense) {
    throw new Error('Neither URL nor getLicense function provided to get license');
  }

  if (keySystemOptions.url && !keySystemOptions.getLicense) {
    keySystemOptions.getLicense = keySystem === 'com.microsoft.playready' ?
      defaultPlayreadyGetLicense(keySystemOptions.url) :
      defaultGetLicense(keySystemOptions.url);
  }

  return keySystemOptions;
};

export const standard5July2016 = ({
  video,
  initDataType,
  initData,
  options,
  removeSession,
  eventBus
}) => {
  let keySystemPromise = Promise.resolve();

  if (typeof video.mediaKeysObject === 'undefined') {
    // Prevent entering this path again.
    video.mediaKeysObject = null;

    // Will store all initData until the MediaKeys is ready.
    video.pendingSessionData = [];

    let certificate;
    let keySystemOptions;

    keySystemPromise = getSupportedKeySystem(options.keySystems);

    if (!keySystemPromise) {
      videojs.log.error('No supported key system found');
      return Promise.resolve();
    }

    keySystemPromise = keySystemPromise.then((keySystemAccess) => {
      return new Promise((resolve, reject) => {
        // save key system for adding sessions
        video.keySystem = keySystemAccess.keySystem;

        keySystemOptions = standardizeKeySystemOptions(
          keySystemAccess.keySystem,
          options.keySystems[keySystemAccess.keySystem]);

        if (!keySystemOptions.getCertificate) {
          resolve(keySystemAccess);
          return;
        }

        keySystemOptions.getCertificate(options, (err, cert) => {
          if (err) {
            reject(err);
            return;
          }

          certificate = cert;

          resolve(keySystemAccess);
        });
      });
    }).then((keySystemAccess) => {
      return keySystemAccess.createMediaKeys();
    }).then((createdMediaKeys) => {
      return setMediaKeys({
        video,
        certificate,
        createdMediaKeys,
        options,
        getLicense: promisifyGetLicense(keySystemOptions.getLicense, eventBus),
        removeSession,
        eventBus
      });
    }).catch(
      videojs.log.error.bind(videojs.log.error,
        'Failed to create and initialize a MediaKeys object')
    );
  }

  return keySystemPromise.then(() => {
    addSession({
      video,
      initDataType,
      initData,
      options,
      // if key system has not been determined then addSession doesn't need getLicense
      getLicense: video.keySystem ?
        promisifyGetLicense(standardizeKeySystemOptions(
          video.keySystem,
          options.keySystems[video.keySystem]).getLicense, eventBus) : null,
      removeSession,
      eventBus
    });
  });
};
