import window from 'global/window';
import videojs from 'video.js';

// `IS_CHROMIUM` and `IS_WINDOWS` are newer Video.js features, so add fallback just in case
export const IS_CHROMIUM = videojs.browser.IS_CHROMIUM || (/Chrome|CriOS/i).test(window.navigator.userAgent);
export const IS_WINDOWS = videojs.browser.IS_WINDOWS || (/Windows/i).test(window.navigator.userAgent);

// Use a combination of API feature and user agent detection to provide an initial
// best guess as to which CDMs are supported.
const hasMediaKeys = Boolean(window.MediaKeys && window.navigator.requestMediaKeySystemAccess);
const isChromeOrFirefox = videojs.browser.IS_CHROME || videojs.browser.IS_FIREFOX;
const isChromiumEdge = videojs.browser.IS_EDGE && IS_CHROMIUM;
const isAnyEdge = videojs.browser.IS_EDGE;

const bestGuessSupport = {
  fairplay: Boolean(window.WebKitMediaKeys) || (hasMediaKeys && videojs.browser.IS_ANY_SAFARI),
  playready: hasMediaKeys && (isAnyEdge && (!IS_CHROMIUM || IS_WINDOWS)),
  widevine: hasMediaKeys && (isChromeOrFirefox || isChromiumEdge),
  clearkey: hasMediaKeys && (isChromeOrFirefox || isChromiumEdge)
};

let latestSupportResults = bestGuessSupport;

// Synchronously return the latest list of supported CDMs returned by detectCDMSupport().
// If none is available, return the best guess
export const getSupportedCDMs = () => {
  return latestSupportResults;
};

const genericConfig = [{
  initDataTypes: ['cenc'],
  audioCapabilities: [{
    contentType: 'audio/mp4;codecs="mp4a.40.2"'
  }],
  videoCapabilities: [{
    contentType: 'video/mp4;codecs="avc1.42E01E"'
  }]
}];

const keySystems = [
  // Fairplay
  // Needs a different config than the others
  {
    keySystem: 'com.apple.fps',
    supportedConfig: [{
      initDataTypes: ['sinf'],
      videoCapabilities: [{
        contentType: 'video/mp4'
      }]
    }]
  },
  // Playready
  {
    keySystem: 'com.microsoft.playready.recommendation',
    supportedConfig: genericConfig
  },
  // Widevine
  {
    keySystem: 'com.widevine.alpha',
    supportedConfig: genericConfig
  },
  // Clear
  {
    keySystem: 'org.w3.clearkey',
    supportedConfig: genericConfig
  }
];

// Asynchronously detect the list of supported CDMs by requesting key system access
// when possible, otherwise rely on browser-specific EME API feature detection.
export const detectSupportedCDMs = () => {
  const Promise = window.Promise;
  const results = {
    fairplay: Boolean(window.WebKitMediaKeys),
    playready: false,
    widevine: false,
    clearkey: false
  };

  if (!window.MediaKeys || !window.navigator.requestMediaKeySystemAccess) {
    latestSupportResults = results;

    return Promise.resolve(results);
  }

  return Promise.all(keySystems.map(({keySystem, supportedConfig}) => {
    return window.navigator.requestMediaKeySystemAccess(keySystem, supportedConfig).catch(() => {});
  })).then(([fairplay, playready, widevine, clearkey]) => {
    results.fairplay = Boolean(fairplay);
    results.playready = Boolean(playready);
    results.widevine = Boolean(widevine);
    results.clearkey = Boolean(clearkey);

    latestSupportResults = results;

    return results;
  });
};
