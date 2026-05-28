'use client';

import type {
  CostBreakdownDto,
  EquipmentType,
  ProductType,
  RecipeStatus,
} from '../types/enums';
import api from '../lib/api';

export interface RecipeListItem {
  id: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  productType: ProductType;
  isActive: boolean;
  versions: Array<{
    id: string;
    versionNumber: number;
    status: RecipeStatus;
    unitCost: number;
    totalCost: number;
    yieldQuantity?: number;
    servingSize?: number | null;
    yieldUom?: { abbreviation: string };
    _count?: {
      ingredients: number;
      steps: number;
      packagings: number;
      laborEntries: number;
      equipmentEntries: number;
    };
  }>;
}

export interface RecipeVersionDetail {
  id: string;
  versionNumber: number;
  status: RecipeStatus;
  yieldQuantity: number;
  yieldUomId: string;
  servingSize?: number | null;
  totalCost: number;
  unitCost: number;
  notes?: string | null;
  yieldUom: {
    id: string;
    name: string;
    abbreviation: string;
  };
  ingredients: Array<{
    id: string;
    inventoryItemId?: string | null;
    subRecipeId?: string | null;
    quantity: number;
    uomId: string;
    notes?: string | null;
    order: number;
    inventoryItem?: {
      id: string;
      name: string;
      uom?: { abbreviation: string };
    } | null;
    uom: {
      id: string;
      abbreviation: string;
    };
  }>;
  steps: Array<{
    id: string;
    stepNumber: number;
    description: string;
    durationMinutes?: number | null;
    notes?: string | null;
  }>;
  packagings: Array<{
    id: string;
    name: string;
    quantity: number;
    unitCost: number;
  }>;
  laborEntries: Array<{
    id: string;
    role: string;
    minutes: number;
    monthlySalary: number;
    monthlyHours: number;
  }>;
  equipmentEntries: Array<{
    id: string;
    name: string;
    type: EquipmentType;
    hoursUsed: number;
    consumptionPerHour: number;
    utilityRate: number;
  }>;
}

export interface RecipeDetail extends Omit<RecipeListItem, 'versions'> {
  category?: { id: string; name: string } | null;
  versions: RecipeVersionDetail[];
}

export interface RecipePayload {
  name: string;
  productType: ProductType;
  description?: string;
  categoryId?: string;
  yieldQuantity: number;
  yieldUomId: string;
  servingSize?: number;
}

export interface RecipeIngredientPayload {
  inventoryItemId?: string;
  subRecipeId?: string;
  quantity: number;
  uomId: string;
  notes?: string;
  order?: number;
}

export interface RecipeStepPayload {
  stepNumber: number;
  description: string;
  durationMinutes?: number;
  notes?: string;
}

export interface RecipePackagingPayload {
  name: string;
  quantity: number;
  unitCost: number;
}

export interface RecipeLaborPayload {
  role: string;
  minutes: number;
  monthlySalary: number;
  monthlyHours: number;
}

export interface RecipeEquipmentPayload {
  name: string;
  type: EquipmentType;
  hoursUsed: number;
  consumptionPerHour: number;
  utilityRate: number;
}

export async function listRecipes(productType?: ProductType) {
  const query = productType
    ? `?limit=200&productType=${productType}`
    : '?limit=200';
  const response = await api.get<{
    success: boolean;
    data: { items: RecipeListItem[] };
  }>(`/recipes${query}`);
  return response.data.data.items;
}

export async function getRecipe(id: string) {
  const response = await api.get<{ success: boolean; data: RecipeDetail }>(
    `/recipes/${id}`,
  );
  return response.data.data;
}

export async function createRecipe(payload: RecipePayload) {
  const response = await api.post<{ success: boolean; data: RecipeDetail }>(
    '/recipes',
    payload,
  );
  return response.data.data;
}

export async function updateRecipe(id: string, payload: RecipePayload) {
  const response = await api.put<{ success: boolean; data: RecipeDetail }>(
    `/recipes/${id}`,
    payload,
  );
  return response.data.data;
}

export async function archiveRecipe(id: string) {
  return api.delete(`/recipes/${id}`);
}

export async function createRecipeVersion(recipeId: string) {
  const response = await api.post<{
    success: boolean;
    data: RecipeVersionDetail;
  }>(`/recipes/${recipeId}/versions`);
  return response.data.data;
}

export async function submitRecipeVersion(recipeId: string, versionId: string) {
  const response = await api.post<{
    success: boolean;
    data: RecipeVersionDetail;
  }>(`/recipes/${recipeId}/versions/${versionId}/submit`);
  return response.data.data;
}

export async function approveRecipeVersion(
  recipeId: string,
  versionId: string,
) {
  const response = await api.post<{
    success: boolean;
    data: RecipeVersionDetail;
  }>(`/recipes/${recipeId}/versions/${versionId}/approve`);
  return response.data.data;
}

export async function recalculateRecipeVersion(
  recipeId: string,
  versionId: string,
) {
  const response = await api.post<{
    success: boolean;
    data: RecipeVersionDetail;
  }>(`/recipes/${recipeId}/versions/${versionId}/recalculate`);
  return response.data.data;
}

export async function getCostBreakdown(versionId: string) {
  const response = await api.get<{ success: boolean; data: CostBreakdownDto }>(
    `/costs/breakdown/${versionId}`,
  );
  return response.data.data;
}

export async function addRecipeIngredient(
  recipeId: string,
  versionId: string,
  payload: RecipeIngredientPayload,
) {
  const response = await api.post<{ success: boolean; data: unknown }>(
    `/recipes/${recipeId}/versions/${versionId}/ingredients`,
    payload,
  );
  return response.data.data;
}

export async function updateRecipeIngredient(
  recipeId: string,
  versionId: string,
  ingredientId: string,
  payload: RecipeIngredientPayload,
) {
  const response = await api.put<{ success: boolean; data: unknown }>(
    `/recipes/${recipeId}/versions/${versionId}/ingredients/${ingredientId}`,
    payload,
  );
  return response.data.data;
}

export async function deleteRecipeIngredient(
  recipeId: string,
  versionId: string,
  ingredientId: string,
) {
  return api.delete(
    `/recipes/${recipeId}/versions/${versionId}/ingredients/${ingredientId}`,
  );
}

export async function addRecipeStep(
  recipeId: string,
  versionId: string,
  payload: RecipeStepPayload,
) {
  const response = await api.post<{ success: boolean; data: unknown }>(
    `/recipes/${recipeId}/versions/${versionId}/steps`,
    payload,
  );
  return response.data.data;
}

export async function updateRecipeStep(
  recipeId: string,
  versionId: string,
  stepId: string,
  payload: RecipeStepPayload,
) {
  const response = await api.put<{ success: boolean; data: unknown }>(
    `/recipes/${recipeId}/versions/${versionId}/steps/${stepId}`,
    payload,
  );
  return response.data.data;
}

export async function deleteRecipeStep(
  recipeId: string,
  versionId: string,
  stepId: string,
) {
  return api.delete(
    `/recipes/${recipeId}/versions/${versionId}/steps/${stepId}`,
  );
}

export async function addRecipePackaging(
  recipeId: string,
  versionId: string,
  payload: RecipePackagingPayload,
) {
  const response = await api.post<{ success: boolean; data: unknown }>(
    `/recipes/${recipeId}/versions/${versionId}/packagings`,
    payload,
  );
  return response.data.data;
}

export async function updateRecipePackaging(
  recipeId: string,
  versionId: string,
  packagingId: string,
  payload: RecipePackagingPayload,
) {
  const response = await api.put<{ success: boolean; data: unknown }>(
    `/recipes/${recipeId}/versions/${versionId}/packagings/${packagingId}`,
    payload,
  );
  return response.data.data;
}

export async function deleteRecipePackaging(
  recipeId: string,
  versionId: string,
  packagingId: string,
) {
  return api.delete(
    `/recipes/${recipeId}/versions/${versionId}/packagings/${packagingId}`,
  );
}

export async function addRecipeLabor(
  recipeId: string,
  versionId: string,
  payload: RecipeLaborPayload,
) {
  const response = await api.post<{ success: boolean; data: unknown }>(
    `/recipes/${recipeId}/versions/${versionId}/labor`,
    payload,
  );
  return response.data.data;
}

export async function updateRecipeLabor(
  recipeId: string,
  versionId: string,
  laborId: string,
  payload: RecipeLaborPayload,
) {
  const response = await api.put<{ success: boolean; data: unknown }>(
    `/recipes/${recipeId}/versions/${versionId}/labor/${laborId}`,
    payload,
  );
  return response.data.data;
}

export async function deleteRecipeLabor(
  recipeId: string,
  versionId: string,
  laborId: string,
) {
  return api.delete(
    `/recipes/${recipeId}/versions/${versionId}/labor/${laborId}`,
  );
}

export async function addRecipeEquipment(
  recipeId: string,
  versionId: string,
  payload: RecipeEquipmentPayload,
) {
  const response = await api.post<{ success: boolean; data: unknown }>(
    `/recipes/${recipeId}/versions/${versionId}/equipment`,
    payload,
  );
  return response.data.data;
}

export async function updateRecipeEquipment(
  recipeId: string,
  versionId: string,
  equipmentId: string,
  payload: RecipeEquipmentPayload,
) {
  const response = await api.put<{ success: boolean; data: unknown }>(
    `/recipes/${recipeId}/versions/${versionId}/equipment/${equipmentId}`,
    payload,
  );
  return response.data.data;
}

export async function deleteRecipeEquipment(
  recipeId: string,
  versionId: string,
  equipmentId: string,
) {
  return api.delete(
    `/recipes/${recipeId}/versions/${versionId}/equipment/${equipmentId}`,
  );
}
