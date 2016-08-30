import videojs from 'video.js';
import {standard5July2016} from './eme';
import fairplay from './fairplay';

let lastSource;

const handleEncryptedEvent = (event, sourceOptions) => {
  standard5July2016({
    video: event.target,
    initDataType: event.initDataType,
    initData: event.initData,
    options: sourceOptions
  });
};

const handleWebKitNeedKeyEvent = (event, sourceOptions) => {
  fairplay({
    video: event.target,
    initData: event.initData,
    options: sourceOptions
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
const onPlayerReady = (player, options) => {
  if (player.$('.vjs-tech').tagName.toLowerCase() !== 'video') {
    return;
  }

  // Support EME 05 July 2016
  player.tech_.el_.addEventListener('encrypted', (event) => {
    handleEncryptedEvent(event, videojs.mergeOptions(options, lastSource));
  });
  // Support Safari EME with FairPlay
  // (also used in early Chrome or Chrome with EME disabled flag)
  player.tech_.el_.addEventListener('webkitneedkey', (event) => {
    handleWebKitNeedKeyEvent(event, videojs.mergeOptions(options, lastSource));
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
const eme = function(options) {
  this.ready(() => {
    onPlayerReady(this, videojs.mergeOptions({}, options));
  });
};

let sourceGrabber = {
  canHandleSource: (sourceObject) => {
    lastSource = sourceObject;
    return '';
  },
  // should never be called
  handleSource: () => {},
  canPlayType: () => ''
};

// register to beginning of HTML5 source handlers
videojs.getComponent('Html5').registerSourceHandler(sourceGrabber, 0);

// Register the plugin with video.js.
videojs.plugin('eme', eme);

export default eme;
