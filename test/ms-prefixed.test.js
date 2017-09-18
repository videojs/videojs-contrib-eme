import QUnit from 'qunit';
import videojs from 'video.js';
import window from 'global/window';
import {
  createMessageBuffer,
  challengeElement
} from './playready-message';
import {
  default as msPrefixed,
  getMessageContents
} from '../src/ms-prefixed';
import utils from './utils';

QUnit.module('videojs-contrib-eme ms-prefixed', {
  beforeEach() {
    this.origMSMediaKeys = window.MSMediaKeys;
    window.MSMediaKeys = () => {};

    const session = new videojs.EventTarget();

    session.keys = [];
    session.update = (key) => session.keys.push(key);

    // mock the video since the APIs won't be available on non IE11 browsers
    const video = {
      msSetMediaKeys: () => {
        video.msKeys = {
          createSession: () => this.session
        };
      }
    };

    this.session = session;
    this.video = video;
  },
  afterEach() {
    window.MSMediaKeys = this.origMSMediaKeys;
  }
});

QUnit.test('checks for required options', function(assert) {
  const origErrorLog = videojs.log.error;
  let errorMessage;

  videojs.log.error = (message) => {
    errorMessage = message;
  };

  msPrefixed({
    video: this.video,
    initData: '',
    options: {}
  });
  assert.equal(errorMessage,
              'PlayReady key system options not provided to decrypt video',
              'shows correct error message');
  errorMessage = null;

  msPrefixed({
    video: this.video,
    initData: '',
    options: {
      keySystems: {}
    }
  });
  assert.equal(errorMessage,
              'PlayReady key system options not provided to decrypt video',
              'shows correct error message');
  errorMessage = null;

  msPrefixed({
    video: this.video,
    initData: '',
    options: {
      keySystems: {
        'com.microsoft.notplayready': true
      }
    }
  });
  assert.equal(errorMessage,
              'PlayReady key system options not provided to decrypt video',
              'shows correct error message');
  errorMessage = null;

  msPrefixed({
    video: this.video,
    initData: '',
    options: {
      keySystems: {
        'com.microsoft.notplayready': true
      }
    }
  });
  assert.equal(errorMessage,
              'PlayReady key system options not provided to decrypt video',
              'shows correct error message');
  errorMessage = null;

  msPrefixed({
    video: this.video,
    initData: '',
    options: {
      keySystems: {
        'com.microsoft.playready': true
      }
    }
  });
  assert.notOk(errorMessage, 'no error message');

  videojs.log.error = origErrorLog;
});

QUnit.test('logs error when on key error', function(assert) {
  const origErrorLog = videojs.log.error;
  let errorMessage;

  videojs.log.error = (message) => {
    errorMessage = message;
  };

  msPrefixed({
    video: this.video,
    initData: '',
    options: {
      keySystems: {
        'com.microsoft.playready': true
      }
    }
  });

  this.session.error = {
    code: 5,
    systemCode: 9
  };

  this.session.trigger('mskeyerror');

  assert.equal(errorMessage,
               'Unexpected key error from key session with code: 5 and systemCode: 9',
               'logged error message');

  videojs.log.error = origErrorLog;
});

QUnit.test('calls getKey when provided on key message', function(assert) {
  let passedOptions = null;
  let passedDestinationURL = null;
  let passedBuffer = null;
  let passedCallback = null;
  let getKeyCallback = (callback) => {
    callback(null, 'a key');
  };

  const emeOptions = {
    keySystems: {
      'com.microsoft.playready': {
        getKey: (options, destinationURL, buffer, callback) => {
          passedOptions = options;
          passedDestinationURL = destinationURL;
          passedBuffer = buffer;
          passedCallback = callback;
          getKeyCallback(callback);
        }
      }
    }
  };

  msPrefixed({
    video: this.video,
    initData: '',
    options: emeOptions
  });

  assert.notOk(passedOptions, 'getKey not called');

  this.session.trigger({
    type: 'mskeymessage',
    destinationURL: 'url',
    message: {
      buffer: 'buffer'
    }
  });

  assert.equal(passedOptions, emeOptions, 'getKey called with options');
  assert.equal(passedDestinationURL, 'url', 'getKey called with destinationURL');
  assert.equal(passedBuffer, 'buffer', 'getKey called with buffer');
  assert.equal(typeof passedCallback, 'function', 'getKey called with callback');
  assert.equal(this.session.keys.length, 1, 'added key to session');
  assert.equal(this.session.keys[0], 'a key', 'added correct key to session');

  const origErrorLog = videojs.log.error;
  let errorMessage;

  videojs.log.error = (message) => {
    errorMessage = message;
  };

  getKeyCallback = (callback) => {
    callback('an error', 'an errored key');
  };

  this.session.trigger({
    type: 'mskeymessage',
    destinationURL: 'url',
    message: {
      buffer: 'buffer'
    }
  });

  assert.equal(errorMessage,
               'Unable to get key: an error',
               'logs error when callback has an error');
  assert.equal(this.session.keys.length, 1, 'did not add a new key');

  videojs.log.error = origErrorLog;
});

QUnit.test('makes request when nothing provided on key message', function(assert) {
  const origXhr = videojs.xhr;
  const xhrCalls = [];

  videojs.xhr = (config, callback) => xhrCalls.push({config, callback});

  msPrefixed({
    video: this.video,
    initData: '',
    options: {
      keySystems: {
        'com.microsoft.playready': true
      }
    }
  });
  this.session.trigger({
    type: 'mskeymessage',
    destinationURL: 'destination-url',
    message: {
      buffer: createMessageBuffer()
    }
  });

  assert.equal(xhrCalls.length, 1, 'one xhr request');
  assert.equal(xhrCalls[0].config.uri,
               'destination-url',
               'made request to destinationURL');
  assert.deepEqual(
    xhrCalls[0].config.headers,
    {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '"http://schemas.microsoft.com/DRM/2007/03/protocols/AcquireLicense"'
    },
    'uses headers from message');
  assert.equal(xhrCalls[0].config.body, challengeElement, 'sends the challenge element');
  assert.equal(xhrCalls[0].config.method, 'post', 'request is a post');
  assert.equal(xhrCalls[0].config.responseType,
               'arraybuffer',
               'responseType is an arraybuffer');

  const origErrorLog = videojs.log.error;
  let errorMessage;

  videojs.log.error = (message) => {
    errorMessage = message;
  };

  const response = {
    body: utils.stringToArrayBuffer('key value')
  };

  xhrCalls[0].callback('an error', response);

  assert.equal(errorMessage,
               'Unable to request key from url: destination-url',
               'logs error when callback has an error');
  assert.equal(this.session.keys.length, 0, 'no key added to session');

  xhrCalls[0].callback(null, response);

  assert.equal(this.session.keys.length, 1, 'key added to session');
  assert.deepEqual(this.session.keys[0],
                   new Uint8Array(response.body),
                   'correct key added to session');

  videojs.log.error = origErrorLog;
  videojs.xhr = origXhr;
});

QUnit.test('makes request on key message when empty object provided in options',
function(assert) {
  const origXhr = videojs.xhr;
  const xhrCalls = [];

  videojs.xhr = (config, callback) => xhrCalls.push({config, callback});

  msPrefixed({
    video: this.video,
    initData: '',
    options: {
      keySystems: {
        'com.microsoft.playready': {}
      }
    }
  });
  this.session.trigger({
    type: 'mskeymessage',
    destinationURL: 'destination-url',
    message: {
      buffer: createMessageBuffer()
    }
  });

  assert.equal(xhrCalls.length, 1, 'one xhr request');
  assert.equal(xhrCalls[0].config.uri,
               'destination-url',
               'made request to destinationURL');
  assert.deepEqual(
    xhrCalls[0].config.headers,
    {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '"http://schemas.microsoft.com/DRM/2007/03/protocols/AcquireLicense"'
    },
    'uses headers from message');
  assert.equal(xhrCalls[0].config.body, challengeElement, 'sends the challenge element');
  assert.equal(xhrCalls[0].config.method, 'post', 'request is a post');
  assert.equal(xhrCalls[0].config.responseType,
               'arraybuffer',
               'responseType is an arraybuffer');

  videojs.xhr = origXhr;
});

QUnit.test('makes request with provided url string on key message', function(assert) {
  const origXhr = videojs.xhr;
  const xhrCalls = [];

  videojs.xhr = (config, callback) => xhrCalls.push({config, callback});

  msPrefixed({
    video: this.video,
    initData: '',
    options: {
      keySystems: {
        'com.microsoft.playready': 'provided-url'
      }
    }
  });
  this.session.trigger({
    type: 'mskeymessage',
    destinationURL: 'destination-url',
    message: {
      buffer: createMessageBuffer([{
        name: 'Content-Type',
        value: 'text/xml; charset=utf-8'
      }, {
        name: 'SOAPAction',
        value: '"http://schemas.microsoft.com/DRM/2007/03/protocols/AcquireLicense"'
      }])
    }
  });

  assert.equal(xhrCalls.length, 1, 'one xhr request');
  assert.equal(xhrCalls[0].config.uri,
               'provided-url',
               'made request to provided-url');
  assert.deepEqual(
    xhrCalls[0].config.headers,
    {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '"http://schemas.microsoft.com/DRM/2007/03/protocols/AcquireLicense"'
    },
    'uses headers from message');
  assert.equal(xhrCalls[0].config.body, challengeElement, 'sends the challenge element');
  assert.equal(xhrCalls[0].config.method, 'post', 'request is a post');
  assert.equal(xhrCalls[0].config.responseType,
               'arraybuffer',
               'responseType is an arraybuffer');

  const origErrorLog = videojs.log.error;
  let errorMessage;

  videojs.log.error = (message) => {
    errorMessage = message;
  };

  const response = {
    body: utils.stringToArrayBuffer('key value')
  };

  xhrCalls[0].callback('an error', response);

  assert.equal(errorMessage,
               'Unable to request key from url: provided-url',
               'logs error when callback has an error');
  assert.equal(this.session.keys.length, 0, 'no key added to session');

  xhrCalls[0].callback(null, response);

  assert.equal(this.session.keys.length, 1, 'key added to session');
  assert.deepEqual(this.session.keys[0],
                   new Uint8Array(response.body),
                   'correct key added to session');

  videojs.log.error = origErrorLog;
  videojs.xhr = origXhr;
});

QUnit.test('makes request with provided url on key message', function(assert) {
  const origXhr = videojs.xhr;
  const xhrCalls = [];

  videojs.xhr = (config, callback) => xhrCalls.push({config, callback});

  msPrefixed({
    video: this.video,
    initData: '',
    options: {
      keySystems: {
        'com.microsoft.playready': {
          url: 'provided-url'
        }
      }
    }
  });
  this.session.trigger({
    type: 'mskeymessage',
    destinationURL: 'destination-url',
    message: {
      buffer: createMessageBuffer([{
        name: 'Content-Type',
        value: 'text/xml; charset=utf-8'
      }, {
        name: 'SOAPAction',
        value: '"http://schemas.microsoft.com/DRM/2007/03/protocols/AcquireLicense"'
      }])
    }
  });

  assert.equal(xhrCalls.length, 1, 'one xhr request');
  assert.equal(xhrCalls[0].config.uri,
               'provided-url',
               'made request to provided-url');
  assert.deepEqual(
    xhrCalls[0].config.headers,
    {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '"http://schemas.microsoft.com/DRM/2007/03/protocols/AcquireLicense"'
    },
    'uses headers from message');
  assert.equal(xhrCalls[0].config.body, challengeElement, 'sends the challenge element');
  assert.equal(xhrCalls[0].config.method, 'post', 'request is a post');
  assert.equal(xhrCalls[0].config.responseType,
               'arraybuffer',
               'responseType is an arraybuffer');

  const origErrorLog = videojs.log.error;
  let errorMessage;

  videojs.log.error = (message) => {
    errorMessage = message;
  };

  const response = {
    body: utils.stringToArrayBuffer('key value')
  };

  xhrCalls[0].callback('an error', response);

  assert.equal(errorMessage,
               'Unable to request key from url: provided-url',
               'logs error when callback has an error');
  assert.equal(this.session.keys.length, 0, 'no key added to session');

  xhrCalls[0].callback(null, response);

  assert.equal(this.session.keys.length, 1, 'key added to session');
  assert.deepEqual(this.session.keys[0],
                   new Uint8Array(response.body),
                   'correct key added to session');

  videojs.log.error = origErrorLog;
  videojs.xhr = origXhr;
});

QUnit.test('getMessageContents parses message contents', function(assert) {
  const {headers, message} = getMessageContents(createMessageBuffer());

  assert.deepEqual(
    headers,
    {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '"http://schemas.microsoft.com/DRM/2007/03/protocols/AcquireLicense"'
    },
    'parses headers');
  assert.deepEqual(message, challengeElement, 'parses challenge element');
});
