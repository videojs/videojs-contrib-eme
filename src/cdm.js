import window from 'global/window';
import videojs from 'video.js';

const keySystems = {
  fairplay: 'com.apple.fairplay',
  playready: 'com.microsoft.playready',
  widevine: 'com.widevine.alpha',
  clearkey: 'org.w3.clearkey'
};

// Use a combination of API feature and user agent detection to provide an initial
// best guess as to which CDMs are supported
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

// Synchronously return the latest or best guess list of supported CDMs
export const getSupportedCDM = () => {
  return latestSupportResults;
};

// Asynchronously detect the list of supported CDMs
export const detectCDMSupport = () => {
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

  // Note: `requestMediaKeySystemAccess` is undefined in Chrome unless over https
  if (window.MediaKeys && window.navigator.requestMediaKeySystemAccess) {
    const defaultConfig = [{
      initDataTypes: [],
      audioCapabilities: [{
        contentType: 'audio/mp4;codecs="mp4a.40.2"'
      }],
      videoCapabilities: [{
        contentType: 'video/mp4;codecs="avc1.42E01E"'
      }]
    }];

    return Promise.all([
      window.navigator.requestMediaKeySystemAccess(keySystems.widevine, defaultConfig).catch(() => {}),
      window.navigator.requestMediaKeySystemAccess(keySystems.playready, defaultConfig).catch(() => {}),
      window.navigator.requestMediaKeySystemAccess(keySystems.clearkey, defaultConfig).catch(() => {})
    ]).then(([widevine, playready, clearkey]) => {
      results.widevine = !!widevine;
      results.playready = !!playready;
      results.clearkey = !!clearkey;

      // Update the guesses now that we have more definitive answers
      latestSupportResults = results;
      return results;
    });
  }
  // Update the guesses now that we have more definitive answers
  latestSupportResults = results;
  return Promise.resolve(results);

};
