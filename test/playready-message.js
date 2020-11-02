import window from 'global/window';
import { stringToArrayBuffer } from './utils';

export const license = 'this is a license';

export const challengeElement = `
  <?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope
    xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <soap:Body>
      <AcquireLicenseResponse xmlns="http://schemas.microsoft.com/DRM/2007/03/protocols">
        <AcquireLicenseResult>
          <Response xmlns="http://schemas.microsoft.com/DRM/2007/03/protocols/messages">
            <LicenseResponse xmlns="http://schemas.microsoft.com/DRM/2007/03/protocols">
              <Version>1</Version>
              <Licenses>
                <License>${license}</License>
              </Licenses>
            </LicenseResponse>
          </Response>
        </AcquireLicenseResult>
      </AcquireLicenseResponse>
    </soap:Body>
  </soap:Envelope>`;

const defaultHeaders = [{
  name: 'Content-Type',
  value: 'text/xml; charset=utf-8'
}, {
  name: 'SOAPAction',
  value: '"http://schemas.microsoft.com/DRM/2007/03/protocols/AcquireLicense"'
}];

const createHeaders = (headers) => {
  return headers.reduce((acc, header) => {
    return acc + `
      <HttpHeader>
        <name>${header.name}</name>
        <value>${header.value}</value>
      </HttpHeader>
    `;
  }, '');
};

export const createMessageBuffer = (headers) => {
  headers = headers || defaultHeaders;

  // can't use TextEncoder because Safari doesn't support it
  return stringToArrayBuffer(`
    <PlayReadyKeyMessage type="LicenseAcquisition">
      <LicenseAcquisition Version="1">
        <Challenge encoding="base64encoded">${window.btoa(challengeElement)}</Challenge>
        <HttpHeaders>${createHeaders(headers)}</HttpHeaders>
      </LicenseAcquisition>
    </PlayReadyKeyMessage>`);
};
