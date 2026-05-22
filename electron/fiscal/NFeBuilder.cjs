const { XMLBuilder } = require('fast-xml-parser');

class NFeBuilder {
    constructor(sale, company, nfeNumber, nfeSeries) {
        this.sale = sale;
        this.company = company;
        this.nfeNumber = nfeNumber;
        this.nfeSeries = nfeSeries;
        this.builder = new XMLBuilder({
            ignoreAttributes: false,
            format: true,
            suppressEmptyNode: true
        });
    }

    build() {
        // Basic NFe Structure (Simplified for NFC-e 65)
        // TODO: Implement full 4.00 layout logic
        const nfe = {
            NFe: {
                '@_xmlns': 'http://www.portalfiscal.inf.br/nfe',
                infNFe: {
                    '@_Id': `NFe${this.generateAccessKey()}`,
                    '@_versao': '4.00',
                    ide: {
                        cUF: this.company.uf_code, // e.g., 35 (SP)
                        cNF: this.generateRandomCode(),
                        natOp: 'VENDA',
                        mod: '65', // NFC-e
                        serie: this.nfeSeries,
                        nNF: this.nfeNumber,
                        dhEmi: new Date().toISOString(),
                        tpNF: '1', // Saída
                        idDest: '1', // Operação interna
                        cMunFG: this.company.city_code,
                        tpImp: '4', // DANFE NFC-e
                        tpEmis: '1', // Normal
                        cDV: '0', // TODO: Calculate Verifier Digit
                        tpAmb: '2', // 1=Production, 2=Homologation
                        finNFe: '1', // Normal
                        indFinal: '1', // Consumidor final
                        indPres: '1', // Presencial
                        procEmi: '0', // App do contribuinte
                        verProc: 'Evobit 1.0'
                    },
                    emit: {
                        CNPJ: this.company.cnpj.replace(/\D/g, ''),
                        xNome: this.company.name,
                        enderEmit: {
                            xLgr: this.company.address.street,
                            nro: this.company.address.number,
                            xBairro: this.company.address.neighborhood,
                            cMun: this.company.city_code,
                            xMun: this.company.city_name,
                            UF: this.company.uf,
                            CEP: this.company.zip_code.replace(/\D/g, ''),
                            cPais: '1058',
                            xPais: 'BRASIL'
                        },
                        IE: this.company.ie.replace(/\D/g, ''),
                        CRT: this.company.crt // 1=Simples, 3=Normal
                    },
                    // TODO: Add det (items), total, transp, pag
                }
            }
        };

        return this.builder.build(nfe);
    }

    generateAccessKey() {
        // Placeholder - Logic to build 44-digit key
        return '35240212345678000123650010000012341000012345';
    }

    generateRandomCode() {
        return Math.floor(Math.random() * 99999999).toString().padStart(8, '0');
    }
}

module.exports = NFeBuilder;
