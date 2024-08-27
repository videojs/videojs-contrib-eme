import videojs from 'video.js';
import { requestPlayreadyLicense } from './playready';
import window from 'global/window';
import {uint8ArrayToString, mergeAndRemoveNull} from './utils';
import {httpResponseHandler} from './http-handler.js';
import {
  defaultGetCertificate as defaultFairplayGetCertificate,
  defaultGetLicense as defaultFairplayGetLicense,
  defaultGetContentId as defaultFairplayGetContentId
} from './fairplay';
import EmeError from './consts/errors';

const isFairplayKeySystem = (str) => str.startsWith('com.apple.fps');

/**
 * Trigger an event on the event bus component safely.
 *
 * This is used because there are cases where we can see race conditions
 * between asynchronous operations (like closing a key session) and the
 * availability of the event bus's DOM element.
 *
 * @param  {Component} eventBus
 * @param  {...} args
 */
export const safeTriggerOnEventBus = (eventBus, args) => {
  if (eventBus.isDisposed()) {
    return;
  }

  eventBus.trigger({...args});
};

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
export const getSupportedConfigurations = (keySystem, keySystemOptions) => {
  if (keySystemOptions.supportedConfigurations) {
    return keySystemOptions.supportedConfigurations;
  }

  const isFairplay = isFairplayKeySystem(keySystem);
  const supportedConfiguration = {};
  const initDataTypes = keySystemOptions.initDataTypes ||
    // fairplay requires an explicit initDataTypes
    (isFairplay ? ['sinf'] : null);
  const audioContentType = keySystemOptions.audioContentType;
  const audioRobustness = keySystemOptions.audioRobustness;
  const videoContentType = keySystemOptions.videoContentType ||
    // fairplay requires an explicit videoCapabilities/videoContentType
    (isFairplay ? 'video/mp4' : null);
  const videoRobustness = keySystemOptions.videoRobustness;
  const persistentState = keySystemOptions.persistentState;

  if (audioContentType || audioRobustness) {
    supportedConfiguration.audioCapabilities = [
      Object.assign(
        {},
        (audioContentType ? { contentType: audioContentType } : {}),
        (audioRobustness ? { robustness: audioRobustness } : {})
      )
    ];
  }

  if (videoContentType || videoRobustness) {
    supportedConfiguration.videoCapabilities = [
      Object.assign(
        {},
        (videoContentType ? { contentType: videoContentType } : {}),
        (videoRobustness ? { robustness: videoRobustness } : {})
      )
    ];
  }

  if (persistentState) {
    supportedConfiguration.persistentState = persistentState;
  }

  if (initDataTypes) {
    supportedConfiguration.initDataTypes = initDataTypes;
  }

  return [supportedConfiguration];
};

export const getSupportedKeySystem = (keySystems) => {
  // As this happens after the src is set on the video, we rely only on the set src (we
  // do not change src based on capabilities of the browser in this plugin).

  let promise;

  Object.keys(keySystems).forEach((keySystem) => {
    const supportedConfigurations = getSupportedConfigurations(keySystem, keySystems[keySystem]);

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

export const makeNewRequest = (player, requestOptions) => {
  const {
    mediaKeys,
    initDataType,
    initData,
    options,
    getLicense,
    removeSession,
    eventBus,
    contentId,
    emeError,
    keySystem
  } = requestOptions;

  let timeElapsed = 0;
  let pauseTimer;

  player.on('pause', () => {
    if (options.limitRenewalsMaxPauseDuration && typeof options.limitRenewalsMaxPauseDuration === 'number') {

      pauseTimer = setInterval(() => {
        timeElapsed++;
        if (timeElapsed >= options.limitRenewalsMaxPauseDuration) {
          clearInterval(pauseTimer);
        }
      }, 1000);

      player.on('play', () => {
        clearInterval(pauseTimer);
        timeElapsed = 0;
      });
    }
  });

  try {
    const keySession = mediaKeys.createSession();

    const closeAndRemoveSession = () => {
      videojs.log.debug('Session expired, closing the session.');
      keySession.close().then(() => {

        // Because close() is async, this promise could resolve after the
        // player has been disposed.
        if (eventBus.isDisposed()) {
          return;
        }

        safeTriggerOnEventBus(eventBus, {
          type: 'keysessionclosed',
          keySession
        });
        removeSession(initData);
      }).catch((error) => {
        const metadata = {
          errorType: EmeError.EMEFailedToCloseSession,
          keySystem
        };

        emeError(error, metadata);
      });
    };

    safeTriggerOnEventBus(eventBus, {
      type: 'keysessioncreated',
      keySession
    });

    player.on('dispose', () => {
      closeAndRemoveSession();
    });

    return new Promise((resolve, reject) => {
      keySession.addEventListener('message', (event) => {
        safeTriggerOnEventBus(eventBus, {
          type: 'keymessage',
          messageEvent: event
        });
        // all other types will be handled by keystatuseschange
        if (event.messageType !== 'license-request' && event.messageType !== 'license-renewal') {
          return;
        }

        if (event.messageType === 'license-renewal') {
          const limitRenewalsBeforePlay = options.limitRenewalsBeforePlay;
          const limitRenewalsMaxPauseDuration = options.limitRenewalsMaxPauseDuration;
          const validLimitRenewalsMaxPauseDuration = typeof limitRenewalsMaxPauseDuration === 'number';
          const renewingBeforePlayback = !player.hasStarted() && limitRenewalsBeforePlay;
          const maxPauseDurationReached = player.paused() && validLimitRenewalsMaxPauseDuration && timeElapsed >= limitRenewalsMaxPauseDuration;
          const ended = player.ended();

          if (renewingBeforePlayback || maxPauseDurationReached || ended) {
            closeAndRemoveSession();
            return;
          }
        }

        getLicense(options, event.message, contentId)
          .then((license) => {
            resolve(keySession.update(license).then(() => {
              safeTriggerOnEventBus(eventBus, {
                type: 'keysessionupdated',
                keySession
              });
            }).catch((error) => {
              const metadata = {
                errorType: EmeError.EMEFailedToUpdateSessionWithReceivedLicenseKeys,
                keySystem
              };

              emeError(error, metadata);
            }));
          })
          .catch((err) => {
            reject(err);
          });
      }, false);

      const KEY_STATUSES_CHANGE = 'keystatuseschange';

      keySession.addEventListener(KEY_STATUSES_CHANGE, (event) => {
        let expired = false;

        // Protect from race conditions causing the player to be disposed.
        if (eventBus.isDisposed()) {
          return;
        }

        // Re-emit the keystatuseschange event with the entire keyStatusesMap
        safeTriggerOnEventBus(eventBus, {
          type: KEY_STATUSES_CHANGE,
          keyStatuses: keySession.keyStatuses
        });

        // Keep 'keystatuschange' for backward compatibility.
        // based on https://www.w3.org/TR/encrypted-media/#example-using-all-events
        keySession.keyStatuses.forEach((status, keyId) => {
          // Trigger an event so that outside listeners can take action if appropriate.
          // For instance, the `output-restricted` status should result in an
          // error being thrown.
          safeTriggerOnEventBus(eventBus, {
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
            const message =
              'Key status reported as "internal-error." Leaving the session open since we ' +
              'don\'t have enough details to know if this error is fatal.';

            // "This value is not actionable by the application."
            // https://www.w3.org/TR/encrypted-media/#dom-mediakeystatus-internal-error
            videojs.log.warn(message, event);
            break;
          }
        });

        if (expired) {
          // Close session and remove it from the session list to ensure that a new
          // session can be created.
          closeAndRemoveSession();
        }
      }, false);

      keySession.generateRequest(initDataType, initData).catch((error) => {
        const metadata = {
          errorType: EmeError.EMEFailedToGenerateLicenseRequest,
          keySystem
        };

        emeError(error, metadata);
        reject('Unable to create or initialize key session');
      });
    });

  } catch (error) {
    const metadata = {
      errorType: EmeError.EMEFailedToCreateMediaKeySession,
      keySystem
    };

    emeError(error, metadata);
  }
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
  player,
  video,
  initDataType,
  initData,
  options,
  getLicense,
  contentId,
  removeSession,
  eventBus,
  emeError
}) => {
  const sessionData = {
    initDataType,
    initData,
    options,
    getLicense,
    removeSession,
    eventBus,
    contentId,
    emeError,
    keySystem: video.keySystem
  };

  if (video.mediaKeysObject) {
    sessionData.mediaKeys = video.mediaKeysObject;
    return makeNewRequest(player, sessionData);
  }

  video.pendingSessionData.push(sessionData);

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
  player,
  video,
  certificate,
  createdMediaKeys,
  emeError
}) => {
  // save media keys on the video element to act as a reference for other functions so
  // that they don't recreate the keys
  video.mediaKeysObject = createdMediaKeys;
  const promises = [];

  if (certificate) {
    promises.push(createdMediaKeys.setServerCertificate(certificate).catch((error) => {
      const metadata = {
        errorType: EmeError.EMEFailedToSetServerCertificate,
        keySystem: video.keySystem
      };

      emeError(error, metadata);
    }));
  }

  for (let i = 0; i < video.pendingSessionData.length; i++) {
    const data = video.pendingSessionData[i];

    promises.push(makeNewRequest(player, {
      mediaKeys: video.mediaKeysObject,
      initDataType: data.initDataType,
      initData: data.initData,
      options: data.options,
      getLicense: data.getLicense,
      removeSession: data.removeSession,
      eventBus: data.eventBus,
      contentId: data.contentId,
      emeError: data.emeError,
      keySystem: video.keySystem
    }));
  }

  video.pendingSessionData = [];

  promises.push(video.setMediaKeys(createdMediaKeys).catch((error) => {
    const metadata = {
      errorType: EmeError.EMEFailedToAttachMediaKeysToVideoElement,
      keySystem: video.keySystem
    };

    emeError(error, metadata);
  }));

  return Promise.all(promises);
};

const defaultPlayreadyGetLicense = (keySystem, keySystemOptions) => (emeOptions, keyMessage, callback) => {
  requestPlayreadyLicense(keySystem, keySystemOptions, keyMessage, emeOptions, callback);
};

export const defaultGetLicense = (keySystem, keySystemOptions) => (emeOptions, keyMessage, callback) => {
  const headers = mergeAndRemoveNull(
    {'Content-type': 'application/octet-stream'},
    emeOptions.emeHeaders,
    keySystemOptions.licenseHeaders
  );

  videojs.xhr({
    uri: keySystemOptions.url,
    method: 'POST',
    responseType: 'arraybuffer',
    requestType: 'license',
    metadata: { keySystem },
    body: keyMessage,
    headers
  }, httpResponseHandler(callback, true));
};

const promisifyGetLicense = (keySystem, getLicenseFn, eventBus) => {
  return (emeOptions, keyMessage, contentId) => {
    return new Promise((resolve, reject) => {
      const callback = function(err, license) {
        if (eventBus) {
          safeTriggerOnEventBus(eventBus, { type: 'licenserequestattempted' });
        }
        if (err) {
          reject(err);
          return;
        }

        resolve(license);
      };

      if (isFairplayKeySystem(keySystem)) {
        getLicenseFn(emeOptions, contentId, new Uint8Array(keyMessage), callback);
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

  if (!keySystemOptions.url && keySystemOptions.licenseUri) {
    keySystemOptions.url = keySystemOptions.licenseUri;
  }

  if (!keySystemOptions.url && !keySystemOptions.getLicense) {
    throw new Error(`Missing url/licenseUri or getLicense in ${keySystem} keySystem configuration.`);
  }

  const isFairplay = isFairplayKeySystem(keySystem);

  if (isFairplay && keySystemOptions.certificateUri && !keySystemOptions.getCertificate) {
    keySystemOptions.getCertificate = defaultFairplayGetCertificate(keySystem, keySystemOptions);
  }

  if (isFairplay && !keySystemOptions.getCertificate) {
    throw new Error(`Missing getCertificate or certificateUri in ${keySystem} keySystem configuration.`);
  }

  if (isFairplay && !keySystemOptions.getContentId) {
    keySystemOptions.getContentId = defaultFairplayGetContentId;
  }

  if (keySystemOptions.url && !keySystemOptions.getLicense) {
    if (keySystem === 'com.microsoft.playready') {
      keySystemOptions.getLicense = defaultPlayreadyGetLicense(keySystem, keySystemOptions);
    } else if (isFairplay) {
      keySystemOptions.getLicense = defaultFairplayGetLicense(keySystem, keySystemOptions);
    } else {
      keySystemOptions.getLicense = defaultGetLicense(keySystem, keySystemOptions);
    }
  }

  return keySystemOptions;
};

export const standard5July2016 = ({
  player,
  video,
  initDataType,
  initData,
  keySystemAccess,
  options,
  removeSession,
  eventBus,
  emeError
}) => {
  let keySystemPromise = Promise.resolve();
  const keySystem = keySystemAccess.keySystem;
  let keySystemOptions;

  // try catch so that we return a promise rejection
  try {
    keySystemOptions = standardizeKeySystemOptions(
      keySystem,
      options.keySystems[keySystem]
    );
  } catch (e) {
    return Promise.reject(e);
  }

  const contentId = keySystemOptions.getContentId ?
    keySystemOptions.getContentId(options, uint8ArrayToString(initData)) : null;

  if (typeof video.mediaKeysObject === 'undefined') {
    // Prevent entering this path again.
    video.mediaKeysObject = null;

    // Will store all initData until the MediaKeys is ready.
    video.pendingSessionData = [];

    let certificate;

    keySystemPromise = new Promise((resolve, reject) => {
      // save key system for adding sessions
      video.keySystem = keySystem;

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
      safeTriggerOnEventBus(eventBus, {
        type: 'keysystemaccesscomplete',
        mediaKeys: createdMediaKeys
      });
      return addPendingSessions({
        player,
        video,
        certificate,
        createdMediaKeys,
        emeError
      });
    }).catch((err) => {
      const metadata = {
        errorType: EmeError.EMEFailedToCreateMediaKeys,
        keySystem
      };

      emeError(err, metadata);
      // if we have a specific error message, use it, otherwise show a more
      // generic one
      if (err) {
        return Promise.reject(err);
      }
      return Promise.reject('Failed to create and initialize a MediaKeys object');
    });
  }

  return keySystemPromise.then(() => {
    // if key system has not been determined then addSession doesn't need getLicense
    const getLicense = video.keySystem ?
      promisifyGetLicense(keySystem, keySystemOptions.getLicense, eventBus) : null;

    return addSession({
      player,
      video,
      initDataType,
      initData,
      options,
      getLicense,
      contentId,
      removeSession,
      eventBus,
      emeError
    });
  });
};
