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

export const unwrappedPlayreadyMessage = `
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <AcquireLicense xmlns="http://schemas.microsoft.com/DRM/2007/03/protocols">
      <challenge>
        <Challenge xmlns="http://schemas.microsoft.com/DRM/2007/03/protocols/messages">
          <LA xmlns="http://schemas.microsoft.com/DRM/2007/03/protocols" Id="SignedData" xml:space="preserve"><Version>1</Version><ContentHeader><WRMHEADER xmlns="http://schemas.microsoft.com/DRM/2007/03/PlayReadyHeader" version="4.0.0.0"><DATA><PROTECTINFO><KEYLEN>16</KEYLEN><ALGID>AESCTR</ALGID></PROTECTINFO><KID>U24lieXb6USvujjSyhfRdg==</KID><CHECKSUM>TKWDEqady2g=</CHECKSUM><LA_URL>https://foo.bar.license</LA_URL></DATA></WRMHEADER></ContentHeader><CLIENTINFO><CLIENTVERSION>4.2.0.5545</CLIENTVERSION></CLIENTINFO><RevocationLists><RevListInfo><ListID>ioydTlK2p0WXkWklprR5Hw==</ListID><Version>13</Version></RevListInfo><RevListInfo><ListID>Ef/RUojT3U6Ct2jqTCChbA==</ListID><Version>68</Version></RevListInfo></RevocationLists><LicenseNonce>U9WysleTindM/gVQyExDdw==</LicenseNonce><ClientTime>1706149441</ClientTime> <EncryptedData xmlns="http://www.w3.org/2001/04/xmlenc#" Type="http://www.w3.org/2001/04/xmlenc#Element"><EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes128-cbc"></EncryptionMethod><KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><EncryptedKey xmlns="http://www.w3.org/2001/04/xmlenc#"><EncryptionMethod Algorithm="http://schemas.microsoft.com/DRM/2007/03/protocols#ecc256"></EncryptionMethod><KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><KeyName>WMRMServer</KeyName></KeyInfo><CipherData><CipherValue>barfoobarfoo</CipherValue></CipherData></EncryptedKey></KeyInfo><CipherData><CipherValue>foocipherbarcipher</CipherValue></CipherData></EncryptedData></LA>
          <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
            <SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
              <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod>
              <SignatureMethod Algorithm="http://schemas.microsoft.com/DRM/2007/03/protocols#ecdsa-sha256"></SignatureMethod>
              <Reference URI="#SignedData">
                <DigestMethod Algorithm="http://schemas.microsoft.com/DRM/2007/03/protocols#sha256"></DigestMethod>
                <DigestValue>FL7P8/ITc+xFvUeoyMRq2JnNbJuhhKINsXtdDuM1Y78=</DigestValue>
              </Reference>
            </SignedInfo>
            <SignatureValue>Ocy3UTUu52QI0MIzdftANLQgJM3SsP6E2XvPlKYzQBtvscJbm/uTi38zrfY2RBU3FJZLtcj0O72lb5Mq5/CNJA==</SignatureValue>
            <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
              <KeyValue>
                <ECCKeyValue>
                  <PublicKey>nxbw6pwjF4fF5sEqM23KU54ifXrRvejWK5GVdjdzCMY3dvjdp7Ho5h5YiZ34xOSAUHJsZwa4DW+P6XFIDauDzg==</PublicKey>
                </ECCKeyValue>
              </KeyValue>
            </KeyInfo>
          </Signature>
        </Challenge>
      </challenge>
    </AcquireLicense>
  </soap:Body>
</soap:Envelope>
`;
