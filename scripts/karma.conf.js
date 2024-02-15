const generate = require('videojs-generate-karma-config');

module.exports = function(config) {

  // see https://github.com/videojs/videojs-generate-karma-config
  // for options
  const options = {
    browsers(aboutToRun) {
      // TODO - current firefox headless fails to run w karma, blocking the npm version script.
      // We should look into a better workaround that allows us to still run firefox through karma
      // See https://github.com/karma-runner/karma-firefox-launcher/issues/328
      return aboutToRun.filter(function(launcherName) {
        return launcherName !== 'FirefoxHeadless';
      });
    }
  };

  config = generate(config, options);

  // any other custom stuff not supported by options here!
};

