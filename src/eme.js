const getSupportedKeySystem = ({video, configurations, keySystems}) => {
  // As this happens after the src is set on the video, we rely only on the set src (we
  // do not change src based on capabilities of the browser in this plugin).
  let systemOptions = {};

  if (configurations.audio && configurations.audio[video.src]) {
    systemOptions.audioCapabilities = [{ contentType: configurations.audio[video.src] }];
  }
  if (configurations.video && configurations.video[video.src]) {
    systemOptions.videoCapabilities =  [{ contentType: configurations.video[video.src] }];
  }

  // TODO determine if and when initDataTypes are necessary in systemOptions

  let promise;

  Object.keys(keySystems).forEach((keySystem) => {
    if (!promise) {
      promise = navigator.requestMediaKeySystemAccess(keySystem, [systemOptions]);
    } else {
      promise.catch((error) => {
        promise = navigator.requestMediaKeySystemAccess(keySystem, [systemOptions])
      });
    }
  });

  return promise;
};

const addSession = ({video, initDataType, initData, getLicense}) => {
  if (video.mediaKeysObject) {
    makeNewRequest({
      mediaKeys: video.mediaKeysObject,
      initDataType,
      initData,
      getLicense
    });
  } else {
    video.pendingSessionData.push({initDataType, initData});
  }
};

const makeNewRequest = ({mediaKeys, initDataType, initData, getLicense}) => {
  let keySession = mediaKeys.createSession();

  keySession.addEventListener("message", (event) => {
    getLicense(event.message)
      .then((license) => {
        return keySession.update(license);
      })
      .catch(console.error.bind(console, 'failed to get and set license'));
  }, false);

  keySession.generateRequest(initDataType, initData).catch(
    console.error.bind(console, 'Unable to create or initialize key session')
  );
};

const setMediaKeys = ({video, certificate, createdMediaKeys, getLicense}) => {
  video.mediaKeysObject = createdMediaKeys;

  // TODO determine if OK to skip
  if (certificate) {
    createdMediaKeys.setServerCertificate(certificate);
  }

  for (let i = 0; i < video.pendingSessionData.length; i++) {
    let data = video.pendingSessionData[i];

    makeNewRequest({
      mediaKeys: video.mediaKeysObject,
      initDataType: data.initDataType,
      initData: data.initData,
      getLicense
    });
  }

  video.pendingSessionData = [];

  return video.setMediaKeys(createdMediaKeys);
};

const promisifyGetLicense = (getLicenseFn) => {
  return (keyMessage) => {
    return new Promise((resolve, reject) => {
      getLicenseFn({ keyMessage }, (err, license) => {
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
      configurations: options.configurations,
      keySystems: options.keySystems
    }).then((keySystemAccess) => {
      return new Promise((resolve, reject) => {
        // save key system for adding sessions
        video.keySystem = keySystemAccess.keySystem;

        keySystemOptions = options.keySystems[keySystemAccess.keySystem];

        // TODO determine if OK to skip
        if (!keySystemOptions.getCertificate) {
          resolve(keySystemAccess);
        }

        keySystemOptions.getCertificate({}, (err, cert) => {
          if (err) {
            reject(err);
            return;
          }

          certificate = cert;

          resolve(keySystemAccess);
        })
      });
    }).then((keySystemAccess) => {
      return keySystemAccess.createMediaKeys();
    }).then((createdMediaKeys) => {
      return setMediaKeys({
        video,
        certificate,
        createdMediaKeys,
        getLicense: promisifyGetLicense(keySystemOptions.getLicense)
      });
    }).catch(
      console.error.bind(console, 'Failed to create and initialize a MediaKeys object')
    );
  }

  addSession({
    video,
    initDataType,
    initData,
    // if key system has not been determined then addSession doesn't need getLicense
    getLicense: video.keySystem ?
      promisifyGetLicense(options.keySystems[video.keySystem].getLicense) :
      null
  });
};
