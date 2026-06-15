/**
 * Utility to parse Brazilian NFe (Nota Fiscal Eletrônica) XML
 */

export const parseNFe = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(e.target.result, "text/xml");

                // Basic Validation
                const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
                if (!infNFe) throw new Error("Arquivo XML inválido ou não é uma NFe.");

                // 1. General Info
                const ide = xmlDoc.getElementsByTagName("ide")[0];
                const nfeData = {
                    key: infNFe.getAttribute("Id")?.replace('NFe', '') || '',
                    access_key: infNFe.getAttribute("Id")?.replace('NFe', '') || '',
                    number: getTagValue(ide, "nNF"),
                    series: getTagValue(ide, "serie"),
                    issue_date: getTagValue(ide, "dhEmi") || getTagValue(ide, "dEmi"),
                    xml_content: e.target.result // Store full XML for reference if needed
                };

                // 2. Issuer (Provider)
                const emit = xmlDoc.getElementsByTagName("emit")[0];
                const provider = {
                    cnpj: getTagValue(emit, "CNPJ"),
                    name: getTagValue(emit, "xNome"),
                    trade_name: getTagValue(emit, "xFant"),
                    ie: getTagValue(emit, "IE"),
                    address: {
                        street: getTagValue(emit, "xLgr"),
                        number: getTagValue(emit, "nro"),
                        neighborhood: getTagValue(emit, "xBairro"),
                        city_code: getTagValue(emit, "cMun"),
                        city: getTagValue(emit, "xMun"),
                        state: getTagValue(emit, "UF"),
                        zip: getTagValue(emit, "CEP"),
                        country: getTagValue(emit, "xPais")
                    }
                };

                // 3. Products (Items)
                const dets = xmlDoc.getElementsByTagName("det");
                const items = [];
                for (let i = 0; i < dets.length; i++) {
                    const prod = dets[i].getElementsByTagName("prod")[0];
                    const imposto = dets[i].getElementsByTagName("imposto")[0];

                    // Taxes (Simplified extraction)
                    const vIPI = getTagValue(imposto, "vIPI") || 0;
                    const vICMS = getTagValue(imposto, "vICMS") || 0;

                    items.push({
                        code: getTagValue(prod, "cProd"),
                        ean: getTagValue(prod, "cEAN"),
                        name: getTagValue(prod, "xProd"),
                        ncm: getTagValue(prod, "NCM"),
                        cest: getTagValue(prod, "CEST"),
                        cfop: getTagValue(prod, "CFOP"),
                        unit: getTagValue(prod, "uCom"),
                        quantity: parseFloat(getTagValue(prod, "qCom") || 0),
                        unit_price: parseFloat(getTagValue(prod, "vUnCom") || 0),
                        total_product: parseFloat(getTagValue(prod, "vProd") || 0),

                        // Taxes for cost composition
                        ipi_value: parseFloat(vIPI),
                        icms_value: parseFloat(vICMS),
                        freight_value: parseFloat(getTagValue(prod, "vFrete") || 0),
                        insurance_value: parseFloat(getTagValue(prod, "vSeg") || 0),
                        discount_value: parseFloat(getTagValue(prod, "vDesc") || 0),
                        other_expenses_value: parseFloat(getTagValue(prod, "vOutro") || 0),
                    });
                }

                // 4. Totals
                const total = xmlDoc.getElementsByTagName("total")[0]?.getElementsByTagName("ICMSTot")[0];
                const financial = {
                    amount_products: parseFloat(getTagValue(total, "vProd") || 0),
                    amount_total: parseFloat(getTagValue(total, "vNF") || 0),
                    amount_freight: parseFloat(getTagValue(total, "vFrete") || 0),
                    amount_insurance: parseFloat(getTagValue(total, "vSeg") || 0),
                    amount_discount: parseFloat(getTagValue(total, "vDesc") || 0),
                    amount_other: parseFloat(getTagValue(total, "vOutro") || 0),
                    amount_ipi: parseFloat(getTagValue(total, "vIPI") || 0),
                };

                // 5. Installments (Duplicatas)
                const dups = xmlDoc.getElementsByTagName("dup");
                const installments = [];
                for (let i = 0; i < dups.length; i++) {
                    installments.push({
                        number: getTagValue(dups[i], "nDup"),
                        due_date: getTagValue(dups[i], "dVenc"),
                        amount: parseFloat(getTagValue(dups[i], "vDup") || 0)
                    });
                }

                resolve({ nfeData, provider, items, financial, installments });

            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
    });
};

const getTagValue = (parent, tagName) => {
    if (!parent) return '';
    const element = parent.getElementsByTagName(tagName)[0];
    return element ? element.textContent : '';
};
