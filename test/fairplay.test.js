import QUnit from 'qunit';

import fairplay from '../src/fairplay';

QUnit.module('videojs-contrib-eme fairplay');

QUnit.test('lifecycle', function(assert) {
  assert.expect(19);

  let done = assert.async();
  let initData = new Uint8Array([1, 2, 3, 4]).buffer;

  let getCertificateCallCount = 0;
  let getCertificateCallback;
  let getCertificate = (options, callback) => {
    getCertificateCallCount++;
    getCertificateCallback = callback;
  };
  let getKeyCallCount = 0;
  let getKeyCallback;
  let getKey = (options, callback) => {
    getKeyCallCount++;
    getKeyCallback = callback;
  };

  let options = {
    keySystems: {
      'com.apple.fps.1_0': {
        getCertificate,
        getKey,
        // not needed due to mocking
        getContentId: () => 'some content id'
      }
    }
  };

  // trap event listeners
  let keySessionEventListeners = {};

  let updateKeySessionCallCount = 0;
  let updateKeySession = (key) => {
    updateKeySessionCallCount++;
  };

  let onKeySessionCreated;

  let createSessionCallCount = 0;
  let createSession = (type, concatenatedData) => {
    createSessionCallCount++;
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
  assert.equal(getCertificateCallCount, 1, 'getCertificate has been called');
  assert.equal(createSessionCallCount, 0, 'a key session has not been created');
  assert.equal(getKeyCallCount, 0, 'getKey has not been called');
  assert.equal(updateKeySessionCallCount, 0, 'update key session has not been called');

  getCertificateCallback(null, new Uint16Array([4, 5, 6, 7]).buffer);

  onKeySessionCreated = () => {
    // Step 2: create a key session
    assert.equal(getCertificateCallCount, 1, 'getCertificate has been called');
    assert.equal(createSessionCallCount, 1, 'a key session has been created');
    assert.equal(getKeyCallCount, 0, 'getKey has not been called');
    assert.equal(updateKeySessionCallCount, 0, 'update key session has not been called');

    assert.ok(keySessionEventListeners.webkitkeymessage,
              'added an event listener for webkitkeymessage');
    assert.ok(keySessionEventListeners.webkitkeyadded,
              'added an event listener for webkitkeyadded');
    assert.ok(keySessionEventListeners.webkitkeyerror,
              'added an event listener for webkitkeyerror');

    keySessionEventListeners.webkitkeymessage({});

    // Step 3: get the key on webkitkeymessage
    assert.equal(getCertificateCallCount, 1, 'getCertificate has been called');
    assert.equal(createSessionCallCount, 1, 'a key session has been created');
    assert.equal(getKeyCallCount, 1, 'getKey has been called');
    assert.equal(updateKeySessionCallCount, 0, 'update key session has not been called');

    getKeyCallback(null, []);

    // Step 4: update the key session with the key
    assert.equal(getCertificateCallCount, 1, 'getCertificate has been called');
    assert.equal(createSessionCallCount, 1, 'a key session has been created');
    assert.equal(getKeyCallCount, 1, 'getKey has been called');
    assert.equal(updateKeySessionCallCount, 1, 'update key session has been called');

    keySessionEventListeners.webkitkeyadded();
  };
});
