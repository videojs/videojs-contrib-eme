var babel = require('rollup-plugin-babel');
var commonjs = require('rollup-plugin-commonjs');
var json = require('rollup-plugin-json');
var multiEntry = require('rollup-plugin-multi-entry');
var resolve = require('rollup-plugin-node-resolve');
var istanbul = require('rollup-plugin-istanbul');

module.exports = function(config) {
  config.set({
    basePath: '..',
    frameworks: ['qunit', 'detectBrowsers'],
    client: {
      clearContext: false,
      qunit: {
        showUI: true,
        testTimeout: 30000
      }
    },
    files: [
      'node_modules/sinon/pkg/sinon.js',
      'node_modules/video.js/dist/video.js',
      'node_modules/video.js/dist/video-js.css',
    {
      included: false,
      pattern: 'src/**/*.js',
      watched: true
    }, {
      pattern: 'test/**/*.test.js',
      // Make sure to disable Karma’s file watcher
      // because the preprocessor will use its own.
      watched: false
    }],
    reporters: ['dots', 'coverage'],
    coverageReporter: {
      reporters: [{
        type: 'text-summary'
      }]
    },
    port: 9876,
    colors: true,
    autoWatch: false,
    singleRun: true,
    browserConsoleLogOptions: {
      terminal: false
    },
    concurrency: 1,
    captureTimeout: 300000,
    browserNoActivityTimeout: 300000,
    browserDisconnectTimeout: 300000,
    browserDisconnectTolerance: 3,
    preprocessors: {
      'test/**/*.test.js': ['rollup']
    },
    customLaunchers: {
      ChromeHeadlessWithFlags: {
        base: 'ChromeHeadless',
        flags: [
          '--mute-audio',
          '--no-sandbox',
          '--no-user-gesture-required'
        ]
      }
    },

    detectBrowsers: {
      usePhantomJS: false,

      // detect what browsers are installed on the system and
      // use headless mode and flags to allow for playback
      postDetection: function(browsers) {
        var newBrowsers = browsers.indexOf('Safari') !== -1 ?
          ['Safari'] : [];

        if (browsers.indexOf('Chrome') !== -1) {
          newBrowsers.push('ChromeHeadlessWithFlags');
        }

        if (browsers.indexOf('Firefox') !== -1) {
          newBrowsers.push('FirefoxHeadless');
        }

        return newBrowsers;
      }
    },

    rollupPreprocessor: {
      output: {
        name: 'emeTest',
        format: 'iife',
        sourceMap: 'inline',
        globals: {
          qunit: 'QUnit',
          sinon: 'sinon',
          'video.js': 'videojs'
        }
      },
      external: ['video.js', 'qunit', 'sinon'],
      plugins: [
        multiEntry({ exports: false }),
        resolve({ browser: true, main: true, jsnext: true }),
        json(),
        commonjs({ sourceMap: false }),
        babel({exclude: 'node_modules/**'}),
        istanbul({ exclude: ['test/**/*.js', 'node_modules/**'] })
      ]
    }
  });
};
