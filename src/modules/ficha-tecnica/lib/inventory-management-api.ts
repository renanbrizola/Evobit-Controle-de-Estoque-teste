'use client';

import { StockMovementType, ItemType } from '../types/enums';
import api from '../lib/api';
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

export interface InventorySupplierOption extends InventoryOption {}

export interface InventoryUomOption extends InventoryOption {
  abbreviation: string;
  type: string;
  conversionFactor: number;
}

export interface InventoryCategoryOption extends InventoryOption {}

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
  const docsResponse = await realApi.categories.list();
  const docs = Array.isArray(docsResponse) ? docsResponse : (docsResponse.items || []);
  return docs.map((d: any) => ({ id: d.id, name: d.name }));
}

export async function listSuppliers() {
  if (realApi.providers) {
    const docsResponse = await realApi.providers.list();
    const docs = Array.isArray(docsResponse) ? docsResponse : (docsResponse?.items || []);
    return docs.map((d: any) => ({ id: d.id, name: d.name || d.fantasy_name || 'Fornecedor sem nome' }));
  }
  const response = await api.get<{ success: boolean; data: { items: Array<{ id: string; name: string }> } }>('/suppliers?limit=100');
  return response.data?.data?.items || [];
}

export async function createSupplier(payload: InventorySupplierPayload) {
  const response = await api.post<{ success: boolean; data: { id: string; name: string } }>('/suppliers', payload);
  return response.data.data;
}

export async function searchInventoryItems(search: string, limit = 20): Promise<InventoryCatalogItem[]> {
  try {
    const prodRes = await realApi.products.list({ limit: 1000 });
    const products = Array.isArray(prodRes) ? prodRes : (prodRes.items || []);

    let recipes: any[] = [];
    if (realApi.recipes) {
      const recRes = await realApi.recipes.list();
      recipes = Array.isArray(recRes) ? recRes : (recRes.items || []);
    }

    const recipeProductIds = new Set(recipes.map(r => r.finished_product_id).filter(Boolean));
    const recipesByFinishedProductId = new Map<string, any>();
    recipes.forEach(r => {
      if (r.finished_product_id) {
        recipesByFinishedProductId.set(r.finished_product_id, r);
      }
    });

    const isPackaging = (p: any) => {
      if (!p) return false;
      const categoryName = typeof p.category === 'object' ? p.category?.name : p.category;
      const lowerCategory = String(categoryName || '').toLowerCase();
      return lowerCategory === 'embalagens' || lowerCategory === 'embalagem';
    };

    const rawMaterialsAndPackaging = products.filter(
      (p: any) => Boolean(p.is_raw_material) || isPackaging(p)
    );

    const searchTerm = search.trim().toLowerCase();
    const filtered = rawMaterialsAndPackaging.filter((p: any) => {
      if (!searchTerm) return true;
      return p.name?.toLowerCase().includes(searchTerm);
    });

    const mapped: InventoryCatalogItem[] = filtered.slice(0, limit).map((p: any) => {
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
        code: hasRecipe && recipe ? `SUBRECIPE:${recipe.id}` : (p.code || null),
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

export async function getInventoryItemDetail(id: string) {
  if (realApi.products) {
    const prodRes = await realApi.products.list({ limit: 1000 });
    const products = Array.isArray(prodRes) ? prodRes : (prodRes?.items || []);
    const p = products.find((x: any) => x.id === id);
    if (p) {
      return {
        id: p.id,
        code: p.barcode || p.id.substring(0, 8),
        name: p.name,
        uom: {
          id: p.unit || 'UN',
          name: p.unit || 'Unidade',
          abbreviation: p.unit || 'UN'
        },
        category: p.category ? { id: p.category, name: p.category } : null,
        minStock: Number(p.min_stock || 0),
        currentStock: Number(p.current_stock || 0),
        stockMovements: []
      };
    }
  }

  const response = await api.get<{ success: boolean; data: InventoryItemDetail }>(`/inventory/${id}`);
  const payload = response.data?.data;
  
  if (!payload || !payload.id) {
    return {
      id,
      code: id.substring(0, 8),
      name: 'Insumo não encontrado',
      uom: { id: 'UN', name: 'Unidade', abbreviation: 'UN' },
      category: null,
      minStock: 0,
      currentStock: 0,
      stockMovements: []
    };
  }
  return payload;
}

export async function listInventoryMovements(id: string, limit = 20) {
  const response = await api.get<{ success: boolean; data: InventoryMovementRow[] }>(`/inventory/${id}/movements?limit=${limit}`);
  return response.data.data;
}

export async function createInventoryItem(payload: InventoryFormPayload) {
  const response = await api.post<{ success: boolean; data: { id: string } }>('/inventory', payload);
  return response.data.data;
}

export async function createCategory(payload: InventoryCategoryPayload) {
  const response = await api.post<{ success: boolean; data: { id: string; name: string } }>('/categories', payload);
  return response.data.data;
}

export async function updateInventoryItem(id: string, payload: InventoryFormPayload) {
  return api.put(`/inventory/${id}`, payload);
}

export async function deleteInventoryItem(id: string) {
  return api.delete(`/inventory/${id}`);
}

export async function addSupplierPricing(id: string, payload: SupplierPricingPayload) {
  return api.post(`/inventory/${id}/supplier-pricing`, payload);
}

export async function registerStockMovement(payload: StockMovementPayload) {
  return api.post('/inventory/movements', payload);
}
