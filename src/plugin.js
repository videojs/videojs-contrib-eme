import videojs from 'video.js';
import {standard5July2016} from './eme';
import fairplay from './fairplay';

let savedOptions;

const handleEncryptedEvent = (event, options) => {
  standard5July2016({
    video: event.target,
    initDataType: event.initDataType,
    initData: event.initData,
    options
  });
};

const handleWebKitNeedKeyEvent = (event, options) => {
  fairplay({
    video: event.target,
    initData: event.initData,
    options
  });
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
const onPlayerReady = (player) => {
  if (!player.tech_.el_.techName_ === 'Html5') {
    return;
  }

  // Support EME 05 July 2016
  player.tech_.el_.addEventListener('encrypted', (event) => {
    handleEncryptedEvent(event, savedOptions);
  });
  // Support Safari EME with FairPlay
  // (also used in early Chrome or Chrome with EME disabled flag)
  player.tech_.el_.addEventListener('webkitneedkey', (event) => {
    handleWebKitNeedKeyEvent(event, savedOptions);
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
 * @function contribEme
 * @param    {Object} [options={}]
 *           An object of options left to the plugin author to define.
 */
const contribEme = function(options) {
  // savedOptions doubles as a state to tell us if we've listened for player ready yet
  if (!savedOptions) {
    this.ready(() => {
      onPlayerReady(this);
    });
  }

  savedOptions = options;
};

// Register the plugin with video.js.
videojs.plugin('contribEme', contribEme);

export default contribEme;
