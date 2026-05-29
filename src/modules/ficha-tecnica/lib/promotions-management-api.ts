'use client';

export interface PromotionRow {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  startDate: string;
  endDate: string;
  items: Array<{
    id: string;
    discountPercent: number;
    promotionalPrice: number;
    price: {
      id: string;
      finalPrice: number | null;
      suggestedPrice: number;
      recipe: {
        name: string;
      };
    };
  }>;
}

export interface PromotionPayload {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export interface PromotionItemPayload {
  priceId: string;
  discountPercent: number;
}

export async function listPromotions(): Promise<PromotionRow[]> {
  return [];
}

export async function createPromotion(payload: PromotionPayload): Promise<PromotionRow> {
  return {
    id: String(Math.random()),
    ...payload,
    status: 'DRAFT',
    items: [],
  };
}

export async function updatePromotion(id: string, payload: PromotionPayload): Promise<PromotionRow> {
  return {
    id,
    ...payload,
    status: 'DRAFT',
    items: [],
  };
}

export async function addPromotionItem(id: string, payload: PromotionItemPayload) {
  return { success: true };
}

export async function updatePromotionItem(promotionId: string, itemId: string, payload: PromotionItemPayload) {
  return { success: true };
}

export async function deletePromotionItem(promotionId: string, itemId: string) {
  return { success: true };
}

export async function publishPromotion(id: string) {
  return { success: true };
}
