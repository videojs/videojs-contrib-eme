import QUnit from 'qunit';

import {standard5July2016} from '../src/eme';

QUnit.module('videojs-contrib-eme eme');

QUnit.test('5 July 2016 lifecycle', function(assert) {
  assert.expect(40);

  let done = assert.async();
  let requestMediaKeySystemAccessCallback;
  let requestMediaKeySystemAccessCallCount = 0;

  navigator.requestMediaKeySystemAccess = (keySystem, options) => {
    requestMediaKeySystemAccessCallCount++;
    return new Promise((resolve, reject) => {
      requestMediaKeySystemAccessCallback = resolve;
    });
  };

  let getCertificateCallCount = 0;
  let getCertificateCallback;
  let getCertificate = (options, callback) => {
    getCertificateCallCount++;
    getCertificateCallback = callback;
  };
  let getLicenseCallCount = 0;
  let getLicenseCallback;
  let getLicense = (options, callback) => {
    getLicenseCallCount++;
    getLicenseCallback = callback;
  };

  let setMediaKeys;
  let video = {
    setMediaKeys: (mediaKeys) => {
      setMediaKeys = mediaKeys;
    }
  };

  let options = {
    configurations: {},
    keySystems: {
      'org.w3.clearkey': {
        getCertificate,
        getLicense
      }
    }
  };

  let createSessionCallCount = 0;
  let keySessionEventListeners = {};
  let keySessionGenerateRequestCallCount = 0;
  let keySessionUpdateCallCount = 0;
  let mediaKeys = {
    createSession: () => {
      createSessionCallCount++;
      return {
        addEventListener: (name, callback) => {
          keySessionEventListeners[name] = callback;
        },
        generateRequest: () => {
          keySessionGenerateRequestCallCount++;
          return new Promise(() => {});
        },
        update: () => {
          keySessionUpdateCallCount++;
        }
      };
    }
  };

  let createMediaKeysCallCount = 0;
  let keySystemAccess = {
    keySystem: 'org.w3.clearkey',
    createMediaKeys: () => {
      createMediaKeysCallCount++;
      return mediaKeys;
    }
  };

  standard5July2016({
    video,
    initDataType: '',
    initData: '',
    options
  });

  // Step 1: get key system
  assert.equal(requestMediaKeySystemAccessCallCount, 1, 'access requested');
  assert.equal(getCertificateCallCount, 0, 'certificate not requested');
  assert.equal(createMediaKeysCallCount, 0, 'media keys not created');
  assert.notEqual(mediaKeys, setMediaKeys, 'media keys not yet set');
  assert.equal(createSessionCallCount, 0, 'key session not created');
  assert.equal(keySessionGenerateRequestCallCount, 0, 'key session request not made');
  assert.equal(getLicenseCallCount, 0, 'license not requested');
  assert.equal(keySessionUpdateCallCount, 0, 'key session not updated');

  requestMediaKeySystemAccessCallback(keySystemAccess);

  // requestMediaKeySystemAccess promise resolution
  setTimeout(() => {
    // Step 2: get certificate
    assert.equal(requestMediaKeySystemAccessCallCount, 1, 'access requested');
    assert.equal(getCertificateCallCount, 1, 'certificate requested');
    assert.equal(createMediaKeysCallCount, 0, 'media keys not created');
    assert.notEqual(mediaKeys, setMediaKeys, 'media keys not yet set');
    assert.equal(createSessionCallCount, 0, 'key session not created');
    assert.equal(keySessionGenerateRequestCallCount, 0, 'key session request not made');
    assert.equal(getLicenseCallCount, 0, 'license not requested');
    assert.equal(keySessionUpdateCallCount, 0, 'key session not updated');

    getCertificateCallback(null, '');

    // getCertificate promise resolution
    setTimeout(() => {
      // Step 3: create media keys, set them, and generate key session request
      assert.equal(requestMediaKeySystemAccessCallCount, 1, 'access requested');
      assert.equal(getCertificateCallCount, 1, 'certificate requested');
      assert.equal(createMediaKeysCallCount, 1, 'media keys created');
      assert.equal(mediaKeys, setMediaKeys, 'media keys set');
      assert.equal(createSessionCallCount, 1, 'key session created');
      assert.equal(keySessionGenerateRequestCallCount, 1, 'key session request made');
      assert.equal(getLicenseCallCount, 0, 'license not requested');
      assert.equal(keySessionUpdateCallCount, 0, 'key session not updated');

      keySessionEventListeners.message({});

      // Step 4: get license
      assert.equal(requestMediaKeySystemAccessCallCount, 1, 'access requested');
      assert.equal(getCertificateCallCount, 1, 'certificate requested');
      assert.equal(createMediaKeysCallCount, 1, 'media keys created');
      assert.equal(mediaKeys, setMediaKeys, 'media keys set');
      assert.equal(createSessionCallCount, 1, 'key session created');
      assert.equal(keySessionGenerateRequestCallCount, 1, 'key session request made');
      assert.equal(getLicenseCallCount, 1, 'license requested');
      assert.equal(keySessionUpdateCallCount, 0, 'key session not updated');

      getLicenseCallback();

      // getLicense promise resolution
      setTimeout(() => {
        // Step 5: update key session
        assert.equal(requestMediaKeySystemAccessCallCount, 1, 'access requested');
        assert.equal(getCertificateCallCount, 1, 'certificate requested');
        assert.equal(createMediaKeysCallCount, 1, 'media keys created');
        assert.equal(mediaKeys, setMediaKeys, 'media keys set');
        assert.equal(createSessionCallCount, 1, 'key session created');
        assert.equal(keySessionGenerateRequestCallCount, 1, 'key session request made');
        assert.equal(getLicenseCallCount, 1, 'license requested');
        assert.equal(keySessionUpdateCallCount, 1, 'key session updated');

        done();
      });
    });
  });
});
