import { XMLParser } from 'fast-xml-parser';

/**
 * Parses an NFe XML string and extracts relevant data for inventory import.
 * @param {string} xmlString The raw XML content of the NFe.
 * @returns {object} Extracted data: { provider, products, nfeNumber, issueDate, totalValue }
 */
export const parseNFeXML = (xmlString) => {
    try {
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
        const jsonObj = parser.parse(xmlString);

        // NFe structure usually has <nfeProc><NFe><infNFe>...
        let infNFe = jsonObj?.nfeProc?.NFe?.infNFe;

        // Sometimes it's just <NFe><infNFe> without nfeProc wrapper
        if (!infNFe) {
            infNFe = jsonObj?.NFe?.infNFe;
        }

        if (!infNFe) {
            throw new Error("Estrutura XML de NF-e inválida ou não suportada.");
        }

        const emit = infNFe.emit;
        const ide = infNFe.ide;
        const dest = infNFe.dest; // Destinatário (a loja)
        const total = infNFe.total?.ICMSTot;

        // 1. Extract Provider (Emitente)
        const provider = {
            cnpj: String(emit?.CNPJ || ''),
            name: String(emit?.xNome || ''),
            trade_name: String(emit?.xFant || emit?.xNome || ''),
            ie: String(emit?.IE || ''),
            street: String(emit?.enderEmit?.xLgr || ''),
            number: String(emit?.enderEmit?.nro || ''),
            neighborhood: String(emit?.enderEmit?.xBairro || ''),
            city: String(emit?.enderEmit?.xMun || ''),
            state: String(emit?.enderEmit?.UF || ''),
            cep: String(emit?.enderEmit?.CEP || ''),
            phone: String(emit?.enderEmit?.fone || '')
        };

        // 2. Extract Products (Detalhamento)
        let detArray = infNFe.det;
        if (!detArray) { detArray = []; }
        // If there's only one product, fast-xml-parser might parse it as an object instead of array
        if (!Array.isArray(detArray)) {
            detArray = [detArray];
        }

        const products = detArray.map((detItem) => {
            const prod = detItem.prod;
            return {
                item_number: String(detItem["@_nItem"] || ''),
                name: String(prod.xProd || ''),
                barcode: (prod.cEAN && prod.cEAN !== "SEM GTIN") ? String(prod.cEAN) : '',
                sku: String(prod.cProd || ''),
                ncm: String(prod.NCM || ''),
                cest: String(prod.CEST || ''),
                cfop: String(prod.CFOP || ''),
                unit: String(prod.uCom || 'UN'),
                quantity: parseFloat(prod.qCom) || 0,
                unit_cost: parseFloat(prod.vUnCom) || 0,
                total_value: parseFloat(prod.vProd) || 0,
                lot_number: String(prod.rastro?.nLote || ''),
                expiration_date: String(prod.rastro?.dVal || '')
            };
        });

        return {
            nfeNumber: String(ide?.nNF || ''),
            issueDate: String(ide?.dhEmi || ide?.dEmi || ''),
            totalValue: parseFloat(total?.vNF) || 0,
            provider,
            products
        };

    } catch (error) {
        console.error("Erro ao fazer parse do XML:", error);
        throw new Error("Falha ao processar o arquivo XML. Verifique se é uma NF-e válida.");
    }
};
