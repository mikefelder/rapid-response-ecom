import { ServiceBusClient, ServiceBusSender, ServiceBusMessage } from '@azure/service-bus';
import { DefaultAzureCredential } from '@azure/identity';
import type { InventoryChangeEvent, NotificationRequest } from '@rapid-response-shopper/shared';

/**
 * Service Bus client wrapper for messaging
 */
export class ServiceBusMessenger {
  private client: ServiceBusClient;
  private senders: Map<string, ServiceBusSender> = new Map();

  constructor() {
    const namespace = process.env.SERVICE_BUS_NAMESPACE;
    if (!namespace) {
      throw new Error('SERVICE_BUS_NAMESPACE environment variable is required');
    }

    // Use connection string if provided (local dev), otherwise managed identity
    const connectionString = process.env.SERVICE_BUS_CONNECTION_STRING;
    if (connectionString) {
      this.client = new ServiceBusClient(connectionString);
    } else {
      // Construct the fully qualified namespace
      const fullyQualifiedNamespace = namespace.includes('.servicebus.windows.net')
        ? namespace
        : `${namespace}.servicebus.windows.net`;
      this.client = new ServiceBusClient(fullyQualifiedNamespace, new DefaultAzureCredential());
    }
  }

  /**
   * Send an inventory change event
   */
  async sendInventoryEvent(event: InventoryChangeEvent): Promise<void> {
    const sender = this.getSender('inventory-events');
    
    const message: ServiceBusMessage = {
      body: event,
      contentType: 'application/json',
      messageId: event.eventId,
      correlationId: event.metadata.correlationId,
      subject: event.eventType,
      applicationProperties: {
        retailer: event.product.retailer,
        productId: event.product.id,
        sku: event.product.sku,
      },
    };

    await sender.sendMessages(message);
  }

  /**
   * Queue a notification for delivery
   */
  async queueNotification(request: NotificationRequest): Promise<void> {
    const sender = this.getSender('notifications');

    const message: ServiceBusMessage = {
      body: request,
      contentType: 'application/json',
      messageId: request.requestId,
      correlationId: request.correlationId,
      subject: 'notification.send',
      // Schedule for immediate delivery
      scheduledEnqueueTimeUtc: new Date(),
    };

    await sender.sendMessages(message);
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    for (const sender of this.senders.values()) {
      await sender.close();
    }
    await this.client.close();
  }

  private getSender(queueName: string): ServiceBusSender {
    let sender = this.senders.get(queueName);
    if (!sender) {
      sender = this.client.createSender(queueName);
      this.senders.set(queueName, sender);
    }
    return sender;
  }
}

// Singleton instance
let serviceBusInstance: ServiceBusMessenger | null = null;

/**
 * Get the shared Service Bus messenger instance
 */
export function getServiceBusMessenger(): ServiceBusMessenger {
  if (!serviceBusInstance) {
    serviceBusInstance = new ServiceBusMessenger();
  }
  return serviceBusInstance;
}
