import videojs from 'video.js';
import window from 'global/window';
import { requestPlayreadyLicense } from './playready';

const PLAYREADY_KEY_SYSTEM = 'com.microsoft.playready';

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
  if (!options.keySystems || !options.keySystems[PLAYREADY_KEY_SYSTEM]) {
    videojs.log.error('PlayReady key system options not provided to decrypt video');
    return;
  }

  if (video.msKeys) {
    return;
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
