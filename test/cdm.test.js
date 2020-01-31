import QUnit from 'qunit';
import videojs from 'video.js';
import { getSupportedCDMs, createDetectSupportedCDMsFunc } from '../src/cdm.js';

QUnit.module('videojs-contrib-eme CDM Module');

QUnit.test('detectSupportedCDMs() returns a Promise', function(assert) {
  const detectSupportedCDMs = createDetectSupportedCDMsFunc();
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
  const detectSupportedCDMs = createDetectSupportedCDMsFunc();
  const promise = detectSupportedCDMs();

  promise.then((result) => {
    if (videojs.browser.IS_FIREFOX) {
      assert.deepEqual(result, {
        fairplay: false,
        playready: false,
        widevine: true,
        clearkey: true
      }, 'widevine and clearkey support reported in Firefox');
    }

    if (videojs.browser.IS_CHROME) {
      // Currently, CDM support should be the same in Chrome and Firefox, but
      // Widevine doesn't work in headless Chrome, so for now we just check
      // that clearkey: true. When the bug is fixed, this block can be combined
      // with the above Firefox block since the behavior should be the same
      // https://bugs.chromium.org/p/chromium/issues/detail?id=788662
      assert.equal(result.fairplay, false, 'fairplay not supported in Chrome');
      assert.equal(result.playready, false, 'playready not supported in Chrome');
      assert.equal(result.clearkey, true, 'clearkey is supported in Chrome');
    }

    if (videojs.browser.IS_ANY_SAFARI) {
      assert.deepEqual(result, {
        fairplay: true,
        playready: false,
        widevine: false,
        clearkey: false
      }, 'fairplay support reported in Safari');
    }

    if (videojs.browser.IE_VERSION || videojs.browser.IS_EDGE) {
      assert.deepEqual(result, {
        fairplay: false,
        playready: true,
        widevine: false,
        clearkey: false
      }, 'playready support reported in IE/Edge');
    }

    done();
  }).catch(done);
});
