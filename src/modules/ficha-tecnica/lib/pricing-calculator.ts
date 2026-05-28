/**
 * Core Matemático de Precificação e Custeio (Ficha Técnica)
 *
 * Módulo 100% puro e sem dependências externas (sem React, sem RxDB, sem API).
 * Recebe objetos montados e retorna resultados calculados.
 */

// ==========================================
// 1. HELPERS E ARREDONDAMENTOS
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

/**
 * Normaliza um percentual para fração decimal.
 * Ex: Se vier 20, vira 0.20. Se vier 0.20, continua 0.20.
 */
export function normalizePercentage(value: number): number {
  // Assume que se o valor for maior que 1 ou menor que -1, está em escala 0-100.
  // Tratamento de segurança para aceitar 20% ou 0.2 de forma agnóstica.
  if (value > 1 || value < -1) {
    return value / 100;
  }
  return value;
}

// ==========================================
// 2. TIPOS DE ENTRADA E SAÍDA
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
}

export interface PricingSimulationResult {
  suggestedPrice: number;
  minimumViablePrice: number; // Preço se a margem for 0
  marginValue: number;
  markupFactor: number;
  cmvPercent: number; // Custo de Mercadoria Vendida em %
  isViable: boolean;
}

// ==========================================
// 3. CÁLCULO DE CUSTOS DE INSUMOS
// ==========================================

export function calculateIngredientGrossQuantity(params: IngredientParams): number {
  const { netQuantity, correctionFactor = 1 } = params;
  return roundCost(netQuantity * Math.max(correctionFactor, 1));
}

export function calculateIngredientCost(params: IngredientParams): number {
  const { unitPrice, yieldFactor = 1 } = params;
  const grossQuantity = calculateIngredientGrossQuantity(params);
  const effectiveYield = yieldFactor > 0 ? yieldFactor : 1; // Evita divisão por zero
  
  // O custo considera a quantidade bruta dividida pelo fator de rendimento do ingrediente.
  return roundCost((grossQuantity / effectiveYield) * unitPrice);
}

export function calculatePackagingCost(params: PackagingParams): number {
  return roundCost(params.quantity * params.unitPrice);
}

// ==========================================
// 4. CÁLCULO DE MÃO DE OBRA E EQUIPAMENTOS
// ==========================================

export function calculateLaborCost(params: LaborParams): number {
  const { minutesUsed, monthlySalary, monthlyHours = 220 } = params;
  const safeHours = monthlyHours > 0 ? monthlyHours : 220; // Previne divisão por zero
  const costPerMinute = monthlySalary / (safeHours * 60);
  
  return roundCost(costPerMinute * minutesUsed);
}

export function calculateEquipmentCost(params: EquipmentParams): number {
  const { hoursUsed, consumptionPerHour, utilityRate } = params;
  return roundCost(hoursUsed * consumptionPerHour * utilityRate);
}

// ==========================================
// 5. CÁLCULOS AGREGADOS (LOTE E UNITÁRIO)
// ==========================================

export function calculateRecipeTotalCosts(params: RecipeTotalParams) {
  const totalIngredientsCost = params.ingredients.reduce((acc, curr) => acc + calculateIngredientCost(curr), 0);
  const totalPackagingCost = params.packagings.reduce((acc, curr) => acc + calculatePackagingCost(curr), 0);
  const totalLaborCost = params.laborEntries.reduce((acc, curr) => acc + calculateLaborCost(curr), 0);
  const totalEquipmentCost = params.equipmentEntries.reduce((acc, curr) => acc + calculateEquipmentCost(curr), 0);

  const totalBatchCost = roundCurrency(
    totalIngredientsCost + totalPackagingCost + totalLaborCost + totalEquipmentCost
  );

  const unitCost = calculateUnitCost(totalBatchCost, params.yieldQuantity);

  return {
    totalIngredientsCost: roundCurrency(totalIngredientsCost),
    totalPackagingCost: roundCurrency(totalPackagingCost),
    totalLaborCost: roundCurrency(totalLaborCost),
    totalEquipmentCost: roundCurrency(totalEquipmentCost),
    totalBatchCost,
    unitCost,
  };
}

export function calculateUnitCost(totalBatchCost: number, yieldQuantity: number): number {
  if (yieldQuantity <= 0) return 0; // Proteção contra divisão por zero
  return roundCurrency(totalBatchCost / yieldQuantity);
}

// ==========================================
// 6. PRECIFICAÇÃO E MARGENS
// ==========================================

export function calculateSuggestedPrice(params: PricingParams): number {
  const {
    unitCost,
    targetMarginPercent,
    cardFeePercent = 0,
    deliveryFeePercent = 0,
    commissionPercent = 0,
    taxPercent = 0,
    operationalCostPercent = 0,
  } = params;

  const totalVariableFraction =
    normalizePercentage(cardFeePercent) +
    normalizePercentage(deliveryFeePercent) +
    normalizePercentage(commissionPercent) +
    normalizePercentage(taxPercent) +
    normalizePercentage(operationalCostPercent);

  const marginFraction = normalizePercentage(targetMarginPercent);

  // Price = Cost / (1 - Custos Variáveis - Margem)
  const denominator = 1 - totalVariableFraction - marginFraction;

  if (denominator <= 0) {
    // Retorna 0 para evitar Infinity ou números negativos caso os impostos+margem ultrapassem 100%
    return 0;
  }

  return roundCurrency(unitCost / denominator);
}

export function calculateMarkupFactor(suggestedPrice: number, unitCost: number): number {
  if (unitCost <= 0) return 0;
  return roundCurrency(suggestedPrice / unitCost);
}

export function calculateRealMargin(finalPrice: number, unitCost: number, totalVariablePercent: number): number {
  if (finalPrice <= 0) return 0;
  
  const totalVariableFraction = normalizePercentage(totalVariablePercent);
  const variableCostsValue = finalPrice * totalVariableFraction;
  
  const marginValue = finalPrice - unitCost - variableCostsValue;
  return roundCurrency(marginValue / finalPrice); // Retorna em fração (0-1)
}

export function simulatePricingScenarios(params: PricingParams): PricingSimulationResult {
  const suggestedPrice = calculateSuggestedPrice(params);

  // Calcula Preço Mínimo (Se margem fosse 0)
  const minParams = { ...params, targetMarginPercent: 0 };
  const minimumViablePrice = calculateSuggestedPrice(minParams);

  // Se o denominador da margem foi < 0 e o preço sugerido zerou, a receita é inviável
  const isViable = suggestedPrice > 0 && suggestedPrice >= minimumViablePrice;

  const totalVariableFraction =
    normalizePercentage(params.cardFeePercent ?? 0) +
    normalizePercentage(params.deliveryFeePercent ?? 0) +
    normalizePercentage(params.commissionPercent ?? 0) +
    normalizePercentage(params.taxPercent ?? 0) +
    normalizePercentage(params.operationalCostPercent ?? 0);

  const marginValue = isViable ? roundCurrency(suggestedPrice * normalizePercentage(params.targetMarginPercent)) : 0;
  const markupFactor = isViable ? calculateMarkupFactor(suggestedPrice, params.unitCost) : 0;
  const cmvPercent = isViable ? roundCurrency(params.unitCost / suggestedPrice) : 0; // Custo dividido por Venda

  return {
    suggestedPrice,
    minimumViablePrice,
    marginValue,
    markupFactor,
    cmvPercent,
    isViable,
  };
}
