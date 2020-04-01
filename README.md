# videojs-contrib-eme


[![Build Status](https://travis-ci.org/videojs/videojs-contrib-eme.svg?branch=master)](https://travis-ci.org/videojs/videojs-contrib-eme)
[![Greenkeeper badge](https://badges.greenkeeper.io/videojs/videojs-contrib-eme.svg)](https://greenkeeper.io/)
[![Slack Status](http://slack.videojs.com/badge.svg)](http://slack.videojs.com)

[![NPM](https://nodei.co/npm/videojs-contrib-eme.png?downloads=true&downloadRank=true)](https://nodei.co/npm/videojs-contrib-eme/)

Supports Encrypted Media Extensions for playback of encrypted content in Video.js

Maintenance Status: Stable

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Using](#using)
  - [Initialization](#initialization)
  - [FairPlay](#fairplay)
    - [Get Certificate/License by URL](#get-certificatelicense-by-url)
    - [Get Certificate/Content ID/License by Functions](#get-certificatecontent-idlicense-by-functions)
  - [PlayReady for IE11 (Windows 8.1+)](#playready-for-ie11-windows-81)
    - [Get License by Default](#get-license-by-default)
    - [Get Key by URL](#get-key-by-url)
    - [Get Key by Function](#get-key-by-function)
  - [Other DRM Systems](#other-drm-systems)
    - [Get License By URL](#get-license-by-url)
    - [Get License By Function](#get-license-by-function)
  - [MediaKeySystemConfiguration and supportedConfigurations](#mediakeysystemconfiguration-and-supportedconfigurations)
  - [Get License Errors](#get-license-errors)
- [API](#api)
  - [Available Options](#available-options)
    - [`keySystems`](#keysystems)
    - [`emeHeaders`](#emeheaders)
  - [Setting Options per Source](#setting-options-per-source)
  - [Setting Options for All Sources](#setting-options-for-all-sources)
  - [Header Hierarchy and Removal](#header-hierarchy-and-removal)
  - [`emeOptions`](#emeoptions)
  - [`initializeMediaKeys()`](#initializemediakeys)
  - [Events](#events)
    - [`licenserequestattempted`](#licenserequestattempted)
    - [`keystatuschange`](#keystatuschange)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Using

By default, videojs-contrib-eme is not able to decrypt any audio/video.

In order to decrypt audio/video, a user must pass in either relevant license URIs, or methods specific to a source and its combination of key system and codec. These are provided to the plugin via either videojs-contrib-eme's plugin options or source options.

If you're new to DRM on the web, read [about how EME is used to play protected content on the web](https://developers.google.com/web/fundamentals/media/eme).

### Initialization

The videojs-contrib-eme plugin must be initialized before a source is loaded into the player:

```js
player.eme();
player.src({
  src: '<your url here>',
  type: 'application/dash+xml',
  keySystems: {
    'com.widevine.alpha': '<YOUR URL HERE>'
  }
});
```

### FairPlay

For FairPlay, only `keySystems` is used from the options passed into videojs-contrib-eme or provided as part of the source object.

There are two ways to configure FairPlay.

#### Get Certificate/License by URL

In this simpler implementation, you can provide URLs and allow videojs-contrib-eme to make the requests internally via default mechanisms.

When using this method, there are two required properties of the `keySystems` object:

* `certificateUri`
* `licenseUri`

And there are two _optional_ properties:

* `certificateHeaders`
* `licenseHeaders`

With this configuration, videojs-contrib-eme will behave in the following ways:

* It will fetch the certificate by making a GET request to your `certificateUri` with an expected response type of `arraybuffer`. Headers can be defined for this request via the `certificateHeaders` object.
* The content ID will be interpreted from the `initData`.
* It will fetch the license by making a POST request to your `licenseUri` with an expected response type of `arraybuffer`. This will have one default header of `Content-type: application/octet-stream`, but this can be overridden (or other headers added) using `licenseHeaders`.


Below are examples of FairPlay configurations of this type:

```js
{
  keySystems: {
    'com.apple.fps.1_0': {
      certificateUri: '<CERTIFICATE_URL>',
      licenseUri: '<LICENSE_URL>'
    }
  }
}
```

or

```javascript
{
  keySystems: {
    'com.apple.fps.1_0': {
      certificateUri: '<CERTIFICATE_URL>',
      certificateHeaders: {
        'Some-Header': 'value'
      },
      licenseUri: '<LICENSE_URL>',
      licenseHeaders: {
        'Some-Header': 'value'
      }
    }
  }
}
```

#### Get Certificate/Content ID/License by Functions

You can control the license and certificate request processes by providing the following methods instead of the properties discussed above:

* `getCertificate()` - Allows asynchronous retrieval of a certificate.
* `getContentId()` - Allows synchronous retrieval of a content ID.
* `getLicense()` - Allows asynchronous retrieval of a license.

```js
{
  keySystems: {
    'com.apple.fps.1_0': {
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

### PlayReady for IE11 (Windows 8.1+)

PlayReady for IE11 (Windows 8.1+) only requires `keySystems` from the options passed into videojs-contrib-eme or provided as part of the source object.

There are three ways to configure PlayReady for IE11 (Windows 8.1+).

#### Get License by Default

If the value of `true` is provided, then a POST request will be made to the `destinationURI` passed by the message from the browser, with the headers and body specified in the message.

```js
keySystems: {
  'com.microsoft.playready': true
}
```

#### Get Key by URL

If a URL is provided - either within an object or as a string - then a POST request will be made to the provided URL, with the headers and body specified in the message. Additionally, a `licenseHeaders` object may be provided, if additional headers are required:

```js
keySystems: {
  'com.microsoft.playready': '<YOUR_KEY_URL>'
}
```

or

```js
  keySystems: {
    'com.microsoft.playready': {
      url: '<YOUR_KEY_URL>',
      licenseHeaders: {
        'Some-Header': 'value'
      }
    }
  }
```

#### Get Key by Function

If a `getKey` function is provided, then the function will be run with the message buffer and `destinationURI` passed by the browser, and will expect a callback with the key:

```js
{
  keySystems: {
    'com.microsoft.playready': {
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

For DRM systems that use the W3C EME specification as of 5 July 2016, only `keySystems` and a way of obtaining the license are required.

Obtaining a license can be done in two ways.

#### Get License By URL

For simple use-cases, you may use a string as the license URL or a URL as a property of in the `keySystems` entry:

```js
{
  keySystems: {
    'org.w3.clearkey': '<YOUR_LICENSE_URL>',
    'com.widevine.alpha': {
      url: '<YOUR_LICENSE_URL>'
    }
  }
}
```

#### Get License By Function

For more complex integrations, you may pass a `getLicense` function to fully control the license retrieval process:

```js
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

Although the license acquisition is the only required configuration, `getCertificate()` is also supported if your source needs to retrieve a certificate, similar to the [FairPlay](#fairplay) implementation above.

The `audioContentType` and `videoContentType` properties for non-FairPlay sources are used to determine if the system supports that codec and to create an appropriate `keySystemAccess` object. If left out, it is possible that the system will create a `keySystemAccess` object for the given key system, but will not be able to play the source due to the browser's inability to use that codec.

Below is an example of using one of these DRM systems and custom `getLicense()` and `getCertificate()` functions:

```js
{
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
}
```

### MediaKeySystemConfiguration and supportedConfigurations

In addition to `audioContentType` and `videoContentType` posted above, it is possible to directly provide the `supportedConfigurations` array to use for the `requestMediaKeySystemAccess` call. This allows for the entire range of options specified by the [MediaKeySystemConfiguration] object.

Note that if `supportedConfigurations` is provided, it will override `audioContentType`, `videoContentType`, `audioRobustness`, `videoRobustness`, and `persistentState`.

Example:

```js
{
  keySystems: {
    'org.w3.clearkey': {
      supportedConfigurations: [{
        videoCapabilities: [{
          contentType: 'video/webm; codecs="vp9"',
          robustness: 'SW_SECURE_CRYPTO'
        }],
        audioCapabilities: [{
          contentType: 'audio/webm; codecs="vorbis"',
          robustness: 'SW_SECURE_CRYPTO'
        }]
      }],
      'org.w3.clearkey': '<YOUR_LICENSE_URL>'
    }
  }
}
```

### Get License Errors

The default `getLicense()` functions pass an error to the callback if the license request returns a 4xx or 5xx response code. Depending on how the license server is configured, it is possible in some cases that a valid license could still be returned even if the response code is in that range. If you wish not to pass an error for 4xx and 5xx response codes, you may pass your own `getLicense()` function with the `keySystems` as described above.

## API

### Available Options

#### `keySystems`

This is the main option through which videojs-contrib-eme can be configured. It maps key systems by name (e.g. `'org.w3.clearkey'`) to an object for configuring that key system.

#### `emeHeaders`

This object can be a convenient way to specify default headers for _all_ requests that are made by videojs-contrib-eme. These headers will override any headers that are set by videojs-contrib-eme internally, but can be further overridden by headers specified in `keySystems` objects (e.g., `certificateHeaders` or `licenseHeaders`).

An `emeHeaders` object should look like this:

```js
emeHeaders: {
  'Common-Header': 'value'
}
```

### Setting Options per Source

This is the recommended way of setting most options. Each source may have a different set of requirements; so, it is best to define options on a per source basis.

To do this, attach the options to the source object you pass to `player.src()`:

```js
player.src({

  // normal Video.js src and type options
  src: '<URL>',
  type: 'video/webm',

  // eme options
  emeHeaders: {
    'Common-Header': 'value'
  },
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

### Setting Options for All Sources

While [setting options per source](#setting-options-per-source) is recommended, some implementations may want to use plugin-level options.

These can be set during plugin invocation:

```js
player.eme({

  // Set Common-Header on ALL requests for ALL key systems.
  emeHeaders: {
    'Common-Header': 'value'
  }
});
```

Plugin-level options may also be set after plugin initialization by assigning to the options property on the `eme` object itself:

```js
player.eme();

player.eme.options.emeHeaders = {
  'Common-Header': 'value'
};
```

or

```js
player.eme();

player.eme.options = {
  emeHeaders: {
    'Common-Header': 'value'
  }
};
```

### Header Hierarchy and Removal

Headers defined in the `emeHeaders` option or in `licenseHeaders`/`certificateHeaders` objects within `keySystems` can _remove_ headers defined at lower levels without defining a new value. This can be done by setting their value to `null`.

The hierarchy of header definitions is:

```
licenseHeaders/certificateHeaders > emeHeaders > internal defaults
```

In most cases, the header `{'Content-type': 'application/octet-stream'}` is a default and cannot be overridden without writing your own `getLicense()` function. This internal default can be overridden by either of the user-provided options.

Here's an example:

```js
player.eme({
  emeHeaders: {

    // Remove the internal default Content-Type
    'Content-Type': null,
    'Custom-Foo': '<CUSTOM_FOO_VALUE>'
  }
});

player.src({
  src: '<URL>',
  type: '<MIME_TYPE>',
  keySystems: {
    'com.apple.fps.1_0': {
      certificateUri: '<CERTIFICATE_URL>',
      certificateHeaders: {
        'Custom-Foo': '<ANOTHER_CUSTOM_FOO_VALUE>'
      },
      licenseUri: '<LICENSE_URL>',
      licenseHeaders: {
        'License-Bar': '<LICENSE_BAR_VALUE>'
      }
    }
  }
})
```

This will result in the following headers for the certificate request:

```
Custom-Foo: <ANOTHER_CUSTOM_FOO_VALUE>
```

And for the license request:

```
Custom-Foo: <CUSTOM_FOO_VALUE>
License-Bar: <LICENSE_BAR_VALUE>
```

### `emeOptions`

All methods in a key system receive `emeOptions` as their first argument.

The `emeOptions` are an object which merges source-level options with plugin-level options.

> **NOTE:** In these cases, plugin-level options will **override** the source-level options. This is used by libraries like [VHS](https://github.com/videojs/http-streaming), but could be unintuitive. This is another reason to prefer source-level options in all cases!

It is available to make it easier to access options in custom key systems methods, so that you don't have to maintain your own references.

For example, if you needed to use a `userId` for the `getCertificate()` request, you could:

```js
player.eme();

player.src({
  keySystems: {
    'org.w3.clearkey': {
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
});
```

### `initializeMediaKeys()`

`player.eme.initializeMediaKeys()` sets up MediaKeys immediately on demand.

This is useful for setting up the video element for DRM before loading any content. Otherwise, the video element is set up for DRM on `encrypted` events. This is not supported in Safari.

```js
// additional plugin options
var emeOptions = {
  keySystems: {
    'org.w3.clearkey': {...}
  }
};

var emeCallback = function(error) {
  if (error) {
    // do something with error
  }

  // do something else
};

var suppressErrorsIfPossible = true;

player.eme.initializeMediaKeys(emeOptions, emeCallback, suppressErrorsIfPossible);
```

When `suppressErrorsIfPossible` is set to `false` (the default) and an error occurs, the error handler will be invoked after the callback finishes and `error()` will be called on the player. When set to `true` and an error occurs, the error handler will not be invoked with the exception of `mskeyerror` errors in IE11 since they cannot be suppressed asynchronously.

### Events

There are some events that are specific to this plugin.

#### `licenserequestattempted`

This event is triggered on the Video.js playback tech on the callback of every license request made by videojs-contrib-eme.

```
player.tech(true).on('licenserequestattempted', function(event) {
  // Act on event
});
```

#### `keystatuschange`

When the status of a key changes, an event of type `keystatuschange` will
be triggered on the Video.js playback tech. This helps you handle feedback to the user for situations like trying to play DRM-protected media on restricted devices.

```
player.tech(true).on('keystatuschange', function(event) {
  // Event data:
  // keyId
  // status: usable, output-restricted, etc
  // target: the MediaKeySession object that caused this event
});
```

This event is triggered directly from the underlying `keystatuseschange` event, so the statuses should correspond to [those listed in the spec](https://www.w3.org/TR/encrypted-media/#dom-mediakeystatus).

## License

Apache License, Version 2.0. [View the license file](LICENSE)

[MediaKeySystemConfiguration]: https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration
