import type { RetailerId, StoreAvailability } from './product.js';

/**
 * Inventory change event published to Service Bus
 */
export interface InventoryChangeEvent {
  /** Unique event identifier (UUID) */
  eventId: string;
  /** Type of inventory change */
  eventType: 'inventory.available' | 'inventory.unavailable';
  /** Event timestamp (ISO 8601) */
  timestamp: string;
  
  /** Product information */
  product: {
    /** Product ID */
    id: string;
    /** Retailer-specific SKU */
    sku: string;
    /** Product name */
    name: string;
    /** Retailer identifier */
    retailer: RetailerId;
    /** Direct link to product page */
    productUrl: string;
    /** Direct add-to-cart URL */
    addToCartUrl: string;
    /** Product image URL */
    imageUrl?: string;
  };
  
  /** Availability details at time of event */
  availability: {
    /** Online availability */
    online: boolean;
    /** Per-store availability */
    stores: Array<{
      storeId: string;
      storeName: string;
      available: boolean;
    }>;
  };
  
  /** Event metadata */
  metadata: {
    /** Correlation ID for distributed tracing */
    correlationId: string;
    /** Source system/component */
    source: string;
  };
}

/**
 * Notification delivery request queued in Service Bus
 */
export interface NotificationRequest {
  /** Unique request identifier (UUID) */
  requestId: string;
  /** Request timestamp (ISO 8601) */
  timestamp: string;
  
  /** The event that triggered this notification */
  triggerEvent: InventoryChangeEvent;
  
  /** Channels to deliver notification through */
  channels: Array<'sms' | 'push'>;
  
  /** Current attempt count */
  attemptCount: number;
  /** Maximum retry attempts */
  maxAttempts: number;
  
  /** Correlation ID for tracing */
  correlationId: string;
}

/**
 * Notification delivery result
 */
export interface NotificationResult {
  /** Request ID */
  requestId: string;
  /** Whether delivery was successful */
  success: boolean;
  /** Delivery channel */
  channel: 'sms' | 'push';
  /** Error message if failed */
  error?: string;
  /** Timestamp of delivery attempt */
  timestamp: string;
}
