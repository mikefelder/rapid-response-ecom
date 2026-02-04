/**
 * Supported retailer identifiers
 */
export type RetailerId = 'bestbuy' | 'amazon' | 'walmart' | 'target';

/**
 * Physical store location for inventory checks
 */
export interface StoreLocation {
  /** Retailer-specific store identifier */
  storeId: string;
  /** Human-readable store name */
  storeName: string;
  /** Optional street address */
  address?: string;
  /** ZIP/postal code for location-based searches */
  zipCode: string;
}

/**
 * Availability state for a single location (online or store)
 */
export interface AvailabilityState {
  /** Whether the product is currently available */
  available: boolean;
  /** Quantity available (if reported by retailer) */
  quantity?: number;
  /** Last time this location had inventory (ISO 8601) */
  lastKnownAvailable?: string;
}

/**
 * Store-specific availability information
 */
export interface StoreAvailability extends AvailabilityState {
  /** Retailer-specific store identifier */
  storeId: string;
}

/**
 * Complete inventory status for a product
 */
export interface InventoryStatus {
  /** Online availability */
  online: AvailabilityState;
  /** Per-store availability */
  stores: StoreAvailability[];
}

/**
 * A product being monitored for inventory availability
 */
export interface MonitoredProduct {
  /** Unique identifier (UUID) */
  id: string;
  /** Cosmos DB timestamp */
  _ts?: number;
  
  // Product identification
  /** Retailer identifier */
  retailer: RetailerId;
  /** Retailer-specific product SKU/ID */
  sku: string;
  /** Human-readable product name */
  name: string;
  
  // Monitoring configuration
  /** Whether monitoring is currently enabled */
  isActive: boolean;
  /** Priority affects polling frequency */
  priority: 'high' | 'normal';
  /** Physical stores to monitor */
  storeLocations?: StoreLocation[];
  
  // Current state
  /** Current inventory status */
  currentStatus: InventoryStatus;
  /** Last inventory check timestamp (ISO 8601) */
  lastCheckedAt: string;
  /** Last status change timestamp (ISO 8601) */
  lastStatusChangeAt?: string;
  
  // Metadata
  /** Product image URL */
  imageUrl?: string;
  /** Direct link to product page */
  productUrl: string;
  /** Direct add-to-cart URL */
  addToCartUrl: string;
  /** Record creation timestamp (ISO 8601) */
  createdAt: string;
  /** Record update timestamp (ISO 8601) */
  updatedAt: string;
}

/**
 * Inventory history entry for audit trail
 */
export interface InventoryHistoryEntry {
  /** Unique identifier (UUID) */
  id: string;
  /** Reference to the monitored product */
  productId: string;
  
  // Event details
  /** Type of inventory event */
  eventType: 'in_stock' | 'out_of_stock';
  /** Event timestamp (ISO 8601) */
  timestamp: string;
  
  // Context
  /** Retailer identifier */
  retailer: RetailerId;
  /** Product SKU */
  sku: string;
  
  // Availability at time of event
  /** Online availability */
  online: boolean;
  /** Per-store availability */
  stores: StoreAvailability[];
  
  // Duration tracking
  /** Duration product was in stock (set when going out of stock) */
  durationInStockMs?: number;
  
  /** TTL for automatic cleanup (seconds) */
  ttl?: number;
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  sms: {
    enabled: boolean;
    /** Phone number in E.164 format */
    phoneNumber?: string;
  };
  push: {
    enabled: boolean;
    subscriptions: PushSubscription[];
  };
}

/**
 * Web Push subscription details
 */
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * User preferences document
 */
export interface UserPreferences {
  /** Document ID (usually "default" for single-user) */
  id: string;
  
  /** Notification configuration */
  notifications: NotificationPreferences;
  
  /** Monitoring configuration */
  monitoring: {
    /** Default polling interval in seconds */
    defaultPollIntervalSeconds: number;
    /** High-priority polling interval in seconds */
    highPriorityPollIntervalSeconds: number;
  };
  
  /** API key references (Key Vault secret names) */
  apiKeyReferences: {
    bestBuy?: string;
  };
  
  /** Record creation timestamp (ISO 8601) */
  createdAt: string;
  /** Record update timestamp (ISO 8601) */
  updatedAt: string;
}
