import videojs from 'video.js';
import { requestPlayreadyLicense } from './playready';
import window from 'global/window';
import {mergeAndRemoveNull} from './utils';

/**
 * Returns an array of MediaKeySystemConfigurationObjects provided in the keySystem
 * options.
 *
 * @see {@link https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration|MediaKeySystemConfigurationObject}
 *
 * @param {Object} keySystemOptions
 *        Options passed into videojs-contrib-eme for a specific keySystem
 * @return {Object[]}
 *         Array of MediaKeySystemConfigurationObjects
 */
export const getSupportedConfigurations = (keySystemOptions) => {
  if (keySystemOptions.supportedConfigurations) {
    return keySystemOptions.supportedConfigurations;
  }

  // TODO use initDataTypes when appropriate
  const supportedConfiguration = {};
  const audioContentType = keySystemOptions.audioContentType;
  const audioRobustness = keySystemOptions.audioRobustness;
  const videoContentType = keySystemOptions.videoContentType;
  const videoRobustness = keySystemOptions.videoRobustness;
  const persistentState = keySystemOptions.persistentState;

  if (audioContentType || audioRobustness) {
    supportedConfiguration.audioCapabilities = [
      Object.assign({},
        (audioContentType ? { contentType: audioContentType } : {}),
        (audioRobustness ? { robustness: audioRobustness } : {})
      )
    ];
  }

  if (videoContentType || videoRobustness) {
    supportedConfiguration.videoCapabilities = [
      Object.assign({},
        (videoContentType ? { contentType: videoContentType } : {}),
        (videoRobustness ? { robustness: videoRobustness } : {})
      )
    ];
  }

  if (persistentState) {
    supportedConfiguration.persistentState = persistentState;
  }

  return [supportedConfiguration];
};

export const getSupportedKeySystem = (keySystems) => {
  // As this happens after the src is set on the video, we rely only on the set src (we
  // do not change src based on capabilities of the browser in this plugin).

  let promise;

  Object.keys(keySystems).forEach((keySystem) => {
    const supportedConfigurations = getSupportedConfigurations(keySystems[keySystem]);

    if (!promise) {
      promise =
        window.navigator.requestMediaKeySystemAccess(keySystem, supportedConfigurations);
    } else {
      promise = promise.catch((e) =>
        window.navigator.requestMediaKeySystemAccess(keySystem, supportedConfigurations));
    }
  });

  return promise;
};

export const makeNewRequest = (requestOptions) => {
  const {
    mediaKeys,
    initDataType,
    initData,
    options,
    getLicense,
    removeSession,
    eventBus
  } = requestOptions;
  const keySession = mediaKeys.createSession();

  eventBus.trigger('keysessioncreated');

  return new Promise((resolve, reject) => {

    keySession.addEventListener('message', (event) => {
      // all other types will be handled by keystatuseschange
      if (event.messageType !== 'license-request' && event.messageType !== 'license-renewal') {
        return;
      }
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
          makeNewRequest(requestOptions);
        });
      }
    }, false);

    keySession.generateRequest(initDataType, initData).catch(() => {
      reject('Unable to create or initialize key session');
    });
  });
};

/*
 * Creates a new media key session if media keys are available, otherwise queues the
 * session creation for when the media keys are available.
 *
 * @see {@link https://www.w3.org/TR/encrypted-media/#dom-mediakeysession|MediaKeySession}
 * @see {@link https://www.w3.org/TR/encrypted-media/#dom-mediakeys|MediaKeys}
 *
 * @function addSession
 * @param {Object} video
 *        Target video element
 * @param {string} initDataType
 *        The type of init data provided
 * @param {Uint8Array} initData
 *        The media's init data
 * @param {Object} options
 *        Options provided to the plugin for this key system
 * @param {function()} [getLicense]
 *        User provided function to retrieve a license
 * @param {function()} removeSession
 *        Function to remove the persisted session on key expiration so that a new session
 *        may be created
 * @param {Object} eventBus
 *        Event bus for any events pertinent to users
 * @return {Promise}
 *         A resolved promise if session is waiting for media keys, or a promise for the
 *         session creation if media keys are available
 */
export const addSession = ({
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

  video.pendingSessionData.push({
    initDataType,
    initData,
    options,
    getLicense,
    removeSession,
    eventBus
  });
  return Promise.resolve();
};

/*
 * Given media keys created from a key system access object, check for any session data
 * that was queued and create new sessions for each.
 *
 * @see {@link https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemaccess|MediaKeySystemAccess}
 * @see {@link https://www.w3.org/TR/encrypted-media/#dom-mediakeysession|MediaKeySession}
 * @see {@link https://www.w3.org/TR/encrypted-media/#dom-mediakeys|MediaKeys}
 *
 * @function addPendingSessions
 * @param {Object} video
 *        Target video element
 * @param {string} [certificate]
 *        The server certificate (if used)
 * @param {Object} createdMediaKeys
 *        Media keys to use for session creation
 * @return {Promise}
 *         A promise containing new session creations and setting of media keys on the
 *         video object
 */
export const addPendingSessions = ({
  video,
  certificate,
  createdMediaKeys
}) => {
  // save media keys on the video element to act as a reference for other functions so
  // that they don't recreate the keys
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
      options: data.options,
      getLicense: data.getLicense,
      removeSession: data.removeSession,
      eventBus: data.eventBus
    }));
  }

  video.pendingSessionData = [];

  promises.push(video.setMediaKeys(createdMediaKeys));

  return Promise.all(promises);
};

const defaultPlayreadyGetLicense = (keySystemOptions) => (emeOptions, keyMessage, callback) => {
  requestPlayreadyLicense(keySystemOptions, keyMessage, emeOptions, callback);
};

export const defaultGetLicense = (keySystemOptions) => (emeOptions, keyMessage, callback) => {
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

    if (response.statusCode >= 400 && response.statusCode <= 599) {
      // Pass an empty object as the error to use the default code 5 error message
      callback({});
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
          return;
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
      defaultPlayreadyGetLicense(keySystemOptions) :
      defaultGetLicense(keySystemOptions);
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

  if (typeof video.mediaKeysObject === 'undefined') {
    // Prevent entering this path again.
    video.mediaKeysObject = null;

    // Will store all initData until the MediaKeys is ready.
    video.pendingSessionData = [];

    let certificate;
    let keySystemOptions;

    keySystemPromise = new Promise((resolve, reject) => {
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

        resolve();
      });
    }).then(() => {
      return keySystemAccess.createMediaKeys();
    }).then((createdMediaKeys) => {
      return addPendingSessions({
        video,
        certificate,
        createdMediaKeys
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
    return addSession({
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
