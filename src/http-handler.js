import videojs from 'video.js';

let httpResponseHandler = videojs.xhr.httpHandler;

// to make sure this doesn't break with older versions of Video.js,
// do a super simple wrapper instead
if (!httpResponseHandler) {
  httpResponseHandler = (callback, decodeResponseBody) => (err, response, responseBody) => {
    if (err) {
      callback(err);
      return;
    }

    // if the HTTP status code is 4xx or 5xx, the request also failed
    if (response.statusCode >= 400 && response.statusCode <= 599) {
      let cause = responseBody;

      if (decodeResponseBody) {
        cause = String.fromCharCode.apply(null, new Uint8Array(responseBody));
      }

      callback({cause});
      return;
    }

    // otherwise, request succeeded
    callback(null, responseBody);
  };
}
export { httpResponseHandler };
