import QUnit from 'qunit';

import {standard5July2016} from '../src/eme';

QUnit.module('videojs-contrib-eme eme');

QUnit.test('5 July 2016 lifecycle', function(assert) {
  assert.expect(40);

  let done = assert.async();
  let callbacks = {};
  let callCounts = {
    requestMediaKeySystemAccess: 0,
    getCertificate: 0,
    getLicense: 0,
    createSession: 0,
    keySessionGenerateRequest: 0,
    keySessionUpdate: 0,
    createMediaKeys: 0
  };

  navigator.requestMediaKeySystemAccess = (keySystem, options) => {
    callCounts.requestMediaKeySystemAccess++;
    return new Promise((resolve, reject) => {
      callbacks.requestMediaKeySystemAccess = resolve;
    });
  };

  let getCertificate = (emeOptions, callback) => {
    callCounts.getCertificate++;
    callbacks.getCertificate = callback;
  };
  let getLicense = (emeOptions, keyMessage, callback) => {
    callCounts.getLicense++;
    callbacks.getLicense = callback;
  };

  let setMediaKeys;
  let video = {
    setMediaKeys: (mediaKeys) => {
      setMediaKeys = mediaKeys;
    }
  };

  let options = {
    keySystems: {
      'org.w3.clearkey': {
        getCertificate,
        getLicense
      }
    }
  };

  let keySessionEventListeners = {};
  let mediaKeys = {
    createSession: () => {
      callCounts.createSession++;
      return {
        addEventListener: (name, callback) => {
          keySessionEventListeners[name] = callback;
        },
        generateRequest: () => {
          callCounts.keySessionGenerateRequest++;
          return new Promise(() => {});
        },
        update: () => {
          callCounts.keySessionUpdate++;
        }
      };
    }
  };

  let keySystemAccess = {
    keySystem: 'org.w3.clearkey',
    createMediaKeys: () => {
      callCounts.createMediaKeys++;
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
  assert.equal(callCounts.requestMediaKeySystemAccess, 1, 'access requested');
  assert.equal(callCounts.getCertificate, 0, 'certificate not requested');
  assert.equal(callCounts.createMediaKeys, 0, 'media keys not created');
  assert.notEqual(mediaKeys, setMediaKeys, 'media keys not yet set');
  assert.equal(callCounts.createSession, 0, 'key session not created');
  assert.equal(callCounts.keySessionGenerateRequest, 0, 'key session request not made');
  assert.equal(callCounts.getLicense, 0, 'license not requested');
  assert.equal(callCounts.keySessionUpdate, 0, 'key session not updated');

  callbacks.requestMediaKeySystemAccess(keySystemAccess);

  // requestMediaKeySystemAccess promise resolution
  setTimeout(() => {
    // Step 2: get certificate
    assert.equal(callCounts.requestMediaKeySystemAccess, 1, 'access requested');
    assert.equal(callCounts.getCertificate, 1, 'certificate requested');
    assert.equal(callCounts.createMediaKeys, 0, 'media keys not created');
    assert.notEqual(mediaKeys, setMediaKeys, 'media keys not yet set');
    assert.equal(callCounts.createSession, 0, 'key session not created');
    assert.equal(callCounts.keySessionGenerateRequest, 0, 'key session request not made');
    assert.equal(callCounts.getLicense, 0, 'license not requested');
    assert.equal(callCounts.keySessionUpdate, 0, 'key session not updated');

    callbacks.getCertificate(null, '');

    // getCertificate promise resolution
    setTimeout(() => {
      // Step 3: create media keys, set them, and generate key session request
      assert.equal(callCounts.requestMediaKeySystemAccess, 1, 'access requested');
      assert.equal(callCounts.getCertificate, 1, 'certificate requested');
      assert.equal(callCounts.createMediaKeys, 1, 'media keys created');
      assert.equal(mediaKeys, setMediaKeys, 'media keys set');
      assert.equal(callCounts.createSession, 1, 'key session created');
      assert.equal(callCounts.keySessionGenerateRequest, 1, 'key session request made');
      assert.equal(callCounts.getLicense, 0, 'license not requested');
      assert.equal(callCounts.keySessionUpdate, 0, 'key session not updated');

      keySessionEventListeners.message({});

      // Step 4: get license
      assert.equal(callCounts.requestMediaKeySystemAccess, 1, 'access requested');
      assert.equal(callCounts.getCertificate, 1, 'certificate requested');
      assert.equal(callCounts.createMediaKeys, 1, 'media keys created');
      assert.equal(mediaKeys, setMediaKeys, 'media keys set');
      assert.equal(callCounts.createSession, 1, 'key session created');
      assert.equal(callCounts.keySessionGenerateRequest, 1, 'key session request made');
      assert.equal(callCounts.getLicense, 1, 'license requested');
      assert.equal(callCounts.keySessionUpdate, 0, 'key session not updated');

      callbacks.getLicense();

      // getLicense promise resolution
      setTimeout(() => {
        // Step 5: update key session
        assert.equal(callCounts.requestMediaKeySystemAccess, 1, 'access requested');
        assert.equal(callCounts.getCertificate, 1, 'certificate requested');
        assert.equal(callCounts.createMediaKeys, 1, 'media keys created');
        assert.equal(mediaKeys, setMediaKeys, 'media keys set');
        assert.equal(callCounts.createSession, 1, 'key session created');
        assert.equal(callCounts.keySessionGenerateRequest, 1, 'key session request made');
        assert.equal(callCounts.getLicense, 1, 'license requested');
        assert.equal(callCounts.keySessionUpdate, 1, 'key session updated');

        done();
      });
    });
  });
});
