import videojs from 'video.js';
import window from 'global/window';

export const getMessageContents = (message) => {
  const xml = (new DOMParser()).parseFromString(
    // TODO do we want to support UTF-8?
    String.fromCharCode.apply(null, new Uint16Array(message)),
    'application/xml');
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

export const requestPlayreadyLicense = (url, messageBuffer, callback) => {
  const { headers, message } = getMessageContents(messageBuffer);

  videojs.xhr({
    uri: url,
    method: 'post',
    headers,
    body: message,
    responseType: 'arraybuffer'
  }, callback);
};
