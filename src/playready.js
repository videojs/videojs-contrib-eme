import videojs from 'video.js';
import window from 'global/window';
import {mergeAndRemoveNull} from './utils';
import {httpResponseHandler} from './http-handler.js';

/**
 * Parses the EME key message XML to extract HTTP headers and the Challenge element to use
 * in the PlayReady license request.
 *
 * @param {ArrayBuffer} message key message from EME
 * @return {Object} an object containing headers and the message body to use in the
 * license request
 */
export const getMessageContents = (message) => {
  // TODO do we want to support UTF-8?
  const xmlString = String.fromCharCode.apply(null, new Uint16Array(message));
  const xml = (new window.DOMParser())
    .parseFromString(xmlString, 'application/xml');
  const headersElement = xml.getElementsByTagName('HttpHeaders')[0];
  const headers = {};

  if (headersElement) {
    const headerNames = headersElement.getElementsByTagName('name');
    const headerValues = headersElement.getElementsByTagName('value');

    for (let i = 0; i < headerNames.length; i++) {
      headers[headerNames[i].childNodes[0].nodeValue] =
        headerValues[i].childNodes[0].nodeValue;
    }
  }

  const challengeElement = xml.getElementsByTagName('Challenge')[0];
  let challenge;

  if (challengeElement) {
    challenge = window.atob(challengeElement.childNodes[0].nodeValue);
  }

  return {
    headers,
    message: challenge
  };
};

export const requestPlayreadyLicense = (keySystemOptions, messageBuffer, emeOptions, callback) => {
  const messageContents = getMessageContents(messageBuffer);
  const message = messageContents.message;

  const headers = mergeAndRemoveNull(
    messageContents.headers,
    emeOptions.emeHeaders,
    keySystemOptions.licenseHeaders
  );

  videojs.xhr({
    uri: keySystemOptions.url,
    method: 'post',
    headers,
    body: message,
    responseType: 'arraybuffer'
  }, httpResponseHandler(callback, true));
};
