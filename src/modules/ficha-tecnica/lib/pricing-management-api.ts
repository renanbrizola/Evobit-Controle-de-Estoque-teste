'use client';

import { api } from '../../../services/api';
import { getRecipe, listWorkbookProducts } from './recipes-management-api';
import { calculateSuggestedPrice, simulatePricingScenarios } from './pricing-calculator';

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

const SCENARIO_MARGINS = [15, 20, 25, 30, 35, 40];

function recipeIdFromVersion(recipeVersionId: string): string {
  return String(recipeVersionId || '').replace(/-v\d+$/, '');
}

async function unitCostForRecipeVersion(recipeVersionId: string): Promise<number> {
  const recipeId = recipeIdFromVersion(recipeVersionId);
  if (!recipeId) return 0;
  const detail = await getRecipe(recipeId);
  return Number(detail.versions[0]?.unitCost || 0);
}

export async function simulatePricing(payload: PricingSimulationPayload): Promise<PricingSimulationResult> {
  const unitCost = await unitCostForRecipeVersion(payload.recipeVersionId);

  const sim = simulatePricingScenarios({
    unitCost,
    targetMarginPercent: payload.targetMarginPercent,
    cardFeePercent: payload.cardFeePercent,
    deliveryFeePercent: payload.deliveryFeePercent,
    commissionPercent: payload.commissionPercent,
    taxPercent: payload.taxPercent,
    operationalCostPercent: payload.operationalCostPercent,
    percentageMode: 'percent',
  });

  const scenarios = SCENARIO_MARGINS.map((m) => {
    const r = calculateSuggestedPrice({
      unitCost,
      targetMarginPercent: m,
      cardFeePercent: payload.cardFeePercent,
      deliveryFeePercent: payload.deliveryFeePercent,
      commissionPercent: payload.commissionPercent,
      taxPercent: payload.taxPercent,
      operationalCostPercent: payload.operationalCostPercent,
      percentageMode: 'percent',
    });
    return {
      label: `${m}%`,
      targetMarginPercent: m,
      suggestedPrice: r.suggestedPrice,
      marginValue: r.isViable ? r.suggestedPrice * (m / 100) : 0,
      isViable: r.isViable,
    };
  });

  return {
    unitCost,
    pricingUnit: payload.pricingUnit,
    suggestedPrice: sim.suggestedPrice,
    marginPercent: payload.targetMarginPercent,
    markupFactor: sim.markupFactor,
    cmvPercent: sim.cmvPercent * 100,
    marginValue: sim.marginValue,
    isViable: sim.isViable,
    alerts: [],
    scenarios,
  };
}

export async function savePrice(payload: SavePricePayload): Promise<PriceRow> {
  const recipeId = recipeIdFromVersion(payload.recipeVersionId);
  const recipe = await api.recipes.getById(recipeId);
  if (!recipe || !recipe.finished_product_id) {
    throw new Error('Receita ou produto vinculado nao encontrado.');
  }

  const unitCost = await unitCostForRecipeVersion(payload.recipeVersionId);

  let finalPrice = Number(payload.finalPrice || 0);
  if (finalPrice <= 0) {
    const suggested = calculateSuggestedPrice({
      unitCost,
      targetMarginPercent: payload.targetMarginPercent,
      cardFeePercent: payload.cardFeePercent,
      deliveryFeePercent: payload.deliveryFeePercent,
      commissionPercent: payload.commissionPercent,
      taxPercent: payload.taxPercent,
      operationalCostPercent: payload.operationalCostPercent,
      percentageMode: 'percent',
    });
    finalPrice = suggested.suggestedPrice;
  }

  // Persiste o preco de venda no produto vinculado a receita.
  await api.products.update(recipe.finished_product_id, { price: finalPrice });

  const totalFeesFraction =
    ((payload.cardFeePercent ?? 0) +
      (payload.deliveryFeePercent ?? 0) +
      (payload.commissionPercent ?? 0) +
      (payload.taxPercent ?? 0) +
      (payload.operationalCostPercent ?? 0)) / 100;
  const marginPercent = finalPrice > 0 ? (1 - totalFeesFraction - unitCost / finalPrice) * 100 : 0;
  const cmvPercent = finalPrice > 0 ? (unitCost / finalPrice) * 100 : 0;

  return {
    id: recipe.finished_product_id,
    recipeId: recipe.id,
    recipeVersionId: payload.recipeVersionId,
    pricingUnit: payload.pricingUnit ?? null,
    status: 'ACTIVE',
    targetMarginPercent: payload.targetMarginPercent,
    cardFeePercent: payload.cardFeePercent ?? 0,
    deliveryFeePercent: payload.deliveryFeePercent ?? 0,
    commissionPercent: payload.commissionPercent ?? 0,
    taxPercent: payload.taxPercent ?? 0,
    operationalCostPercent: payload.operationalCostPercent ?? 0,
    unitCost,
    suggestedPrice: finalPrice,
    finalPrice,
    marginPercent,
    markupFactor: unitCost > 0 ? finalPrice / unitCost : 0,
    cmvPercent,
    notes: payload.notes ?? null,
    createdAt: new Date().toISOString(),
    recipe: { id: recipe.id, name: recipe.name || 'Sem nome' },
    recipeVersion: { id: payload.recipeVersionId, versionNumber: 1 },
    approvedBy: null,
  };
}

export async function listPrices(): Promise<PriceRow[]> {
  const products = await listWorkbookProducts();

  return products
    .filter((p) => p.salePrice != null && Number(p.salePrice) > 0)
    .map((p): PriceRow => {
      const finalPrice = Number(p.salePrice ?? 0);
      const unitCost = Number(p.totalCost ?? 0);
      return {
        id: p.recipeId,
        recipeId: p.recipeId,
        recipeVersionId: p.recipeVersionId,
        pricingUnit: p.pricingUnit ?? null,
        status: 'ACTIVE',
        targetMarginPercent: Number(p.marginPercent ?? 0),
        cardFeePercent: 0,
        deliveryFeePercent: 0,
        commissionPercent: 0,
        taxPercent: 0,
        operationalCostPercent: 0,
        unitCost,
        suggestedPrice: Number(p.suggestedPrice ?? finalPrice),
        finalPrice,
        marginPercent: Number(p.marginPercent ?? 0),
        markupFactor: unitCost > 0 ? finalPrice / unitCost : 0,
        cmvPercent: Number(p.cmvPercent ?? 0),
        notes: null,
        createdAt: p.updatedAt,
        recipe: { id: p.recipeId, name: p.recipeName },
        recipeVersion: { id: p.recipeVersionId, versionNumber: p.versionNumber },
        approvedBy: null,
      };
    });
}

export async function approvePrice(_id: string): Promise<PriceRow> {
  // TODO(precificação): persistir aprovação de preço na API real do Evobit.
  throw new Error('Aprovação de preço ainda não está disponível no Evobit.');
}

export async function activatePrice(_id: string): Promise<PriceRow> {
  // TODO(precificação): persistir ativação de preço na API real do Evobit.
  throw new Error('Ativação de preço ainda não está disponível no Evobit.');
}
