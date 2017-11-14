import QUnit from 'qunit';
import { getMessageContents } from '../src/playready';
import {
  createMessageBuffer,
  challengeElement
} from './playready-message';

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
