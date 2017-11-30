import videojs from 'video.js';
import { requestPlayreadyLicense } from './playready';

const getSupportedKeySystem = ({video, keySystems}) => {
  // As this happens after the src is set on the video, we rely only on the set src (we
  // do not change src based on capabilities of the browser in this plugin).

  let promise;

  Object.keys(keySystems).forEach((keySystem) => {
    // TODO use initDataTypes when appropriate
    let systemOptions = {};
    let audioContentType = keySystems[keySystem].audioContentType;
    let videoContentType = keySystems[keySystem].videoContentType;

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
      promise = navigator.requestMediaKeySystemAccess(keySystem, [systemOptions]);
    } else {
      promise = promise.catch(
        (e) => navigator.requestMediaKeySystemAccess(keySystem, [systemOptions]));
    }
  });

  return promise;
};

const makeNewRequest = ({mediaKeys, initDataType, initData, options, getLicense}) => {
  let keySession = mediaKeys.createSession();

  keySession.addEventListener('message', (event) => {
    getLicense(options, event.message)
      .then((license) => {
        return keySession.update(license);
      })
      .catch(videojs.log.error.bind(videojs.log.error, 'failed to get and set license'));
  }, false);

  keySession.generateRequest(initDataType, initData).catch(
    videojs.log.error.bind(videojs.log.error,
                           'Unable to create or initialize key session')
  );
};

const addSession = ({video, initDataType, initData, options, getLicense}) => {
  if (video.mediaKeysObject) {
    makeNewRequest({
      mediaKeys: video.mediaKeysObject,
      initDataType,
      initData,
      options,
      getLicense
    });
  } else {
    video.pendingSessionData.push({initDataType, initData});
  }
};

const setMediaKeys = ({video, certificate, createdMediaKeys, options, getLicense}) => {
  video.mediaKeysObject = createdMediaKeys;

  if (certificate) {
    createdMediaKeys.setServerCertificate(certificate);
  }

  for (let i = 0; i < video.pendingSessionData.length; i++) {
    let data = video.pendingSessionData[i];

    makeNewRequest({
      mediaKeys: video.mediaKeysObject,
      initDataType: data.initDataType,
      initData: data.initData,
      options,
      getLicense
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

const promisifyGetLicense = (getLicenseFn) => {
  return (emeOptions, keyMessage) => {
    return new Promise((resolve, reject) => {
      getLicenseFn(emeOptions, keyMessage, (err, license) => {
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

export const standard5July2016 = ({video, initDataType, initData, options}) => {
  if (!options || !options.keySystems) {
    return;
  }

  if (typeof video.mediaKeysObject === 'undefined') {
    // Prevent entering this path again.
    video.mediaKeysObject = null;

    // Will store all initData until the MediaKeys is ready.
    video.pendingSessionData = [];

    let certificate;
    let keySystemOptions;

    let keySystemPromise = getSupportedKeySystem({
      video,
      keySystems: options.keySystems
    });

    if (!keySystemPromise) {
      videojs.log.error('No supported key system found');
      return;
    }

    keySystemPromise.then((keySystemAccess) => {
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
        getLicense: promisifyGetLicense(keySystemOptions.getLicense)
      });
    }).catch(
      videojs.log.error.bind(videojs.log.error,
                             'Failed to create and initialize a MediaKeys object')
    );
  }

  addSession({
    video,
    initDataType,
    initData,
    options,
    // if key system has not been determined then addSession doesn't need getLicense
    getLicense: video.keySystem ?
      promisifyGetLicense(standardizeKeySystemOptions(
        video.keySystem,
        options.keySystems[video.keySystem]).getLicense) : null
  });
};
