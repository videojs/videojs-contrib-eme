const FAIRPLAY_KEY_SYSTEM = 'com.apple.fps.1_0';

const addKey = ({video, contentId, concatenatedInitData, getKey}) => {
  return new Promise((resolve, reject) => {
    if (!video.webkitKeys) {
      video.webkitSetMediaKeys(new WebKitMediaKeys(FAIRPLAY_KEY_SYSTEM));
    }

    if (!video.webkitKeys) {
      reject('Could not create MediaKeys');
      return;
    }

    let keySession = video.webkitKeys.createSession('video/mp4', concatenatedInitData);

    if (!keySession) {
      reject('Could not create key session');
      return;
    }

    keySession.contentId = contentId;

    keySession.addEventListener('webkitkeymessage', (event) => {
      let message = event.message;

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

    keySession.addEventListener('webkitkeyerror', (event) => {
      reject(event);
    });
  });
};

const fairplay = ({video, initData, options}) => {
  let fairplayOptions = options.keySystems[FAIRPLAY_KEY_SYSTEM];

  return new Promise((resolve, reject) => {
    fairplayOptions.getCertificate({}, (err, certificate) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(certificate);
    });
  }).then((certificate) => {
    return addKey({
      video,
      contentId: fairplayOptions.getContentId(initData),
      concatenatedInitData: fairplayOptions.getConcatenatedInitData(initData,
                                                                    certificate),
      getKey: fairplayOptions.getKey
    });
  }).catch((e) => {
    console.error(e);
  });
};

export default fairplay;
