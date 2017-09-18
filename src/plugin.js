import videojs from 'video.js';
import {standard5July2016} from './eme';
import fairplay from './fairplay';
import msPrefixed from './ms-prefixed';

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

const handleMsNeedKeyEvent = (event, sourceOptions) => {
  msPrefixed({
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
  // Chrome 42+, Firefox 47+, Edge
  player.tech_.el_.addEventListener('encrypted', (event) => {
    handleEncryptedEvent(event, videojs.mergeOptions(options, player.currentSource()));
  });
  // Support Safari EME with FairPlay
  // (also used in early Chrome or Chrome with EME disabled flag)
  player.tech_.el_.addEventListener('webkitneedkey', (event) => {
    handleWebKitNeedKeyEvent(event,
                             videojs.mergeOptions(options, player.currentSource()));
  });
  // IE11 Windows 8.1+
  player.tech_.el_.addEventListener('msneedkey', (event) => {
    handleMsNeedKeyEvent(event, videojs.mergeOptions(options, player.currentSource()));
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
