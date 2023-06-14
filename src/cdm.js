import window from 'global/window';

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
  // Requires different config than other CDMs
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
    return Promise.resolve(results);
  }

  return Promise.all(keySystems.map(({keySystem, supportedConfig}) => {
    return window.navigator.requestMediaKeySystemAccess(keySystem, supportedConfig).catch(() => {});
  })).then(([fairplay, playready, widevine, clearkey]) => {
    results.fairplay = Boolean(fairplay);
    results.playready = Boolean(playready);
    results.widevine = Boolean(widevine);
    results.clearkey = Boolean(clearkey);

    return results;
  });
};
