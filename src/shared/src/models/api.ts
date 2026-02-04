import type { RetailerId, MonitoredProduct, StoreLocation, StoreAvailability } from './product.js';

// ============================================================================
// Product Management API
// ============================================================================

/**
 * Request to create a new monitored product
 */
export interface CreateProductRequest {
  /** Retailer identifier */
  retailer: RetailerId;
  /** Retailer-specific product SKU/ID */
  sku: string;
  /** Human-readable product name */
  name: string;
  /** Priority level (affects polling frequency) */
  priority?: 'high' | 'normal';
  /** Physical stores to monitor */
  storeLocations?: Array<{
    storeId: string;
    storeName: string;
    zipCode: string;
  }>;
}

/**
 * Request to update an existing product
 */
export interface UpdateProductRequest {
  /** Updated product name */
  name?: string;
  /** Updated priority */
  priority?: 'high' | 'normal';
  /** Updated store locations */
  storeLocations?: StoreLocation[];
  /** Enable/disable monitoring */
  isActive?: boolean;
}

/**
 * Product response (API representation)
 */
export interface ProductResponse {
  id: string;
  retailer: RetailerId;
  sku: string;
  name: string;
  isActive: boolean;
  priority: 'high' | 'normal';
  storeLocations: StoreLocation[];
  currentStatus: {
    online: { available: boolean; quantity?: number };
    stores: StoreAvailability[];
  };
  lastCheckedAt: string;
  lastStatusChangeAt?: string;
  imageUrl?: string;
  productUrl: string;
  addToCartUrl: string;
}

/**
 * Paginated list of products
 */
export interface ProductListResponse {
  products: ProductResponse[];
  pagination: {
    total: number;
    continuationToken?: string;
    hasMore: boolean;
  };
}

// ============================================================================
// Inventory History API
// ============================================================================

/**
 * Single history entry response
 */
export interface HistoryEntryResponse {
  id: string;
  eventType: 'in_stock' | 'out_of_stock';
  timestamp: string;
  online: boolean;
  stores: Array<{
    storeId: string;
    available: boolean;
  }>;
  durationInStockMs?: number;
}

/**
 * Inventory history response
 */
export interface InventoryHistoryResponse {
  productId: string;
  productName: string;
  entries: HistoryEntryResponse[];
  pagination: {
    continuationToken?: string;
    hasMore: boolean;
  };
}

// ============================================================================
// User Preferences API
// ============================================================================

/**
 * User preferences response
 */
export interface UserPreferencesResponse {
  notifications: {
    sms: {
      enabled: boolean;
      /** Phone number (masked for display) */
      phoneNumber?: string;
    };
    push: {
      enabled: boolean;
      subscriptionCount: number;
    };
  };
  monitoring: {
    defaultPollIntervalSeconds: number;
    highPriorityPollIntervalSeconds: number;
  };
}

/**
 * Request to update SMS preferences
 */
export interface UpdateSmsPreferencesRequest {
  enabled: boolean;
  /** Phone number in E.164 format */
  phoneNumber?: string;
}

/**
 * Request to update push preferences
 */
export interface UpdatePushPreferencesRequest {
  enabled: boolean;
}

/**
 * Request to add a push subscription
 */
export interface AddPushSubscriptionRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ============================================================================
// Error Responses
// ============================================================================

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    cosmosDb: 'ok' | 'error';
    serviceBus: 'ok' | 'error';
    keyVault: 'ok' | 'error';
  };
}
