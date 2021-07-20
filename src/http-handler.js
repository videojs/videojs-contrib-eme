import window from 'global/window';

export const httpResponseHandler = (callback) => (err, response, responseBody) => {
  // if the XHR failed, return that error
  if (err) {
    callback(err);
    return;
  }

  // if the HTTP status code is 4xx or 5xx, the request also failed
  if (response.statusCode >= 400 && response.statusCode <= 599) {
    let cause;

    if (window.TextDecoder) {
      const charset = getCharset(response.headers && response.headers['content-type']);

      cause = new TextDecoder(charset).decode(responseBody);
    } else {
      cause = String.fromCharCode.apply(null, new Uint8Array(responseBody));
    }

    callback({cause});
    return;
  }

  // otherwise, request succeeded
  callback(null, responseBody);
};

function getCharset(contentTypeHeader = '') {
  return contentTypeHeader
    .toLowerCase()
    .split(';')
    .reduce((charset, contentType) => {
      const [type, value] = contentType.split('=');

      if (type.trim() === 'charset') {
        return value.trim();
      }

      return charset;
    }, 'utf-8');
}
