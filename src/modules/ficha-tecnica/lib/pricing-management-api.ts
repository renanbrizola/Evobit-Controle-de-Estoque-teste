'use client';

export interface PricingSimulationPayload {
  recipeVersionId: string;
  pricingUnit?: string;
  targetMarginPercent: number;
  cardFeePercent?: number;
  deliveryFeePercent?: number;
  commissionPercent?: number;
  taxPercent?: number;
  operationalCostPercent?: number;
}

export interface SavePricePayload extends PricingSimulationPayload {
  finalPrice?: number;
  notes?: string;
}

export interface PricingSimulationResult {
  unitCost: number;
  pricingUnit?: string;
  suggestedPrice: number;
  finalPrice?: number;
  marginPercent: number;
  markupFactor: number;
  cmvPercent: number;
  marginValue: number;
  isViable: boolean;
  alerts: Array<{
    code: string;
    severity: 'ERROR' | 'WARNING';
    message: string;
  }>;
  scenarios: Array<{
    label: string;
    targetMarginPercent: number;
    suggestedPrice: number;
    marginValue: number;
    isViable: boolean;
  }>;
}

export interface PriceRow {
  id: string;
  recipeId: string;
  recipeVersionId: string | null;
  pricingUnit?: string | null;
  status: string;
  targetMarginPercent: number;
  cardFeePercent: number;
  deliveryFeePercent: number;
  commissionPercent: number;
  taxPercent: number;
  operationalCostPercent: number;
  unitCost: number;
  suggestedPrice: number;
  finalPrice: number | null;
  marginPercent: number;
  markupFactor: number;
  cmvPercent: number;
  notes?: string | null;
  createdAt: string;
  recipe: {
    id: string;
    name: string;
  };
  recipeVersion?: {
    id: string;
    versionNumber: number;
  } | null;
  approvedBy?: {
    id: string;
    name: string;
  } | null;
}

export async function simulatePricing(_payload: PricingSimulationPayload) {
  const response = { data: { data: { unitCost: 15.5, suggestedPrice: 45.9, marginPercent: 30, markupFactor: 3, cmvPercent: 33, marginValue: 13.5, isViable: true, alerts: [], scenarios: [] } } };
  return response.data.data;
}

export async function savePrice(payload: SavePricePayload) {
  const response = { data: { data: { id: '1', ...payload } as any } };
  return response.data.data;
}

export async function listPrices() {
  const response = { data: { data: [] } };
  return response.data.data;
}

export async function approvePrice(id: string) {
  const response = await api.post<{ success: boolean; data: PriceRow }>(`/pricing/${id}/approve`);
  return response.data.data;
}

export async function activatePrice(id: string) {
  const response = await api.post<{ success: boolean; data: PriceRow }>(`/pricing/${id}/activate`);
  return response.data.data;
}
