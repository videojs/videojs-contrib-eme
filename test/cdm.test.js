import QUnit from 'qunit';
import window from 'global/window';
import videojs from 'video.js';
import {detectSupportedCDMs } from '../src/cdm.js';

// `IS_CHROMIUM` and `IS_WINDOWS` are newer Video.js features, so add fallback just in case
const IS_CHROMIUM = videojs.browser.IS_CHROMIUM || (/Chrome|CriOS/i).test(window.navigator.userAgent);
const IS_WINDOWS = videojs.browser.IS_WINDOWS || (/Windows/i).test(window.navigator.userAgent);

QUnit.module('videojs-contrib-eme CDM Module');

QUnit.skip('detectSupportedCDMs() returns a Promise', function(assert) {
  const promise = detectSupportedCDMs();

  assert.ok(promise.then);
});

// NOTE: This test is not future-proof. It verifies that the CDM detect function
// works as expected given browser's *current* CDM support. If that support changes,
// this test may need updating.
QUnit.test('detectSupportedCDMs() promise resolves correctly on different browsers', function(assert) {
  const done = assert.async();
  const promise = detectSupportedCDMs();

  promise.then((result) => {
    // Currently, widevine and clearkey don't work in headless Chrome, so we can't verify cdm support in
    // the remote Video.js test environment. However, it can be verified if testing locally in a real browser.
    // Headless Chrome bug: https://bugs.chromium.org/p/chromium/issues/detail?id=788662
    if (videojs.browser.IS_CHROME) {
      assert.equal(result.fairplay, false, 'fairplay not supported in Chrome');
      assert.equal(result.playready, false, 'playready not supported in Chrome');

      // Uncomment if testing locally in actual browser
      // assert.equal(result.clearkey, true, 'clearkey is supported in Chrome');
      // assert.equal(result.widevine, true, 'widevine is supported in Chrome');
    }

    // Widevine requires a plugin in Ubuntu Firefox so it also does not work in the remote Video.js test environment
    if (videojs.browser.IS_FIREFOX) {
      assert.equal(result.fairplay, false, 'fairplay not supported in FF');
      assert.equal(result.playready, false, 'playready not supported in FF');
      assert.equal(result.clearkey, true, 'clearkey is supported in FF');

      // Uncomment if testing locally in actual browser
      // assert.equal(result.widevine, true, 'widevine is supported in Chrome and FF');
    }

    if (videojs.browser.IS_ANY_SAFARI) {
      assert.deepEqual(result, {
        fairplay: true,
        clearkey: true,
        playready: false,
        widevine: false
      }, 'fairplay support reported in Safari');
    }

    if (videojs.browser.IS_EDGE && IS_CHROMIUM && !IS_WINDOWS) {
      assert.deepEqual(result, {
        fairplay: false,
        playready: false,
        widevine: true,
        clearkey: true
      }, 'widevine support reported in non-Windows Chromium Edge');
    }

    if (videojs.browser.IS_EDGE && IS_CHROMIUM && IS_WINDOWS) {
      assert.deepEqual(result, {
        fairplay: false,
        playready: true,
        widevine: true,
        clearkey: true
      }, 'widevine and playready support reported in Windows Chromium Edge');
    }

    done();
  }).catch(done);
});
