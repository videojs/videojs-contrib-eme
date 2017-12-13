import document from 'global/document';

import QUnit from 'qunit';
import sinon from 'sinon';
import videojs from 'video.js';

import {
  default as plugin,
  hasSession,
  setupSessions,
  handleEncryptedEvent,
  handleMsNeedKeyEvent,
  handleWebKitNeedKeyEvent,
  getOptions
} from '../src/plugin';

const Player = videojs.getComponent('Player');

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
  },

  afterEach() {
    this.player.dispose();
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

QUnit.module('plugin guard functions');

QUnit.test('handleEncryptedEvent checks for required options', function(assert) {
  const initData1 = new Uint8Array([1, 2, 3]).buffer;
  const event = {
    // mock video target to prevent errors since it's a pain to mock out the continuation
    // of functionality on a successful pass through of the guards
    target: {},
    initData: initData1
  };
  let options = {};
  let sessions = [];

  handleEncryptedEvent(event, options, sessions);
  assert.equal(sessions.length, 0, 'did not create a session when no options');

  options = { keySystems: {} };
  handleEncryptedEvent(event, options, sessions);
  assert.equal(sessions.length, 1, 'created a session when keySystems in options');
  assert.equal(sessions[0].initData, initData1, 'captured initData in the session');

  const initData2 = new Uint8Array([4, 5, 6]).buffer;

  event.initData = initData2;

  handleEncryptedEvent(event, options, sessions);
  assert.equal(sessions.length, 2, 'created a new session when new init data');
  assert.equal(sessions[0].initData, initData1, 'retained session init data');
  assert.equal(sessions[1].initData, initData2, 'added new session init data');

  event.initData = new Uint8Array([1, 2, 3]).buffer;

  handleEncryptedEvent(event, options, sessions);
  assert.equal(sessions.length, 2, 'no new session when same init data');
  assert.equal(sessions[0].initData, initData1, 'retained session init data');
  assert.equal(sessions[1].initData, initData2, 'retained session init data');
});

QUnit.test('handleMsNeedKeyEvent checks for required options', function(assert) {
  const event = {
    // mock video target to prevent errors since it's a pain to mock out the continuation
    // of functionality on a successful pass through of the guards
    target: {},
    initData: new Uint8Array([1, 2, 3])
  };
  let options = {};
  let sessions = [];

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

QUnit.test('handleWebKitNeedKeyEvent checks for required options', function(assert) {
  const event = {};
  let options = {};

  assert.notOk(handleWebKitNeedKeyEvent(event, options), 'no return when no options');

  options = { keySystems: {} };
  assert.notOk(handleWebKitNeedKeyEvent(event, options),
               'no return when no FairPlay key system');

  options = { keySystems: { 'com.apple.notfps.1_0': {} } };
  assert.notOk(handleWebKitNeedKeyEvent(event, options),
               'no return when no proper FairPlay key system');

  options = { keySystems: { 'com.apple.fps.1_0': {} } };
  assert.ok(handleWebKitNeedKeyEvent(event, options),
            'valid return when proper FairPlay key system');
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
