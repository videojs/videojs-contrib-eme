import document from 'global/document';

import QUnit from 'qunit';
import sinon from 'sinon';
import videojs from 'video.js';
import window from 'global/window';

import {
  default as plugin,
  hasSession,
  setupSessions,
  handleEncryptedEvent,
  handleMsNeedKeyEvent,
  handleWebKitNeedKeyEvent,
  getOptions,
  removeSession,
  emeErrorHandler
} from '../src/plugin';

const Player = videojs.getComponent('Player');

function noop() {}

QUnit.test('the environment is sane', function(assert) {
  assert.strictEqual(typeof Array.isArray, 'function', 'es5 exists');
  assert.strictEqual(typeof sinon, 'object', 'sinon exists');
  assert.strictEqual(typeof videojs, 'function', 'videojs exists');
  assert.strictEqual(typeof plugin, 'function', 'plugin is a function');
});

QUnit.module('videojs-contrib-eme', {
  beforeEach() {
    // Mock the environment's timers because certain things - particularly
    // player readiness - are asynchronous in video.js 5. This MUST come
    // before any player is created; otherwise, timers could get created
    // with the actual timer methods!
    this.clock = sinon.useFakeTimers();

    this.fixture = document.getElementById('qunit-fixture');
    this.video = document.createElement('video');
    this.fixture.appendChild(this.video);
    this.player = videojs(this.video);

    this.origRequestMediaKeySystemAccess = window.navigator.requestMediaKeySystemAccess;

    window.navigator.requestMediaKeySystemAccess = (keySystem, options) => {
      return Promise.resolve({
        keySystem: 'org.w3.clearkey',
        createMediaKeys: () => {
          return {
            createSession: () => new videojs.EventTarget()
          };
        }
      });
    };
  },

  afterEach() {
    window.navigator.requestMediaKeySystemAccess = this.origRequestMediaKeySystemAccess;
    this.clock.restore();
  }
});

QUnit.test('registers itself with video.js', function(assert) {
  assert.strictEqual(
    typeof Player.prototype.eme,
    'function',
    'videojs-contrib-eme plugin was registered'
  );
});

QUnit.test('exposes options', function(assert) {
  assert.notOk(this.player.eme.options, 'options is unavailable at start');

  this.player.eme();
  assert.deepEqual(this.player.eme.options,
    {},
    'options defaults to empty object once initialized');

  this.video = document.createElement('video');
  this.video.setAttribute('data-setup', JSON.stringify({
    plugins: {
      eme: {
        applicationId: 'application-id',
        publisherId: 'publisher-id'
      }
    }
  }));
  this.fixture.appendChild(this.video);
  this.player = videojs(this.video);

  assert.ok(this.player.eme.options, 'exposes options');
  assert.strictEqual(this.player.eme.options.applicationId,
    'application-id',
    'exposes applicationId');
  assert.strictEqual(this.player.eme.options.publisherId,
    'publisher-id',
    'exposes publisherId');
});

// skip test for Safari
if (!window.WebKitMediaKeys) {
  QUnit.test('initializeMediaKeys standard', function(assert) {
    assert.expect(9);
    const done = assert.async();
    const initData = new Uint8Array([1, 2, 3]).buffer;
    let errors = 0;
    const options = {
      keySystems: {
        'org.w3.clearkey': {
          pssh: initData
        }
      }
    };
    const callback = (error) => {
      const sessions = this.player.eme.sessions;

      assert.equal(sessions.length, 1, 'created a session when keySystems in options');
      assert.deepEqual(sessions[0].initData, initData, 'captured initData in the session');
      assert.equal(
        error,
        'Error: Neither URL nor getLicense function provided to get license',
        'callback receives error'
      );
    };

    this.player.eme();

    this.player.on('error', () => {
      errors++;
      assert.equal(errors, 1, 'error triggered only once');
      assert.equal(
        this.player.error().message,
        'Neither URL nor getLicense function provided to get license',
        'error is called on player'
      );
      this.player.error(null);
    });

    this.player.eme.initializeMediaKeys(options, callback);
    // need to clear sessions to have the error trigger again
    this.player.eme.sessions = [];
    this.player.eme.initializeMediaKeys(options, callback, true);

    setTimeout(() => {
      assert.equal(this.player.error(), null,
        'no error called on player with suppressError = true');
      done();
    });
    this.clock.tick(1);
  });

}

QUnit.test('initializeMediaKeys ms-prefix', function(assert) {
  assert.expect(17);
  const done = assert.async();
  // stub setMediaKeys
  const setMediaKeys = this.player.tech_.el_.setMediaKeys;
  let throwError = true;
  let errors = 0;
  let keySession;
  let errorMessage;
  const origMediaKeys = window.MediaKeys;
  const origWebKitMediaKeys = window.WebKitMediaKeys;

  window.MediaKeys = undefined;
  window.WebKitMediaKeys = undefined;

  if (!window.MSMediaKeys) {
    window.MSMediaKeys = () => {};
  }

  this.player.tech_.el_.setMediaKeys = null;
  if (!this.player.tech_.el_.msSetMediaKeys) {
    this.player.tech_.el_.msSetMediaKeys = () => {
      this.player.tech_.el_.msKeys = {
        createSession: () => {
          if (throwError) {
            throw new Error('error creating keySession');
          } else {
            keySession = new videojs.EventTarget();
            return keySession;
          }
        }
      };
    };
  }

  const initData = new Uint8Array([1, 2, 3]).buffer;
  const options = {
    keySystems: {
      'com.microsoft.playready': {
        pssh: initData
      }
    }
  };
  const callback = (error) => {
    const sessions = this.player.eme.sessions;

    assert.equal(sessions.length, 1, 'created a session when keySystems in options');
    assert.deepEqual(sessions[0].initData, initData, 'captured initData in the session');
    assert.notEqual(error, undefined, 'callback receives error');

  };
  const reset = () => {
    this.player.eme.sessions = [];
    keySession = null;
  };
  const asyncKeySessionError = () => {
    if (keySession) {
      // we stubbed the keySession
      setTimeout(() => {
        keySession.error = {code: 1, systemCode: 2};
        keySession.trigger({
          target: keySession,
          type: 'mskeyerror'
        });
      });
      this.clock.tick(1);
    }
  };

  this.player.eme();

  this.player.on('error', () => {
    errors++;
    assert.equal(
      this.player.error().message,
      errorMessage,
      'error is called on player'
    );
    this.player.error(null);
  });

  // sync error thrown by handleMsNeedKeyEvent
  errorMessage = 'error creating keySession';
  this.player.eme.initializeMediaKeys(options, callback);
  reset();
  this.player.eme.initializeMediaKeys(options, callback, true);
  reset();
  // async error event on key session
  throwError = false;
  errorMessage = 'Unexpected key error from key session with code: 1 and systemCode: 2';
  this.player.eme.initializeMediaKeys(options, callback);
  asyncKeySessionError();
  reset();
  this.player.eme.initializeMediaKeys(options, callback, true);
  asyncKeySessionError();
  reset();

  setTimeout(() => {
    // `error` will be called on the player 3 times, because a key session
    // error can't be suppressed on IE11
    assert.equal(errors, 3, 'error called on player 3 times');
    assert.equal(this.player.error(), null,
      'no error called on player with suppressError = true');
    window.MediaKeys = origMediaKeys;
    window.WebKitMediaKeys = origWebKitMediaKeys;
    done();
  });
  this.clock.tick(1);

  this.player.tech_.el_.msSetMediaKeys = null;
  this.player.tech_.el_.setMediaKeys = setMediaKeys;
});

QUnit.test('tech error listener is removed on dispose', function(assert) {
  const done = assert.async(1);
  let called = 0;
  const browser = videojs.browser;
  const origMediaKeys = window.MediaKeys;
  const origWebKitMediaKeys = window.WebKitMediaKeys;

  window.MediaKeys = undefined;
  window.WebKitMediaKeys = undefined;
  if (!window.MSMediaKeys) {
    window.MSMediaKeys = noop.bind(this);
  }
  // let this test pass on edge
  videojs.browser = {IS_EDGE: false};

  this.player.error = () => {
    called++;
  };

  this.player.eme();

  this.player.ready(() => {
    assert.equal(called, 0, 'never called');

    this.player.tech_.trigger('mskeyerror');
    assert.equal(called, 1, 'called once');

    this.player.dispose();
    this.player.tech_.trigger('mskeyerror');
    assert.equal(called, 1, 'not called after player disposal');

    this.player.error = undefined;
    videojs.browser = browser;
    window.MediaKeys = origMediaKeys;
    window.WebKitMediaKeys = origWebKitMediaKeys;
    done();
  });

  this.clock.tick(1);
});

QUnit.module('plugin guard functions', {
  beforeEach() {
    this.options = {
      keySystems: {
        'org.w3.clearkey': {url: 'some-url'}
      }
    };

    this.initData1 = new Uint8Array([1, 2, 3]).buffer;
    this.initData2 = new Uint8Array([4, 5, 6]).buffer;

    this.event1 = {
    // mock video target to prevent errors since it's a pain to mock out the continuation
    // of functionality on a successful pass through of the guards
      target: {},
      initData: this.initData1
    };
    this.event2 = {
      target: {},
      initData: this.initData2
    };

    if (!window.MSMediaKeys) {
      window.MSMediaKeys = noop.bind(this);
    }
    if (!window.WebKitMediaKeys) {
      window.WebKitMediaKeys = noop.bind(this);
    }

    this.origRequestMediaKeySystemAccess = window.navigator.requestMediaKeySystemAccess;

    window.navigator.requestMediaKeySystemAccess = (keySystem, options) => {
      return Promise.resolve({
        keySystem: 'org.w3.clearkey',
        createMediaKeys: () => {
          return {
            createSession: () => new videojs.EventTarget()
          };
        }
      });
    };
  },
  afterEach() {
    window.navigator.requestMediaKeySystemAccess = this.origRequestMediaKeySystemAccess;
  }
});

QUnit.test('handleEncryptedEvent checks for required options', function(assert) {
  const done = assert.async();
  const sessions = [];

  handleEncryptedEvent(this.event1, {}, sessions).then(() => {
    assert.equal(sessions.length, 0, 'did not create a session when no options');
    done();
  });
});

QUnit.test('handleEncryptedEvent checks for required init data', function(assert) {
  const done = assert.async();
  const sessions = [];

  handleEncryptedEvent({ target: {}, initData: null }, this.options, sessions).then(() => {
    assert.equal(sessions.length, 0, 'did not create a session when no init data');
    done();
  });
});

QUnit.test('handleEncryptedEvent creates session', function(assert) {
  const done = assert.async();
  const sessions = [];

  // testing the rejection path because this isn't a real session
  handleEncryptedEvent(this.event1, this.options, sessions).catch(() => {
    assert.equal(sessions.length, 1, 'created a session when keySystems in options');
    assert.equal(sessions[0].initData, this.initData1, 'captured initData in the session');
    done();
  });
});

QUnit.test('handleEncryptedEvent creates new session for new init data', function(assert) {
  const done = assert.async();
  const sessions = [];

  // testing the rejection path because this isn't a real session
  handleEncryptedEvent(this.event1, this.options, sessions).catch(() => {
    return handleEncryptedEvent(this.event2, this.options, sessions).catch(() => {
      assert.equal(sessions.length, 2, 'created a new session when new init data');
      assert.equal(sessions[0].initData, this.initData1, 'retained session init data');
      assert.equal(sessions[1].initData, this.initData2, 'added new session init data');
      done();
    });
  });
});

QUnit.test('handleEncryptedEvent doesn\'t create duplicate sessions', function(assert) {
  const done = assert.async();
  const sessions = [];

  // testing the rejection path because this isn't a real session
  handleEncryptedEvent(this.event1, this.options, sessions).catch(() => {
    return handleEncryptedEvent(this.event2, this.options, sessions).catch(() => {
      return handleEncryptedEvent(this.event2, this.options, sessions).then(() => {
        assert.equal(sessions.length, 2, 'no new session when same init data');
        assert.equal(sessions[0].initData, this.initData1, 'retained session init data');
        assert.equal(sessions[1].initData, this.initData2, 'retained session init data');
        done();
      });
    });
  });
});

QUnit.test('handleEncryptedEvent uses predefined init data', function(assert) {
  const done = assert.async();
  const options = {
    keySystems: {
      'org.w3.clearkey': {
        pssh: this.initData1
      }
    }
  };
  const sessions = [];

  // testing the rejection path because this isn't a real session
  handleEncryptedEvent(this.event2, options, sessions).catch(() => {
    assert.equal(sessions.length, 1, 'created a session when keySystems in options');
    assert.deepEqual(sessions[0].initData, this.initData1, 'captured initData in the session');
    done();
  });
});

QUnit.test('handleMsNeedKeyEvent uses predefined init data', function(assert) {
  const options = {
    keySystems: {
      'com.microsoft.playready': {
        pssh: this.initData1
      }
    }
  };
  const sessions = [];

  this.event2.target = {
    msSetMediaKeys: () => {
      this.event2.target.msKeys = {
        createSession: () => new videojs.EventTarget()
      };
    }
  };

  handleMsNeedKeyEvent(this.event2, options, sessions);
  assert.equal(sessions.length, 1, 'created a session when keySystems in options');
  assert.deepEqual(sessions[0].initData, this.initData1, 'captured initData in the session');

  this.event2.target = {};
});

QUnit.test('handleMsNeedKeyEvent checks for required options', function(assert) {
  const event = {
    initData: new Uint8Array([1, 2, 3]),
    // mock video target to prevent errors since it's a pain to mock out the continuation
    // of functionality on a successful pass through of the guards
    target: {
      msSetMediaKeys() {
        this.msKeys = {
          createSession: () => new videojs.EventTarget()
        };
      }
    }
  };
  let options = {};
  const sessions = [];

  handleMsNeedKeyEvent(event, options, sessions);
  assert.equal(sessions.length, 0, 'no session created when no options');

  options = { keySystems: {} };
  handleMsNeedKeyEvent(event, options, sessions);
  assert.equal(sessions.length, 0, 'no session created when no PlayReady key system');

  options = { keySystems: { 'com.microsoft.notplayready': true } };
  handleMsNeedKeyEvent(event, options, sessions);
  assert.equal(sessions.length,
    0,
    'no session created when no proper PlayReady key system');

  options = { keySystems: { 'com.microsoft.playready': true } };
  handleMsNeedKeyEvent(event, options, sessions);
  assert.equal(sessions.length, 1, 'session created');
  assert.ok(sessions[0].playready, 'created a PlayReady session');

  const createdSession = sessions[0];

  // even when there's new init data, we should not create a new session
  event.initData = new Uint8Array([4, 5, 6]);

  handleMsNeedKeyEvent(event, options, sessions);
  assert.equal(sessions.length, 1, 'no new session created');
  assert.equal(sessions[0], createdSession, 'did not replace session');
});

QUnit.test('handleMsNeedKeyEvent checks for required init data', function(assert) {
  const event = {
    // mock video target to prevent errors since it's a pain to mock out the continuation
    // of functionality on a successful pass through of the guards
    target: {},
    initData: null
  };
  const options = { keySystems: { 'com.microsoft.playready': true } };
  const sessions = [];

  handleMsNeedKeyEvent(event, options, sessions);
  assert.equal(sessions.length, 0, 'no session created when no init data');
});

QUnit.test('handleWebKitNeedKeyEvent checks for required options', function(assert) {
  const event = {
    initData: new Uint8Array([1, 2, 3, 4]),
    target: {webkitSetMediaKeys: noop}
  };
  const done = assert.async(4);
  let options = {};

  handleWebKitNeedKeyEvent(event, options).then((val) => {
    assert.equal(val, undefined, 'resolves an empty promise when no options');
    done();
  });

  options = { keySystems: {} };
  handleWebKitNeedKeyEvent(event, options).then((val) => {
    assert.equal(val, undefined,
      'resolves an empty promise when no FairPlay key system');
    done();
  });

  options = { keySystems: { 'com.apple.notfps.1_0': {} } };
  handleWebKitNeedKeyEvent(event, options).then((val) => {
    assert.equal(val, undefined,
      'resolves an empty promise when no proper FairPlay key system');
    done();
  });

  options = { keySystems: { 'com.apple.fps.1_0': {} } };

  const promise = handleWebKitNeedKeyEvent(event, options);

  promise.catch((err) => {
    assert.equal(err, 'Could not create key session',
      'expected error message');
    done();
  });
  assert.ok(promise, 'returns promise when proper FairPlay key system');
});

QUnit.test('handleWebKitNeedKeyEvent checks for required init data', function(assert) {
  const done = assert.async();
  const event = {
    initData: null
  };
  const options = { keySystems: { 'com.apple.fps.1_0': {} } };

  handleWebKitNeedKeyEvent(event, options).then((val) => {
    assert.equal(val, undefined, 'resolves an empty promise when no init data');
    done();
  });
});

QUnit.module('plugin isolated functions');

QUnit.test('hasSession determines if a session exists', function(assert) {
  // cases in spec (where initData should always be an ArrayBuffer)
  const initData = new Uint8Array([1, 2, 3]).buffer;

  assert.notOk(hasSession([], initData), 'false when no sessions');
  assert.ok(hasSession([{ initData }], initData),
    'true when initData is present in a session');
  assert.ok(
    hasSession([
      {},
      { initData: new Uint8Array([1, 2, 3]).buffer }
    ], initData),
    'true when same initData contents present in a session');
  assert.notOk(hasSession([{ initData: new Uint8Array([1, 2]).buffer }], initData),
    'false when initData contents not present in a session');

  // cases outside of spec (where initData is not always an ArrayBuffer)
  assert.ok(
    hasSession([{ initData: new Uint8Array([1, 2, 3]) }], initData),
    'true even if session initData is a typed array and initData is an ArrayBuffer');
  assert.ok(
    hasSession([{ initData: new Uint8Array([1, 2, 3]).buffer }],
      new Uint8Array([1, 2, 3])),
    'true even if session initData is an ArrayBuffer and initData is a typed array');
  assert.ok(
    hasSession([{ initData: new Uint8Array([1, 2, 3]) }], new Uint8Array([1, 2, 3])),
    'true even if both session initData and initData are typed arrays');
});

QUnit.test('setupSessions sets up sessions for new sources', function(assert) {
  // mock the player with an eme plugin object attached to it
  let src = 'some-src';
  const player = { eme: {}, src: () => src };

  setupSessions(player);

  assert.ok(Array.isArray(player.eme.sessions),
    'creates a sessions array when none exist');
  assert.equal(player.eme.sessions.length, 0, 'sessions array is empty');
  assert.equal(player.eme.activeSrc, 'some-src', 'set activeSrc property');

  setupSessions(player);

  assert.equal(player.eme.sessions.length, 0, 'sessions array is still empty');
  assert.equal(player.eme.activeSrc, 'some-src', 'activeSrc property did not change');

  player.eme.sessions.push({});
  src = 'other-src';
  setupSessions(player);

  assert.equal(player.eme.sessions.length, 0, 'sessions array reset');
  assert.equal(player.eme.activeSrc, 'other-src', 'activeSrc property changed');

  player.eme.sessions.push({});
  setupSessions(player);

  assert.equal(player.eme.sessions.length, 1, 'sessions array unchanged');
  assert.equal(player.eme.activeSrc, 'other-src', 'activeSrc property unchanged');
});

QUnit.test('getOptions prioritizes eme options over source options', function(assert) {
  const player = {
    eme: {
      options: {
        keySystems: {
          keySystem1: {
            audioContentType: 'audio-content-type',
            videoContentType: 'video-content-type'
          },
          keySystem3: {
            licenseUrl: 'license-url-3'
          }
        },
        extraOption: 'extra-option'
      }
    },
    currentSource() {
      return {
        keySystems: {
          keySystem1: {
            licenseUrl: 'license-url-1',
            videoContentType: 'source-video-content-type'
          },
          keySystem2: {
            licenseUrl: 'license-url-2'
          }
        },
        type: 'application/dash+xml'
      };
    }
  };

  assert.deepEqual(getOptions(player), {
    keySystems: {
      keySystem1: {
        audioContentType: 'audio-content-type',
        videoContentType: 'video-content-type',
        licenseUrl: 'license-url-1'
      },
      keySystem2: {
        licenseUrl: 'license-url-2'
      },
      keySystem3: {
        licenseUrl: 'license-url-3'
      }
    },
    type: 'application/dash+xml',
    extraOption: 'extra-option'
  }, 'updates source options with eme options');
});

QUnit.test('removeSession removes sessions', function(assert) {
  const initData1 = new Uint8Array([1, 2, 3]);
  const initData2 = new Uint8Array([2, 3, 4]);
  const initData3 = new Uint8Array([3, 4, 5]);
  const sessions = [{
    initData: initData1
  }, {
    initData: initData2
  }, {
    initData: initData3
  }];

  removeSession(sessions, initData2);
  assert.deepEqual(sessions,
    [{ initData: initData1 }, { initData: initData3 }],
    'removed session with initData');

  removeSession(sessions, null);
  assert.deepEqual(sessions,
    [{ initData: initData1 }, { initData: initData3 }],
    'does nothing when passed null');

  removeSession(sessions, new Uint8Array([6, 7, 8]));
  assert.deepEqual(sessions,
    [{ initData: initData1 }, { initData: initData3 }],
    'does nothing when passed non-matching initData');

  removeSession(sessions, new Uint8Array([1, 2, 3]));
  assert.deepEqual(sessions,
    [{ initData: initData1 }, { initData: initData3 }],
    'did not remove session because initData is not the same reference');

  removeSession(sessions, initData1);
  assert.deepEqual(sessions,
    [{ initData: initData3 }],
    'removed session with initData');
  removeSession(sessions, initData3);
  assert.deepEqual(sessions, [], 'removed session with initData');
  removeSession(sessions, initData2);
  assert.deepEqual(sessions, [], 'does nothing when no sessions');
});

QUnit.test('emeError properly handles various parameter types', function(assert) {
  let errorObj;
  const player = {
    tech_: {
      el_: videojs.EventTarget()
    },
    error: (obj) => {
      errorObj = obj;
    }
  };
  const emeError = emeErrorHandler(player);

  emeError(undefined);
  assert.equal(errorObj.message, null, 'null error message');

  emeError({});
  assert.equal(errorObj.message, null, 'null error message');

  emeError(new Error('some error'));
  assert.equal(errorObj.message, 'some error', 'use error text when error');

  emeError('some string');
  assert.equal(errorObj.message, 'some string', 'use string when string');

  emeError({type: 'mskeyerror', message: 'some event'});
  assert.equal(errorObj.message, 'some event', 'use message property when object has it');
});
