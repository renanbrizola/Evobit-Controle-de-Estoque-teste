'use client';

import { api } from '../../../services/api';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUser } from '../../../services/authHelper';
import { getRecipe, listWorkbookProducts, resetCache } from './recipes-management-api';
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

// ─── Persistencia real do preco (ft_prices, online-first Supabase) ─────────
interface PriceRecordInput {
  recipeId: string;
  recipeVersionId: string;
  finishedProductId: string;
  pricingUnit?: string | null;
  targetMarginPercent: number;
  cardFeePercent: number;
  deliveryFeePercent: number;
  commissionPercent: number;
  taxPercent: number;
  operationalCostPercent: number;
  unitCost: number;
  suggestedPrice: number;
  finalPrice: number;
  marginPercent: number;
  markupFactor: number;
  cmvPercent: number;
  notes?: string | null;
}

async function upsertPriceRecord(input: PriceRecordInput): Promise<void> {
  let userId: string | null = null;
  try {
    const user = await getCurrentUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }
  if (!userId) return; // sem sessao: nao persiste o historico (o preco ja foi no produto)

  const row = {
    user_id: userId,
    recipe_id: input.recipeId,
    recipe_version_id: input.recipeVersionId,
    finished_product_id: input.finishedProductId,
    pricing_unit: input.pricingUnit ?? null,
    status: 'ACTIVE',
    target_margin_percent: input.targetMarginPercent,
    card_fee_percent: input.cardFeePercent,
    delivery_fee_percent: input.deliveryFeePercent,
    commission_percent: input.commissionPercent,
    tax_percent: input.taxPercent,
    operational_cost_percent: input.operationalCostPercent,
    unit_cost: input.unitCost,
    suggested_price: input.suggestedPrice,
    final_price: input.finalPrice,
    margin_percent: input.marginPercent,
    markup_factor: input.markupFactor,
    cmv_percent: input.cmvPercent,
    notes: input.notes ?? null,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('ft_prices').upsert(row, { onConflict: 'recipe_id' });
  if (error) {
    // Degrada com elegancia se a migration ft_prices ainda nao foi aplicada.
    console.warn('[ft_prices] historico de preco nao salvo:', error.message);
  }
}

function priceRowFromRecord(r: Record<string, any>): PriceRow {
  const finalPrice = Number(r.final_price ?? 0);
  return {
    id: String(r.id),
    recipeId: r.recipe_id,
    recipeVersionId: r.recipe_version_id ?? null,
    pricingUnit: r.pricing_unit ?? null,
    status: r.status ?? 'ACTIVE',
    targetMarginPercent: Number(r.target_margin_percent ?? 0),
    cardFeePercent: Number(r.card_fee_percent ?? 0),
    deliveryFeePercent: Number(r.delivery_fee_percent ?? 0),
    commissionPercent: Number(r.commission_percent ?? 0),
    taxPercent: Number(r.tax_percent ?? 0),
    operationalCostPercent: Number(r.operational_cost_percent ?? 0),
    unitCost: Number(r.unit_cost ?? 0),
    suggestedPrice: Number(r.suggested_price ?? finalPrice),
    finalPrice,
    marginPercent: Number(r.margin_percent ?? 0),
    markupFactor: Number(r.markup_factor ?? 0),
    cmvPercent: Number(r.cmv_percent ?? 0),
    notes: r.notes ?? null,
    createdAt: r.created_at ?? r.updated_at ?? new Date().toISOString(),
    recipe: { id: r.recipe_id, name: '' },
    recipeVersion: r.recipe_version_id ? { id: r.recipe_version_id, versionNumber: 1 } : null,
    approvedBy: null,
  };
}

async function fetchPriceRecords(): Promise<Map<string, PriceRow>> {
  const map = new Map<string, PriceRow>();
  try {
    const { data, error } = await supabase.from('ft_prices').select('*').is('deleted_at', null);
    if (error || !data) return map;
    for (const r of data) map.set(r.recipe_id, priceRowFromRecord(r));
  } catch {
    // tabela ausente / offline: retorna vazio e listPrices cai no derivado
  }
  return map;
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
  // Invalida o cache de produtos para o overview refletir o novo preco no reload
  // (loadProductsCache carrega "uma vez"; sem isto, ficava mostrando "---").
  resetCache();

  const totalFeesFraction =
    ((payload.cardFeePercent ?? 0) +
      (payload.deliveryFeePercent ?? 0) +
      (payload.commissionPercent ?? 0) +
      (payload.taxPercent ?? 0) +
      (payload.operationalCostPercent ?? 0)) / 100;
  const marginPercent = finalPrice > 0 ? (1 - totalFeesFraction - unitCost / finalPrice) * 100 : 0;
  const cmvPercent = finalPrice > 0 ? (unitCost / finalPrice) * 100 : 0;
  const markupFactor = unitCost > 0 ? finalPrice / unitCost : 0;

  // Persiste o snapshot completo da precificacao (taxas, margem, custo, notas).
  await upsertPriceRecord({
    recipeId: recipe.id,
    recipeVersionId: payload.recipeVersionId,
    finishedProductId: recipe.finished_product_id,
    pricingUnit: payload.pricingUnit ?? null,
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
    markupFactor,
    cmvPercent,
    notes: payload.notes ?? null,
  });

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
  const [products, records] = await Promise.all([listWorkbookProducts(), fetchPriceRecords()]);
  const productByRecipe = new Map(products.map((p) => [p.recipeId, p]));
  const rows: PriceRow[] = [];

  // 1. Registros salvos (ft_prices) — SEMPRE no historico, com o breakdown real.
  //    Nao dependem do salePrice do cache de produtos (que pode estar velho).
  for (const [recipeId, stored] of records) {
    const p = productByRecipe.get(recipeId);
    rows.push({
      ...stored,
      recipe: { id: recipeId, name: p?.recipeName ?? stored.recipe.name ?? 'Sem nome' },
      recipeVersion: p ? { id: p.recipeVersionId, versionNumber: p.versionNumber } : stored.recipeVersion,
    });
  }

  // 2. Produtos com preco > 0 sem registro salvo (derivado; taxas desconhecidas = 0).
  for (const p of products) {
    if (records.has(p.recipeId)) continue;
    if (p.salePrice == null || Number(p.salePrice) <= 0) continue;
    const finalPrice = Number(p.salePrice ?? 0);
    const unitCost = Number(p.totalCost ?? 0);
    rows.push({
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
      createdAt: p.updatedAt ?? new Date().toISOString(),
      recipe: { id: p.recipeId, name: p.recipeName },
      recipeVersion: { id: p.recipeVersionId, versionNumber: p.versionNumber },
      approvedBy: null,
    });
  }

  return rows;
}

export async function approvePrice(_id: string): Promise<PriceRow> {
  // TODO(precificação): persistir aprovação de preço na API real do Evobit.
  throw new Error('Aprovação de preço ainda não está disponível no Evobit.');
}

export async function activatePrice(_id: string): Promise<PriceRow> {
  // TODO(precificação): persistir ativação de preço na API real do Evobit.
  throw new Error('Ativação de preço ainda não está disponível no Evobit.');
}
