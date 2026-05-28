export const Permissions = {
  // Inventory
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_CREATE: 'inventory:create',
  INVENTORY_EDIT: 'inventory:edit',
  INVENTORY_DELETE: 'inventory:delete',

  // Recipes
  RECIPE_VIEW: 'recipe:view',
  RECIPE_CREATE: 'recipe:create',
  RECIPE_EDIT: 'recipe:edit',
  RECIPE_DELETE: 'recipe:delete',
  RECIPE_APPROVE: 'recipe:approve',
  RECIPE_PRINT: 'recipe:print',

  // Cost & Pricing
  COST_VIEW: 'cost:view',
  PRICING_VIEW: 'pricing:view',
  PRICING_CREATE: 'pricing:create',
  PRICING_APPROVE: 'pricing:approve',
  PRICE_CHANGE: 'pricing:change',

  // Promotions
  PROMOTION_VIEW: 'promotion:view',
  PROMOTION_CREATE: 'promotion:create',
  PROMOTION_EDIT: 'promotion:edit',
  PROMOTION_APPROVE: 'promotion:approve',
  PROMOTION_PUBLISH: 'promotion:publish',

  // Suppliers
  SUPPLIER_VIEW: 'supplier:view',
  SUPPLIER_CREATE: 'supplier:create',
  SUPPLIER_EDIT: 'supplier:edit',

  // Users & Roles
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',
  ROLE_MANAGE: 'role:manage',

  // Reports
  REPORT_VIEW: 'report:view',
  REPORT_EXPORT: 'report:export',

  // Audit
  AUDIT_VIEW: 'audit:view',

  // Imports
  IMPORT_CREATE: 'import:create',
  IMPORT_VIEW: 'import:view',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const RolePermissions: Record<string, Permission[]> = {
  SUPER_ADMIN: Object.values(Permissions) as Permission[],
  ADMIN: Object.values(Permissions).filter((p) => p !== 'role:manage') as Permission[],
  PRODUCTION_MANAGER: [
    'inventory:view', 'recipe:view', 'recipe:create', 'recipe:edit', 'recipe:approve',
    'recipe:print', 'cost:view', 'pricing:view', 'promotion:view', 'report:view',
  ] as Permission[],
  FINANCIAL_MANAGER: [
    'cost:view', 'pricing:view', 'pricing:create', 'pricing:approve', 'pricing:change',
    'promotion:view', 'promotion:approve', 'report:view', 'report:export', 'audit:view',
  ] as Permission[],
  BUYER: [
    'inventory:view', 'inventory:create', 'inventory:edit',
    'supplier:view', 'supplier:create', 'supplier:edit', 'report:view',
  ] as Permission[],
  OPERATOR: [
    'inventory:view', 'recipe:view', 'recipe:print', 'promotion:view',
  ] as Permission[],
  COST_ANALYST: [
    'inventory:view', 'recipe:view', 'cost:view', 'pricing:view', 'pricing:create',
    'promotion:view', 'report:view', 'report:export',
  ] as Permission[],
  VIEWER: [
    'inventory:view', 'recipe:view', 'cost:view', 'pricing:view',
    'promotion:view', 'report:view',
  ] as Permission[],
};
