import videojs from 'video.js';
import { standard5July2016 } from './eme';
import {
  default as fairplay,
  FAIRPLAY_KEY_SYSTEM
} from './fairplay';
import {
  default as msPrefixed,
  PLAYREADY_KEY_SYSTEM
} from './ms-prefixed';
import { arrayBuffersEqual, arrayBufferFrom } from './utils';

export const hasSession = (sessions, initData) => {
  for (let i = 0; i < sessions.length; i++) {
    // Other types of sessions may be in the sessions array that don't store the initData
    // (for instance, PlayReady sessions on IE11).
    if (!sessions[i].initData) {
      continue;
    }

    // initData should be an ArrayBuffer by the spec:
    // eslint-disable-next-line max-len
    // @see [Media Encrypted Event initData Spec]{@link https://www.w3.org/TR/encrypted-media/#mediaencryptedeventinit}
    //
    // However, on some browsers it may come back with a typed array view of the buffer.
    // This is the case for IE11, however, since IE11 sessions are handled differently
    // (following the msneedkey PlayReady path), this coversion may not be important. It
    // is safe though, and might be a good idea to retain in the short term (until we have
    // catalogued the full range of browsers and their implementations).
    if (arrayBuffersEqual(arrayBufferFrom(sessions[i].initData),
                          arrayBufferFrom(initData))) {
      return true;
    }
  }

  return false;
};

export const handleEncryptedEvent = (event, sourceOptions, sessions) => {
  if (!sourceOptions || !sourceOptions.keySystems) {
    // return silently since it may be handled by a different system
    return;
  }

  // "Initialization Data must be a fixed value for a given set of stream(s) or media
  // data. It must only contain information related to the keys required to play a given
  // set of stream(s) or media data."
  // eslint-disable-next-line max-len
  // @see [Initialization Data Spec]{@link https://www.w3.org/TR/encrypted-media/#initialization-data}
  if (hasSession(sessions, event.initData)) {
    // TODO convert to videojs.log.debug and add back in
    // https://github.com/videojs/video.js/pull/4780
    // videojs.log('eme',
    //             'Already have a configured session for init data, ignoring event.');
    return;
  }

  sessions.push({ initData: event.initData });

  standard5July2016({
    video: event.target,
    initDataType: event.initDataType,
    initData: event.initData,
    options: sourceOptions
  });
};

export const handleWebKitNeedKeyEvent = (event, sourceOptions) => {
  if (!sourceOptions.keySystems || !sourceOptions.keySystems[FAIRPLAY_KEY_SYSTEM]) {
    // return silently since it may be handled by a different system
    return;
  }

  // From Apple's example Safari FairPlay integration code, webkitneedkey is not repeated
  // for the same content. Unless documentation is found to present the opposite, handle
  // all webkitneedkey events the same (even if they are repeated).

  return fairplay({
    video: event.target,
    initData: event.initData,
    options: sourceOptions
  });
};

export const handleMsNeedKeyEvent = (event, sourceOptions, sessions) => {
  if (!sourceOptions.keySystems || !sourceOptions.keySystems[PLAYREADY_KEY_SYSTEM]) {
    // return silently since it may be handled by a different system
    return;
  }

  // "With PlayReady content protection, your Web app must handle the first needKey event,
  // but it must then ignore any other needKey event that occurs."
  // eslint-disable-next-line max-len
  // @see [PlayReady License Acquisition]{@link https://msdn.microsoft.com/en-us/library/dn468979.aspx}
  //
  // Usually (and as per the example in the link above) this is determined by checking for
  // the existence of video.msKeys. However, since the video element may be reused, it's
  // easier to directly manage the session.
  if (sessions.reduce((acc, session) => acc || session.playready, false)) {
    // TODO convert to videojs.log.debug and add back in
    // https://github.com/videojs/video.js/pull/4780
    // videojs.log('eme',
    //             'An \'msneedkey\' event was receieved earlier, ignoring event.');
    return;
  }

  sessions.push({ playready: true });

  msPrefixed({
    video: event.target,
    initData: event.initData,
    options: sourceOptions
  });
};

/**
 * Configure a persistent sessions array and activeSrc property to ensure we properly
 * handle each independent source's events. Should be run on any encrypted or needkey
 * style event to ensure that the sessions reflect the active source.
 *
 * @function setupSessions
 * @param    {Player} player
 */
export const setupSessions = (player) => {
  const src = player.src();

  if (src !== player.eme.activeSrc) {
    player.eme.activeSrc = src;
    player.eme.sessions = [];
  }
};

/**
 * Function to invoke when the player is ready.
 *
 * This is a great place for your plugin to initialize itself. When this
 * function is called, the player will have its DOM and child components
 * in place.
 *
 * @function onPlayerReady
 * @param    {Player} player
 * @param    {Object} [options={}]
 */
const onPlayerReady = (player, options) => {
  if (player.$('.vjs-tech').tagName.toLowerCase() !== 'video') {
    return;
  }

  setupSessions(player);

  // Support EME 05 July 2016
  // Chrome 42+, Firefox 47+, Edge
  player.tech_.el_.addEventListener('encrypted', (event) => {
    // TODO convert to videojs.log.debug and add back in
    // https://github.com/videojs/video.js/pull/4780
    // videojs.log('eme', 'Received an \'encrypted\' event');
    setupSessions(player);
    handleEncryptedEvent(event,
                         videojs.mergeOptions(options, player.currentSource()),
                         player.eme.sessions);
  });
  // Support Safari EME with FairPlay
  // (also used in early Chrome or Chrome with EME disabled flag)
  player.tech_.el_.addEventListener('webkitneedkey', (event) => {
    // TODO convert to videojs.log.debug and add back in
    // https://github.com/videojs/video.js/pull/4780
    // videojs.log('eme', 'Received a \'webkitneedkey\' event');

    // TODO it's possible that the video state must be cleared if reusing the same video
    // element between sources
    setupSessions(player);
    handleWebKitNeedKeyEvent(event,
                             videojs.mergeOptions(options, player.currentSource()));
  });

  // EDGE still fires msneedkey, but should use encrypted instead
  if (videojs.browser.IS_EDGE) {
    return;
  }

  // IE11 Windows 8.1+
  player.tech_.el_.addEventListener('msneedkey', (event) => {
    // TODO convert to videojs.log.debug and add back in
    // https://github.com/videojs/video.js/pull/4780
    // videojs.log('eme', 'Received an \'msneedkey\' event');
    setupSessions(player);
    handleMsNeedKeyEvent(event,
                         videojs.mergeOptions(options, player.currentSource()),
                         player.eme.sessions);
  });
};

/**
 * A video.js plugin.
 *
 * In the plugin function, the value of `this` is a video.js `Player`
 * instance. You cannot rely on the player being in a "ready" state here,
 * depending on how the plugin is invoked. This may or may not be important
 * to you; if not, remove the wait for "ready"!
 *
 * @function eme
 * @param    {Object} [options={}]
 *           An object of options left to the plugin author to define.
 */
const eme = function(options = {}) {
  this.ready(() => {
    onPlayerReady(this, videojs.mergeOptions({}, options));
  });

  this.eme.options = options;
};

// Register the plugin with video.js.
const registerPlugin = videojs.registerPlugin || videojs.plugin;

registerPlugin('eme', eme);

export default eme;
