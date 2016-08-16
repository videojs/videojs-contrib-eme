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

## Options

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
    },
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
