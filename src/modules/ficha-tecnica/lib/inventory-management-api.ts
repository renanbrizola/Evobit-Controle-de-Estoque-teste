'use client';

import { ItemType, StockMovementType } from '../types/enums';
import type { WorkbookInputRowDto } from '../types/enums';
import { api as realApi } from '../../../services/api';

export interface InventoryFormPayload {
  name: string;
  type: string;
  uomId: string;
  categoryId?: string;
  code?: string;
  description?: string;
  yieldFactor?: number;
  correctionFactor?: number;
  minStock?: number;
  currentStock?: number;
}

export interface SupplierPricingPayload {
  supplierId: string;
  unitPrice: number;
  currency?: string;
}

export interface InventoryOption {
  id: string;
  name: string;
}

export type InventorySupplierOption = InventoryOption;

export interface InventoryUomOption extends InventoryOption {
  abbreviation: string;
  type: string;
  conversionFactor: number;
}

export type InventoryCategoryOption = InventoryOption;

export interface InventorySupplierPayload {
  name: string;
  tradeName?: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  leadTimeDays?: number;
  notes?: string;
}

export interface InventoryCategoryPayload {
  name: string;
  description?: string;
  parentId?: string;
}

export interface StockMovementPayload {
  itemId: string;
  type: StockMovementType;
  quantity: number;
  unitCost?: number;
  notes?: string;
  reference?: string;
}

export interface InventoryMovementRow {
  id: string;
  type: string;
  quantity: number;
  unitCost?: number | null;
  notes?: string | null;
  reference?: string | null;
  movedAt: string;
  createdAt: string;
}

export interface InventoryItemDetail {
  id: string;
  name: string;
  code?: string | null;
  type: string;
  currentStock: number;
  minStock?: number | null;
  description?: string | null;
  yieldFactor?: number | null;
  correctionFactor?: number | null;
  category?: { id: string; name: string } | null;
  uom: { id: string; name: string; abbreviation: string };
  supplierPricings: Array<{
    id: string;
    unitPrice: number;
    validFrom: string;
    supplier: { id: string; name: string };
  }>;
  stockMovements: InventoryMovementRow[];
}

export interface InventoryCatalogItem {
  id: string;
  name: string;
  code?: string | null;
  /** Id da receita vinculada quando o item é um composto (sub-receita). */
  recipeId?: string | null;
  type: string;
  uom: {
    id: string;
    name: string;
    abbreviation: string;
  };
  category?: {
    id: string;
    name: string;
  } | null;
}

// ===========================================================================
// Helpers — o adaptador da ficha técnica fala direto com a API real do Evobit
// (RxDB). Não há mais cliente HTTP/stub: produtos, categorias, fornecedores e
// movimentações vêm de `services/api`.
// ===========================================================================

function toArray<T = unknown>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const items = (res as { items?: T[] } | null)?.items;
  return Array.isArray(items) ? items : [];
}

function isPackaging(p: any): boolean {
  if (!p) return false;
  const categoryName = typeof p.category === 'object' ? p.category?.name : p.category;
  const lower = String(categoryName || '').toLowerCase();
  return lower === 'embalagens' || lower === 'embalagem';
}

function productUnitPrice(p: any): number {
  return Number(p.cost_price) || Number(p.average_cost) || Number(p.price) || 0;
}

async function fetchCategories(): Promise<InventoryCategoryOption[]> {
  const docs = toArray<any>(await realApi.categories.list());
  return docs.map((d) => ({ id: d.id, name: d.name }));
}

async function resolveCategoryNameById(categoryId?: string): Promise<string> {
  if (!categoryId) return '';
  const categories = await fetchCategories();
  const match = categories.find((c) => c.id === categoryId);
  return match ? match.name : '';
}

export async function listUoms() {
  return [
    { id: 'UN', name: 'Unidade', abbreviation: 'UN', type: 'COUNT', conversionFactor: 1 },
    { id: 'KG', name: 'Quilograma', abbreviation: 'KG', type: 'WEIGHT', conversionFactor: 1 },
    { id: 'G', name: 'Grama', abbreviation: 'G', type: 'WEIGHT', conversionFactor: 0.001 },
    { id: 'L', name: 'Litro', abbreviation: 'L', type: 'VOLUME', conversionFactor: 1 },
    { id: 'ML', name: 'Mililitro', abbreviation: 'ML', type: 'VOLUME', conversionFactor: 0.001 }
  ];
}

export async function listCategories() {
  return fetchCategories();
}

export async function listSuppliers() {
  const docs = toArray<any>(await realApi.providers.list());
  return docs.map((d) => ({ id: d.id, name: d.name || d.trade_name || 'Fornecedor sem nome' }));
}

export async function createSupplier(payload: InventorySupplierPayload) {
  const created = await realApi.providers.create({
    name: payload.name,
    trade_name: payload.tradeName || '',
    cnpj: payload.cnpj || '',
    email: payload.email || '',
    phone: payload.phone || '',
    delivery_time: payload.leadTimeDays != null ? String(payload.leadTimeDays) : '',
  });
  return { id: created.id, name: created.name };
}

export async function searchInventoryItems(search: string, limit = 20): Promise<InventoryCatalogItem[]> {
  try {
    const products = toArray<any>(await realApi.products.list({ limit: 1000 }));

    let recipes: any[] = [];
    if (realApi.recipes) {
      recipes = toArray<any>(await realApi.recipes.list());
    }

    const recipeProductIds = new Set(recipes.map((r) => r.finished_product_id).filter(Boolean));
    const recipesByFinishedProductId = new Map<string, any>();
    recipes.forEach((r) => {
      if (r.finished_product_id) {
        recipesByFinishedProductId.set(r.finished_product_id, r);
      }
    });

    const rawMaterialsAndPackaging = products.filter(
      (p) => Boolean(p.is_raw_material) || isPackaging(p)
    );

    const searchTerm = search.trim().toLowerCase();
    const filtered = rawMaterialsAndPackaging.filter((p) => {
      if (!searchTerm) return true;
      return p.name?.toLowerCase().includes(searchTerm);
    });

    const mapped: InventoryCatalogItem[] = filtered.slice(0, limit).map((p) => {
      const hasRecipe = recipeProductIds.has(p.id);
      const recipe = recipesByFinishedProductId.get(p.id);

      let itemType = ItemType.INSUMO;
      if (isPackaging(p)) {
        itemType = ItemType.EMBALAGEM;
      } else if (hasRecipe) {
        itemType = ItemType.COMPOSITE;
      }

      return {
        id: p.id,
        name: p.name || 'Sem nome',
        code: p.barcode || null,
        recipeId: hasRecipe && recipe ? recipe.id : null,
        type: itemType,
        uom: {
          id: p.unit || 'UN',
          name: p.unit || 'Unidade',
          abbreviation: p.unit || 'UN',
        },
        category: p.category ? {
          id: typeof p.category === 'object' ? p.category.id : p.category,
          name: typeof p.category === 'object' ? p.category.name : p.category,
        } : null,
      };
    });

    return mapped;
  } catch (err) {
    console.error('Error in searchInventoryItems:', err);
    return [];
  }
}

export async function listInventoryItems(): Promise<InventoryCatalogItem[]> {
  return searchInventoryItems('', 200);
}

/**
 * Lista os insumos (matérias-primas + embalagens) reais no formato esperado
 * pelo workbook da ficha técnica (preço, estoque e fornecedor inclusos).
 */
export async function listWorkbookInputs(): Promise<WorkbookInputRowDto[]> {
  const [products, providers] = await Promise.all([
    realApi.products.list({ limit: 5000 }).then(toArray<any>),
    realApi.providers.list().then(toArray<any>),
  ]);

  const providerNameById = new Map<string, string>(
    providers.map((p) => [p.id, p.name || p.trade_name || '']),
  );

  let recipes: any[] = [];
  if (realApi.recipes) {
    recipes = toArray<any>(await realApi.recipes.list());
  }
  const recipesByFinishedProductId = new Map<string, any>();
  recipes.forEach((r) => {
    if (r.finished_product_id) recipesByFinishedProductId.set(r.finished_product_id, r);
  });

  const insumos = products.filter((p) => Boolean(p.is_raw_material) || isPackaging(p));

  // Código exibido: código de barras cadastrado ou sequencial (0001, 0002...)
  // estável pela ordem de criação. O vínculo com sub-receita vai em recipeId.
  const byCreation = [...insumos].sort(
    (a, b) =>
      String(a.created_at || '').localeCompare(String(b.created_at || '')) ||
      String(a.name || '').localeCompare(String(b.name || '')),
  );
  const sequentialCodeById = new Map<string, string>(
    byCreation.map((p, index) => [p.id, String(index + 1).padStart(4, '0')]),
  );

  return insumos.map((p): WorkbookInputRowDto => {
    const recipe = recipesByFinishedProductId.get(p.id);
    const hasRecipe = Boolean(recipe);

    let type: ItemType = ItemType.INSUMO;
    if (isPackaging(p)) type = ItemType.EMBALAGEM;
    else if (hasRecipe) type = ItemType.COMPOSITE;

    const stock = Number(p.current_stock || 0);
    const categoryName = typeof p.category === 'object' ? p.category?.name : p.category;

    return {
      id: p.id,
      code: p.barcode || sequentialCodeById.get(p.id) || '',
      recipeId: hasRecipe ? recipe.id : null,
      name: p.name || 'Sem nome',
      type,
      grossQuantity: stock,
      netQuantity: stock,
      unit: p.unit || 'UN',
      price: productUnitPrice(p),
      factor: 1,
      supplier: p.provider_id ? (providerNameById.get(p.provider_id) || null) : null,
      purchaseDate: null,
      categoryName: categoryName || null,
    };
  });
}

export async function getInventoryItemDetail(id: string): Promise<InventoryItemDetail> {
  const [products, categories, providers] = await Promise.all([
    realApi.products.list({ limit: 5000 }).then(toArray<any>),
    fetchCategories(),
    realApi.providers.list().then(toArray<any>),
  ]);

  const p = products.find((x) => x.id === id);

  if (!p) {
    return {
      id,
      code: id.substring(0, 8),
      name: 'Insumo não encontrado',
      type: ItemType.INSUMO,
      currentStock: 0,
      minStock: 0,
      description: null,
      yieldFactor: 1,
      correctionFactor: 1,
      category: null,
      uom: { id: 'UN', name: 'Unidade', abbreviation: 'UN' },
      supplierPricings: [],
      stockMovements: [],
    };
  }

  const provider = p.provider_id ? providers.find((x) => x.id === p.provider_id) : null;
  const categoryMatch = p.category ? categories.find((c) => c.name === p.category) : null;
  const price = productUnitPrice(p);

  const supplierPricings = price > 0
    ? [{
        id: `${p.id}-price`,
        unitPrice: price,
        validFrom: p.updated_at || new Date().toISOString(),
        supplier: { id: provider?.id || '', name: provider?.name || 'Fornecedor não informado' },
      }]
    : [];

  const stockMovements = await listInventoryMovements(id, 50);

  return {
    id: p.id,
    code: p.barcode || '',
    name: p.name,
    type: isPackaging(p) ? ItemType.EMBALAGEM : ItemType.INSUMO,
    currentStock: Number(p.current_stock || 0),
    minStock: Number(p.min_stock || 0),
    description: p.description || null,
    yieldFactor: 1,
    correctionFactor: 1,
    category: categoryMatch
      ? { id: categoryMatch.id, name: categoryMatch.name }
      : (p.category ? { id: p.category, name: p.category } : null),
    uom: { id: p.unit || 'UN', name: p.unit || 'Unidade', abbreviation: p.unit || 'UN' },
    supplierPricings,
    stockMovements,
  };
}

export async function listInventoryMovements(id: string, limit = 20): Promise<InventoryMovementRow[]> {
  const all = toArray<any>(await realApi.movements.list());

  return all
    .filter((m) => m.product_id === id)
    .map((m): InventoryMovementRow => {
      const raw = m.rawType || m.type;
      let uiType = 'AJUSTE';
      if (raw === 'IN' || raw === 'Entrada') uiType = 'ENTRADA';
      else if (raw === 'OUT' || raw === 'Saída') uiType = 'SAIDA';

      return {
        id: m.id,
        type: uiType,
        quantity: Number(m.quantity || m.qty || 0),
        unitCost: m.cost_unit != null ? Number(m.cost_unit) : null,
        notes: m.obs || null,
        reference: m.reason || null,
        movedAt: m.date || m.updated_at || '',
        createdAt: m.date || m.updated_at || '',
      };
    })
    .slice(0, limit);
}

export async function createInventoryItem(payload: InventoryFormPayload) {
  const categoryName = await resolveCategoryNameById(payload.categoryId);
  const created = await realApi.products.create({
    name: payload.name,
    unit: payload.uomId,
    category: categoryName,
    barcode: payload.code || '',
    description: payload.description || '',
    min_stock: Number(payload.minStock || 0),
    current_stock: Number(payload.currentStock || 0),
    is_raw_material: true,
  });
  return { id: created.id };
}

export async function createCategory(payload: InventoryCategoryPayload) {
  const created = await realApi.categories.create(payload.name);
  return { id: created.id, name: created.name };
}

export async function updateInventoryItem(id: string, payload: InventoryFormPayload) {
  const categoryName = await resolveCategoryNameById(payload.categoryId);
  return realApi.products.update(id, {
    name: payload.name,
    unit: payload.uomId,
    category: categoryName,
    barcode: payload.code || '',
    description: payload.description || '',
    min_stock: Number(payload.minStock || 0),
    current_stock: Number(payload.currentStock || 0),
  });
}

export async function deleteInventoryItem(id: string) {
  return realApi.products.delete(id);
}

/**
 * O Evobit não tem coleção de preço por fornecedor; persistimos o preço
 * informado como custo do produto (cost_price/average_cost) e vinculamos o
 * fornecedor escolhido.
 */
export async function addSupplierPricing(id: string, payload: SupplierPricingPayload) {
  const unitPrice = Number(payload.unitPrice || 0);
  return realApi.products.update(id, {
    cost_price: unitPrice,
    average_cost: unitPrice,
    provider_id: payload.supplierId || undefined,
  });
}

export async function registerStockMovement(payload: StockMovementPayload) {
  let uiType = 'Ajuste';
  let reason = payload.reference || '';

  if (payload.type === StockMovementType.ENTRADA) {
    uiType = 'Entrada';
  } else if (payload.type === StockMovementType.SAIDA) {
    uiType = 'Saída';
  } else if (payload.type === StockMovementType.PERDA) {
    uiType = 'Saída';
    reason = reason || 'Perda';
  } else if (payload.type === StockMovementType.CONSUMO_PRODUCAO) {
    uiType = 'Saída';
    reason = reason || 'Consumo de produção';
  }

  const unitCost = payload.unitCost != null ? Number(payload.unitCost) : 0;

  return realApi.movements.createTransaction([{
    product_id: payload.itemId,
    type: uiType,
    quantity: Number(payload.quantity || 0),
    cost_unit: unitCost,
    price: unitCost,
    reason: reason || uiType,
    obs: payload.notes || '',
    provider: '',
    validity: '',
  }]);
}
