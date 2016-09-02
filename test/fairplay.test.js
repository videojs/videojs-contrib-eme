import QUnit from 'qunit';

import fairplay from '../src/fairplay';

QUnit.module('videojs-contrib-eme fairplay');

QUnit.test('lifecycle', function(assert) {
  assert.expect(19);

  let done = assert.async();
  let initData = new Uint8Array([1, 2, 3, 4]).buffer;
  let callbacks = {};
  let callCounts = {
    getCertificate: 0,
    getLicense: 0,
    updateKeySession: 0,
    createSession: 0
  };

  let getCertificate = (emeOptions, callback) => {
    callCounts.getCertificate++;
    callbacks.getCertificate = callback;
  };
  let getLicense = (emeOptions, contentId, keyMessage, callback) => {
    callCounts.getLicense++;
    callbacks.getLicense = callback;
  };

  let options = {
    keySystems: {
      'com.apple.fps.1_0': {
        getCertificate,
        getLicense,
        // not needed due to mocking
        getContentId: () => 'some content id'
      }
    }
  };

  // trap event listeners
  let keySessionEventListeners = {};

  let updateKeySession = (key) => {
    callCounts.updateKeySession++;
  };

  let onKeySessionCreated;

  let createSession = (type, concatenatedData) => {
    callCounts.createSession++;
    return {
      addEventListener: (name, callback) => {
        keySessionEventListeners[name] = callback;

        if (name === 'webkitkeyerror') {
          // Since we don't have a way of executing code at the end of addKey's promise,
          // we assume that adding the listener for webkitkeyerror is the last run code
          // within the promise.
          onKeySessionCreated();
        }
      },
      update: updateKeySession
    };
  };

  // mock webkitKeys to avoid browser specific calls and enable us to verify ordering
  let video = {
    webkitKeys: {
      createSession
    }
  };

  fairplay({ video, initData, options })
    .then(() => {
      done();
    });

  // Step 1: getCertificate
  assert.equal(callCounts.getCertificate, 1, 'getCertificate has been called');
  assert.equal(callCounts.createSession, 0, 'a key session has not been created');
  assert.equal(callCounts.getLicense, 0, 'getLicense has not been called');
  assert.equal(callCounts.updateKeySession, 0, 'updateKeySession has not been called');

  callbacks.getCertificate(null, new Uint16Array([4, 5, 6, 7]).buffer);

  onKeySessionCreated = () => {
    // Step 2: create a key session
    assert.equal(callCounts.getCertificate, 1, 'getCertificate has been called');
    assert.equal(callCounts.createSession, 1, 'a key session has been created');
    assert.equal(callCounts.getLicense, 0, 'getLicense has not been called');
    assert.equal(callCounts.updateKeySession, 0, 'updateKeySession has not been called');

    assert.ok(keySessionEventListeners.webkitkeymessage,
              'added an event listener for webkitkeymessage');
    assert.ok(keySessionEventListeners.webkitkeyadded,
              'added an event listener for webkitkeyadded');
    assert.ok(keySessionEventListeners.webkitkeyerror,
              'added an event listener for webkitkeyerror');

    keySessionEventListeners.webkitkeymessage({});

    // Step 3: get the key on webkitkeymessage
    assert.equal(callCounts.getCertificate, 1, 'getCertificate has been called');
    assert.equal(callCounts.createSession, 1, 'a key session has been created');
    assert.equal(callCounts.getLicense, 1, 'getLicense has been called');
    assert.equal(callCounts.updateKeySession, 0, 'updateKeySession has not been called');

    callbacks.getLicense(null, []);

    // Step 4: update the key session with the key
    assert.equal(callCounts.getCertificate, 1, 'getCertificate has been called');
    assert.equal(callCounts.createSession, 1, 'a key session has been created');
    assert.equal(callCounts.getLicense, 1, 'getLicense has been called');
    assert.equal(callCounts.updateKeySession, 1, 'updateKeySession has been called');

    keySessionEventListeners.webkitkeyadded();
  };
});
