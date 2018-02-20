# videojs-contrib-eme [![Build Status](https://travis-ci.org/videojs/videojs-contrib-eme.svg?branch=master)](https://travis-ci.org/videojs/videojs-contrib-eme)

[![Greenkeeper badge](https://badges.greenkeeper.io/videojs/videojs-contrib-eme.svg)](https://greenkeeper.io/)

Supports Encrypted Media Extensions for playback of encrypted content in Video.js

Lead Maintainer: Garrett Singer [@gesinger](https://github.com/gesinger)
Maintenance Status: Experimental

### Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Using](#using)
  - [FairPlay](#fairplay)
  - [Other DRM Systems](#other-drm-systems)
  - [Source Options](#source-options)
  - [Plugin Options](#plugin-options)
  - [emeOptions](#emeoptions)
  - [Passing methods seems complicated](#passing-methods-seems-complicated)
- [Getting Started](#getting-started)
  - [Running Tests](#running-tests)
  - [Tag and Release](#tag-and-release)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Using

By default, videojs-contrib-eme is not able to decrypt any audio/video. In order to
decrypt audio/video, a user must pass in either relevant license URIs, or methods specific
to a source and its combination of key system and codec. These are provided to the plugin
via either videojs-contrib-eme's plugin options, or source options.

### FairPlay

For FairPlay, only `keySystems` is used from the options passed into videojs-contrib-eme,
or provided as part of the source object.

The required methods to provide are:
* `getCertificate`
* `getContentId`
* `getLicense`
or, if you are using the default FairPlay methods, the only required parameters are:
* `certificateUri`
* `licenseUri`

Below is an example of videojs-contrib-eme options when only using FairPlay:

```javascript
{
  keySystems: {
    "com.apple.fps.1_0": {
      getCertificate: function(emeOptions, callback) {
        // request certificate
        // if err, callback(err)
        // if success, callback(null, certificate)
      },
      getContentId: function(emeOptions, initData) {
        // return content ID
      },
      getLicense: function(emeOptions, contentId, keyMessage, callback) {
        // request key
        // if err, callback(err)
        // if success, callback(null, key) as arraybuffer
      }
    }
  }
}
```

Below is an example of videojs-contrib-eme options when only using FairPlay, and using
the default FairPlay methods:

```javascript
{
  keySystems: {
    "com.apple.fps.1_0": {
      certificateUri: "<CERTIFICATE URI>",
      licenseUri: "<LICENSE URI>"
    }
  }
}
```

The default methods are defined as follows:
* getCertificate - GET certificateUri with response type of arraybuffer
* getContentId - gets the hostname from the initData URI
* getLicense - POST licenseUri with response type of arraybuffer, header of
'Content-type': 'application/octet-stream', and body of webKitKeyMessage

### PlayReady for IE11 (Windows 8.1+)

PlayReady for IE11 (Windows 8.1+) only requires `keySystems` from the options passed
into videojs-contrib-eme, or provided as part of the source object.

There are four choices for options that may be passed:

1) If the value of `true` is provided, then a POST request will be made to the
`detinationURI` passed by the message from the browser, with the headers and body
specified in the message.

Example:
```javascript
  keySystems: {
    "com.microsoft.playready": true
  }
```

2/3) If a url is provided, either within an object or as a string, then a POST request
will be made to the provided url, with the headers and body specified in the message.

Example:
```javascript
  keySystems: {
    "com.microsoft.playready": "<your url here>"
  }
  // or
  keySystems: {
    "com.microsoft.playready": {
      "url": "<your url here>"
    }
  }
```

4) If a `getKey` function is provided, then the function will be run with the message
buffer and destinationURI passed by the browser, and will expect a callback with the key.

Example:
```javascript
{
  keySystems: {
    "com.microsoft.playready": {
      getKey: function(emeOptions, destinationURI, buffer, callback) {
        // request key
        // if err, callback(err)
        // if success, callback(null, key), where key is a Uint8Array
      }
    }
  }
}
```

### Other DRM Systems

For DRM systems that use the W3C EME specification as of 5 July 2016, only `keySystems`
and a way of obtaining the license are required.

To obtain a license requires one of a couple different options:
1) You may use a string as the license url, or a url as an entry in the options:
```javascript
{
  keySystems: {
    'org.w3.clearkey': '<your-license-url>',
    'com.widevine.alpha': {
      url: '<your-license-url>'
    }
  }
}
```
2) You may pass a `getLicense` function:
```javascript
{
  keySystems: {
    'org.w3.clearkey': {
      getLicense: function(emeOptions, keyMessage, callback) {
        // request license
        // if err, callback(err)
        // if success, callback(null, license)
      }
    }
  }
}
```

Although the license acquisition related config is the only required configuration,
`getCertificate` is also supported if your source needs to retrieve a certificate.

The `audioContentType` and `videoContentType` properties for non-FairPlay sources are
used to determine if the system supports that codec, and to create an appropriate
`keySystemAccess` object. If left out, it is possible that the system will create a
`keySystemAccess` object for the given key system, but will not be able to play the
source due to the browser's inability to use that codec.

Below is an example of videojs-contrib-eme options when only using one of these DRM
systems, and custom `getLicense` and `getCertificate` functions:

```javascript
{
  keySystems: {
    "org.w3.clearkey": {
      audioContentType: 'audio/webm; codecs="vorbis"',
      videoContentType: 'video/webm; codecs="vp9"',
      getCertificate: function(emeOptions, callback) {
        // request certificate
        // if err, callback(err)
        // if success, callback(null, certificate)
      },
      getLicense: function(emeOptions, keyMessage, callback) {
        // request license
        // if err, callback(err)
        // if success, callback(null, license)
      }
    }
  }
}
```

### Source Options

Since each source may have a different set of properties and methods, it is best to use
source options instead of plugin options when specifying key systems. To do that, simply
pass the same options as you would as part of the plugin options, but instead pass them
as part of the source object when specifying `player.src(sourceObject)`.

For example:

```javascript
player.src({
  // normal src and type options
  src: '<URL>',
  type: 'video/webm',
  // eme options
  keySystems: {
    'org.w3.clearkey': {
      audioContentType: 'audio/webm; codecs="vorbis"',
      videoContentType: 'video/webm; codecs="vp9"',
      getCertificate: function(emeOptions, callback) {
        // request certificate
        // if err, callback(err)
        // if success, callback(null, certificate)
      },
      getLicense: function(emeOptions, keyMessage, callback) {
        // request license
        // if err, callback(err)
        // if success, callback(null, license)
      }
    }
  }
});
```

### Plugin Options

Plugin options may be provided in one of two ways. Either they are provided in the
standard plugins configuration when setting up video.js itself, or they may be set by
assigning to the options property on the eme object itself:

```javascript
player.eme.options = {
  // options you want to pass
};
```

### emeOptions

`emeOptions` are provided for all methods. This is a reference to the source options for
the current source merged with (overwritten by) the latest plugin options. It is available
to make it easier to access options so that you don't have to maintain them yourself.

For example. If you need to use a userId for the getCertificate request, you can pass in
plugin options that have:

```javascript
{
  keySystems: {
    "org.w3.clearkey": {
      getCertificate: function(emeOptions, callback) {
        var userId = emeOptions.userId; // 'user-id'
        // ...
      },
      getLicense: function(emeOptions, keyMessage, callback) {
        var userId = emeOptions.userId; // 'user-id'
        // ...
      }
    }
  },
  userId: 'user-id'
}
```

Or, if you need a source-specific userId, you can overwrite it via the source options:

```javascript
// plugin options
{
  keySystems: {
    "org.w3.clearkey": {
      getCertificate: function(emeOptions, callback) {
        var userId = emeOptions.userId; // 'source-specific-user-id'
        // ...
      },
      getLicense: function(emeOptions, keyMessage, callback) {
        var userId = emeOptions.userId; // 'source-specific-user-id'
        // ...
      }
    }
  },
  userId: 'user-id'
}

// source options
player.src({
  src: '<URL>',
  type: 'video/webm',
  userId: 'source-specific-user-id'
});
```

### Passing methods seems complicated

While simple URLs are supported for many EME implementations, we wanted to provide as much
flexibility as possible. This means that if your server has a different structure, you use
a different format for FairPlay content IDs, or you want to test something in the browser
without making a request, we can support that, since you can control the methods.

### Special Events

There are some events that are specific to this plugin.  Once such event is `licenserequestattempted`.
This event is triggered on the `tech_` on the callback of every license request.

In order to listen to this event:

```
player.tech_.on('licenserequestattempted', function(event) {
  // Act on event
});
```

## Getting Started

1. Clone this repository!
1. Install dependencies: `npm install`
1. Run a development server: `npm start`

That's it! Refer to the [video.js plugin standards](https://github.com/videojs/generator-videojs-plugin/docs/standards.md) for more detail.

### Running Tests

- In all available and supported browsers: `npm test`
- In a specific browser: `npm run test:chrome`, `npm run test:firefox`, etc.
- While development server is running, navigate to [`http://localhost:9999/test/`](http://localhost:9999/test/) (_note:_ port may vary, check console output)

### Tag and Release

1. Make sure everything is committed.
1. `npm version *` where `*` is `major`, `minor`, `patch`, etc. [Read more about versioning.](https://github.com/videojs/generator-videojs-plugin/docs/standards.md#versioning)
1. `npm publish`

## License

Apache License, Version 2.0. [View the license file](LICENSE)
