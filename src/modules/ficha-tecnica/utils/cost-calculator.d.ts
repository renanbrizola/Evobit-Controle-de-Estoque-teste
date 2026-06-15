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
export declare function calculateSuggestedPrice(params: PricingParams): PricingResult;
export interface IngredientCostInput {
    quantity: number;
    unitPrice: number;
    yieldFactor?: number;
    correctionFactor?: number;
}
export declare function calculateIngredientCost(input: IngredientCostInput): {
    grossQuantity: number;
    lineCost: number;
};
export declare function calculateLaborCost(minutes: number, monthlySalary: number, monthlyHours?: number): number;
export declare function calculateEquipmentCost(hoursUsed: number, consumptionPerHour: number, utilityRatePerUnit: number): number;
//# sourceMappingURL=cost-calculator.d.ts.map
