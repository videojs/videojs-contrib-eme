const generate = require('videojs-generate-karma-config');

module.exports = function(config) {

  // see https://github.com/videojs/videojs-generate-karma-config
  // for options
  const options = {
    browserstackLaunchers(defaults) {
      delete defaults.bsSafariElCapitan;
      delete defaults.bsEdgeWin10;
      delete defaults.bsIE11Win10;
      return defaults;
    }
  };

  config = generate(config, options);

  // any other custom stuff not supported by options here!
};

