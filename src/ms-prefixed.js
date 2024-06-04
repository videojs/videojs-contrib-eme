/**
 * The W3C Working Draft of 22 October 2013 seems to be the best match for
 * the ms-prefixed API. However, it should only be used as a guide; it is
 * doubtful the spec is 100% implemented as described.
 *
 * @see https://www.w3.org/TR/2013/WD-encrypted-media-20131022
 * @see https://docs.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/compatibility/mt598601(v=vs.85)
 */
import window from 'global/window';
import { requestPlayreadyLicense } from './playready';
import { getMediaKeySystemConfigurations } from './utils';
import EmeError from './consts/errors';
import { safeTriggerOnEventBus } from './eme';

export const PLAYREADY_KEY_SYSTEM = 'com.microsoft.playready';

export const addKeyToSession = (options, session, event, eventBus, emeError) => {
  let playreadyOptions = options.keySystems[PLAYREADY_KEY_SYSTEM];

  if (typeof playreadyOptions.getKey === 'function') {
    playreadyOptions.getKey(options, event.destinationURL, event.message.buffer, (err, key) => {
      if (err) {
        const metadata = {
          errorType: EmeError.EMEFailedToRequestMediaKeySystemAccess,
          config: getMediaKeySystemConfigurations(options.keySystems)
        };

        emeError(err, metadata);
        safeTriggerOnEventBus(eventBus, {
          message: 'Unable to get key: ' + err,
          target: session,
          type: 'mskeyerror'
        });
        return;
      }

      session.update(key);

      safeTriggerOnEventBus(eventBus, {
        type: 'keysessionupdated',
        keySession: session
      });
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
      safeTriggerOnEventBus(eventBus, { type: 'licenserequestattempted' });
    }

    if (err) {
      const metadata = {
        errorType: EmeError.EMEFailedToGenerateLicenseRequest,
        keySystem: PLAYREADY_KEY_SYSTEM
      };

      emeError(err, metadata);
      safeTriggerOnEventBus(eventBus, {
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
    requestPlayreadyLicense(PLAYREADY_KEY_SYSTEM, playreadyOptions, event.message.buffer, options, callback);
  }
};

export const createSession = (video, initData, options, eventBus, emeError) => {
  // Note: invalid mime type passed here throws a NotSupportedError
  const session = video.msKeys.createSession('video/mp4', initData);

  if (!session) {
    const error = new Error('Could not create key session.');
    const metadata = {
      errorType: EmeError.EMEFailedToCreateMediaKeySession,
      keySystem: PLAYREADY_KEY_SYSTEM
    };

    emeError(error, metadata);
    throw error;
  }

  safeTriggerOnEventBus(eventBus, {
    type: 'keysessioncreated',
    keySession: session
  });

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
    safeTriggerOnEventBus(eventBus, {
      type: 'keymessage',
      messageEvent: event
    });
    addKeyToSession(options, session, event, eventBus, emeError);
  });

  session.addEventListener('mskeyerror', (event) => {
    const metadata = {
      errorType: EmeError.EMEFailedToCreateMediaKeySession,
      keySystem: PLAYREADY_KEY_SYSTEM
    };

    emeError(session.error, metadata);
    safeTriggerOnEventBus(eventBus, {
      message: 'Unexpected key error from key session with ' +
      `code: ${session.error.code} and systemCode: ${session.error.systemCode}`,
      target: session,
      type: 'mskeyerror'
    });
  });

  session.addEventListener('mskeyadded', () => {
    safeTriggerOnEventBus(eventBus, {
      target: session,
      type: 'mskeyadded'
    });
  });
};

export default ({video, initData, options, eventBus, emeError}) => {
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
    const metadata = {
      errorType: EmeError.EMEFailedToCreateMediaKeys,
      keySystem: PLAYREADY_KEY_SYSTEM
    };

    emeError(e, metadata);
    throw new Error('Unable to create media keys for PlayReady key system. ' +
      'Error: ' + e.message);
  }

  createSession(video, initData, options, eventBus, emeError);
};
