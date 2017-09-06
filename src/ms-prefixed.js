import videojs from 'video.js';
import window from 'global/window';

const PLAYREADY_KEY_SYSTEM = 'com.microsoft.playready';

export const getMessageContents = (message) => {
  const xml = (new DOMParser()).parseFromString(
    // TODO do we want to support UTF-8?
    String.fromCharCode.apply(null, new Uint16Array(message)),
    'application/xml');
  const headersElement = xml.getElementsByTagName('HttpHeaders')[0];
  const headers = {};

  if (headersElement) {
    const headerNames = headersElement.getElementsByTagName('name');
    const headerValues = headersElement.getElementsByTagName('value');

    for (let i = 0; i < headerNames.length; i++) {
      headers[headerNames[i].childNodes[0].nodeValue] =
        headerValues[i].childNodes[0].nodeValue;
    }
  }

  const challengeElement = xml.getElementsByTagName('Challenge')[0];
  let challenge;

  if (challengeElement) {
    challenge = window.atob(challengeElement.childNodes[0].nodeValue);
  }

  return {
    headers,
    message: challenge
  };
};

export const addKeyToSession = (options, session, event) => {
  let playreadyOptions = options.keySystems[PLAYREADY_KEY_SYSTEM];

  if (typeof playreadyOptions === 'string') {
    playreadyOptions = { url: playreadyOptions };
  }

  // falsy values were covered prior to this, so anything not a filled object (true,
  // empty object, etc.) should use the provided destinationURL
  if (typeof playreadyOptions !== 'object') {
    playreadyOptions = { url: event.destinationURL };
  }

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

  const {headers, message} = getMessageContents(event.message.buffer);

  videojs.xhr({
    uri: playreadyOptions.url,
    method: 'post',
    headers,
    body: message,
    responseType: 'arraybuffer'
  }, (err, response) => {
    if (err) {
      videojs.log.error('Unable to request key from url: ' + playreadyOptions.url);
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
