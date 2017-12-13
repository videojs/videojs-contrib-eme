/**
 * videojs-contrib-eme
 * @version 3.0.0
 * @copyright 2017 
 * @license Apache-2.0
 */
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.videojsContribEme = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _videoJs = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);

var _videoJs2 = _interopRequireDefault(_videoJs);

var _playready = require('./playready');

var getSupportedKeySystem = function getSupportedKeySystem(_ref) {
  var video = _ref.video;
  var keySystems = _ref.keySystems;

  // As this happens after the src is set on the video, we rely only on the set src (we
  // do not change src based on capabilities of the browser in this plugin).

  var promise = undefined;

  Object.keys(keySystems).forEach(function (keySystem) {
    // TODO use initDataTypes when appropriate
    var systemOptions = {};
    var audioContentType = keySystems[keySystem].audioContentType;
    var videoContentType = keySystems[keySystem].videoContentType;

    if (audioContentType) {
      systemOptions.audioCapabilities = [{
        contentType: audioContentType
      }];
    }
    if (videoContentType) {
      systemOptions.videoCapabilities = [{
        contentType: videoContentType
      }];
    }

    if (!promise) {
      promise = navigator.requestMediaKeySystemAccess(keySystem, [systemOptions]);
    } else {
      promise = promise['catch'](function (e) {
        return navigator.requestMediaKeySystemAccess(keySystem, [systemOptions]);
      });
    }
  });

  return promise;
};

var makeNewRequest = function makeNewRequest(_ref2) {
  var mediaKeys = _ref2.mediaKeys;
  var initDataType = _ref2.initDataType;
  var initData = _ref2.initData;
  var options = _ref2.options;
  var getLicense = _ref2.getLicense;

  var keySession = mediaKeys.createSession();

  keySession.addEventListener('message', function (event) {
    getLicense(options, event.message).then(function (license) {
      return keySession.update(license);
    })['catch'](_videoJs2['default'].log.error.bind(_videoJs2['default'].log.error, 'failed to get and set license'));
  }, false);

  keySession.generateRequest(initDataType, initData)['catch'](_videoJs2['default'].log.error.bind(_videoJs2['default'].log.error, 'Unable to create or initialize key session'));
};

var addSession = function addSession(_ref3) {
  var video = _ref3.video;
  var initDataType = _ref3.initDataType;
  var initData = _ref3.initData;
  var options = _ref3.options;
  var getLicense = _ref3.getLicense;

  if (video.mediaKeysObject) {
    makeNewRequest({
      mediaKeys: video.mediaKeysObject,
      initDataType: initDataType,
      initData: initData,
      options: options,
      getLicense: getLicense
    });
  } else {
    video.pendingSessionData.push({ initDataType: initDataType, initData: initData });
  }
};

var setMediaKeys = function setMediaKeys(_ref4) {
  var video = _ref4.video;
  var certificate = _ref4.certificate;
  var createdMediaKeys = _ref4.createdMediaKeys;
  var options = _ref4.options;
  var getLicense = _ref4.getLicense;

  video.mediaKeysObject = createdMediaKeys;

  if (certificate) {
    createdMediaKeys.setServerCertificate(certificate);
  }

  for (var i = 0; i < video.pendingSessionData.length; i++) {
    var data = video.pendingSessionData[i];

    makeNewRequest({
      mediaKeys: video.mediaKeysObject,
      initDataType: data.initDataType,
      initData: data.initData,
      options: options,
      getLicense: getLicense
    });
  }

  video.pendingSessionData = [];

  return video.setMediaKeys(createdMediaKeys);
};

var defaultPlayreadyGetLicense = function defaultPlayreadyGetLicense(url) {
  return function (emeOptions, keyMessage, callback) {
    (0, _playready.requestPlayreadyLicense)(url, keyMessage, function (err, response, responseBody) {
      if (err) {
        callback(err);
        return;
      }

      callback(null, responseBody);
    });
  };
};

var defaultGetLicense = function defaultGetLicense(url) {
  return function (emeOptions, keyMessage, callback) {
    _videoJs2['default'].xhr({
      uri: url,
      method: 'POST',
      responseType: 'arraybuffer',
      body: keyMessage,
      headers: {
        'Content-type': 'application/octet-stream'
      }
    }, function (err, response, responseBody) {
      if (err) {
        callback(err);
        return;
      }

      callback(null, responseBody);
    });
  };
};

var promisifyGetLicense = function promisifyGetLicense(getLicenseFn) {
  return function (emeOptions, keyMessage) {
    return new Promise(function (resolve, reject) {
      getLicenseFn(emeOptions, keyMessage, function (err, license) {
        if (err) {
          reject(err);
        }

        resolve(license);
      });
    });
  };
};

var standardizeKeySystemOptions = function standardizeKeySystemOptions(keySystem, keySystemOptions) {
  if (typeof keySystemOptions === 'string') {
    keySystemOptions = { url: keySystemOptions };
  }

  if (!keySystemOptions.url && !keySystemOptions.getLicense) {
    throw new Error('Neither URL nor getLicense function provided to get license');
  }

  if (keySystemOptions.url && !keySystemOptions.getLicense) {
    keySystemOptions.getLicense = keySystem === 'com.microsoft.playready' ? defaultPlayreadyGetLicense(keySystemOptions.url) : defaultGetLicense(keySystemOptions.url);
  }

  return keySystemOptions;
};

var standard5July2016 = function standard5July2016(_ref5) {
  var video = _ref5.video;
  var initDataType = _ref5.initDataType;
  var initData = _ref5.initData;
  var options = _ref5.options;

  if (typeof video.mediaKeysObject === 'undefined') {
    var _ret = (function () {
      // Prevent entering this path again.
      video.mediaKeysObject = null;

      // Will store all initData until the MediaKeys is ready.
      video.pendingSessionData = [];

      var certificate = undefined;
      var keySystemOptions = undefined;

      var keySystemPromise = getSupportedKeySystem({
        video: video,
        keySystems: options.keySystems
      });

      if (!keySystemPromise) {
        _videoJs2['default'].log.error('No supported key system found');
        return {
          v: undefined
        };
      }

      keySystemPromise.then(function (keySystemAccess) {
        return new Promise(function (resolve, reject) {
          // save key system for adding sessions
          video.keySystem = keySystemAccess.keySystem;

          keySystemOptions = standardizeKeySystemOptions(keySystemAccess.keySystem, options.keySystems[keySystemAccess.keySystem]);

          if (!keySystemOptions.getCertificate) {
            resolve(keySystemAccess);
            return;
          }

          keySystemOptions.getCertificate(options, function (err, cert) {
            if (err) {
              reject(err);
              return;
            }

            certificate = cert;

            resolve(keySystemAccess);
          });
        });
      }).then(function (keySystemAccess) {
        return keySystemAccess.createMediaKeys();
      }).then(function (createdMediaKeys) {
        return setMediaKeys({
          video: video,
          certificate: certificate,
          createdMediaKeys: createdMediaKeys,
          options: options,
          getLicense: promisifyGetLicense(keySystemOptions.getLicense)
        });
      })['catch'](_videoJs2['default'].log.error.bind(_videoJs2['default'].log.error, 'Failed to create and initialize a MediaKeys object'));
    })();

    if (typeof _ret === 'object') return _ret.v;
  }

  addSession({
    video: video,
    initDataType: initDataType,
    initData: initData,
    options: options,
    // if key system has not been determined then addSession doesn't need getLicense
    getLicense: video.keySystem ? promisifyGetLicense(standardizeKeySystemOptions(video.keySystem, options.keySystems[video.keySystem]).getLicense) : null
  });
};
exports.standard5July2016 = standard5July2016;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./playready":4}],2:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _videoJs = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);

var _videoJs2 = _interopRequireDefault(_videoJs);

var _globalWindow = require('global/window');

var _globalWindow2 = _interopRequireDefault(_globalWindow);

var _utils = require('./utils');

var FAIRPLAY_KEY_SYSTEM = 'com.apple.fps.1_0';

exports.FAIRPLAY_KEY_SYSTEM = FAIRPLAY_KEY_SYSTEM;
var concatInitDataIdAndCertificate = function concatInitDataIdAndCertificate(_ref) {
  var initData = _ref.initData;
  var id = _ref.id;
  var cert = _ref.cert;

  if (typeof id === 'string') {
    id = (0, _utils.stringToUint16Array)(id);
  }

  // layout:
  //   [initData]
  //   [4 byte: idLength]
  //   [idLength byte: id]
  //   [4 byte:certLength]
  //   [certLength byte: cert]
  var offset = 0;
  var buffer = new ArrayBuffer(initData.byteLength + 4 + id.byteLength + 4 + cert.byteLength);
  var dataView = new DataView(buffer);
  var initDataArray = new Uint8Array(buffer, offset, initData.byteLength);

  initDataArray.set(initData);
  offset += initData.byteLength;

  dataView.setUint32(offset, id.byteLength, true);
  offset += 4;

  var idArray = new Uint16Array(buffer, offset, id.length);

  idArray.set(id);
  offset += idArray.byteLength;

  dataView.setUint32(offset, cert.byteLength, true);
  offset += 4;

  var certArray = new Uint8Array(buffer, offset, cert.byteLength);

  certArray.set(cert);

  return new Uint8Array(buffer, 0, buffer.byteLength);
};

var addKey = function addKey(_ref2) {
  var video = _ref2.video;
  var contentId = _ref2.contentId;
  var initData = _ref2.initData;
  var cert = _ref2.cert;
  var options = _ref2.options;
  var getLicense = _ref2.getLicense;

  return new Promise(function (resolve, reject) {
    if (!video.webkitKeys) {
      video.webkitSetMediaKeys(new _globalWindow2['default'].WebKitMediaKeys(FAIRPLAY_KEY_SYSTEM));
    }

    if (!video.webkitKeys) {
      reject('Could not create MediaKeys');
      return;
    }

    var keySession = video.webkitKeys.createSession('video/mp4', concatInitDataIdAndCertificate({ id: contentId, initData: initData, cert: cert }));

    if (!keySession) {
      reject('Could not create key session');
      return;
    }

    keySession.contentId = contentId;

    keySession.addEventListener('webkitkeymessage', function (event) {
      getLicense(options, contentId, event.message, function (err, license) {
        if (err) {
          reject(err);
          return;
        }

        keySession.update(new Uint8Array(license));
      });
    });

    keySession.addEventListener('webkitkeyadded', function (event) {
      resolve(event);
    });

    // for testing purposes, adding webkitkeyerror must be the last item in this method
    keySession.addEventListener('webkitkeyerror', function (event) {
      reject(event);
    });
  });
};

var defaultGetCertificate = function defaultGetCertificate(certificateUri) {
  return function (emeOptions, callback) {
    _videoJs2['default'].xhr({
      uri: certificateUri,
      responseType: 'arraybuffer'
    }, function (err, response, responseBody) {
      if (err) {
        callback(err);
        return;
      }

      callback(null, new Uint8Array(responseBody));
    });
  };
};

var defaultGetContentId = function defaultGetContentId(emeOptions, initData) {
  return (0, _utils.getHostnameFromUri)((0, _utils.uint8ArrayToString)(initData));
};

var defaultGetLicense = function defaultGetLicense(licenseUri) {
  return function (emeOptions, contentId, keyMessage, callback) {
    _videoJs2['default'].xhr({
      uri: licenseUri,
      method: 'POST',
      responseType: 'arraybuffer',
      body: keyMessage,
      headers: {
        'Content-type': 'application/octet-stream'
      }
    }, function (err, response, responseBody) {
      if (err) {
        callback(err);
        return;
      }

      callback(null, responseBody);
    });
  };
};

var fairplay = function fairplay(_ref3) {
  var video = _ref3.video;
  var initData = _ref3.initData;
  var options = _ref3.options;

  var fairplayOptions = options.keySystems[FAIRPLAY_KEY_SYSTEM];
  var getCertificate = fairplayOptions.getCertificate || defaultGetCertificate(fairplayOptions.certificateUri);
  var getContentId = fairplayOptions.getContentId || defaultGetContentId;
  var getLicense = fairplayOptions.getLicense || defaultGetLicense(fairplayOptions.licenseUri);

  return new Promise(function (resolve, reject) {
    getCertificate(options, function (err, cert) {
      if (err) {
        reject(err);
        return;
      }

      resolve(cert);
    });
  }).then(function (cert) {
    return addKey({
      video: video,
      cert: cert,
      initData: initData,
      getLicense: getLicense,
      options: options,
      contentId: getContentId(options, initData)
    });
  })['catch'](_videoJs2['default'].log.error.bind(_videoJs2['default'].log.error));
};

exports['default'] = fairplay;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./utils":5,"global/window":6}],3:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _videoJs = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);

var _videoJs2 = _interopRequireDefault(_videoJs);

var _globalWindow = require('global/window');

var _globalWindow2 = _interopRequireDefault(_globalWindow);

var _playready = require('./playready');

var PLAYREADY_KEY_SYSTEM = 'com.microsoft.playready';

exports.PLAYREADY_KEY_SYSTEM = PLAYREADY_KEY_SYSTEM;
var addKeyToSession = function addKeyToSession(options, session, event) {
  var playreadyOptions = options.keySystems[PLAYREADY_KEY_SYSTEM];

  if (typeof playreadyOptions.getKey === 'function') {
    playreadyOptions.getKey(options, event.destinationURL, event.message.buffer, function (err, key) {
      if (err) {
        _videoJs2['default'].log.error('Unable to get key: ' + err);
        return;
      }

      session.update(key);
    });
    return;
  }

  if (typeof playreadyOptions === 'string') {
    playreadyOptions = { url: playreadyOptions };
  }

  var url = playreadyOptions.url || event.destinationURL;

  (0, _playready.requestPlayreadyLicense)(url, event.message.buffer, function (err, response) {
    if (err) {
      _videoJs2['default'].log.error('Unable to request key from url: ' + url);
      return;
    }

    session.update(new Uint8Array(response.body));
  });
};

exports.addKeyToSession = addKeyToSession;
var createSession = function createSession(video, initData, options) {
  var session = video.msKeys.createSession('video/mp4', initData);

  if (!session) {
    _videoJs2['default'].log.error('Could not create key session.');
    return;
  }

  // Note that mskeymessage may not always be called for PlayReady:
  //
  // "If initData contains a PlayReady object that contains an OnDemand header, only a
  // keyAdded event is returned (as opposed to a keyMessage event as described in the
  // Encrypted Media Extension draft). Similarly, if initData contains a PlayReady object
  // that contains a key identifier in the hashed data storage (HDS), only a keyAdded
  // event is returned."
  // eslint-disable-next-line max-len
  // @see [PlayReady License Acquisition]{@link https://msdn.microsoft.com/en-us/library/dn468979.aspx}
  session.addEventListener('mskeymessage', function (event) {
    addKeyToSession(options, session, event);
  });

  session.addEventListener('mskeyerror', function (event) {
    _videoJs2['default'].log.error('Unexpected key error from key session with ' + ('code: ' + session.error.code + ' and systemCode: ' + session.error.systemCode));
  });
};

exports.createSession = createSession;

exports['default'] = function (_ref) {
  var video = _ref.video;
  var initData = _ref.initData;
  var options = _ref.options;

  // Although by the standard examples the presence of video.msKeys is checked first to
  // verify that we aren't trying to create a new session when one already exists, here
  // sessions are managed earlier (on the player.eme object), meaning that at this point
  // any existing keys should be cleaned up.
  if (video.msKeys) {
    delete video.msKeys;
  }

  try {
    video.msSetMediaKeys(new _globalWindow2['default'].MSMediaKeys(PLAYREADY_KEY_SYSTEM));
  } catch (e) {
    _videoJs2['default'].log.error('Unable to create media keys for PlayReady key system. Error: ' + e.message);
    return;
  }

  createSession(video, initData, options);
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./playready":4,"global/window":6}],4:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _videoJs = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);

var _videoJs2 = _interopRequireDefault(_videoJs);

var _globalWindow = require('global/window');

var _globalWindow2 = _interopRequireDefault(_globalWindow);

/**
 * Parses the EME key message XML to extract HTTP headers and the Challenge element to use
 * in the PlayReady license request.
 *
 * @param {ArrayBuffer} message key message from EME
 * @return {Object} an object containing headers and the message body to use in the
 * license request
 */
var getMessageContents = function getMessageContents(message) {
  var xml = new DOMParser().parseFromString(
  // TODO do we want to support UTF-8?
  String.fromCharCode.apply(null, new Uint16Array(message)), 'application/xml');
  var headersElement = xml.getElementsByTagName('HttpHeaders')[0];
  var headers = {};

  if (headersElement) {
    var headerNames = headersElement.getElementsByTagName('name');
    var headerValues = headersElement.getElementsByTagName('value');

    for (var i = 0; i < headerNames.length; i++) {
      headers[headerNames[i].childNodes[0].nodeValue] = headerValues[i].childNodes[0].nodeValue;
    }
  }

  var challengeElement = xml.getElementsByTagName('Challenge')[0];
  var challenge = undefined;

  if (challengeElement) {
    challenge = _globalWindow2['default'].atob(challengeElement.childNodes[0].nodeValue);
  }

  return {
    headers: headers,
    message: challenge
  };
};

exports.getMessageContents = getMessageContents;
var requestPlayreadyLicense = function requestPlayreadyLicense(url, messageBuffer, callback) {
  var _getMessageContents = getMessageContents(messageBuffer);

  var headers = _getMessageContents.headers;
  var message = _getMessageContents.message;

  _videoJs2['default'].xhr({
    uri: url,
    method: 'post',
    headers: headers,
    body: message,
    responseType: 'arraybuffer'
  }, callback);
};
exports.requestPlayreadyLicense = requestPlayreadyLicense;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"global/window":6}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var stringToUint16Array = function stringToUint16Array(string) {
  // 2 bytes for each char
  var buffer = new ArrayBuffer(string.length * 2);
  var array = new Uint16Array(buffer);

  for (var i = 0; i < string.length; i++) {
    array[i] = string.charCodeAt(i);
  }

  return array;
};

exports.stringToUint16Array = stringToUint16Array;
var uint8ArrayToString = function uint8ArrayToString(array) {
  return String.fromCharCode.apply(null, new Uint16Array(array.buffer));
};

exports.uint8ArrayToString = uint8ArrayToString;
var getHostnameFromUri = function getHostnameFromUri(uri) {
  var link = document.createElement('a');

  link.href = uri;
  return link.hostname;
};

exports.getHostnameFromUri = getHostnameFromUri;
var arrayBuffersEqual = function arrayBuffersEqual(arrayBuffer1, arrayBuffer2) {
  if (arrayBuffer1 === arrayBuffer2) {
    return true;
  }

  if (arrayBuffer1.byteLength !== arrayBuffer2.byteLength) {
    return false;
  }

  var dataView1 = new DataView(arrayBuffer1);
  var dataView2 = new DataView(arrayBuffer2);

  for (var i = 0; i < dataView1.byteLength; i++) {
    if (dataView1.getUint8(i) !== dataView2.getUint8(i)) {
      return false;
    }
  }

  return true;
};

exports.arrayBuffersEqual = arrayBuffersEqual;
var arrayBufferFrom = function arrayBufferFrom(bufferOrTypedArray) {
  if (bufferOrTypedArray instanceof Uint8Array || bufferOrTypedArray instanceof Uint16Array) {
    return bufferOrTypedArray.buffer;
  }

  return bufferOrTypedArray;
};
exports.arrayBufferFrom = arrayBufferFrom;
},{}],6:[function(require,module,exports){
(function (global){
var win;

if (typeof window !== "undefined") {
    win = window;
} else if (typeof global !== "undefined") {
    win = global;
} else if (typeof self !== "undefined"){
    win = self;
} else {
    win = {};
}

module.exports = win;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],7:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _videoJs = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);

var _videoJs2 = _interopRequireDefault(_videoJs);

var _eme = require('./eme');

var _fairplay = require('./fairplay');

var _fairplay2 = _interopRequireDefault(_fairplay);

var _msPrefixed = require('./ms-prefixed');

var _msPrefixed2 = _interopRequireDefault(_msPrefixed);

var _utils = require('./utils');

var hasSession = function hasSession(sessions, initData) {
  for (var i = 0; i < sessions.length; i++) {
    // Other types of sessions may be in the sessions array that don't store the initData
    // (for instance, PlayReady sessions on IE11).
    if (!sessions[i].initData) {
      continue;
    }

    // initData should be an ArrayBuffer by the spec:
    // eslint-disable-next-line max-len
    // @see [Media Encrypted Event initData Spec]{@link https://www.w3.org/TR/encrypted-media/#mediaencryptedeventinit}
    //
    // However, on some browsers it may come back with a typed array view of the buffer.
    // This is the case for IE11, however, since IE11 sessions are handled differently
    // (following the msneedkey PlayReady path), this coversion may not be important. It
    // is safe though, and might be a good idea to retain in the short term (until we have
    // catalogued the full range of browsers and their implementations).
    if ((0, _utils.arrayBuffersEqual)((0, _utils.arrayBufferFrom)(sessions[i].initData), (0, _utils.arrayBufferFrom)(initData))) {
      return true;
    }
  }

  return false;
};

exports.hasSession = hasSession;
var handleEncryptedEvent = function handleEncryptedEvent(event, options, sessions) {
  if (!options || !options.keySystems) {
    // return silently since it may be handled by a different system
    return;
  }

  // "Initialization Data must be a fixed value for a given set of stream(s) or media
  // data. It must only contain information related to the keys required to play a given
  // set of stream(s) or media data."
  // eslint-disable-next-line max-len
  // @see [Initialization Data Spec]{@link https://www.w3.org/TR/encrypted-media/#initialization-data}
  if (hasSession(sessions, event.initData)) {
    // TODO convert to videojs.log.debug and add back in
    // https://github.com/videojs/video.js/pull/4780
    // videojs.log('eme',
    //             'Already have a configured session for init data, ignoring event.');
    return;
  }

  sessions.push({ initData: event.initData });

  (0, _eme.standard5July2016)({
    video: event.target,
    initDataType: event.initDataType,
    initData: event.initData,
    options: options
  });
};

exports.handleEncryptedEvent = handleEncryptedEvent;
var handleWebKitNeedKeyEvent = function handleWebKitNeedKeyEvent(event, options) {
  if (!options.keySystems || !options.keySystems[_fairplay.FAIRPLAY_KEY_SYSTEM]) {
    // return silently since it may be handled by a different system
    return;
  }

  // From Apple's example Safari FairPlay integration code, webkitneedkey is not repeated
  // for the same content. Unless documentation is found to present the opposite, handle
  // all webkitneedkey events the same (even if they are repeated).

  return (0, _fairplay2['default'])({
    video: event.target,
    initData: event.initData,
    options: options
  });
};

exports.handleWebKitNeedKeyEvent = handleWebKitNeedKeyEvent;
var handleMsNeedKeyEvent = function handleMsNeedKeyEvent(event, options, sessions) {
  if (!options.keySystems || !options.keySystems[_msPrefixed.PLAYREADY_KEY_SYSTEM]) {
    // return silently since it may be handled by a different system
    return;
  }

  // "With PlayReady content protection, your Web app must handle the first needKey event,
  // but it must then ignore any other needKey event that occurs."
  // eslint-disable-next-line max-len
  // @see [PlayReady License Acquisition]{@link https://msdn.microsoft.com/en-us/library/dn468979.aspx}
  //
  // Usually (and as per the example in the link above) this is determined by checking for
  // the existence of video.msKeys. However, since the video element may be reused, it's
  // easier to directly manage the session.
  if (sessions.reduce(function (acc, session) {
    return acc || session.playready;
  }, false)) {
    // TODO convert to videojs.log.debug and add back in
    // https://github.com/videojs/video.js/pull/4780
    // videojs.log('eme',
    //             'An \'msneedkey\' event was receieved earlier, ignoring event.');
    return;
  }

  sessions.push({ playready: true });

  (0, _msPrefixed2['default'])({
    video: event.target,
    initData: event.initData,
    options: options
  });
};

exports.handleMsNeedKeyEvent = handleMsNeedKeyEvent;
var getOptions = function getOptions(player) {
  return _videoJs2['default'].mergeOptions(player.currentSource(), player.eme.options);
};

exports.getOptions = getOptions;
/**
 * Configure a persistent sessions array and activeSrc property to ensure we properly
 * handle each independent source's events. Should be run on any encrypted or needkey
 * style event to ensure that the sessions reflect the active source.
 *
 * @function setupSessions
 * @param    {Player} player
 */
var setupSessions = function setupSessions(player) {
  var src = player.src();

  if (src !== player.eme.activeSrc) {
    player.eme.activeSrc = src;
    player.eme.sessions = [];
  }
};

exports.setupSessions = setupSessions;
/**
 * Function to invoke when the player is ready.
 *
 * This is a great place for your plugin to initialize itself. When this
 * function is called, the player will have its DOM and child components
 * in place.
 *
 * @function onPlayerReady
 * @param    {Player} player
 * @param    {Object} [options={}]
 */
var onPlayerReady = function onPlayerReady(player) {
  if (player.$('.vjs-tech').tagName.toLowerCase() !== 'video') {
    return;
  }

  setupSessions(player);

  // Support EME 05 July 2016
  // Chrome 42+, Firefox 47+, Edge
  player.tech_.el_.addEventListener('encrypted', function (event) {
    // TODO convert to videojs.log.debug and add back in
    // https://github.com/videojs/video.js/pull/4780
    // videojs.log('eme', 'Received an \'encrypted\' event');
    setupSessions(player);
    handleEncryptedEvent(event, getOptions(player), player.eme.sessions);
  });
  // Support Safari EME with FairPlay
  // (also used in early Chrome or Chrome with EME disabled flag)
  player.tech_.el_.addEventListener('webkitneedkey', function (event) {
    // TODO convert to videojs.log.debug and add back in
    // https://github.com/videojs/video.js/pull/4780
    // videojs.log('eme', 'Received a \'webkitneedkey\' event');

    // TODO it's possible that the video state must be cleared if reusing the same video
    // element between sources
    setupSessions(player);
    handleWebKitNeedKeyEvent(event, getOptions(player));
  });

  // EDGE still fires msneedkey, but should use encrypted instead
  if (_videoJs2['default'].browser.IS_EDGE) {
    return;
  }

  // IE11 Windows 8.1+
  player.tech_.el_.addEventListener('msneedkey', function (event) {
    // TODO convert to videojs.log.debug and add back in
    // https://github.com/videojs/video.js/pull/4780
    // videojs.log('eme', 'Received an \'msneedkey\' event');
    setupSessions(player);
    handleMsNeedKeyEvent(event, getOptions(player), player.eme.sessions);
  });
};

/**
 * A video.js plugin.
 *
 * In the plugin function, the value of `this` is a video.js `Player`
 * instance. You cannot rely on the player being in a "ready" state here,
 * depending on how the plugin is invoked. This may or may not be important
 * to you; if not, remove the wait for "ready"!
 *
 * @function eme
 * @param    {Object} [options={}]
 *           An object of options left to the plugin author to define.
 */
var eme = function eme() {
  var _this = this;

  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  this.ready(function () {
    return onPlayerReady(_this);
  });

  this.eme.options = options;
};

// Register the plugin with video.js.
var registerPlugin = _videoJs2['default'].registerPlugin || _videoJs2['default'].plugin;

registerPlugin('eme', eme);

exports['default'] = eme;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./eme":1,"./fairplay":2,"./ms-prefixed":3,"./utils":5}]},{},[7])(7)
});