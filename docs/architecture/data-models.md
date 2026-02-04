# Data Models

## Overview

This document describes the core data models used throughout the Rapid Response Shopper system.

## Cosmos DB Container Design

### Container: `products`
**Partition Key**: `/id`

Stores products being monitored for inventory availability.

```typescript
interface MonitoredProduct {
  // Cosmos DB fields
  id: string;                    // Unique product identifier (UUID)
  _ts?: number;                  // Cosmos timestamp
  
  // Product identification
  retailer: RetailerId;          // e.g., "bestbuy", "amazon"
  sku: string;                   // Retailer-specific product ID
  name: string;                  // Human-readable product name
  
  // Monitoring configuration
  isActive: boolean;             // Whether monitoring is enabled
  priority: "high" | "normal";   // Affects polling frequency
  storeLocations?: StoreLocation[]; // Physical stores to check
  
  // Current state
  currentStatus: InventoryStatus;
  lastCheckedAt: string;         // ISO 8601 timestamp
  lastStatusChangeAt?: string;   // ISO 8601 timestamp
  
  // Metadata
  imageUrl?: string;
  productUrl: string;            // Direct link to product page
  addToCartUrl: string;          // Direct add-to-cart link
  createdAt: string;
  updatedAt: string;
}

type RetailerId = "bestbuy" | "amazon" | "walmart" | "target";

interface StoreLocation {
  storeId: string;
  storeName: string;
  address?: string;
  zipCode: string;
}

interface InventoryStatus {
  online: AvailabilityState;
  stores: StoreAvailability[];
}

interface AvailabilityState {
  available: boolean;
  quantity?: number;           // If retailer provides it
  lastKnownAvailable?: string; // ISO 8601 timestamp
}

interface StoreAvailability {
  storeId: string;
  available: boolean;
  quantity?: number;
}
```

### Container: `inventory-history`
**Partition Key**: `/productId`

Stores historical inventory state changes for audit and analytics.

```typescript
interface InventoryHistoryEntry {
  // Cosmos DB fields
  id: string;                    // Unique entry ID (UUID)
  productId: string;             // FK to products container
  
  // Event details
  eventType: "in_stock" | "out_of_stock";
  timestamp: string;             // ISO 8601 timestamp
  
  // Context
  retailer: RetailerId;
  sku: string;
  
  // Availability details
  online: boolean;
  stores: StoreAvailability[];
  
  // Duration tracking (set when transitioning out of stock)
  durationInStockMs?: number;
  
  // TTL for automatic cleanup (optional)
  ttl?: number;                  // Seconds until auto-delete
}
```

### Container: `user-preferences`
**Partition Key**: `/id`

Stores user configuration and notification preferences.

```typescript
interface UserPreferences {
  // Cosmos DB fields
  id: string;                    // "default" for single-user setup
  
  // Notification settings
  notifications: {
    sms: {
      enabled: boolean;
      phoneNumber?: string;      // E.164 format
    };
    push: {
      enabled: boolean;
      subscriptions: PushSubscription[];
    };
  };
  
  // Monitoring settings
  monitoring: {
    defaultPollIntervalSeconds: number;
    highPriorityPollIntervalSeconds: number;
  };
  
  // API keys (stored in Key Vault, reference here)
  apiKeyReferences: {
    bestBuy?: string;            // Key Vault secret name
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
```

## Service Bus Message Schemas

### Topic: `inventory-events`

Published when inventory state changes are detected.

```typescript
interface InventoryChangeEvent {
  eventId: string;               // UUID
  eventType: "inventory.available" | "inventory.unavailable";
  timestamp: string;             // ISO 8601
  
  product: {
    id: string;
    sku: string;
    name: string;
    retailer: RetailerId;
    productUrl: string;
    addToCartUrl: string;
  };
  
  availability: {
    online: boolean;
    stores: Array<{
      storeId: string;
      storeName: string;
      available: boolean;
    }>;
  };
  
  metadata: {
    correlationId: string;       // For distributed tracing
    source: string;              // "inventory-monitor"
  };
}
```

### Queue: `notifications`

Queued notification delivery requests.

```typescript
interface NotificationRequest {
  requestId: string;             // UUID
  timestamp: string;             // ISO 8601
  
  // What triggered this notification
  triggerEvent: InventoryChangeEvent;
  
  // Delivery channels
  channels: Array<"sms" | "push">;
  
  // Retry tracking
  attemptCount: number;
  maxAttempts: number;
  
  // For dead-letter analysis
  correlationId: string;
}
```

## API Request/Response Models

### Product Management

```typescript
// POST /api/products
interface CreateProductRequest {
  retailer: RetailerId;
  sku: string;
  name: string;
  priority?: "high" | "normal";
  storeLocations?: Array<{
    storeId: string;
    storeName: string;
    zipCode: string;
  }>;
}

// GET /api/products/:id
interface ProductResponse {
  id: string;
  retailer: RetailerId;
  sku: string;
  name: string;
  isActive: boolean;
  priority: "high" | "normal";
  storeLocations: StoreLocation[];
  currentStatus: InventoryStatus;
  lastCheckedAt: string;
  lastStatusChangeAt?: string;
  imageUrl?: string;
  productUrl: string;
  addToCartUrl: string;
}

// GET /api/products/:id/history
interface InventoryHistoryResponse {
  productId: string;
  entries: InventoryHistoryEntry[];
  pagination: {
    continuationToken?: string;
    hasMore: boolean;
  };
}
```

### User Preferences

```typescript
// GET/PUT /api/preferences
interface UserPreferencesResponse {
  notifications: {
    sms: {
      enabled: boolean;
      phoneNumber?: string;      // Masked for display
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

// PUT /api/preferences/notifications/sms
interface UpdateSmsPreferencesRequest {
  enabled: boolean;
  phoneNumber?: string;          // E.164 format
}
```

## Indexing Strategy

### Products Container
- Composite index on `(retailer, isActive)` for filtered queries
- Include `lastCheckedAt` for ordering

### Inventory History Container
- Composite index on `(productId, timestamp DESC)` for history queries
- TTL enabled for automatic cleanup (configurable, e.g., 90 days)

## Data Retention

| Data Type | Default Retention | Configurable |
|-----------|------------------|--------------|
| Products | Indefinite | No |
| Inventory History | 90 days | Yes (TTL) |
| User Preferences | Indefinite | No |
| Service Bus Messages | 14 days (dead-letter) | Yes |
