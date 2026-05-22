const axios = require('axios');
const https = require('https');
const fs = require('fs');

class SefazCommunicator {
    constructor(pfxPath, password, environment = 'homologacao') {
        this.pfx = fs.readFileSync(pfxPath);
        this.password = password;
        this.env = environment;

        // URLs for SP (Example) - Should be configurable by UF
        this.urls = {
            homologacao: {
                autorizacao: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx',
                retorno: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeRetAutorizacao4.asmx'
            },
            producao: {
                autorizacao: 'https://nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx',
                retorno: 'https://nfce.fazenda.sp.gov.br/ws/NFeRetAutorizacao4.asmx'
            }
        };
    }

    async send(signedXml) {
        const url = this.urls[this.env].autorizacao;

        const httpsAgent = new https.Agent({
            pfx: this.pfx,
            passphrase: this.password,
            rejectUnauthorized: false // Often needed for SEFAZ self-signed or specific chains
        });

        const soapEnvelope = `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
        <soap:Header>
          <nfe:nfeCabecMsg>
            <nfe:cUF>35</nfe:cUF>
            <nfe:versaoDados>4.00</nfe:versaoDados>
          </nfe:nfeCabecMsg>
        </soap:Header>
        <soap:Body>
          <nfe:nfeDadosMsg>${signedXml}</nfe:nfeDadosMsg>
        </soap:Body>
      </soap:Envelope>
    `;

        try {
            const response = await axios.post(url, soapEnvelope, {
                headers: {
                    'Content-Type': 'application/soap+xml; charset=utf-8'
                },
                httpsAgent: httpsAgent
            });

            return { success: true, data: response.data };
        } catch (error) {
            console.error('SEFAZ Error:', error.message);
            return { success: false, error: error.message, details: error.response?.data };
        }
    }
}

module.exports = SefazCommunicator;
