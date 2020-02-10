import QUnit from 'qunit';

import {
  arrayBuffersEqual,
  arrayBufferFrom,
  mergeAndRemoveNull
} from '../src/utils';

QUnit.module('utils');

QUnit.test('arrayBuffersEqual checks if two array buffers are equal', function(assert) {
  assert.ok(
    arrayBuffersEqual(new ArrayBuffer(3), new ArrayBuffer(3)),
    'same size empty array buffers are equal');
  assert.notOk(
    arrayBuffersEqual(new ArrayBuffer(2), new ArrayBuffer(3)),
    'different size empty array buffers are not equal');

  const arrayBuffer = new ArrayBuffer(10);

  assert.ok(arrayBuffersEqual(arrayBuffer, arrayBuffer), 'same array buffer is equal');

  assert.ok(
    arrayBuffersEqual(new Uint8Array([1, 2, 3]).buffer, new Uint8Array([1, 2, 3]).buffer),
    'array buffers with same content are equal');
  assert.notOk(
    arrayBuffersEqual(new Uint8Array([1, 2, 3]).buffer, new Uint8Array([1, 2, 4]).buffer),
    'array buffers with different content are not equal');
  assert.notOk(
    arrayBuffersEqual(new Uint8Array([1, 2, 3]).buffer, new Uint8Array([1, 2]).buffer),
    'array buffers with different content lengths are not equal');
});

QUnit.test('arrayBufferFrom returns buffer from typed arrays', function(assert) {
  const uint8Array = new Uint8Array([1, 2, 3]);
  let buffer = arrayBufferFrom(uint8Array);

  assert.ok(buffer instanceof ArrayBuffer, 'returned an ArrayBuffer');
  assert.equal(buffer, uint8Array.buffer, 'buffer is the Uint8Array\'s buffer');

  const uint16Array = new Uint16Array([4, 5, 6]);

  buffer = arrayBufferFrom(uint16Array);
  assert.ok(buffer instanceof ArrayBuffer, 'returned an ArrayBuffer');
  assert.equal(buffer, uint16Array.buffer, 'buffer is the Uint16Array\'s buffer');

  buffer = arrayBufferFrom(buffer);
  assert.ok(buffer instanceof ArrayBuffer, 'buffer is still an ArrayBuffer');
  assert.equal(buffer, uint16Array.buffer, 'buffer is the same buffer');
});

QUnit.test('mergeAndRemoveNull removes property if value is null', function(assert) {
  const object1 = {
    a: 'a',
    b: 'b',
    c: 'c'
  };
  const object2 = {
    a: 'A',
    b: null
  };

  const resultObj = mergeAndRemoveNull(object1, object2);

  assert.deepEqual(resultObj, {
    a: 'A',
    c: 'c'
  }, 'successfully merged and removed null property');
});
