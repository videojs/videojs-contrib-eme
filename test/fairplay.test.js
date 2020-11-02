import QUnit from 'qunit';
import {
  default as fairplay,
  FAIRPLAY_KEY_SYSTEM,
  defaultGetLicense,
  defaultGetCertificate
} from '../src/fairplay';
import videojs from 'video.js';
import window from 'global/window';
import { getMockEventBus } from './utils';

QUnit.module('videojs-contrib-eme fairplay');

QUnit.test('lifecycle', function(assert) {
  assert.expect(23);

  const done = assert.async();
  const initData = new Uint8Array([1, 2, 3, 4]).buffer;
  const callbacks = {};
  const callCounts = {
    getCertificate: 0,
    getLicense: 0,
    updateKeySession: 0,
    createSession: 0,
    licenseRequestAttempts: 0
  };

  const getCertificate = (emeOptions, callback) => {
    callCounts.getCertificate++;
    callbacks.getCertificate = callback;
  };
  const getLicense = (emeOptions, contentId, keyMessage, callback) => {
    callCounts.getLicense++;
    callbacks.getLicense = callback;
  };

  const options = {
    keySystems: {
      'com.apple.fps.1_0': {
        getCertificate,
        getLicense,
        // not needed due to mocking
        getContentId: () => 'some content id'
      }
    }
  };

  const eventBus = {
    trigger: (name) => {
      if (name === 'licenserequestattempted') {
        callCounts.licenseRequestAttempts++;
      }
    }
  };

  // trap event listeners
  const keySessionEventListeners = {};

  const updateKeySession = (key) => {
    callCounts.updateKeySession++;
  };

  let onKeySessionCreated;

  const createSession = (type, concatenatedData) => {
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
  const video = {
    webkitKeys: {
      createSession
    }
  };

  fairplay({ video, initData, options, eventBus })
    .then(() => {
      done();
    });

  // Step 1: getCertificate
  assert.equal(callCounts.getCertificate, 1, 'getCertificate has been called');
  assert.equal(callCounts.createSession, 0, 'a key session has not been created');
  assert.equal(callCounts.getLicense, 0, 'getLicense has not been called');
  assert.equal(callCounts.updateKeySession, 0, 'updateKeySession has not been called');
  assert.equal(callCounts.licenseRequestAttempts, 0,
    'license request event not triggered (since no callback yet)');

  callbacks.getCertificate(null, new Uint16Array([4, 5, 6, 7]).buffer);

  onKeySessionCreated = () => {
    // Step 2: create a key session
    assert.equal(callCounts.getCertificate, 1, 'getCertificate has been called');
    assert.equal(callCounts.createSession, 1, 'a key session has been created');
    assert.equal(callCounts.getLicense, 0, 'getLicense has not been called');
    assert.equal(callCounts.updateKeySession, 0, 'updateKeySession has not been called');
    assert.equal(callCounts.licenseRequestAttempts, 0,
      'license request event not triggered (since no callback yet)');

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
    assert.equal(callCounts.licenseRequestAttempts, 0,
      'license request event not triggered (since no callback yet)');

    callbacks.getLicense(null, []);

    // Step 4: update the key session with the key
    assert.equal(callCounts.getCertificate, 1, 'getCertificate has been called');
    assert.equal(callCounts.createSession, 1, 'a key session has been created');
    assert.equal(callCounts.getLicense, 1, 'getLicense has been called');
    assert.equal(callCounts.updateKeySession, 1, 'updateKeySession has been called');
    assert.equal(callCounts.licenseRequestAttempts, 1,
      'license request event triggered');

    keySessionEventListeners.webkitkeyadded();
  };
});

QUnit.test('error in getCertificate rejects promise', function(assert) {
  const keySystems = {};
  const done = assert.async(1);

  keySystems[FAIRPLAY_KEY_SYSTEM] = {
    getCertificate: (options, callback) => {
      callback('error in getCertificate');
    }
  };

  fairplay({options: {keySystems}, eventBus: getMockEventBus() }).catch((err) => {
    assert.equal(err, 'error in getCertificate', 'message is good');
    done();
  });

});

QUnit.test('error in WebKitMediaKeys rejects promise', function(assert) {
  const keySystems = {};
  const done = assert.async(1);
  const initData = new Uint8Array([1, 2, 3, 4]).buffer;
  const video = {
    webkitSetMediaKeys: () => {}
  };

  window.WebKitMediaKeys = () => {
    throw new Error('unsupported keySystem');
  };

  keySystems[FAIRPLAY_KEY_SYSTEM] = {};

  fairplay({
    video,
    initData,
    options: {keySystems},
    eventBus: getMockEventBus()
  }).catch(err => {
    assert.equal(err, 'Could not create MediaKeys', 'message is good');
    done();
  });

});

QUnit.test('error in webkitSetMediaKeys rejects promise', function(assert) {
  const keySystems = {};
  const done = assert.async(1);
  const initData = new Uint8Array([1, 2, 3, 4]).buffer;
  const video = {
    webkitSetMediaKeys: () => {
      throw new Error('MediaKeys unusable');
    }
  };

  window.WebKitMediaKeys = () => {};

  keySystems[FAIRPLAY_KEY_SYSTEM] = {};

  fairplay({
    video,
    initData,
    options: {keySystems},
    eventBus: getMockEventBus()
  }).catch(err => {
    assert.equal(err, 'Could not create MediaKeys', 'message is good');
    done();
  });

});

QUnit.test('error in webkitKeys.createSession rejects promise', function(assert) {
  const keySystems = {};
  const done = assert.async(1);
  const initData = new Uint8Array([1, 2, 3, 4]).buffer;
  const video = {
    webkitSetMediaKeys: () => {
      video.webkitKeys = {
        createSession: () => {
          throw new Error('invalid mimeType or initData');
        }
      };
    }
  };

  window.WebKitMediaKeys = () => {};

  keySystems[FAIRPLAY_KEY_SYSTEM] = {};

  fairplay({
    video,
    initData,
    options: {keySystems},
    eventBus: getMockEventBus()
  }).catch(err => {
    assert.equal(err, 'Could not create key session',
      'message is good');
    done();
  });

});

QUnit.test('error in getLicense rejects promise', function(assert) {
  const keySystems = {};
  const done = assert.async(1);
  const initData = new Uint8Array([1, 2, 3, 4]).buffer;
  const video = {
    webkitSetMediaKeys: () => {
      video.webkitKeys = {
        createSession: () => {
          return {
            addEventListener: (event, callback) => {
              if (event === 'webkitkeymessage') {
                callback({message: 'whatever'});
              }
            }
          };
        }
      };
    }
  };

  window.WebKitMediaKeys = () => {};

  keySystems[FAIRPLAY_KEY_SYSTEM] = {
    getLicense: (options, contentId, message, callback) => {
      callback('error in getLicense');
    }
  };

  fairplay({
    video,
    initData,
    options: {keySystems},
    eventBus: getMockEventBus()
  }).catch(err => {
    assert.equal(err, 'error in getLicense', 'message is good');
    done();
  });

});

QUnit.test('keysessioncreated fired on key session created', function(assert) {
  const keySystems = {};
  const done = assert.async();
  const initData = new Uint8Array([1, 2, 3, 4]).buffer;
  let sessionCreated = false;
  const video = {
    webkitSetMediaKeys: () => {
      video.webkitKeys = {
        createSession: () => {
          sessionCreated = true;
          return {
            addEventListener: () => {}
          };
        }
      };
    }
  };
  const eventBus = {
    trigger: (event) => {
      if (event === 'keysessioncreated') {
        assert.ok(sessionCreated, 'keysessioncreated fired after session created');
        done();
      }
    }
  };

  window.WebKitMediaKeys = () => {};

  keySystems[FAIRPLAY_KEY_SYSTEM] = {
    licenseUri: 'some-url',
    certificateUri: 'some-other-url'
  };

  fairplay({
    video,
    initData,
    options: { keySystems },
    eventBus
  });
});

QUnit.test('a webkitkeyerror rejects promise', function(assert) {
  let keySession;
  const keySystems = {};
  const done = assert.async(1);
  const initData = new Uint8Array([1, 2, 3, 4]).buffer;
  const video = {
    webkitSetMediaKeys: () => {
      video.webkitKeys = {
        createSession: () => {
          return {
            addEventListener: (event, callback) => {
              if (event === 'webkitkeyerror') {
                callback('webkitkeyerror');
              }
            },
            error: {
              code: 0,
              systemCode: 1
            }
          };
        }
      };
    }
  };

  window.WebKitMediaKeys = () => {};

  keySystems[FAIRPLAY_KEY_SYSTEM] = {
    getLicense: (options, contentId, message, callback) => {
      callback(null);
      keySession.trigger('webkitkeyerror');
    }
  };

  fairplay({
    video,
    initData,
    options: {keySystems},
    eventBus: getMockEventBus()
  }).catch(err => {
    assert.equal(err, 'KeySession error: code 0, systemCode 1', 'message is good');
    done();
  });

});

QUnit.test('emeHeaders sent with license and certificate requests', function(assert) {
  const origXhr = videojs.xhr;
  const emeOptions = {
    emeHeaders: {
      'Some-Header': 'some-header-value'
    }
  };
  const fairplayOptions = {
    licenseUri: 'some-url',
    certificateUri: 'some-other-url'
  };
  const xhrCalls = [];

  videojs.xhr = (xhrOptions) => {
    xhrCalls.push(xhrOptions);
  };

  const getLicense = defaultGetLicense(fairplayOptions);
  const getCertificate = defaultGetCertificate(fairplayOptions);

  getLicense(emeOptions);
  getCertificate(emeOptions);

  assert.equal(xhrCalls.length, 2, 'made two XHR requests');

  assert.deepEqual(xhrCalls[0], {
    uri: 'some-url',
    method: 'POST',
    responseType: 'arraybuffer',
    body: undefined,
    headers: {
      'Content-type': 'application/octet-stream',
      'Some-Header': 'some-header-value'
    }
  }, 'made license request with proper emeHeaders value');

  assert.deepEqual(xhrCalls[1], {
    uri: 'some-other-url',
    responseType: 'arraybuffer',
    headers: {
      'Some-Header': 'some-header-value'
    }
  }, 'made certificate request with proper emeHeaders value');

  videojs.xhr = origXhr;
});

QUnit.test('licenseHeaders and certificateHeaders properties override emeHeaders value', function(assert) {
  const origXhr = videojs.xhr;
  const emeOptions = {
    emeHeaders: {
      'Some-Header': 'some-header-value'
    }
  };
  const fairplayOptions = {
    licenseUri: 'some-url',
    certificateUri: 'some-other-url',
    licenseHeaders: {
      'Some-Header': 'higher-priority-license-header'
    },
    certificateHeaders: {
      'Some-Header': 'higher-priority-cert-header'
    }
  };
  const xhrCalls = [];

  videojs.xhr = (xhrOptions) => {
    xhrCalls.push(xhrOptions);
  };

  const getLicense = defaultGetLicense(fairplayOptions);
  const getCertificate = defaultGetCertificate(fairplayOptions);

  getLicense(emeOptions);
  getCertificate(emeOptions);

  assert.equal(xhrCalls.length, 2, 'made two XHR requests');

  assert.deepEqual(xhrCalls[0], {
    uri: 'some-url',
    method: 'POST',
    responseType: 'arraybuffer',
    body: undefined,
    headers: {
      'Content-type': 'application/octet-stream',
      'Some-Header': 'higher-priority-license-header'
    }
  }, 'made license request with proper licenseHeaders value');

  assert.deepEqual(xhrCalls[1], {
    uri: 'some-other-url',
    responseType: 'arraybuffer',
    headers: {
      'Some-Header': 'higher-priority-cert-header'
    }
  }, 'made certificate request with proper certificateHeaders value');

  videojs.xhr = origXhr;
});
