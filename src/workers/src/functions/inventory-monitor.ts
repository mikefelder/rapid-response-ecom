import { app, InvocationContext, Timer } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import {
  type MonitoredProduct,
  type InventoryHistoryEntry,
  type InventoryChangeEvent,
  type NotificationRequest,
  type StoreAvailability,
  type StoreLocation,
  InventoryProviderFactory,
} from '@rapid-response-shopper/shared';
import { getCosmosClient } from '../services/cosmos-client.js';
import { getServiceBusMessenger } from '../services/service-bus-client.js';

/**
 * Inventory Monitor Worker
 * 
 * This timer-triggered function polls retailer APIs at regular intervals
 * to check inventory status of monitored products. When a status change
 * is detected (out-of-stock → in-stock), it:
 * 
 * 1. Updates the product record in Cosmos DB
 * 2. Creates an inventory history entry
 * 3. Publishes an event to Service Bus
 * 4. Queues a notification for delivery
 */

// Timer schedule: every 10 seconds for high responsiveness
// In production, consider adaptive intervals based on product priority
const TIMER_SCHEDULE = '*/10 * * * * *';

/**
 * Main inventory monitoring function
 */
async function inventoryMonitor(timer: Timer, context: InvocationContext): Promise<void> {
  const startTime = Date.now();
  const correlationId = uuidv4();
  
  context.log(`Inventory monitor triggered at ${new Date().toISOString()}`);
  context.log(`Correlation ID: ${correlationId}`);

  try {
    // Initialize services
    const cosmosClient = await getCosmosClient();
    const serviceBus = getServiceBusMessenger();

    // Get all active products to monitor
    const products = await cosmosClient.getActiveProducts();
    context.log(`Found ${products.length} active products to monitor`);

    if (products.length === 0) {
      return;
    }

    // Initialize provider factory with API key from environment
    const providerFactory = InventoryProviderFactory.create({
      bestbuy: {
        apiKey: process.env.BESTBUY_API_KEY ?? '',
        rateLimit: { requestsPerSecond: 5 },
      },
    });

    // Process each product
    const results = await Promise.allSettled(
      products.map((product) =>
        checkProductInventory(product, providerFactory, cosmosClient, serviceBus, correlationId, context)
      )
    );

    // Log summary
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    const duration = Date.now() - startTime;

    context.log(`Inventory check complete: ${succeeded} succeeded, ${failed} failed, ${duration}ms`);

    // Log failures for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        context.error(`Failed to check product ${products[index].sku}: ${result.reason}`);
      }
    });
  } catch (error) {
    context.error(`Inventory monitor error: ${error}`);
    throw error;
  }
}

/**
 * Check inventory for a single product
 */
async function checkProductInventory(
  product: MonitoredProduct,
  providerFactory: InventoryProviderFactory,
  cosmosClient: Awaited<ReturnType<typeof getCosmosClient>>,
  serviceBus: ReturnType<typeof getServiceBusMessenger>,
  correlationId: string,
  context: InvocationContext
): Promise<void> {
  const provider = providerFactory.getProvider(product.retailer);
  
  if (!provider) {
    context.warn(`No provider available for retailer: ${product.retailer}`);
    return;
  }

  // Check inventory via retailer API
  const result = await provider.checkInventory(product.sku, product.storeLocations);
  const now = new Date().toISOString();

  // Determine if there's a status change
  const wasAvailable = isAvailable(product.currentStatus);
  const nowAvailable = isAvailable(result.status);
  const statusChanged = wasAvailable !== nowAvailable;

  context.log(
    `Product ${product.sku}: was ${wasAvailable ? 'available' : 'unavailable'}, ` +
    `now ${nowAvailable ? 'available' : 'unavailable'}, changed: ${statusChanged}`
  );

  // Update product record
  product.currentStatus = result.status;
  product.lastCheckedAt = now;
  
  if (statusChanged) {
    product.lastStatusChangeAt = now;
  }

  // Update URLs if they changed
  product.productUrl = result.productUrl;
  product.addToCartUrl = result.addToCartUrl;
  if (result.imageUrl) {
    product.imageUrl = result.imageUrl;
  }

  await cosmosClient.updateProduct(product);

  // Handle status change
  if (statusChanged) {
    // Get previous history entry for duration calculation
    const previousEntry = await cosmosClient.getLatestHistoryEntry(product.id);
    
    // Create history entry
    const historyEntry: InventoryHistoryEntry = {
      id: uuidv4(),
      productId: product.id,
      eventType: nowAvailable ? 'in_stock' : 'out_of_stock',
      timestamp: now,
      retailer: product.retailer,
      sku: product.sku,
      online: result.status.online.available,
      stores: result.status.stores,
      // Calculate duration if previous entry was opposite state
      durationInStockMs:
        previousEntry && previousEntry.eventType === 'in_stock' && !nowAvailable
          ? new Date(now).getTime() - new Date(previousEntry.timestamp).getTime()
          : undefined,
      ttl: 90 * 24 * 60 * 60, // 90 days
    };

    await cosmosClient.addHistoryEntry(historyEntry);

    // Create and publish event
    const event: InventoryChangeEvent = {
      eventId: uuidv4(),
      eventType: nowAvailable ? 'inventory.available' : 'inventory.unavailable',
      timestamp: now,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        retailer: product.retailer,
        productUrl: product.productUrl,
        addToCartUrl: product.addToCartUrl,
        imageUrl: product.imageUrl,
      },
      availability: {
        online: result.status.online.available,
        stores: result.status.stores.map((s: StoreAvailability) => ({
          storeId: s.storeId,
          storeName: product.storeLocations?.find((loc: StoreLocation) => loc.storeId === s.storeId)?.storeName ?? s.storeId,
          available: s.available,
        })),
      },
      metadata: {
        correlationId,
        source: 'inventory-monitor',
      },
    };

    await serviceBus.sendInventoryEvent(event);
    context.log(`Published ${event.eventType} event for ${product.sku}`);

    // Queue notification only for "in stock" events
    if (nowAvailable) {
      const notificationRequest: NotificationRequest = {
        requestId: uuidv4(),
        timestamp: now,
        triggerEvent: event,
        channels: ['sms'], // Could be configured per user
        attemptCount: 0,
        maxAttempts: 3,
        correlationId,
      };

      await serviceBus.queueNotification(notificationRequest);
      context.log(`Queued notification for ${product.sku}`);
    }
  }
}

/**
 * Check if any availability is true
 */
function isAvailable(status: MonitoredProduct['currentStatus']): boolean {
  return status.online.available || status.stores.some((s: StoreAvailability) => s.available);
}

// Register the function
app.timer('inventoryMonitor', {
  schedule: TIMER_SCHEDULE,
  handler: inventoryMonitor,
  runOnStartup: false, // Don't run on cold start in production
});
