export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: Required<ResponseMeta>;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const DomainErrorCodes = {
  PRICE_BELOW_COST: 'PRICE_BELOW_COST',
  MARGIN_VIOLATION: 'MARGIN_VIOLATION',
  RECIPE_VERSION_IMMUTABLE: 'RECIPE_VERSION_IMMUTABLE',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  YIELD_MUST_BE_POSITIVE: 'YIELD_MUST_BE_POSITIVE',
  INVALID_PERCENTAGE_SUM: 'INVALID_PERCENTAGE_SUM',
  DOMAIN_VALIDATION: 'DOMAIN_VALIDATION',
} as const;

export type DomainErrorCode = (typeof DomainErrorCodes)[keyof typeof DomainErrorCodes];
