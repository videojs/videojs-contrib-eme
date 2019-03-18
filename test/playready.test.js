import QUnit from 'qunit';
import {
  getMessageContents,
  requestPlayreadyLicense
} from '../src/playready';
import {
  createMessageBuffer,
  challengeElement
} from './playready-message';
import videojs from 'video.js';

QUnit.module('playready');

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

QUnit.test('emeHeaders sent with license requests', function(assert) {
  const origXhr = videojs.xhr;
  const emeOptions = {
    emeHeaders: {
      'Some-Header': 'some-header-value'
    }
  };
  const keySystemOptions = {
    url: 'some-url',
    licenseHeaders: {}
  };
  const xhrCalls = [];

  videojs.xhr = (xhrOptions) => {
    xhrCalls.push(xhrOptions);
  };

  requestPlayreadyLicense(keySystemOptions, createMessageBuffer(), emeOptions);

  assert.equal(xhrCalls.length, 1, 'made one XHR');
  assert.deepEqual(xhrCalls[0], {
    uri: 'some-url',
    method: 'post',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '"http://schemas.microsoft.com/DRM/2007/03/protocols/AcquireLicense"',
      'Some-Header': 'some-header-value'
    },
    body: challengeElement,
    responseType: 'arraybuffer'
  }, 'license request sent with correct headers');

  videojs.xhr = origXhr;
});

QUnit.test('licenseHeaders property overrides emeHeaders', function(assert) {
  const origXhr = videojs.xhr;
  const emeOptions = {
    emeHeaders: {
      'Some-Header': 'some-header-value'
    }
  };
  const keySystemOptions = {
    url: 'some-url',
    licenseHeaders: {
      'Some-Header': 'priority-header-value'
    }
  };
  const xhrCalls = [];

  videojs.xhr = (xhrOptions) => {
    xhrCalls.push(xhrOptions);
  };

  requestPlayreadyLicense(keySystemOptions, createMessageBuffer(), emeOptions);

  assert.equal(xhrCalls.length, 1, 'made one XHR');
  assert.deepEqual(xhrCalls[0], {
    uri: 'some-url',
    method: 'post',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '"http://schemas.microsoft.com/DRM/2007/03/protocols/AcquireLicense"',
      'Some-Header': 'priority-header-value'
    },
    body: challengeElement,
    responseType: 'arraybuffer'
  }, 'license request sent with correct headers');

  videojs.xhr = origXhr;
});
