/**
 * Core Matemático de Precificação e Custeio (Ficha Técnica)
 *
 * Módulo 100% puro e sem dependências externas (sem React, sem RxDB, sem API).
 * Recebe objetos montados e retorna resultados calculados.
 */

// ==========================================
// 1. ERROS E CONTRATOS
// ==========================================

export type PricingErrorCode =
  | 'INVALID_UNIT_COST'
  | 'INVALID_YIELD'
  | 'INVALID_MONTHLY_HOURS'
  | 'VARIABLE_COSTS_AND_MARGIN_EXCEED_100_PERCENT'
  | 'ZERO_OR_NEGATIVE_DENOMINATOR';

export interface SuggestedPriceResult {
  suggestedPrice: number;
  isViable: boolean;
  reason?: PricingErrorCode;
  denominator?: number;
}

// ==========================================
// 2. HELPERS E ARREDONDAMENTOS
// ==========================================

const COST_DECIMALS = 4;
const PRICE_DECIMALS = 2;

/**
 * Arredonda para 4 casas decimais para minimizar perda em custos de precisão.
 */
export function roundCost(value: number): number {
  return Math.round(value * Math.pow(10, COST_DECIMALS)) / Math.pow(10, COST_DECIMALS);
}

/**
 * Arredonda para 2 casas decimais (Moeda).
 */
export function roundCurrency(value: number): number {
  return Math.round(value * Math.pow(10, PRICE_DECIMALS)) / Math.pow(10, PRICE_DECIMALS);
}

export type PercentageMode = 'decimal' | 'percent' | 'auto';

/**
 * Normaliza um percentual para fração decimal.
 * @param value Valor numérico do percentual.
 * @param mode 'decimal': assume que 0.2 é 20%. 'percent': assume que 20 é 20%. 'auto': tenta adivinhar (>1 é percent).
 */
export function normalizePercentage(value: number, mode: PercentageMode = 'auto'): number {
  if (mode === 'decimal') {
    return value;
  }
  if (mode === 'percent') {
    return value / 100;
  }
  // fallback "auto"
  if (value > 1 || value < -1) {
    return value / 100;
  }
  return value;
}

// ==========================================
// 3. TIPOS DE ENTRADA E SAÍDA
// ==========================================

export interface IngredientParams {
  netQuantity: number;      // Quantidade líquida pedida na receita
  unitPrice: number;        // Preço por unidade de medida de compra
  yieldFactor?: number;     // Fator de Rendimento (ex: 0.9 = 90% aproveitamento)
  correctionFactor?: number;// Fator de Correção (F.C) (>= 1)
  // TODO: conversionFactor (Futuro): Será necessário quando houver descasamento de UoM.
}

export interface LaborParams {
  minutesUsed: number;      // Tempo da mão de obra na receita
  monthlySalary: number;    // Salário base
  monthlyHours?: number;    // Horas trabalhadas no mês (padrão 220)
}

export interface EquipmentParams {
  hoursUsed: number;        // Horas que o equipamento ficou ligado
  consumptionPerHour: number; // Consumo (ex: kW/h)
  utilityRate: number;      // Tarifa (ex: preço do kWh)
}

export interface PackagingParams {
  quantity: number;
  unitPrice: number;
}

export interface RecipeTotalParams {
  ingredients: IngredientParams[];
  packagings: PackagingParams[];
  laborEntries: LaborParams[];
  equipmentEntries: EquipmentParams[];
  yieldQuantity: number; // Quantas unidades essa receita gera no fim
}

export interface PricingParams {
  unitCost: number;
  targetMarginPercent: number; // Margem de lucro desejada (%)
  cardFeePercent?: number;     // Taxas de cartão (%)
  deliveryFeePercent?: number; // Ex: iFood (%)
  commissionPercent?: number;  // Comissões (%)
  taxPercent?: number;         // Impostos (%)
  operationalCostPercent?: number; // Rateio de custos fixos (%)
  percentageMode?: PercentageMode; // Modo de interpretação dos percentuais (padrão: 'auto')
}

export interface PricingSimulationResult {
  suggestedPrice: number;
  minimumViablePrice: number; // Preço se a margem for 0
  marginValue: number;
  markupFactor: number;
  cmvPercent: number; // Custo de Mercadoria Vendida em %
  totalVariablePercent: number; // Soma de todos os percentuais variáveis (cartão, taxa, etc)
  isViable: boolean;
  reason?: PricingErrorCode;
}

// ==========================================
// 4. CÁLCULO DE CUSTOS DE INSUMOS
// ==========================================

export function calculateIngredientGrossQuantity(params: IngredientParams): number {
  const { netQuantity, correctionFactor = 1 } = params;
  return roundCost(netQuantity * Math.max(correctionFactor, 1));
}

export function calculateIngredientCost(params: IngredientParams): number {
  const { unitPrice, yieldFactor = 1 } = params;
  const grossQuantity = calculateIngredientGrossQuantity(params);
  const effectiveYield = yieldFactor > 0 ? yieldFactor : 1; // Evita divisão por zero
  
  return roundCost((grossQuantity / effectiveYield) * unitPrice);
}

export function calculatePackagingCost(params: PackagingParams): number {
  return roundCost(params.quantity * params.unitPrice);
}

// ==========================================
// 5. CÁLCULO DE MÃO DE OBRA E EQUIPAMENTOS
// ==========================================

export function calculateLaborCost(params: LaborParams): number {
  const { minutesUsed, monthlySalary, monthlyHours = 220 } = params;
  
  if (monthlyHours <= 0) {
    // Retorna 0 em caso de horas inválidas para evitar infinity
    return 0;
  }
  
  const costPerMinute = monthlySalary / (monthlyHours * 60);
  return roundCost(costPerMinute * minutesUsed);
}

export function calculateEquipmentCost(params: EquipmentParams): number {
  const { hoursUsed, consumptionPerHour, utilityRate } = params;
  return roundCost(hoursUsed * consumptionPerHour * utilityRate);
}

// ==========================================
// 6. CÁLCULOS AGREGADOS (LOTE E UNITÁRIO)
// ==========================================

export function calculateRecipeTotalCosts(params: RecipeTotalParams) {
  const totalIngredientsCost = params.ingredients.reduce((acc, curr) => acc + calculateIngredientCost(curr), 0);
  const totalPackagingCost = params.packagings.reduce((acc, curr) => acc + calculatePackagingCost(curr), 0);
  const totalLaborCost = params.laborEntries.reduce((acc, curr) => acc + calculateLaborCost(curr), 0);
  const totalEquipmentCost = params.equipmentEntries.reduce((acc, curr) => acc + calculateEquipmentCost(curr), 0);

  const totalBatchCost = roundCurrency(
    totalIngredientsCost + totalPackagingCost + totalLaborCost + totalEquipmentCost
  );

  const unitCostResult = calculateUnitCost(totalBatchCost, params.yieldQuantity);

  return {
    totalIngredientsCost: roundCurrency(totalIngredientsCost),
    totalPackagingCost: roundCurrency(totalPackagingCost),
    totalLaborCost: roundCurrency(totalLaborCost),
    totalEquipmentCost: roundCurrency(totalEquipmentCost),
    totalBatchCost,
    unitCost: unitCostResult.unitCost,
    isYieldViable: unitCostResult.isViable,
    yieldReason: unitCostResult.reason,
  };
}

export function calculateUnitCost(totalBatchCost: number, yieldQuantity: number): { unitCost: number, isViable: boolean, reason?: PricingErrorCode } {
  if (yieldQuantity <= 0) {
    return { unitCost: 0, isViable: false, reason: 'INVALID_YIELD' };
  }
  return { unitCost: roundCost(totalBatchCost / yieldQuantity), isViable: true };
}

// ==========================================
// 7. PRECIFICAÇÃO E MARGENS
// ==========================================

export function calculateSuggestedPrice(params: PricingParams): SuggestedPriceResult {
  const {
    unitCost,
    targetMarginPercent,
    cardFeePercent = 0,
    deliveryFeePercent = 0,
    commissionPercent = 0,
    taxPercent = 0,
    operationalCostPercent = 0,
    percentageMode = 'auto',
  } = params;

  if (unitCost <= 0) {
    return { suggestedPrice: 0, isViable: false, reason: 'INVALID_UNIT_COST' };
  }

  const totalVariableFraction =
    normalizePercentage(cardFeePercent, percentageMode) +
    normalizePercentage(deliveryFeePercent, percentageMode) +
    normalizePercentage(commissionPercent, percentageMode) +
    normalizePercentage(taxPercent, percentageMode) +
    normalizePercentage(operationalCostPercent, percentageMode);

  const marginFraction = normalizePercentage(targetMarginPercent, percentageMode);

  // Price = Cost / (1 - Custos Variáveis - Margem)
  const denominator = 1 - totalVariableFraction - marginFraction;

  if (denominator <= 0) {
    return {
      suggestedPrice: 0,
      isViable: false,
      reason: 'VARIABLE_COSTS_AND_MARGIN_EXCEED_100_PERCENT',
      denominator,
    };
  }

  return {
    suggestedPrice: roundCurrency(unitCost / denominator),
    isViable: true,
    denominator,
  };
}

export function calculateMarkupFactor(suggestedPrice: number, unitCost: number): number {
  if (unitCost <= 0) return 0;
  return roundCost(suggestedPrice / unitCost);
}

export function calculateRealMargin(finalPrice: number, unitCost: number, totalVariableFraction: number): number {
  if (finalPrice <= 0) return 0;
  const variableCostsValue = finalPrice * totalVariableFraction;
  const marginValue = finalPrice - unitCost - variableCostsValue;
  return roundCost(marginValue / finalPrice); // Retorna em fração (0-1)
}

export function simulatePricingScenarios(params: PricingParams): PricingSimulationResult {
  const { percentageMode = 'auto' } = params;
  
  const suggestedPriceResult = calculateSuggestedPrice(params);

  // Calcula Preço Mínimo (Se margem fosse 0)
  const minParams = { ...params, targetMarginPercent: 0 };
  const minimumViablePriceResult = calculateSuggestedPrice(minParams);

  const totalVariableFraction =
    normalizePercentage(params.cardFeePercent ?? 0, percentageMode) +
    normalizePercentage(params.deliveryFeePercent ?? 0, percentageMode) +
    normalizePercentage(params.commissionPercent ?? 0, percentageMode) +
    normalizePercentage(params.taxPercent ?? 0, percentageMode) +
    normalizePercentage(params.operationalCostPercent ?? 0, percentageMode);

  const isViable = suggestedPriceResult.isViable;
  
  const marginValue = isViable ? roundCurrency(suggestedPriceResult.suggestedPrice * normalizePercentage(params.targetMarginPercent, percentageMode)) : 0;
  const markupFactor = isViable ? calculateMarkupFactor(suggestedPriceResult.suggestedPrice, params.unitCost) : 0;
  const cmvPercent = isViable && suggestedPriceResult.suggestedPrice > 0 ? roundCost(params.unitCost / suggestedPriceResult.suggestedPrice) : 0;

  return {
    suggestedPrice: suggestedPriceResult.suggestedPrice,
    minimumViablePrice: minimumViablePriceResult.suggestedPrice,
    marginValue,
    markupFactor,
    cmvPercent,
    totalVariablePercent: totalVariableFraction, // Retorna em fração
    isViable,
    reason: suggestedPriceResult.reason,
  };
}
