<a name="5.5.2"></a>
## [5.5.2](https://github.com/videojs/videojs-contrib-eme/compare/v5.5.1...v5.5.2) (2025-07-22)

### Bug Fixes

* check for legacy Fairplay support when switching out of handleEncryptedEvent (#234) ([595f2ad](https://github.com/videojs/videojs-contrib-eme/commit/595f2ad)), closes [#234](https://github.com/videojs/videojs-contrib-eme/issues/234)
* improve legacy fairplay workflow detection (#235) ([9dff1b8](https://github.com/videojs/videojs-contrib-eme/commit/9dff1b8)), closes [#235](https://github.com/videojs/videojs-contrib-eme/issues/235)

<a name="5.5.1"></a>
## [5.5.1](https://github.com/videojs/videojs-contrib-eme/compare/v5.5.0...v5.5.1) (2024-08-27)

### Bug Fixes

* excessive requests when using HDCP fallback with LDL (#225) ([348935e](https://github.com/videojs/videojs-contrib-eme/commit/348935e)), closes [#225](https://github.com/videojs/videojs-contrib-eme/issues/225)

<a name="5.5.0"></a>
# [5.5.0](https://github.com/videojs/videojs-contrib-eme/compare/v5.4.1...v5.5.0) (2024-07-08)

### Features

* add manual setup eme listeners (#226) ([a22099a](https://github.com/videojs/videojs-contrib-eme/commit/a22099a)), closes [#226](https://github.com/videojs/videojs-contrib-eme/issues/226)

<a name="5.4.1"></a>
## [5.4.1](https://github.com/videojs/videojs-contrib-eme/compare/v5.4.0...v5.4.1) (2024-06-13)

### Bug Fixes

* pass emeError to handleWebKitNeedKeyEvent to avoid TypeError (#222) ([463c839](https://github.com/videojs/videojs-contrib-eme/commit/463c839)), closes [#222](https://github.com/videojs/videojs-contrib-eme/issues/222)

<a name="5.4.0"></a>
# [5.4.0](https://github.com/videojs/videojs-contrib-eme/compare/v5.3.2...v5.4.0) (2024-06-04)

### Features

* add metadata to the license requests (#221) ([7621c86](https://github.com/videojs/videojs-contrib-eme/commit/7621c86)), closes [#221](https://github.com/videojs/videojs-contrib-eme/issues/221)

<a name="5.3.2"></a>
## [5.3.2](https://github.com/videojs/videojs-contrib-eme/compare/v5.3.1...v5.3.2) (2024-05-17)

### Bug Fixes

* fix cleanup issues (#220) ([6b82ffa](https://github.com/videojs/videojs-contrib-eme/commit/6b82ffa)), closes [#220](https://github.com/videojs/videojs-contrib-eme/issues/220)

<a name="5.3.1"></a>
## [5.3.1](https://github.com/videojs/videojs-contrib-eme/compare/v5.3.0...v5.3.1) (2024-05-16)

### Bug Fixes

* eventBus error after dispose (#218) ([730bdd9](https://github.com/videojs/videojs-contrib-eme/commit/730bdd9)), closes [#218](https://github.com/videojs/videojs-contrib-eme/issues/218)

<a name="5.3.0"></a>
# [5.3.0](https://github.com/videojs/videojs-contrib-eme/compare/v5.2.1...v5.3.0) (2024-05-09)

### Features

* add legacy fairplay flow cleanup (#219) ([b7ce1e1](https://github.com/videojs/videojs-contrib-eme/commit/b7ce1e1)), closes [#219](https://github.com/videojs/videojs-contrib-eme/issues/219)

<a name="5.2.1"></a>
## [5.2.1](https://github.com/videojs/videojs-contrib-eme/compare/v5.2.0...v5.2.1) (2024-04-23)

### Chores

* move eme errors (#215) ([1a000bc](https://github.com/videojs/videojs-contrib-eme/commit/1a000bc)), closes [#215](https://github.com/videojs/videojs-contrib-eme/issues/215)

<a name="5.2.0"></a>
# [5.2.0](https://github.com/videojs/videojs-contrib-eme/compare/v5.1.2...v5.2.0) (2024-03-28)

### Features

* eme error interface (#208) ([5820da7](https://github.com/videojs/videojs-contrib-eme/commit/5820da7)), closes [#208](https://github.com/videojs/videojs-contrib-eme/issues/208)
* event payloads (#210) ([8bc0cff](https://github.com/videojs/videojs-contrib-eme/commit/8bc0cff)), closes [#210](https://github.com/videojs/videojs-contrib-eme/issues/210)

<a name="5.1.2"></a>
## [5.1.2](https://github.com/videojs/videojs-contrib-eme/compare/v5.1.1...v5.1.2) (2024-03-12)

### Bug Fixes

* getOptions after encrypted event (#209) ([6b0b6dd](https://github.com/videojs/videojs-contrib-eme/commit/6b0b6dd)), closes [#209](https://github.com/videojs/videojs-contrib-eme/issues/209)

<a name="5.1.1"></a>
## [5.1.1](https://github.com/videojs/videojs-contrib-eme/compare/v5.1.0...v5.1.1) (2024-02-28)

### Bug Fixes

* fixes an issue where events were using stale player options (#207) ([92aae13](https://github.com/videojs/videojs-contrib-eme/commit/92aae13)), closes [#207](https://github.com/videojs/videojs-contrib-eme/issues/207)

<a name="5.1.0"></a>
# [5.1.0](https://github.com/videojs/videojs-contrib-eme/compare/v5.0.0...v5.1.0) (2024-02-17)

### Features

* Add CDM detection module (#98) ([33dfe13](https://github.com/videojs/videojs-contrib-eme/commit/33dfe13)), closes [#98](https://github.com/videojs/videojs-contrib-eme/issues/98)
* add request types (#200) ([58109ca](https://github.com/videojs/videojs-contrib-eme/commit/58109ca)), closes [#200](https://github.com/videojs/videojs-contrib-eme/issues/200)

### Bug Fixes

* Close keySession when player is disposed (#176) ([c8ca31a](https://github.com/videojs/videojs-contrib-eme/commit/c8ca31a)), closes [#176](https://github.com/videojs/videojs-contrib-eme/issues/176)
* disable firefox headless in karma (#205) ([a90edcb](https://github.com/videojs/videojs-contrib-eme/commit/a90edcb)), closes [#205](https://github.com/videojs/videojs-contrib-eme/issues/205)
* legacy fairplay (#204) ([ee6e512](https://github.com/videojs/videojs-contrib-eme/commit/ee6e512)), closes [#204](https://github.com/videojs/videojs-contrib-eme/issues/204)
* playready message passthrough (#201) ([78bc2d7](https://github.com/videojs/videojs-contrib-eme/commit/78bc2d7)), closes [#201](https://github.com/videojs/videojs-contrib-eme/issues/201)

### Chores

* Update CI workflow (#188) ([579df4c](https://github.com/videojs/videojs-contrib-eme/commit/579df4c)), closes [#188](https://github.com/videojs/videojs-contrib-eme/issues/188)

### Code Refactoring

* add support for future Video.js 8.x (#172) ([6a19aba](https://github.com/videojs/videojs-contrib-eme/commit/6a19aba)), closes [#172](https://github.com/videojs/videojs-contrib-eme/issues/172)

<a name="5.0.0"></a>
# [5.0.0](https://github.com/videojs/videojs-contrib-eme/compare/v4.0.0...v5.0.0) (2022-08-19)

### Features

* expose plugin version (#163) ([5f9a1ea](https://github.com/videojs/videojs-contrib-eme/commit/5f9a1ea)), closes [#163](https://github.com/videojs/videojs-contrib-eme/issues/163)

### Chores

* **package:** update to Node 16 and run npm audit (#170) ([0f68f21](https://github.com/videojs/videojs-contrib-eme/commit/0f68f21)), closes [#170](https://github.com/videojs/videojs-contrib-eme/issues/170)
* update jsdoc ([01e887f](https://github.com/videojs/videojs-contrib-eme/commit/01e887f))
* update tooling to remove ie transpiling, update broken tests (#169) ([4b330d5](https://github.com/videojs/videojs-contrib-eme/commit/4b330d5)), closes [#169](https://github.com/videojs/videojs-contrib-eme/issues/169)

### Tests

* cleanup xhr correctly (#150) ([b992167](https://github.com/videojs/videojs-contrib-eme/commit/b992167)), closes [#150](https://github.com/videojs/videojs-contrib-eme/issues/150)


### BREAKING CHANGES

* Internet Explorer will no longer work.

<a name="4.0.1"></a>
## [4.0.1](https://github.com/videojs/videojs-contrib-eme/compare/v4.0.0...v4.0.1) (2022-04-22)

### Chores

* update jsdoc ([01e887f](https://github.com/videojs/videojs-contrib-eme/commit/01e887f))

### Tests

* cleanup xhr correctly (#150) ([b992167](https://github.com/videojs/videojs-contrib-eme/commit/b992167)), closes [#150](https://github.com/videojs/videojs-contrib-eme/issues/150)

<a name="4.0.0"></a>
# [4.0.0](https://github.com/videojs/videojs-contrib-eme/compare/v3.10.1...v4.0.0) (2021-10-20)

### Bug Fixes

* convert initData to a string (#147) ([922e5eb](https://github.com/videojs/videojs-contrib-eme/commit/922e5eb)), closes [#147](https://github.com/videojs/videojs-contrib-eme/issues/147)

### Reverts

* "revert: fix: use in-spec EME for versions of Safari which support it (#142) (#145)" (#146) ([c912bda](https://github.com/videojs/videojs-contrib-eme/commit/c912bda)), closes [#142](https://github.com/videojs/videojs-contrib-eme/issues/142) [#145](https://github.com/videojs/videojs-contrib-eme/issues/145) [#146](https://github.com/videojs/videojs-contrib-eme/issues/146)


### BREAKING CHANGES

* getContentId will now receive a string representation
of the initData

<a name="3.10.1"></a>
## [3.10.1](https://github.com/videojs/videojs-contrib-eme/compare/v3.10.0...v3.10.1) (2021-10-19)

### Reverts

* fix: use in-spec EME for versions of Safari which support it (#142) (#145) ([fdb57e3](https://github.com/videojs/videojs-contrib-eme/commit/fdb57e3)), closes [#142](https://github.com/videojs/videojs-contrib-eme/issues/142) [#145](https://github.com/videojs/videojs-contrib-eme/issues/145)

<a name="3.10.0"></a>
# [3.10.0](https://github.com/videojs/videojs-contrib-eme/compare/v3.9.0...v3.10.0) (2021-10-15)

### Bug Fixes

* use in-spec EME for versions of Safari which support it (#142) ([5897655](https://github.com/videojs/videojs-contrib-eme/commit/5897655)), closes [#142](https://github.com/videojs/videojs-contrib-eme/issues/142) [#87](https://github.com/videojs/videojs-contrib-eme/issues/87)

### Chores

* update linter, run --fix on files, and manually lint when needed (#141) ([a794ea9](https://github.com/videojs/videojs-contrib-eme/commit/a794ea9)), closes [#141](https://github.com/videojs/videojs-contrib-eme/issues/141)

<a name="3.9.0"></a>
# [3.9.0](https://github.com/videojs/videojs-contrib-eme/compare/v3.8.1...v3.9.0) (2021-07-27)

### Features

* on license request errors, return response body as cause (#137) ([a9a5b82](https://github.com/videojs/videojs-contrib-eme/commit/a9a5b82)), closes [#137](https://github.com/videojs/videojs-contrib-eme/issues/137)

<a name="3.8.1"></a>
## [3.8.1](https://github.com/videojs/videojs-contrib-eme/compare/v3.8.0...v3.8.1) (2021-05-19)

### Bug Fixes

* handle initial duplicate webkitneedskey to prevent error dialog (#134) ([5ded675](https://github.com/videojs/videojs-contrib-eme/commit/5ded675)), closes [#134](https://github.com/videojs/videojs-contrib-eme/issues/134)

### Chores

* update docs for robustness and mention widevine warning (#129) ([9c4f577](https://github.com/videojs/videojs-contrib-eme/commit/9c4f577)), closes [#129](https://github.com/videojs/videojs-contrib-eme/issues/129)

<a name="3.8.0"></a>
# [3.8.0](https://github.com/videojs/videojs-contrib-eme/compare/v3.7.1...v3.8.0) (2020-11-18)

### Features

* add keysessioncreated event (#124) ([d114979](https://github.com/videojs/videojs-contrib-eme/commit/d114979)), closes [#124](https://github.com/videojs/videojs-contrib-eme/issues/124)

<a name="3.7.1"></a>
## [3.7.1](https://github.com/videojs/videojs-contrib-eme/compare/v3.7.0...v3.7.1) (2020-09-15)

### Bug Fixes

* only getLicense on license-request or license-renewal (#116) ([c15d1ca](https://github.com/videojs/videojs-contrib-eme/commit/c15d1ca)), closes [#116](https://github.com/videojs/videojs-contrib-eme/issues/116)
* try to re-request key if the session expired (#120) ([20d6adc](https://github.com/videojs/videojs-contrib-eme/commit/20d6adc)), closes [#120](https://github.com/videojs/videojs-contrib-eme/issues/120)

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
