export const productSchema = {
    title: 'product schema',
    version: 7,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' },
        sku: { type: 'string' }, // New
        model: { type: 'string' }, // New
        brand: { type: 'string' },
        manufacturer: { type: 'string' }, // New
        barcode: { type: 'string' },
        category: { type: 'string' },
        unit: { type: 'string' },
        description: { type: ['string', 'null'] },
        is_active: { type: ['boolean', 'null'] }, // New
        is_raw_material: { type: ['boolean', 'null'], default: false }, // New (Fase 0)
        is_service: { type: ['boolean', 'null'], default: false }, // New (Fase 0)

        // Pricing
        price: { type: ['number', 'null'] },
        cost_price: { type: ['number', 'null'] },
        promotional_price: { type: ['number', 'null'] }, // New
        average_cost: { type: ['number', 'null'] },

        // Stock
        min_stock: { type: ['number', 'null'] },
        current_stock: { type: ['number', 'null'] },
        available_stock: { type: ['number', 'null'], default: 0 }, // New (Fase 0)
        location: { type: ['string', 'null'] }, // New

        // Fiscal
        ncm: { type: 'string' }, // New
        cest: { type: 'string' }, // New
        cfop: { type: 'string' }, // New
        origin: { type: 'string' }, // New
        tax_group: { type: 'string' }, // New

        // Logistics
        weight_gross: { type: 'number' }, // New
        weight_net: { type: 'number' }, // New
        width: { type: 'number' }, // New
        height: { type: 'number' }, // New
        depth: { type: 'number' }, // New

        // Relationships
        provider_id: { type: ['string', 'null'] },
        user_id: { type: ['string', 'null'] },
        updated_at: { type: ['string', 'null'] },
        created_at: { type: ['string', 'null'] },
        deleted_at: { type: ['string', 'null'] },
        last_sale_date: { type: ['string', 'null'] }, // New (Reports efficiency)
        expiration_date: { type: ['string', 'null'] } // Deprecated but kept to avoid migration issues
    },
    required: ['id', 'name']
};

export const providerSchema = {
    title: 'provider schema',
    version: 3,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' }, // Razão Social
        trade_name: { type: 'string' }, // Nome Fantasia - New
        cnpj: { type: 'string' },
        ie: { type: 'string' }, // Inscrição Estadual - New
        im: { type: 'string' }, // Inscrição Municipal - New

        // Contact
        phone: { type: 'string' },
        mobile_phone: { type: 'string' }, // New
        email: { type: 'string' },
        email_nfe: { type: 'string' }, // New
        website: { type: 'string' }, // New
        seller: { type: 'string' }, // Contact Person

        // Address Breakdown - New
        cep: { type: 'string' },
        street: { type: 'string' },
        number: { type: 'string' },
        complement: { type: 'string' },
        neighborhood: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        address: { type: 'string' }, // Legacy/Full string

        // Commercial/Financial
        delivery_time: { type: 'string' },
        payment_terms: { type: 'string' },
        product_types: { type: 'string' },
        order_day: { type: 'string' },
        bank_info: { type: 'string' }, // New
        credit_limit: { type: 'number' }, // New

        is_active: { type: 'boolean' }, // New
        user_id: { type: 'string' },
        updated_at: { type: 'string' }
    },
    required: ['id', 'name']
};

export const movementSchema = {
    title: 'movement schema',
    version: 1,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        product_id: {
            type: 'string'
        },
        type: {
            type: 'string',
            enum: ['IN', 'OUT', 'ADJUSTMENT']
        },
        quantity: {
            type: 'number'
        },
        price: {
            type: 'number'
        },
        cost_unit: {
            type: 'number' // Custo unitário de aquisição (entradas)
        },
        reason: {
            type: 'string'
        },
        obs: {
            type: 'string'
        },
        date: {
            type: 'string'
        },
        user_id: {
            type: 'string'
        },
        provider: {
            type: 'string'
        },
        validity: {
            type: 'string'
        },
        batch_id: {
            type: 'string' // Referência ao lote (product_batches.id)
        },
        reference_id: {
            type: 'string' // ID do movimento original (para estornos/ajustes)
        },
        updated_at: {
            type: 'string'
        }
    },
    required: ['id', 'product_id', 'type', 'quantity', 'date']
};

// LOTES — cada compra/entrada gera um lote com custo e validade próprios
export const batchSchema = {
    title: 'product batch schema',
    version: 1,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        product_id: {
            type: 'string'
        },
        quantity: {
            type: 'number' // Quantidade remanescente neste lote
        },
        initial_quantity: {
            type: 'number' // Quantidade original do lote
        },
        cost_unit: {
            type: 'number' // Custo unitário de aquisição
        },
        expiration_date: {
            type: 'string' // Validade deste lote (opcional)
        },
        provider: {
            type: 'string' // Fornecedor deste lote
        },
        movement_id: {
            type: 'string' // Movimento de entrada que gerou este lote
        },
        user_id: {
            type: 'string'
        },
        created_at: {
            type: 'string'
        },
        updated_at: {
            type: 'string'
        },
        deleted_at: {
            type: 'string' // Tombstone para sync
        }
    },
    required: ['id', 'product_id', 'quantity', 'cost_unit']
};

// CATEGORIAS — cadastro dinâmico de categorias de produtos
export const categorySchema = {
    title: 'category schema',
    version: 1,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string'
        },
        user_id: {
            type: 'string'
        },
        updated_at: {
            type: 'string'
        }
    },
    required: ['id', 'name']
};

// RECEITAS / FICHA TÉCNICA (Capa + Ingredientes)
export const recipeSchema = {
    title: 'recipe schema',
    version: 4, // Bumped for discount_from_stock and auto_production (v3) -> added ingredient id (v4)
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        finished_product_id: { type: 'string' }, // O produto de venda que resulta dessa receita
        name: { type: 'string' }, // Ex: Receita do Bolo de Cenoura Base
        yield_quantity: { type: 'number' }, // Quanto rende (ex: 1 bolo, 10 pedaços)
        preparation_time_minutes: { type: 'number' },
        instructions: { type: 'string' },
        is_active: { type: 'boolean' },
        auto_production: { type: 'boolean' }, // Produzir automaticamente na venda
        ingredients: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    input_product_id: { type: 'string' },
                    quantity: { type: 'number' },
                    unit: { type: 'string' },
                    loss_percentage: { type: 'number' },
                    discount_from_stock: { type: 'boolean' }
                },
                required: ['id', 'input_product_id', 'quantity']
            }
        },
        user_id: { type: 'string' },
        updated_at: { type: 'string' },
        created_at: { type: 'string' },
        deleted_at: { type: 'string' }
    },
    required: ['id', 'finished_product_id', 'name']
};

// VENDAS (Pedidos / Orçamentos / NFC-e)
export const saleSchema = {
    title: 'sale schema',
    version: 4, // Bumped to 4 for Fiscal/NFC-e fields
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        type: { type: 'string', enum: ['QUOTE', 'ORDER', 'SALE'] }, // ORÇAMENTO, PEDIDO, VENDA
        customer_id: { type: 'string' },
        user_id: { type: 'string' },

        // Values
        subtotal: { type: 'number' },
        discount: { type: 'number' },
        shipping_cost: { type: 'number' }, // New
        other_costs: { type: 'number' },   // New
        total: { type: 'number' },

        // Payments (Simples ou Múltiplos via collection order_payments)
        amount_paid: { type: 'number' },
        change_amount: { type: 'number' },
        payment_method: { type: 'string' }, // Deprecated if using order_payments, kept for simple sales

        status: { type: 'string' }, // 'DRAFT', 'OPEN', 'APPROVED', 'BILLED', 'COMPLETED', 'CANCELED'
        date: { type: 'string' },
        notes: { type: 'string' }, // New

        // Fiscal / NFC-e fields
        fiscal_status: { type: 'string', enum: ['PENDING', 'EMITTED', 'ERROR', 'CANCELED'] },
        nfe_key: { type: 'string' },
        nfe_number: { type: 'number' },
        nfe_series: { type: 'number' },
        nfe_url: { type: 'string' }, // URL da DANFE

        created_at: { type: 'string' },
        updated_at: { type: 'string' }
    },
    required: ['id', 'total', 'date', 'status']
};

export const saleItemSchema = {
    title: 'sale item schema',
    version: 3, // Bumped for consistency
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        sale_id: { type: 'string' },
        product_id: { type: 'string' },
        quantity: { type: 'number' },
        unit_price: { type: 'number' },
        discount: { type: 'number' }, // New line item discount
        total: { type: 'number' },
        cost_unit: { type: 'number' },
        notes: { type: 'string' }, // New
        created_at: { type: 'string' },
        updated_at: { type: 'string' }
    },
    required: ['id', 'sale_id', 'product_id', 'quantity', 'total']
};

// PAGAMENTOS (Múltiplas formas de pagamento por venda)
export const orderPaymentSchema = {
    title: 'order payment schema',
    version: 1,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        sale_id: { type: 'string' },
        payment_method: { type: 'string' }, // 'cash', 'credit_card', 'debit_card', 'pix', 'credit' (crediário)
        amount: { type: 'number' },
        installment: { type: 'number' }, // 1 de X
        installments_total: { type: 'number' }, // Total de parcelas
        due_date: { type: 'string' }, // Para cheques ou crediário
        status: { type: 'string' }, // 'PENDING', 'PAID'
        created_at: { type: 'string' }
    },
    required: ['id', 'sale_id', 'amount', 'payment_method']
};

// CONTAS A RECEBER (Gerado a partir de vendas a prazo/crediário)
export const receivableSchema = {
    title: 'receivable schema',
    version: 1,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        sale_id: { type: 'string' },
        customer_id: { type: 'string' },
        description: { type: 'string' },
        amount: { type: 'number' },
        due_date: { type: 'string' },
        paid_amount: { type: 'number' },
        paid_date: { type: 'string' },
        status: { type: 'string', enum: ['PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELED'] },
        payment_method: { type: 'string' },
        created_at: { type: 'string' },
        updated_at: { type: 'string' }
    },
    required: ['id', 'sale_id', 'amount', 'due_date', 'status']
};

// COMPRAS
export const purchaseSchema = {
    title: 'purchase schema',
    version: 2, // Bumped for ERP features
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        provider_id: { type: 'string' },
        user_id: { type: 'string' },

        // Values
        total: { type: 'number' },
        subtotal: { type: 'number' }, // New
        discount: { type: 'number' }, // New
        freight: { type: 'number' }, // New
        insurance: { type: 'number' }, // New
        other_expenses: { type: 'number' }, // New

        status: { type: 'string' }, // 'DRAFT', 'ORDER', 'WAITING_DELIVERY', 'COMPLETED', 'CANCELED'
        date: { type: 'string' }, // Data de Emissão / Compra

        // Fiscal
        nfe_key: { type: 'string' }, // New
        nfe_xml: { type: 'string' }, // New
        issue_date: { type: 'string' }, // New (Data Emissão NFe)

        created_at: { type: 'string' },
        updated_at: { type: 'string' }
    },
    required: ['id', 'total', 'date', 'status']
};

export const purchaseItemSchema = {
    title: 'purchase item schema',
    version: 3,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        purchase_id: { type: 'string' },
        product_id: { type: 'string' },
        quantity: { type: 'number' },
        unit_cost: { type: 'number' },
        total: { type: 'number' },

        // Extended
        ipi_percent: { type: 'number' }, // New
        icms_percent: { type: 'number' }, // New

        created_at: { type: 'string' },
        updated_at: { type: 'string' }
    },
    required: ['id', 'purchase_id', 'product_id', 'quantity', 'total']
};

// CONTAS A PAGAR (Novo)
export const purchasePaymentSchema = {
    title: 'purchase payment schema',
    version: 1,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        purchase_id: { type: 'string' },
        provider_id: { type: 'string' },
        description: { type: 'string' },
        amount: { type: 'number' },
        due_date: { type: 'string' },
        paid_amount: { type: 'number' },
        paid_date: { type: 'string' },
        status: { type: 'string', enum: ['PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELED'] },
        payment_method: { type: 'string' }, // Boleto, Pix, Transferência
        barcode: { type: 'string' }, // Linha digitável
        created_at: { type: 'string' },
        updated_at: { type: 'string' }
    },
    required: ['id', 'purchase_id', 'amount', 'due_date', 'status']
};

// FINANCEIRO
export const transactionSchema = {
    title: 'transaction schema',
    version: 1,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        user_id: { type: 'string' },
        description: { type: 'string' },
        amount: { type: 'number' },
        type: { type: 'string', enum: ['income', 'expense'] },
        category: { type: 'string' },
        date: { type: 'string' },
        reference_id: { type: 'string' }, // ID da Venda ou Compra
        reference_type: { type: 'string' }, // 'sale', 'purchase', 'manual'
        status: { type: 'string' }, // 'completed', 'pending'
        created_at: { type: 'string' },
        updated_at: { type: 'string' }
    },
    required: ['id', 'description', 'amount', 'type', 'date']
};

export const customerSchema = {
    title: 'customer schema',
    version: 1,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' },
        cpf_cnpj: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        address: { type: 'string' },
        user_id: { type: 'string' },
        updated_at: { type: 'string' }
    },
    required: ['id', 'name']
};

// SYNC EVENTS (Fila imutável para offline-first robusto)
export const syncEventSchema = {
    title: 'sync event schema',
    version: 2,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        entity: { type: 'string' }, // Ex: 'movements', 'products'
        action: { type: 'string', enum: ['INSERT', 'UPDATE', 'DELETE'] },
        payload: { type: 'string' }, // JSON stringified payload
        local_timestamp: { type: 'string' },
        device_id: { type: 'string' },
        sync_status: { type: 'string', enum: ['PENDING', 'SYNCED', 'ERROR'] },
        error_message: { type: 'string' },
        created_at: { type: 'string' },
        deleted_at: { type: 'string' }
    },
    required: ['id', 'entity', 'action', 'payload', 'local_timestamp', 'sync_status']
};
