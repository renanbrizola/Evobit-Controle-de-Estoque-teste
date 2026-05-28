import { roundCost, roundPrice, toFraction } from './currency';

const DEFAULT_MONTHLY_HOURS = 220;

export interface PricingParams {
  unitCost: number;
  cmvCost?: number;
  targetMarginPercent: number;
  cardFeePercent?: number;
  deliveryFeePercent?: number;
  commissionPercent?: number;
  taxPercent?: number;
  operationalCostPercent?: number;
}

export interface PricingResult {
  suggestedPrice: number;
  minimumViablePrice: number;
  marginValue: number;
  marginPercent: number;
  markupFactor: number;
  cmvPercent: number;
  totalVariablePercent: number;
  contributionMarginValue: number;
  contributionMarginPercent: number;
  isViable: boolean;
}

export function calculateSuggestedPrice(params: PricingParams): PricingResult {
  const {
    unitCost,
    targetMarginPercent,
    cardFeePercent = 0,
    deliveryFeePercent = 0,
    commissionPercent = 0,
    taxPercent = 0,
    operationalCostPercent = 0,
  } = params;

  const totalVariablePercent =
    cardFeePercent + deliveryFeePercent + commissionPercent + taxPercent + operationalCostPercent;

  const totalVariableFraction = toFraction(totalVariablePercent);
  const marginFraction = toFraction(targetMarginPercent);
  const cmvBaseCost = params.cmvCost ?? unitCost;

  // Price = Cost / (1 - totalVariable% - margin%)
  const denominator = 1 - totalVariableFraction - marginFraction;

  if (denominator <= 0) {
    throw new Error('Parâmetros inviáveis: margem + custos variáveis >= 100%');
  }

  const suggestedPrice = roundPrice(unitCost / denominator);

  // Minimum viable price: margin = 0
  const minDenominator = 1 - totalVariableFraction;
  const minimumViablePrice = roundPrice(unitCost / (minDenominator > 0 ? minDenominator : 1));

  const marginValue = roundPrice(suggestedPrice * marginFraction);
  const cmvPercent = roundPrice((cmvBaseCost / suggestedPrice) * 100);
  const markupFactor = roundPrice(suggestedPrice / unitCost);
  const contributionMarginValue = roundPrice(
    suggestedPrice - unitCost - suggestedPrice * totalVariableFraction,
  );
  const contributionMarginPercent = roundPrice((contributionMarginValue / suggestedPrice) * 100);
  const isViable = suggestedPrice >= minimumViablePrice && denominator > 0;

  return {
    suggestedPrice,
    minimumViablePrice,
    marginValue,
    marginPercent: targetMarginPercent,
    markupFactor,
    cmvPercent,
    totalVariablePercent,
    contributionMarginValue,
    contributionMarginPercent,
    isViable,
  };
}

export interface IngredientCostInput {
  quantity: number;
  unitPrice: number;
  yieldFactor?: number; // 0-1, defaults to 1
  correctionFactor?: number; // >= 1, defaults to 1
}

export function calculateIngredientCost(input: IngredientCostInput): {
  grossQuantity: number;
  lineCost: number;
} {
  const { quantity, unitPrice, yieldFactor = 1, correctionFactor = 1 } = input;
  const effectiveYield = yieldFactor > 0 ? yieldFactor : 1;
  const grossQuantity = roundCost(quantity * correctionFactor);
  const lineCost = roundCost((grossQuantity / effectiveYield) * unitPrice);
  return { grossQuantity, lineCost };
}

export function calculateLaborCost(
  minutes: number,
  monthlySalary: number,
  monthlyHours = DEFAULT_MONTHLY_HOURS,
): number {
  const costPerMinute = monthlySalary / (monthlyHours * 60);
  return roundCost(costPerMinute * minutes);
}

export function calculateEquipmentCost(
  hoursUsed: number,
  consumptionPerHour: number,
  utilityRatePerUnit: number,
): number {
  return roundCost(hoursUsed * consumptionPerHour * utilityRatePerUnit);
}
