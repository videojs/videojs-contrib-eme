import videojs from 'video.js';

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
      promise.catch((e) => {
        promise = navigator.requestMediaKeySystemAccess(keySystem, [systemOptions]);
      });
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

export const standard5July2016 = ({video, initDataType, initData, options}) => {
  if (typeof video.mediaKeysObject === 'undefined') {
    // Prevent entering this path again.
    video.mediaKeysObject = null;

    // Will store all initData until the MediaKeys is ready.
    video.pendingSessionData = [];

    let certificate;
    let keySystemOptions;

    getSupportedKeySystem({
      video,
      keySystems: options.keySystems
    }).then((keySystemAccess) => {
      return new Promise((resolve, reject) => {
        // save key system for adding sessions
        video.keySystem = keySystemAccess.keySystem;

        keySystemOptions = options.keySystems[keySystemAccess.keySystem];

        if (!keySystemOptions.getCertificate) {
          resolve(keySystemAccess);
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
      promisifyGetLicense(options.keySystems[video.keySystem].getLicense) :
      null
  });
};
