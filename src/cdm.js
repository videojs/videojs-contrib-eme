import window from 'global/window';
import videojs from 'video.js';

const keySystems = {
  fairplay: 'com.apple.fairplay',
  playready: 'com.microsoft.playready',
  widevine: 'com.widevine.alpha',
  clearkey: 'org.w3.clearkey'
};

// Use a combination of API feature and user agent detection to provide an initial
// best guess as to which CDMs are supported.
const bestGuessSupport = {
  fairplay: !!window.WebKitMediaKeys,
  playready: !!(window.MSMediaKeys && videojs.browser.IE_VERSION) ||
    !!(window.MediaKeys && window.navigator.requestMediaKeySystemAccess && videojs.browser.IS_EDGE),
  widevine: !!(window.MediaKeys && window.navigator.requestMediaKeySystemAccess) &&
    (videojs.browser.IS_CHROME || videojs.browser.IS_FIREFOX),
  clearkey: !!(window.MediaKeys && window.navigator.requestMediaKeySystemAccess) &&
    (videojs.browser.IS_CHROME || videojs.browser.IS_FIREFOX)
};

let latestSupportResults = bestGuessSupport;

// Synchronously return the latest list of supported CDMs returned by detectCDMSupport().
// If none is available, return the best guess
export const getSupportedCDMs = () => {
  return latestSupportResults;
};

// Asynchronously detect the list of supported CDMs by requesting key system access
// when possible, otherwise rely on browser-specific EME API feature detection. This
// is curried to allow passing a promise polyfill from the player options when the
// plugin is initialized. The polyfill is necessary to ensure the function behaves
// consistently between IE (which lacks native promise support) and other browsers
export const createDetectSupportedCDMsFunc = (promise = window.Promise) => () => {
  const results = {
    fairplay: false,
    playready: false,
    widevine: false,
    clearkey: false
  };

  if (window.WebKitMediaKeys) {
    results.fairplay = true;
  }

  if (window.MSMediaKeys && window.MSMediaKeys.isTypeSupported(keySystems.playready)) {
    results.playready = true;
  }

  if (window.MediaKeys && window.navigator.requestMediaKeySystemAccess) {
    const validConfig = [{
      initDataTypes: [],
      audioCapabilities: [{
        contentType: 'audio/mp4;codecs="mp4a.40.2"'
      }],
      videoCapabilities: [{
        contentType: 'video/mp4;codecs="avc1.42E01E"'
      }]
    }];

    // Currently, Safari doesn't support requestMediaKeySystemAccess() so Fairplay
    // is excluded from the checks here
    return promise.all([
      window.navigator.requestMediaKeySystemAccess(keySystems.widevine, validConfig).catch(() => {}),
      window.navigator.requestMediaKeySystemAccess(keySystems.playready, validConfig).catch(() => {}),
      window.navigator.requestMediaKeySystemAccess(keySystems.clearkey, validConfig).catch(() => {})
    ]).then(([widevine, playready, clearkey]) => {
      results.widevine = !!widevine;
      results.playready = !!playready;
      results.clearkey = !!clearkey;
      latestSupportResults = results;

      return results;
    });
  }

  latestSupportResults = results;

  return promise.resolve(results);
};
