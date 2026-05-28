'use client';

import { StockMovementType } from '../types/enums';
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
  const docs = await realApi.categories.list();
  return docs.map((d: any) => ({ id: d.id, name: d.name }));
}

export async function listSuppliers() {
  const response = await api.get<{ success: boolean; data: { items: Array<{ id: string; name: string }> } }>('/suppliers?limit=100');
  return response.data.data.items;
}

export async function createSupplier(payload: InventorySupplierPayload) {
  const response = await api.post<{ success: boolean; data: { id: string; name: string } }>('/suppliers', payload);
  return response.data.data;
}

export async function listInventoryItems() {
  const response = await api.get<{ success: boolean; data: { items: InventoryCatalogItem[] } }>('/inventory?limit=200');
  return response.data.data.items;
}

export async function searchInventoryItems(search: string, limit = 20): Promise<InventoryCatalogItem[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (search.trim()) params.set('search', search.trim());
  const response = await api.get<{ success: boolean; data: { items: InventoryCatalogItem[] } }>(
    `/inventory?${params.toString()}`,
  );
  return response.data.data.items;
}

export async function getInventoryItemDetail(id: string) {
  const response = await api.get<{ success: boolean; data: InventoryItemDetail }>(`/inventory/${id}`);
  return response.data.data;
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
