const generate = require('videojs-generate-karma-config');

module.exports = function(config) {
  config = generate(config);
  // any custom stuff here!

  config.customLaunchers = {
    ChromeHeadlessWithFlags: {
      base: 'ChromeHeadless',
      flags: [
        '--mute-audio',
        '--no-sandbox',
        '--no-user-gesture-required'
      ]
    }
  };

  config.browsers = ['ChromeHeadlessWithFlags', 'FirefoxHeadless', 'Safari'];

  config.detectBrowsers.enabled = false;
};
