'use client';

import { api } from '../../../services/api';
import { v4 as uuidv4 } from 'uuid';
import { calculateSuggestedPrice } from './pricing-calculator';
import type {
  CostBreakdownDto,
  EquipmentType,
  ProductType,
  RecipeStatus,
  WorkbookProductRowDto,
} from '../types/enums';

export interface RecipeListItem {
  id: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  productType: ProductType;
  isActive: boolean;
  finished_product_id?: string;
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
let cachedRecipes: any[] = [];
let cacheLoaded = false;

export function resetCache() {
  cachedProducts = [];
  cachedProductsMap.clear();
  cachedRecipes = [];
  cacheLoaded = false;
}

async function loadProductsCache() {
  if (!cacheLoaded) {
    // Busca até 10000 produtos para garantir cache completo
    const res = await api.products.list({ limit: 10000, active_only: true });
    const products = Array.isArray(res) ? res : (res.items || []);
    cachedProducts = products;
    cachedProductsMap = new Map(products.map(p => [p.id, p]));

    // Busca receitas reais do banco de dados local
    if (api.recipes) {
      const recRes = await api.recipes.list();
      cachedRecipes = Array.isArray(recRes) ? recRes : (recRes.items || []);
    } else {
      cachedRecipes = [];
    }

    cacheLoaded = true;
  }
}

function isPackaging(p: any) {
  if (!p) return false;
  const categoryName = typeof p.category === 'object' ? p.category?.name : p.category;
  const lowerCategory = String(categoryName || '').toLowerCase();
  return lowerCategory === 'embalagens' || lowerCategory === 'embalagem';
}

function getProductCost(productId: string, visited: Set<string> = new Set(), depth = 0): number {
  const prod = cachedProductsMap.get(productId);
  const fallbackCost = prod ? (Number(prod.average_cost) || Number(prod.cost_price) || Number(prod.price) || 0) : 0;

  if (!prod) return 0;

  // Enforce maximum 1 level of depth and loop detection using visited set
  if (prod.is_raw_material && depth < 1 && !visited.has(productId)) {
    const recipe = cachedRecipes.find(r => r.finished_product_id === productId);
    if (recipe) {
      const newVisited = new Set(visited);
      newVisited.add(productId);

      let totalRecipeCost = 0;
      const ingredients = recipe.ingredients || [];
      for (const ing of ingredients) {
        if (!ing.input_product_id) continue;
        const ingProdCost = getProductCost(ing.input_product_id, newVisited, depth + 1);
        const lossPercentage = Number(ing.loss_percentage) || 0;
        const qtyWithLoss = Number(ing.quantity) * (1 + (lossPercentage / 100));
        totalRecipeCost += qtyWithLoss * ingProdCost;
      }

      const yieldQuantity = Number(recipe.yield_quantity) || 1;
      const calculatedUnitCost = yieldQuantity > 0 ? totalRecipeCost / yieldQuantity : 0;

      if (calculatedUnitCost > 0) {
        return calculatedUnitCost;
      }
    }
  }

  return fallbackCost;
}

function calculateCost(ingredients: any[] = []) {
  let totalCost = 0;
  
  const mappedIngredients = ingredients.map((ing, index) => {
    const prod = cachedProductsMap.get(ing.input_product_id);
    let unitCost = 0;
    
    if (prod) {
      unitCost = getProductCost(prod.id);
    }
    
    // Calcula o custo com perda
    const lossPercentage = Number(ing.loss_percentage) || 0;
    const qtyWithLoss = Number(ing.quantity) * (1 + (lossPercentage / 100));
    const ingCost = qtyWithLoss * unitCost;
    
    totalCost += ingCost;

    // Vincula a sub-receita se houver uma vinculada ao produto
    const linkedRecipe = cachedRecipes.find(r => r.finished_product_id === ing.input_product_id);

    return {
      id: ing.id || uuidv4(),
      inventoryItemId: ing.input_product_id,
      subRecipeId: linkedRecipe ? linkedRecipe.id : undefined,
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
  const response = await api.recipes.list();
  const recipes = Array.isArray(response) ? response : (response.items || []);

  const mapped = recipes.map(recipe => {
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
      finished_product_id: recipe.finished_product_id,
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

  if (productType) {
    if (productType === 'SUB_RECEITA') {
      return mapped.filter(r => {
        const prod = cachedProductsMap.get(r.finished_product_id);
        return prod?.is_raw_material === true;
      });
    } else if (productType === 'FINAL') {
      return mapped.filter(r => {
        const prod = cachedProductsMap.get(r.finished_product_id);
        return !prod || prod.is_raw_material !== true;
      });
    }
  }

  return mapped;
}

export async function loadTechnicalSheetProducts() {
  await loadProductsCache();

  const products = cachedProducts;
  const recipes = cachedRecipes;

  const recipeProductIds = new Set(recipes.map(r => r.finished_product_id).filter(Boolean));

  const simpleInputs = products.filter(p =>
    p.is_raw_material === true &&
    !recipeProductIds.has(p.id) &&
    !isPackaging(p)
  ).map(p => {
    const cost = getProductCost(p.id);
    return {
      ...p,
      cost_price: cost,
      average_cost: cost
    };
  });

  const compoundInputs = products.filter(p =>
    p.is_raw_material === true &&
    recipeProductIds.has(p.id)
  ).map(p => {
    const cost = getProductCost(p.id);
    return {
      ...p,
      cost_price: cost,
      average_cost: cost
    };
  });

  const packagingItems = products.filter(p => isPackaging(p)).map(p => {
    const cost = getProductCost(p.id);
    return {
      ...p,
      cost_price: cost,
      average_cost: cost
    };
  });

  const finalProducts = products.filter(p =>
    p.is_active !== false &&
    !p.deleted_at
  );

  const recipesByFinishedProductId = new Map<string, any>();
  recipes.forEach(r => {
    if (r.finished_product_id) {
      recipesByFinishedProductId.set(r.finished_product_id, r);
    }
  });

  return {
    simpleInputs,
    compoundInputs,
    packagingItems,
    finalProducts,
    recipesByFinishedProductId
  };
}

export async function getRecipe(id: string): Promise<RecipeDetail> {
  await loadProductsCache();
  const recipe = await api.recipes.getById(id);
  
  if (!recipe) throw new Error('Receita não encontrada');

  const { totalCost: ingredientsCost, mappedIngredients } = calculateCost(recipe.ingredients);
  const entryCosts = computeEntryCosts(recipe);
  const totalCost = ingredientsCost + entryCosts.extras;
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
    packagings: (recipe.packaging_entries || []).map((e: any) => ({
      id: e.id,
      name: e.name || '',
      quantity: Number(e.quantity) || 0,
      unitCost: Number(e.unit_cost) || 0,
    })),
    laborEntries: (recipe.labor_entries || []).map((e: any) => ({
      id: e.id,
      role: e.role || '',
      minutes: Number(e.minutes) || 0,
      monthlySalary: Number(e.monthly_salary) || 0,
      monthlyHours: Number(e.monthly_hours) || 0,
    })),
    equipmentEntries: (recipe.equipment_entries || []).map((e: any) => ({
      id: e.id,
      name: e.name || '',
      type: (e.type || 'ELECTRIC') as EquipmentType,
      hoursUsed: Number(e.hours_used) || 0,
      consumptionPerHour: Number(e.consumption_per_hour) || 0,
      utilityRate: Number(e.utility_rate) || 0,
    })),
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
  let finishedProductId = payload.finishedProductId;

  // Catalogo unificado: sem produto vinculado, cria o produto automaticamente
  // a partir do nome da ficha. Ficha final -> produto final; SUB_RECEITA
  // (insumo composto) -> is_raw_material TRUE, senao a listagem de compostos
  // (que filtra por is_raw_material) nunca mostra o que foi criado.
  if (!finishedProductId) {
    const isCompound = payload.productType === 'SUB_RECEITA';
    const productName = (payload.name || 'Nova Ficha').trim();

    // Reusa produto existente com o mesmo nome: o Supabase tem
    // unique(user_id, name) em products — criar duplicata local faz o push
    // falhar pra sempre (duplicate key) e a receita quebrar na nuvem (FK).
    await loadProductsCache();
    const existing = cachedProducts.find(
      (p: any) => !p.deleted_at && String(p.name || '').trim().toLowerCase() === productName.toLowerCase()
    );

    if (existing) {
      finishedProductId = existing.id;
      if (isCompound && existing.is_raw_material !== true) {
        await api.products.update(existing.id, { is_raw_material: true });
      }
    } else {
      let categoryName = '';
      if (payload.categoryId) {
        const catRes = await api.categories.list();
        const cats = Array.isArray(catRes) ? catRes : (catRes.items || []);
        categoryName = cats.find((c: any) => c.id === payload.categoryId)?.name || '';
      }
      const product = await api.products.create({
        name: productName,
        category: categoryName,
        unit: 'UN',
        is_raw_material: isCompound,
      });
      finishedProductId = product.id;
    }
  }

  const recipe = await api.recipes.create({
    name: payload.name || 'Nova Ficha',
    finished_product_id: finishedProductId,
    yield_quantity: payload.yieldQuantity,
    preparation_time_minutes: 0,
    instructions: payload.description || '',
    ingredients: []
  });

  resetCache();
  return getRecipe(recipe.id);
}

export async function updateRecipe(id: string, payload: RecipePayload): Promise<RecipeDetail> {
  const current = await api.recipes.getById(id);
  
  await api.recipes.update(id, {
    name: payload.name,
    finished_product_id: payload.finishedProductId || current.finished_product_id,
    yield_quantity: payload.yieldQuantity,
    instructions: payload.description || ''
  });

  resetCache();
  return getRecipe(id);
}

export async function archiveRecipe(id: string) {
  const res = await api.recipes.softDelete(id);
  resetCache();
  return res;
}

// =======================
// No-ops para Sub-Módulos
// =======================
export async function createRecipeVersion(recipeId: string) {
  return (await getRecipe(recipeId)).versions[0];
}
export async function submitRecipeVersion(recipeId: string, _versionId: string) {
  return (await getRecipe(recipeId)).versions[0];
}
export async function approveRecipeVersion(recipeId: string, _versionId: string) {
  return (await getRecipe(recipeId)).versions[0];
}
export async function recalculateRecipeVersion(recipeId: string, _versionId: string) {
  return (await getRecipe(recipeId)).versions[0];
}
export async function getCostBreakdown(versionId: string): Promise<CostBreakdownDto> {
  // versionId tem o formato `${recipeId}-v1` (ver listWorkbookProducts/getRecipe).
  const recipeId = String(versionId || '').replace(/-v\d+$/, '');
  await loadProductsCache();
  const recipe = await api.recipes.getById(recipeId);

  const ingredients = (recipe?.ingredients || []).map((ing: any) => {
    const prod = cachedProductsMap.get(ing.input_product_id);
    const unitPrice = prod ? getProductCost(prod.id) : 0;
    const lossPercentage = Number(ing.loss_percentage) || 0;
    const qtyWithLoss = Number(ing.quantity) * (1 + lossPercentage / 100);
    return {
      itemId: ing.input_product_id,
      name: prod?.name || 'Ingrediente',
      quantity: Number(ing.quantity),
      uom: ing.unit || prod?.unit || 'UN',
      unitPrice,
      lineCost: qtyWithLoss * unitPrice,
      missingPrice: unitPrice <= 0,
    };
  });

  const totalIngredientsCost = ingredients.reduce((sum: number, i: any) => sum + i.lineCost, 0);
  const yieldQuantity = Number(recipe?.yield_quantity) || 1;

  const packaging = (recipe?.packaging_entries || []).map((e: any) => ({
    itemId: e.id,
    name: e.name || 'Embalagem',
    quantity: Number(e.quantity) || 0,
    unitPrice: Number(e.unit_cost) || 0,
    lineCost: (Number(e.quantity) || 0) * (Number(e.unit_cost) || 0),
  }));
  const labor = (recipe?.labor_entries || []).map((e: any) => {
    const monthlyMinutes = (Number(e.monthly_hours) || 0) * 60;
    const costPerMinute = monthlyMinutes > 0 ? (Number(e.monthly_salary) || 0) / monthlyMinutes : 0;
    return {
      employeeId: e.id,
      role: e.role || 'Funcionário',
      minutes: Number(e.minutes) || 0,
      costPerMinute,
      lineCost: (Number(e.minutes) || 0) * costPerMinute,
    };
  });
  const equipment = (recipe?.equipment_entries || []).map((e: any) => ({
    equipmentId: e.id,
    name: e.name || 'Equipamento',
    hoursUsed: Number(e.hours_used) || 0,
    lineCost: (Number(e.hours_used) || 0) * (Number(e.consumption_per_hour) || 0) * (Number(e.utility_rate) || 0),
  }));

  const totalPackagingCost = packaging.reduce((sum: number, i: any) => sum + i.lineCost, 0);
  const totalLaborCost = labor.reduce((sum: number, i: any) => sum + i.lineCost, 0);
  const totalEquipmentCost = equipment.reduce((sum: number, i: any) => sum + i.lineCost, 0);
  const totalBatchCost = totalIngredientsCost + totalPackagingCost + totalLaborCost + totalEquipmentCost;

  return {
    recipeId,
    recipeVersionId: versionId,
    yieldQuantity,
    ingredients,
    packaging,
    labor,
    equipment,
    totalIngredientsCost,
    totalPackagingCost,
    totalLaborCost,
    totalEquipmentCost,
    totalBatchCost,
    unitCost: yieldQuantity > 0 ? totalBatchCost / yieldQuantity : totalBatchCost,
    currency: 'BRL',
  } as CostBreakdownDto;
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

  let inputProductId = payload.inventoryItemId;
  if (payload.subRecipeId) {
    const subRecipe = await api.recipes.getById(payload.subRecipeId);
    if (subRecipe && subRecipe.finished_product_id) {
      inputProductId = subRecipe.finished_product_id;
    }
  }

  if (!inputProductId) {
    throw new Error('Produto do ingrediente não especificado.');
  }

  const newIng = {
    id: uuidv4(),
    input_product_id: inputProductId,
    quantity: payload.quantity,
    unit: payload.uomId,
    loss_percentage: 0,
    discount_from_stock: true
  };

  const updatedIngredients = [...(recipe.ingredients || []), newIng];
  await api.recipes.update(recipeId, { ingredients: updatedIngredients });
  resetCache();
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

  let inputProductId = payload.inventoryItemId;
  if (payload.subRecipeId) {
    const subRecipe = await api.recipes.getById(payload.subRecipeId);
    if (subRecipe && subRecipe.finished_product_id) {
      inputProductId = subRecipe.finished_product_id;
    }
  }

  const updatedIngredients = (recipe.ingredients || []).map(ing => {
    if (ing.id === ingredientId) {
      return {
        ...ing,
        quantity: payload.quantity,
        input_product_id: inputProductId || ing.input_product_id,
        unit: payload.uomId || ing.unit
      };
    }
    return ing;
  });

  await api.recipes.update(recipeId, { ingredients: updatedIngredients });
  resetCache();
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
  resetCache();
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
  resetCache();
  return { success: true };
}

export async function updateRecipeStep(
  _recipeId: string,
  _versionId: string,
  _stepId: string,
  _payload: RecipeStepPayload,
) {
  resetCache();
  return { success: true };
}

export async function deleteRecipeStep(
  _recipeId: string,
  _versionId: string,
  _stepId: string,
) {
  resetCache();
  return { success: true };
}

// =======================
// Mão de Obra / Embalagens / Equipamentos (custos do lote, arrays no doc da receita)
// =======================
type RecipeEntryField = 'packaging_entries' | 'labor_entries' | 'equipment_entries';

async function mutateRecipeEntries(
  recipeId: string,
  field: RecipeEntryField,
  mutate: (entries: any[]) => any[],
) {
  const recipe = await api.recipes.getById(recipeId);
  if (!recipe) throw new Error('Receita não encontrada');
  const next = mutate([...(recipe[field] || [])]);
  await api.recipes.update(recipeId, { [field]: next });
  resetCache();
  return { success: true };
}

const packagingEntry = (p: RecipePackagingPayload) => ({
  name: p.name,
  quantity: Number(p.quantity) || 0,
  unit_cost: Number(p.unitCost) || 0,
});
const laborEntry = (p: RecipeLaborPayload) => ({
  role: p.role,
  minutes: Number(p.minutes) || 0,
  monthly_salary: Number(p.monthlySalary) || 0,
  monthly_hours: Number(p.monthlyHours) || 0,
});
const equipmentEntry = (p: RecipeEquipmentPayload) => ({
  name: p.name,
  type: p.type,
  hours_used: Number(p.hoursUsed) || 0,
  consumption_per_hour: Number(p.consumptionPerHour) || 0,
  utility_rate: Number(p.utilityRate) || 0,
});

export async function addRecipePackaging(recipeId: string, _versionId: string, payload: RecipePackagingPayload) {
  return mutateRecipeEntries(recipeId, 'packaging_entries', (entries) => [...entries, { id: uuidv4(), ...packagingEntry(payload) }]);
}
export async function updateRecipePackaging(recipeId: string, _versionId: string, entryId: string, payload: RecipePackagingPayload) {
  return mutateRecipeEntries(recipeId, 'packaging_entries', (entries) =>
    entries.map((e) => (e.id === entryId ? { ...e, ...packagingEntry(payload) } : e)));
}
export async function deleteRecipePackaging(recipeId: string, _versionId: string, entryId: string) {
  return mutateRecipeEntries(recipeId, 'packaging_entries', (entries) => entries.filter((e) => e.id !== entryId));
}
export async function addRecipeLabor(recipeId: string, _versionId: string, payload: RecipeLaborPayload) {
  return mutateRecipeEntries(recipeId, 'labor_entries', (entries) => [...entries, { id: uuidv4(), ...laborEntry(payload) }]);
}
export async function updateRecipeLabor(recipeId: string, _versionId: string, entryId: string, payload: RecipeLaborPayload) {
  return mutateRecipeEntries(recipeId, 'labor_entries', (entries) =>
    entries.map((e) => (e.id === entryId ? { ...e, ...laborEntry(payload) } : e)));
}
export async function deleteRecipeLabor(recipeId: string, _versionId: string, entryId: string) {
  return mutateRecipeEntries(recipeId, 'labor_entries', (entries) => entries.filter((e) => e.id !== entryId));
}
export async function addRecipeEquipment(recipeId: string, _versionId: string, payload: RecipeEquipmentPayload) {
  return mutateRecipeEntries(recipeId, 'equipment_entries', (entries) => [...entries, { id: uuidv4(), ...equipmentEntry(payload) }]);
}
export async function updateRecipeEquipment(recipeId: string, _versionId: string, entryId: string, payload: RecipeEquipmentPayload) {
  return mutateRecipeEntries(recipeId, 'equipment_entries', (entries) =>
    entries.map((e) => (e.id === entryId ? { ...e, ...equipmentEntry(payload) } : e)));
}
export async function deleteRecipeEquipment(recipeId: string, _versionId: string, entryId: string) {
  return mutateRecipeEntries(recipeId, 'equipment_entries', (entries) => entries.filter((e) => e.id !== entryId));
}

/**
 * Custos adicionais do lote a partir dos arrays da receita:
 * embalagens (qtd*custo), mão de obra (min * salário/(horas*60)) e
 * equipamentos (horas * consumo/h * tarifa).
 */
function computeEntryCosts(recipe: any) {
  const packaging = (recipe?.packaging_entries || []).reduce(
    (sum: number, e: any) => sum + (Number(e.quantity) || 0) * (Number(e.unit_cost) || 0), 0);
  const labor = (recipe?.labor_entries || []).reduce((sum: number, e: any) => {
    const monthlyMinutes = (Number(e.monthly_hours) || 0) * 60;
    const perMinute = monthlyMinutes > 0 ? (Number(e.monthly_salary) || 0) / monthlyMinutes : 0;
    return sum + (Number(e.minutes) || 0) * perMinute;
  }, 0);
  const equipment = (recipe?.equipment_entries || []).reduce(
    (sum: number, e: any) =>
      sum + (Number(e.hours_used) || 0) * (Number(e.consumption_per_hour) || 0) * (Number(e.utility_rate) || 0), 0);
  return { packaging, labor, equipment, extras: packaging + labor + equipment };
}

// =======================
// Precificação: produtos reais (receitas) para o workbook
// =======================
export interface WorkbookProductsProfile {
  targetMarginPercent?: number;
  cardFeePercent?: number;
  deliveryFeePercent?: number;
  commissionPercent?: number;
  taxPercent?: number;
  operationalCostPercent?: number;
}

/**
 * Monta a lista de produtos a precificar (data.products) a partir das receitas
 * reais: custo unitário via calculateCost, preço sugerido via pricing-calculator
 * e preço de venda atual lido do produto vinculado.
 */
export async function listWorkbookProducts(
  profile: WorkbookProductsProfile = {},
): Promise<WorkbookProductRowDto[]> {
  if (!api.recipes) return [];
  await loadProductsCache();

  const response = await api.recipes.list();
  const recipes = Array.isArray(response) ? response : (response.items || []);

  const margin = Number(profile.targetMarginPercent ?? 25);
  const cardFee = Number(profile.cardFeePercent ?? 0);
  const deliveryFee = Number(profile.deliveryFeePercent ?? 0);
  const commission = Number(profile.commissionPercent ?? 0);
  const tax = Number(profile.taxPercent ?? 0);
  const operational = Number(profile.operationalCostPercent ?? 0);
  const totalFeesFraction = (cardFee + deliveryFee + commission + tax + operational) / 100;

  return recipes.map((recipe, index): WorkbookProductRowDto => {
    const { totalCost: ingredientsBatchCost } = calculateCost(recipe.ingredients);
    const entryCosts = computeEntryCosts(recipe);
    const yieldQuantity = Number(recipe.yield_quantity) || 1;
    const perUnit = (batchValue: number) => (yieldQuantity > 0 ? batchValue / yieldQuantity : batchValue);
    const ingredientUnitCost = perUnit(ingredientsBatchCost);
    const laborUnitCost = perUnit(entryCosts.labor);
    const packagingUnitCost = perUnit(entryCosts.packaging);
    const equipmentUnitCost = perUnit(entryCosts.equipment);
    const unitCost = ingredientUnitCost + laborUnitCost + packagingUnitCost + equipmentUnitCost;

    const product = cachedProductsMap.get(recipe.finished_product_id);
    const salePrice = product ? Number(product.price || 0) : 0;
    const unit = product?.unit || 'un';

    const suggested = calculateSuggestedPrice({
      unitCost,
      targetMarginPercent: margin,
      cardFeePercent: cardFee,
      deliveryFeePercent: deliveryFee,
      commissionPercent: commission,
      taxPercent: tax,
      operationalCostPercent: operational,
      percentageMode: 'percent',
    });

    const marginPercent = salePrice > 0 ? (1 - totalFeesFraction - unitCost / salePrice) * 100 : null;
    const cmvPercent = salePrice > 0 ? (unitCost / salePrice) * 100 : null;
    const contributionMargin = salePrice > 0 ? salePrice - unitCost - salePrice * totalFeesFraction : null;

    return {
      code: (product?.sku && String(product.sku).trim()) || `P${String(index + 1).padStart(2, '0')}`,
      recipeId: recipe.id,
      recipeName: recipe.name || 'Sem nome',
      // Mesma convencao do getRecipes: produto is_raw_material = insumo composto
      // (SUB_RECEITA). A Precificacao filtra FINAL, entao compostos ficam fora.
      productType: product?.is_raw_material === true ? 'SUB_RECEITA' : 'FINAL',
      recipeVersionId: `${recipe.id}-v1`,
      versionNumber: 1,
      versionStatus: salePrice > 0 ? 'APPROVED' : 'DRAFT',
      yieldQuantity,
      yieldUnit: unit,
      servingSize: null,
      pricingUnit: unit,
      pricingUnitFactor: 1,
      laborCost: laborUnitCost,
      ingredientCost: ingredientUnitCost,
      packagingCost: packagingUnitCost,
      equipmentCost: equipmentUnitCost,
      cardFee,
      deliveryCost: deliveryFee,
      taxCost: tax,
      operationalCost: operational,
      totalCost: unitCost,
      suggestedPrice: suggested.isViable ? suggested.suggestedPrice : null,
      salePrice: salePrice > 0 ? salePrice : null,
      contributionMargin,
      marginPercent,
      cmvPercent,
      updatedAt: product?.updated_at || new Date().toISOString(),
    };
  });
}
