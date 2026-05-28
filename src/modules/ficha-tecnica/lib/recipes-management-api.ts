'use client';

import { api } from '../../../services/api';
import { v4 as uuidv4 } from 'uuid';
import type {
  CostBreakdownDto,
  EquipmentType,
  ProductType,
  RecipeStatus,
} from '../types/enums';

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
  finished_product_id?: string;
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
  finishedProductId?: string;
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

// Helpers do Evobit Adapter
let cachedProducts: any[] = [];
let cachedProductsMap = new Map<string, any>();

async function loadProductsCache() {
  if (cachedProducts.length === 0) {
    // Busca até 10000 produtos para garantir cache completo
    const res = await api.products.list({ limit: 10000, active_only: true });
    cachedProducts = res;
    cachedProductsMap = new Map(res.map(p => [p.id, p]));
  }
}

function calculateCost(ingredients: any[] = []) {
  let totalCost = 0;
  
  const mappedIngredients = ingredients.map((ing, index) => {
    const prod = cachedProductsMap.get(ing.input_product_id);
    let unitCost = 0;
    
    if (prod) {
      unitCost = Number(prod.average_cost) || Number(prod.cost_price) || Number(prod.price) || 0;
    }
    
    // Calcula o custo com perda
    const lossPercentage = Number(ing.loss_percentage) || 0;
    const qtyWithLoss = Number(ing.quantity) * (1 + (lossPercentage / 100));
    const ingCost = qtyWithLoss * unitCost;
    
    totalCost += ingCost;

    return {
      id: ing.id || uuidv4(),
      inventoryItemId: ing.input_product_id,
      quantity: Number(ing.quantity),
      uomId: ing.unit || 'UN',
      notes: lossPercentage > 0 ? `Perda: ${lossPercentage}%` : '',
      order: index + 1,
      inventoryItem: prod ? {
        id: prod.id,
        name: prod.name,
        uom: { abbreviation: prod.unit || 'UN' }
      } : null,
      uom: {
        id: ing.unit || 'UN',
        abbreviation: ing.unit || 'UN'
      }
    };
  });
  
  return { totalCost, mappedIngredients };
}

// =======================
// Exportações de Recipes
// =======================

export async function listProducts() {
  await loadProductsCache();
  return cachedProducts.map(p => ({ id: p.id, name: p.name }));
}

export async function listRecipes(productType?: ProductType): Promise<RecipeListItem[]> {
  if (!api.recipes) {
    console.error('api.recipes não encontrado. Certifique-se de usar a versão atualizada de src/services/api.js');
    return [];
  }
  
  await loadProductsCache();
  const recipes = await api.recipes.list();

  return recipes.map(recipe => {
    const { totalCost } = calculateCost(recipe.ingredients);
    const yq = Number(recipe.yield_quantity) || 1;
    const unitCost = yq > 0 ? totalCost / yq : totalCost;

    return {
      id: recipe.id,
      name: recipe.name || 'Sem nome',
      description: recipe.instructions,
      categoryId: null,
      productType: 'FINAL' as ProductType,
      isActive: recipe.is_active !== false,
      versions: [{
        id: recipe.id + '-v1',
        versionNumber: 1,
        status: 'APPROVED' as RecipeStatus,
        unitCost,
        totalCost,
        yieldQuantity: recipe.yield_quantity,
        _count: {
          ingredients: (recipe.ingredients || []).length,
          steps: recipe.instructions ? 1 : 0,
          packagings: 0,
          laborEntries: 0,
          equipmentEntries: 0
        }
      }]
    };
  });
}

export async function getRecipe(id: string): Promise<RecipeDetail> {
  await loadProductsCache();
  const recipe = await api.recipes.getById(id);
  
  if (!recipe) throw new Error('Receita não encontrada');

  const { totalCost, mappedIngredients } = calculateCost(recipe.ingredients);
  const yq = Number(recipe.yield_quantity) || 1;
  const unitCost = yq > 0 ? totalCost / yq : totalCost;

  const version: RecipeVersionDetail = {
    id: recipe.id + '-v1',
    versionNumber: 1,
    status: 'APPROVED' as RecipeStatus,
    yieldQuantity: recipe.yield_quantity || 1,
    yieldUomId: 'UN',
    totalCost,
    unitCost,
    yieldUom: { id: 'UN', name: 'Unidade', abbreviation: 'UN' },
    ingredients: mappedIngredients,
    steps: recipe.instructions ? [{
      id: uuidv4(),
      stepNumber: 1,
      description: recipe.instructions
    }] : [],
    packagings: [],
    laborEntries: [],
    equipmentEntries: []
  };

  return {
    id: recipe.id,
    finished_product_id: recipe.finished_product_id,
    name: recipe.name || 'Sem nome',
    description: recipe.instructions,
    productType: 'FINAL' as ProductType,
    isActive: recipe.is_active !== false,
    versions: [version]
  };
}

export async function createRecipe(payload: RecipePayload): Promise<RecipeDetail> {
  if (!payload.finishedProductId) {
    throw new Error('finishedProductId é obrigatório');
  }

  const recipe = await api.recipes.create({
    name: payload.name || 'Nova Ficha',
    finished_product_id: payload.finishedProductId,
    yield_quantity: payload.yieldQuantity,
    preparation_time_minutes: 0,
    instructions: payload.description || '',
    ingredients: []
  });

  return getRecipe(recipe.id);
}

export async function updateRecipe(id: string, payload: RecipePayload): Promise<RecipeDetail> {
  const current = await api.recipes.getById(id);
  
  // Extrai perda do notes
  const parsedIngredients = current?.ingredients || [];
  
  await api.recipes.update(id, {
    name: payload.name,
    finished_product_id: payload.finishedProductId || current.finished_product_id,
    yield_quantity: payload.yieldQuantity,
    instructions: payload.description || ''
  });

  return getRecipe(id);
}

export async function archiveRecipe(id: string) {
  return api.recipes.softDelete(id);
}

// =======================
// No-ops para Sub-Módulos
// =======================
export async function createRecipeVersion(recipeId: string) {
  return (await getRecipe(recipeId)).versions[0];
}
export async function submitRecipeVersion(recipeId: string, versionId: string) {
  return (await getRecipe(recipeId)).versions[0];
}
export async function approveRecipeVersion(recipeId: string, versionId: string) {
  return (await getRecipe(recipeId)).versions[0];
}
export async function recalculateRecipeVersion(recipeId: string, versionId: string) {
  return (await getRecipe(recipeId)).versions[0];
}
export async function getCostBreakdown(versionId: string) {
  return { materials: 0, labor: 0, equipment: 0, packaging: 0, overhead: 0, total: 0 };
}

// =======================
// Ingredientes
// =======================
export async function addRecipeIngredient(
  recipeId: string,
  versionId: string,
  payload: RecipeIngredientPayload,
) {
  const recipe = await api.recipes.getById(recipeId);
  if (!recipe) throw new Error('Receita não encontrada');

  const newIng = {
    id: uuidv4(),
    input_product_id: payload.inventoryItemId,
    quantity: payload.quantity,
    unit: payload.uomId,
    loss_percentage: 0,
    discount_from_stock: true
  };

  const updatedIngredients = [...(recipe.ingredients || []), newIng];
  await api.recipes.update(recipeId, { ingredients: updatedIngredients });
  return { success: true };
}

export async function updateRecipeIngredient(
  recipeId: string,
  versionId: string,
  ingredientId: string,
  payload: RecipeIngredientPayload,
) {
  const recipe = await api.recipes.getById(recipeId);
  if (!recipe) throw new Error('Receita não encontrada');

  const updatedIngredients = (recipe.ingredients || []).map(ing => {
    if (ing.id === ingredientId) {
      return {
        ...ing,
        quantity: payload.quantity,
        input_product_id: payload.inventoryItemId || ing.input_product_id,
        unit: payload.uomId || ing.unit
      };
    }
    return ing;
  });

  await api.recipes.update(recipeId, { ingredients: updatedIngredients });
  return { success: true };
}

export async function deleteRecipeIngredient(
  recipeId: string,
  versionId: string,
  ingredientId: string,
) {
  const recipe = await api.recipes.getById(recipeId);
  if (!recipe) throw new Error('Receita não encontrada');

  const updatedIngredients = (recipe.ingredients || []).filter(ing => ing.id !== ingredientId);
  await api.recipes.update(recipeId, { ingredients: updatedIngredients });
  return { success: true };
}

// =======================
// Passos / Instructions
// =======================
export async function addRecipeStep(
  recipeId: string,
  versionId: string,
  payload: RecipeStepPayload,
) {
  const recipe = await api.recipes.getById(recipeId);
  const instructions = recipe?.instructions || '';
  const newInstructions = instructions ? `${instructions}\n\nPasso: ${payload.description}` : payload.description;
  await api.recipes.update(recipeId, { instructions: newInstructions });
  return { success: true };
}

export async function updateRecipeStep(
  recipeId: string,
  versionId: string,
  stepId: string,
  payload: RecipeStepPayload,
) {
  return { success: true }; // No-op for now to avoid overwriting all instructions complexly
}

export async function deleteRecipeStep(
  recipeId: string,
  versionId: string,
  stepId: string,
) {
  return { success: true };
}

// =======================
// Mão de Obra/Embalagens/Equipamentos (Fase Futura)
// =======================
export async function addRecipePackaging() { throw new Error('Embalagens não suportadas na versão atual'); }
export async function updateRecipePackaging() { throw new Error('Embalagens não suportadas na versão atual'); }
export async function deleteRecipePackaging() { throw new Error('Embalagens não suportadas na versão atual'); }
export async function addRecipeLabor() { throw new Error('Mão de obra não suportada na versão atual'); }
export async function updateRecipeLabor() { throw new Error('Mão de obra não suportada na versão atual'); }
export async function deleteRecipeLabor() { throw new Error('Mão de obra não suportada na versão atual'); }
export async function addRecipeEquipment() { throw new Error('Equipamentos não suportados na versão atual'); }
export async function updateRecipeEquipment() { throw new Error('Equipamentos não suportados na versão atual'); }
export async function deleteRecipeEquipment() { throw new Error('Equipamentos não suportados na versão atual'); }
