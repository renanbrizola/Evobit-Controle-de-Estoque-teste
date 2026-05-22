
/**
 * Prints a receipt for a thermal printer (58mm or 80mm).
 * Opens a new window with the receipt content and triggers print.
 * @param {Object} sale - The sale object
 * @param {Object} customer - The linked customer object (optional)
 * @param {Array} items - Array of items in the sale
 * @param {Object} companyInfo - Company settings (name, address, etc.)
 */
export const printReceipt = (sale, customer, items, companyInfo) => {
    const width = '300px'; // Approx 80mm width standard for web print

    // Format helpers
    const fMoney = (val) => Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fDate = (iso) => new Date(iso).toLocaleString('pt-BR');

    const html = `
    <html>
    <head>
        <title>Recibo #${sale.id.substr(0, 8)}</title>
        <style>
            body { 
                font-family: 'Courier New', Courier, monospace; 
                font-size: 12px; 
                width: ${width}; 
                margin: 0; 
                padding: 10px; 
                color: #000;
            }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
            .header h2 { margin: 0; font-size: 16px; font-weight: bold; }
            .header p { margin: 2px 0; font-size: 10px; }
            
            .info { margin-bottom: 10px; font-size: 10px; }
            .info table { width: 100%; }
            
            .items { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .items th { text-align: left; border-bottom: 1px solid #000; font-size: 10px; }
            .items td { padding: 4px 0; font-size: 11px; vertical-align: top; }
            .qty { width: 30px; text-align: center; }
            .price { text-align: right; }
            
            .totals { margin-top: 10px; border-top: 1px dashed #000; pt-2; }
            .totals table { width: 100%; border-collapse: collapse; }
            .totals td { text-align: right; padding: 2px 0; font-weight: bold; }
            .totals .label { text-align: left; font-weight: normal; }
            
            .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px solid #ddd; padding-top: 10px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>${companyInfo?.companyName || 'EVOBIT ERP'}</h2>
            <p>${companyInfo?.address || 'Endereço não configurado'}</p>
            <p>Tel: ${companyInfo?.phone || '-'}</p>
            <p>${fDate(sale.date)}</p>
        </div>

        <div class="info">
            <table>
                <tr>
                    <td><strong>Venda:</strong> #${sale.id.substr(0, 8)}</td>
                    <td style="text-align: right"><strong>Op:</strong> ${sale.user_id?.substr(0, 5) || 'Admin'}</td>
                </tr>
                ${customer ? `
                <tr>
                    <td colspan="2"><strong>Cliente:</strong> ${customer.name}</td>
                </tr>
                <tr>
                    <td colspan="2">Doc: ${customer.cpf_cnpj || '-'}</td>
                </tr>
                ` : ''}
            </table>
        </div>

        <table class="items">
            <thead>
                <tr>
                    <th>ITEM</th>
                    <th class="qty">QTD</th>
                    <th class="price">R$</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td class="qty">${item.quantity}</td>
                        <td class="price">${fMoney(item.total)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals">
            <table>
                <tr>
                    <td class="label">Subtotal:</td>
                    <td>${fMoney(sale.subtotal)}</td>
                </tr>
                ${sale.discount > 0 ? `
                <tr>
                    <td class="label">Desconto:</td>
                    <td>-${fMoney(sale.discount)}</td>
                </tr>
                ` : ''}
                <tr>
                    <td class="label" style="font-size: 14px">TOTAL:</td>
                    <td style="font-size: 14px">${fMoney(sale.total)}</td>
                </tr>
                <tr>
                    <td class="label">Pagamento:</td>
                    <td>${sale.payment_method?.toUpperCase()}</td>
                </tr>
                ${sale.change_amount > 0 ? `
                <tr>
                    <td class="label">Troco:</td>
                    <td>${fMoney(sale.change_amount)}</td>
                </tr>
                ` : ''}
            </table>
        </div>

        <div class="footer">
            <p>*** NÃO É DOCUMENTO FISCAL ***</p>
            <p>Obrigado pela preferência!</p>
            <p>Sistema: Evobit Desktop</p>
        </div>

        <script>
            window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 100);
            }
        </script>
    </body>
    </html>
    `;

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    // Write content to iframe
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Trigger print when loaded
    iframe.contentWindow.onload = () => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        // Remove iframe after a delay to ensure print dialog opens
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    };
};
