# videojs-contrib-eme

Supports Encrypted Media Extensions for playback of encrypted content in Video.js

### Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Getting Started](#getting-started)
  - [Running Tests](#running-tests)
  - [Tag and Release](#tag-and-release)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Using

By default, videojs-contrib-eme is not able to decrypt any audio/video. In order to
decrypt audio/video, a user must pass in methods that are specific to a source and its
combination of key system and codec. These are provided via videojs-contrib-eme's options.

The bare minium requirement is to provide the `keySystems` property with an object
containing at least one key system that you will be using and an implementation of its
required methods.

The `configurations` object contains audio and video sources mapped to their codecs.
These are used to determine if the system supports that codec, and to create an
appropriate `keySystemAccess` object. If left out, it is possible that the system will
create a `keySystemAccess` object for the given key system, but will not be able to play
the source due to the browser's inability to use that codec.

### FairPlay

For FairPlay, only `keySystems` is used from the options passed into videojs-contrib-eme.

The required methods to provide are:
* `getCertificate`
* `getContentId`
* `getConcatenatedInitData`
* `getKey`

Below is an example of videojs-contrib-eme options when only using FairPlay:

```javascript
{
  keySystems: {
    "com.apple.fps.1_0": {
      getCertificate: (options, callback) => {
        // request certificate
        // if err, callback(err)
        // if success, callback(null, certificate)
      },
      getContentId: (initData) => {
        // return content ID
      },
      getConcatenatedInitData: (initData, certificate) => {
        // return concatenated init data
      },
      getKey: (options, callback) => {
        let { contentId, webKitKeyMessage } = options;

        // request key using options
        // if err, callback(err)
        // if success, callback(null, key) as arraybuffer
      }
    }
  }
}
```

### Other DRM Systems

For DRM systems that use the W3C EME specification as of 5 July 2016, both `keySystems`
and `configurations` are required.

`getLicense` is the only required `keySystems` method. `getCertificate` is also supported
if your source needs to retrieve a certificate.

Below is an example of videojs-contrib-eme options when only using one of these DRM
systems:

```javascript
{
  configurations: {
    audio: {
      'http://www.somesource.com/someext.ext': 'audio/webm; codecs="vorbis"',
      'http://www.someothersource.com/someext.ext': 'audio/webm; codecs="opus"'
    },
    video: {
      'http://www.somesource.com/someext.ext': 'video/webm; codecs="vp9"',
      'http://www.someothersource.com/someext.ext': 'video/webm; codecs="vp8"'
    }
  },
  keySystems: {
    "org.w3.clearkey": {
      getCertificate: (options, callback) => {
        // request certificate
        // if err, callback(err)
        // if success, callback(null, certificate)
      },
      getLicense: (options, callback) => {
        let keyMessage = options.keyMessage;

        // request license using mediaKeyMessage
        // if err, callback(err)
        // if success, callback(null, license)
      }
    }
  }
}
```

### This Seems Complicated

If you're wondering why there are so many methods to implement, and why the options can't
simply have URLs, you're asking good questions.

Right now, we wanted to provide as much flexibility as possible. This means that if your
server has a different structure than most servers, you use a different format for
FairPlay content IDs, or you want to test something in the browser without making a
request, we can support that, since you control the methods.

In the future we may provide default implementations and allow passing through the minimum
amount of details possible. If you have any suggestions on how we should go about this,
we'd love to hear your ideas!

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

MIT. Copyright (c) Garrett Singer &lt;gesinger@gmail.com&gt;
