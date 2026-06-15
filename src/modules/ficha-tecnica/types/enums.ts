export enum RecipeStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  ARCHIVED = 'ARCHIVED',
}

export enum ItemType {
  INSUMO = 'INSUMO',
  EMBALAGEM = 'EMBALAGEM',
  ETIQUETA = 'ETIQUETA',
  ROTULO = 'ROTULO',
  COMPOSITE = 'COMPOSITE',
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  PRODUCTION_MANAGER = 'PRODUCTION_MANAGER',
  FINANCIAL_MANAGER = 'FINANCIAL_MANAGER',
  BUYER = 'BUYER',
  OPERATOR = 'OPERATOR',
  COST_ANALYST = 'COST_ANALYST',
  VIEWER = 'VIEWER',
}

export enum StockMovementType {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA',
  AJUSTE = 'AJUSTE',
  PERDA = 'PERDA',
  CONSUMO_PRODUCAO = 'CONSUMO_PRODUCAO',
}

export enum ProductionOrderStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PromotionStatus {
  DRAFT = 'DRAFT',
  SIMULATED = 'SIMULATED',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PriceStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  REPLACED = 'REPLACED',
}

export enum EquipmentType {
  ELECTRIC = 'ELECTRIC',
  GAS = 'GAS',
}

export enum UtilityRateType {
  KWH = 'KWH',
  GAS_KG = 'GAS_KG',
  GAS_M3 = 'GAS_M3',
}

export enum ProductType {
  FINAL = 'FINAL',
  SUB_RECEITA = 'SUB_RECEITA',
}

export enum ImportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}
