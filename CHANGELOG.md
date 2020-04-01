<a name="3.7.0"></a>
# [3.7.0](https://github.com/videojs/videojs-contrib-eme/compare/v3.6.0...v3.7.0) (2020-04-01)

### Features

* add support for setting persistentState in supportedConfigurations (#102) ([ef9fa23](https://github.com/videojs/videojs-contrib-eme/commit/ef9fa23)), closes [#102](https://github.com/videojs/videojs-contrib-eme/issues/102)

<a name="3.6.0"></a>
# [3.6.0](https://github.com/videojs/videojs-contrib-eme/compare/v3.5.6...v3.6.0) (2020-02-12)

### Features

* support setting robustness and supportedConfigurations (#100) ([502c8ea](https://github.com/videojs/videojs-contrib-eme/commit/502c8ea)), closes [#100](https://github.com/videojs/videojs-contrib-eme/issues/100)

<a name="3.5.6"></a>
## [3.5.6](https://github.com/videojs/videojs-contrib-eme/compare/v3.5.5...v3.5.6) (2020-02-10)

### Bug Fixes

* save session-specific options in pending session data when waiting on media keys (#96) ([6cdbfa8](https://github.com/videojs/videojs-contrib-eme/commit/6cdbfa8)), closes [#96](https://github.com/videojs/videojs-contrib-eme/issues/96)

<a name="3.5.5"></a>
## [3.5.5](https://github.com/videojs/videojs-contrib-eme/compare/v3.5.4...v3.5.5) (2020-02-06)

### Bug Fixes

* getLicense should pass an error to callback if XHR returns 400/500 (#99) ([498ebaf](https://github.com/videojs/videojs-contrib-eme/commit/498ebaf)), closes [#99](https://github.com/videojs/videojs-contrib-eme/issues/99)

<a name="3.5.4"></a>
## [3.5.4](https://github.com/videojs/videojs-contrib-eme/compare/v3.5.3...v3.5.4) (2019-05-08)

### Bug Fixes

* use legacy WebKit API when available to address Safari 12.1 issues ([7a20e5d](https://github.com/videojs/videojs-contrib-eme/commit/7a20e5d))
* use new method signature for requestPlayreadyLicense from #81 (#85) ([36d5f9c](https://github.com/videojs/videojs-contrib-eme/commit/36d5f9c)), closes [#81](https://github.com/videojs/videojs-contrib-eme/issues/81) [#85](https://github.com/videojs/videojs-contrib-eme/issues/85)

<a name="3.5.3"></a>
## [3.5.3](https://github.com/videojs/videojs-contrib-eme/compare/v3.5.2...v3.5.3) (2019-05-02)

### Bug Fixes

* Fix support for custom getLicense methods for ms-prefixed PlayReady (#84) ([473f535](https://github.com/videojs/videojs-contrib-eme/commit/473f535)), closes [#84](https://github.com/videojs/videojs-contrib-eme/issues/84)

<a name="3.5.2"></a>
## [3.5.2](https://github.com/videojs/videojs-contrib-eme/compare/v3.5.1...v3.5.2) (2019-05-01)

### Bug Fixes

* Fix regression in ms-prefixed PlayReady license request callbacks caused by #81 (#83) ([b52ba35](https://github.com/videojs/videojs-contrib-eme/commit/b52ba35)), closes [#81](https://github.com/videojs/videojs-contrib-eme/issues/81) [#83](https://github.com/videojs/videojs-contrib-eme/issues/83)

<a name="3.5.1"></a>
## [3.5.1](https://github.com/videojs/videojs-contrib-eme/compare/v3.5.0...v3.5.1) (2019-05-01)

### Bug Fixes

* Use correct callback function signature for PlayReady license request callbacks. (#81) ([07a1f25](https://github.com/videojs/videojs-contrib-eme/commit/07a1f25)), closes [#81](https://github.com/videojs/videojs-contrib-eme/issues/81)

### Chores

* **package:** Regenerate package-lock.json (#82) ([beb62af](https://github.com/videojs/videojs-contrib-eme/commit/beb62af)), closes [#82](https://github.com/videojs/videojs-contrib-eme/issues/82)

<a name="3.5.0"></a>
# [3.5.0](https://github.com/videojs/videojs-contrib-eme/compare/v3.4.1...v3.5.0) (2019-03-20)

### Features

* Add support for defining custom headers for default license and certificate requests. (#76) ([7197390](https://github.com/videojs/videojs-contrib-eme/commit/7197390)), closes [#76](https://github.com/videojs/videojs-contrib-eme/issues/76)
* Trigger player errors from EME errors and refactor to use promises internally. ([7cae936](https://github.com/videojs/videojs-contrib-eme/commit/7cae936))

### Chores

* use npm lts/carbon (#71) ([dc5d8c4](https://github.com/videojs/videojs-contrib-eme/commit/dc5d8c4)), closes [#71](https://github.com/videojs/videojs-contrib-eme/issues/71)

### Tests

* Update dependencies and fix test that fails in Safari. (#77) ([5238d08](https://github.com/videojs/videojs-contrib-eme/commit/5238d08)), closes [#77](https://github.com/videojs/videojs-contrib-eme/issues/77)

<a name="3.4.1"></a>
## [3.4.1](https://github.com/videojs/videojs-contrib-eme/compare/v3.4.0...v3.4.1) (2018-10-24)

### Bug Fixes

* check for init data (#62) ([d966e5b](https://github.com/videojs/videojs-contrib-eme/commit/d966e5b)), closes [#62](https://github.com/videojs/videojs-contrib-eme/issues/62)

<a name="3.4.0"></a>
# [3.4.0](https://github.com/videojs/videojs-contrib-eme/compare/v3.3.0...v3.4.0) (2018-10-24)

### Features

* added API to set media keys directly (#61) ([57701b9](https://github.com/videojs/videojs-contrib-eme/commit/57701b9)), closes [#61](https://github.com/videojs/videojs-contrib-eme/issues/61)

### Bug Fixes

* pass along preset PlayReady init data (#60) ([746e5ed](https://github.com/videojs/videojs-contrib-eme/commit/746e5ed)), closes [#60](https://github.com/videojs/videojs-contrib-eme/issues/60)

### Chores

* Update using plugin generator v7.2.4 (#52) ([761f547](https://github.com/videojs/videojs-contrib-eme/commit/761f547)), closes [#52](https://github.com/videojs/videojs-contrib-eme/issues/52)

### Documentation

* removing maintainers section (#53) ([12beb15](https://github.com/videojs/videojs-contrib-eme/commit/12beb15)), closes [#53](https://github.com/videojs/videojs-contrib-eme/issues/53)
* update readme to include plugin init (#51) ([050c300](https://github.com/videojs/videojs-contrib-eme/commit/050c300)), closes [#51](https://github.com/videojs/videojs-contrib-eme/issues/51)
* use tech() and not tech_ (#46) ([3b724b6](https://github.com/videojs/videojs-contrib-eme/commit/3b724b6)), closes [#46](https://github.com/videojs/videojs-contrib-eme/issues/46)

# CHANGELOG
