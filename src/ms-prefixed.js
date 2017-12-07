import videojs from 'video.js';
import window from 'global/window';
import { requestPlayreadyLicense } from './playready';

export const PLAYREADY_KEY_SYSTEM = 'com.microsoft.playready';

export const addKeyToSession = (options, session, event) => {
  let playreadyOptions = options.keySystems[PLAYREADY_KEY_SYSTEM];

  if (typeof playreadyOptions.getKey === 'function') {
    playreadyOptions.getKey(
      options, event.destinationURL, event.message.buffer, (err, key) => {
        if (err) {
          videojs.log.error('Unable to get key: ' + err);
          return;
        }

        session.update(key);
      });
    return;
  }

  if (typeof playreadyOptions === 'string') {
    playreadyOptions = { url: playreadyOptions };
  }

  const url = playreadyOptions.url || event.destinationURL;

  requestPlayreadyLicense(url, event.message.buffer, (err, response) => {
    if (err) {
      videojs.log.error('Unable to request key from url: ' + url);
      return;
    }

    session.update(new Uint8Array(response.body));
  });
};

export const createSession = (video, initData, options) => {
  const session = video.msKeys.createSession('video/mp4', initData);

  if (!session) {
    videojs.log.error('Could not create key session.');
    return;
  }

  // Note that mskeymessage may not always be called for PlayReady:
  //
  // "If initData contains a PlayReady object that contains an OnDemand header, only a
  // keyAdded event is returned (as opposed to a keyMessage event as described in the
  // Encrypted Media Extension draft). Similarly, if initData contains a PlayReady object
  // that contains a key identifier in the hashed data storage (HDS), only a keyAdded
  // event is returned."
  // eslint-disable-next-line max-len
  // @see [PlayReady License Acquisition]{@link https://msdn.microsoft.com/en-us/library/dn468979.aspx}
  session.addEventListener('mskeymessage', (event) => {
    addKeyToSession(options, session, event);
  });

  session.addEventListener('mskeyerror', (event) => {
    videojs.log.error(
      'Unexpected key error from key session with ' +
      `code: ${session.error.code} and systemCode: ${session.error.systemCode}`);
  });
};

export default ({video, initData, options}) => {
  // Although by the standard examples the presence of video.msKeys is checked first to
  // verify that we aren't trying to create a new session when one already exists, here
  // sessions are managed earlier (on the player.eme object), meaning that at this point
  // any existing keys should be cleaned up.
  if (video.msKeys) {
    delete video.msKeys;
  }

  try {
    video.msSetMediaKeys(new window.MSMediaKeys(PLAYREADY_KEY_SYSTEM));
  } catch (e) {
    videojs.log.error(
      'Unable to create media keys for PlayReady key system. Error: ' + e.message);
    return;
  }

  createSession(video, initData, options);
};
