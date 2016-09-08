/**
 * videojs-contrib-eme
 * @version 1.0.0
 * @copyright 2016 Garrett Singer <gesinger@gmail.com>
 * @license MIT
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
      promise['catch'](function (e) {
        promise = navigator.requestMediaKeySystemAccess(keySystem, [systemOptions]);
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

var standard5July2016 = function standard5July2016(_ref5) {
  var video = _ref5.video;
  var initDataType = _ref5.initDataType;
  var initData = _ref5.initData;
  var options = _ref5.options;

  if (!options || !options.keySystems) {
    return;
  }

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

          keySystemOptions = options.keySystems[keySystemAccess.keySystem];

          if (!keySystemOptions.getCertificate) {
            resolve(keySystemAccess);
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
    getLicense: video.keySystem ? promisifyGetLicense(options.keySystems[video.keySystem].getLicense) : null
  });
};
exports.standard5July2016 = standard5July2016;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(require,module,exports){
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
module.exports = exports['default'];
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./utils":3,"global/window":4}],3:[function(require,module,exports){
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
},{}],4:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(require,module,exports){
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

var lastSource = undefined;

var handleEncryptedEvent = function handleEncryptedEvent(event, sourceOptions) {
  (0, _eme.standard5July2016)({
    video: event.target,
    initDataType: event.initDataType,
    initData: event.initData,
    options: sourceOptions
  });
};

var handleWebKitNeedKeyEvent = function handleWebKitNeedKeyEvent(event, sourceOptions) {
  (0, _fairplay2['default'])({
    video: event.target,
    initData: event.initData,
    options: sourceOptions
  });
};

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
var onPlayerReady = function onPlayerReady(player, options) {
  if (player.$('.vjs-tech').tagName.toLowerCase() !== 'video') {
    return;
  }

  // Support EME 05 July 2016
  player.tech_.el_.addEventListener('encrypted', function (event) {
    handleEncryptedEvent(event, _videoJs2['default'].mergeOptions(options, lastSource));
  });
  // Support Safari EME with FairPlay
  // (also used in early Chrome or Chrome with EME disabled flag)
  player.tech_.el_.addEventListener('webkitneedkey', function (event) {
    handleWebKitNeedKeyEvent(event, _videoJs2['default'].mergeOptions(options, lastSource));
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
var eme = function eme(options) {
  var _this = this;

  eme.options = options;

  this.on('ready', function () {
    onPlayerReady(_this, _videoJs2['default'].mergeOptions({}, options));
  });
};

var sourceGrabber = {
  canHandleSource: function canHandleSource(sourceObject) {
    lastSource = sourceObject;
    return '';
  },
  // should never be called
  handleSource: function handleSource() {},
  canPlayType: function canPlayType() {
    return '';
  }
};

// start with no options
eme.options = {};

// register to beginning of HTML5 source handlers
_videoJs2['default'].getComponent('Html5').registerSourceHandler(sourceGrabber, 0);

// Register the plugin with video.js.
_videoJs2['default'].plugin('eme', eme);

exports['default'] = eme;
module.exports = exports['default'];
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./eme":1,"./fairplay":2}]},{},[5])(5)
});