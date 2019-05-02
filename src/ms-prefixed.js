/**
 * The W3C Working Draft of 22 October 2013 seems to be the best match for
 * the ms-prefixed API. However, it should only be used as a guide; it is
 * doubtful the spec is 100% implemented as described.
 * @see https://www.w3.org/TR/2013/WD-encrypted-media-20131022
 * @see https://docs.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/compatibility/mt598601(v=vs.85)
 */
import window from 'global/window';
import { requestPlayreadyLicense } from './playready';

export const PLAYREADY_KEY_SYSTEM = 'com.microsoft.playready';

export const addKeyToSession = (options, session, event, eventBus) => {
  let playreadyOptions = options.keySystems[PLAYREADY_KEY_SYSTEM];

  if (typeof playreadyOptions.getKey === 'function') {
    playreadyOptions.getKey(
      options, event.destinationURL, event.message.buffer, (err, key) => {
        if (err) {
          eventBus.trigger({
            message: 'Unable to get key: ' + err,
            target: session,
            type: 'mskeyerror'
          });
          return;
        }

        session.update(key);
      });
    return;
  }

  if (typeof playreadyOptions === 'string') {
    playreadyOptions = {url: playreadyOptions};
  } else if (typeof playreadyOptions === 'boolean') {
    playreadyOptions = {};
  }

  if (!playreadyOptions.url) {
    playreadyOptions.url = event.destinationURL;
  }

  const callback = (err, responseBody) => {
    if (eventBus) {
      eventBus.trigger('licenserequestattempted');
    }

    if (err) {
      eventBus.trigger({
        message: 'Unable to request key from url: ' + playreadyOptions.url,
        target: session,
        type: 'mskeyerror'
      });
      return;
    }

    session.update(new Uint8Array(responseBody));
  };

  if (playreadyOptions.getLicense) {
    playreadyOptions.getLicense(options, event.message.buffer, callback);
  } else {
    requestPlayreadyLicense(playreadyOptions, event.message.buffer, options, callback);
  }
};

export const createSession = (video, initData, options, eventBus) => {
  // Note: invalid mime type passed here throws a NotSupportedError
  const session = video.msKeys.createSession('video/mp4', initData);

  if (!session) {
    throw new Error('Could not create key session.');
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
    addKeyToSession(options, session, event, eventBus);
  });

  session.addEventListener('mskeyerror', (event) => {
    eventBus.trigger({
      message: 'Unexpected key error from key session with ' +
      `code: ${session.error.code} and systemCode: ${session.error.systemCode}`,
      target: session,
      type: 'mskeyerror'
    });
  });

  session.addEventListener('mskeyadded', () => {
    eventBus.trigger({
      target: session,
      type: 'mskeyadded'
    });
  });
};

export default ({video, initData, options, eventBus}) => {
  // Although by the standard examples the presence of video.msKeys is checked first to
  // verify that we aren't trying to create a new session when one already exists, here
  // sessions are managed earlier (on the player.eme object), meaning that at this point
  // any existing keys should be cleaned up.
  // TODO: Will this break rotation? Is it safe?
  if (video.msKeys) {
    delete video.msKeys;
  }

  try {
    video.msSetMediaKeys(new window.MSMediaKeys(PLAYREADY_KEY_SYSTEM));
  } catch (e) {
    throw new Error('Unable to create media keys for PlayReady key system. ' +
      'Error: ' + e.message);
  }

  createSession(video, initData, options, eventBus);
};
