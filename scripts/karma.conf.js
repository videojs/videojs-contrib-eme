const generate = require('videojs-generate-karma-config');

module.exports = function(config) {
  const options = {
    customLaunchers(defaults) {
      return Object.assign(defaults, {
        ChromeHeadlessWithFlags: {
          base: 'ChromeHeadless',
          flags: ['--mute-audio', '--no-sandbox', '--no-user-gesture-required']
        }
      });
    },
    browsers(aboutToRun) {
      const chromeIndex = aboutToRun.indexOf('ChromeHeadless');
      const safariIndex = aboutToRun.indexOf('Safari');

      // change chrome to chrome headless with flags
      if (chromeIndex !== -1) {
        aboutToRun.splice(chromeIndex, 1, 'ChromeHeadlessWithFlags');
      }

      // do not test on safari
      if (safariIndex !== -1) {
        aboutToRun.splice(safariIndex, 1);
      }

      return aboutToRun;

    }
  };

  config = generate(config, options);
};
