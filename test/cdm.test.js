import QUnit from 'qunit';
import videojs from 'video.js';
import {IS_CHROMIUM, IS_WINDOWS, getSupportedCDMs, detectSupportedCDMs } from '../src/cdm.js';

QUnit.module('videojs-contrib-eme CDM Module');

QUnit.test('detectSupportedCDMs() returns a Promise', function(assert) {
  const promise = detectSupportedCDMs();

  assert.ok(promise.then);
});

QUnit.test('getSupportedCDMs() returns an object with correct properties', function(assert) {
  const cdmResults = getSupportedCDMs();
  const cdmNames = Object.keys(cdmResults);

  assert.equal(cdmNames.length, 4, 'object contains correct number of properties');
  assert.equal(cdmNames.includes('fairplay'), true, 'object contains fairplay property');
  assert.equal(cdmNames.includes('playready'), true, 'object contains playready property');
  assert.equal(cdmNames.includes('widevine'), true, 'object contains widevine property');
  assert.equal(cdmNames.includes('clearkey'), true, 'object contains clearkey property');
});

// NOTE: This test is not future-proof. It verifies that the CDM detect function
// works as expected given browser's *current* CDM support. If that support changes,
// this test may need updating.
QUnit.test('detectSupportedCDMs() promise resolves correctly on different browsers', function(assert) {
  const done = assert.async();
  const promise = detectSupportedCDMs();

  promise.then((result) => {
    // Currently, widevine doesn't work in headless Chrome and requires a plugin in Ubuntu Firefox, so
    // we can't verify widevine support in the remote Video.js test environment. However, it can be verified
    // if testing locally. Headless Chrome bug: https://bugs.chromium.org/p/chromium/issues/detail?id=788662
    if (videojs.browser.IS_CHROME || videojs.browser.IS_FIREFOX) {
      assert.equal(result.fairplay, false, 'fairplay not supported in Chrome and FF');
      assert.equal(result.playready, false, 'playready not supported in Chrome and FF');
      assert.equal(result.clearkey, true, 'clearkey is supported in Chrome and FF');

      // Uncomment if testing locally
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
