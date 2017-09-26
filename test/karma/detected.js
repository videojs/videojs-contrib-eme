var common = require('./common');

// Runs default testing configuration in multiple environments.

module.exports = function(config) {

  // Travis CI should run in its available Firefox headless browser.
  if (process.env.TRAVIS) {

    config.set(common({
      // TODO Firefox should be included. It is not because it was timing out randomly.
      browsers: ['travisChrome', 'Firefox'],
      plugins: [
        'karma-chrome-launcher',
        'karma-firefox-launcher'
      ]
    }));
  } else {
    config.set(common({

      frameworks: ['detectBrowsers'],

      plugins: [
        'karma-chrome-launcher',
        'karma-detect-browsers',
        'karma-firefox-launcher',
        'karma-ie-launcher',
        'karma-safari-launcher'
      ],

      detectBrowsers: {
        usePhantomJS: false
      }
    }));
  }
};
