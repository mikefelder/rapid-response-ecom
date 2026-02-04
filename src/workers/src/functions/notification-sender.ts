import { app, InvocationContext } from '@azure/functions';
import type { NotificationRequest, NotificationResult } from '@rapid-response-shopper/shared';
import { getCosmosClient } from '../services/cosmos-client.js';
import { getSmsService } from '../services/sms-service.js';

/**
 * Notification Sender Worker
 * 
 * This Service Bus-triggered function processes notification requests
 * and delivers them via SMS (and future: push notifications).
 * 
 * Features:
 * - Sub-second delivery after inventory detection
 * - Automatic retries with exponential backoff
 * - Dead-letter queue for failed deliveries
 * - Delivery receipts and logging
 */

/**
 * Main notification sender function
 */
async function notificationSender(
  message: NotificationRequest,
  context: InvocationContext
): Promise<void> {
  const startTime = Date.now();
  
  context.log(`Processing notification ${message.requestId}`);
  context.log(`Correlation ID: ${message.correlationId}`);
  context.log(`Attempt ${message.attemptCount + 1} of ${message.maxAttempts}`);

  try {
    // Get user preferences to determine notification targets
    const cosmosClient = await getCosmosClient();
    const preferences = await cosmosClient.getUserPreferences();

    if (!preferences) {
      context.warn('No user preferences found, skipping notification');
      return;
    }

    const results: NotificationResult[] = [];

    // Process each requested channel
    for (const channel of message.channels) {
      try {
        switch (channel) {
          case 'sms':
            if (preferences.notifications.sms.enabled && preferences.notifications.sms.phoneNumber) {
              const smsResult = await sendSmsNotification(message, preferences.notifications.sms.phoneNumber, context);
              results.push(smsResult);
            } else {
              context.log('SMS notifications disabled or no phone number configured');
            }
            break;

          case 'push':
            if (preferences.notifications.push.enabled && preferences.notifications.push.subscriptions.length > 0) {
              const pushResults = await sendPushNotifications(message, preferences.notifications.push.subscriptions, context);
              results.push(...pushResults);
            } else {
              context.log('Push notifications disabled or no subscriptions');
            }
            break;

          default:
            context.warn(`Unknown notification channel: ${channel}`);
        }
      } catch (error) {
        context.error(`Failed to send ${channel} notification: ${error}`);
        results.push({
          requestId: message.requestId,
          success: false,
          channel,
          error: String(error),
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Log results
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const duration = Date.now() - startTime;

    context.log(`Notification delivery complete: ${successful} succeeded, ${failed} failed, ${duration}ms`);

    // If all deliveries failed, throw to trigger retry
    if (results.length > 0 && successful === 0) {
      throw new Error(`All notification deliveries failed: ${results.map((r) => r.error).join(', ')}`);
    }
  } catch (error) {
    context.error(`Notification sender error: ${error}`);
    
    // Let Service Bus handle retry logic
    throw error;
  }
}

/**
 * Send SMS notification
 */
async function sendSmsNotification(
  message: NotificationRequest,
  phoneNumber: string,
  context: InvocationContext
): Promise<NotificationResult> {
  const smsService = getSmsService();
  const event = message.triggerEvent;

  // Format the message
  const location = event.availability.stores.find((s) => s.available)?.storeName;
  const smsText = smsService.formatAlertMessage(
    event.product.name,
    event.product.retailer,
    event.product.addToCartUrl,
    location
  );

  context.log(`Sending SMS to ${phoneNumber.substring(0, 4)}****`);
  context.log(`Message: ${smsText}`);

  try {
    const result = await smsService.sendSms(phoneNumber, smsText);

    if (result.successful) {
      context.log(`SMS sent successfully, message ID: ${result.messageId}`);
      return {
        requestId: message.requestId,
        success: true,
        channel: 'sms',
        timestamp: new Date().toISOString(),
      };
    } else {
      const errorMessage = `SMS delivery failed: ${result.errorMessage}`;
      context.error(errorMessage);
      return {
        requestId: message.requestId,
        success: false,
        channel: 'sms',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    return {
      requestId: message.requestId,
      success: false,
      channel: 'sms',
      error: String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Send push notifications to all subscribed devices
 */
async function sendPushNotifications(
  message: NotificationRequest,
  subscriptions: Array<{ endpoint: string; keys: { p256dh: string; auth: string } }>,
  context: InvocationContext
): Promise<NotificationResult[]> {
  const event = message.triggerEvent;
  const results: NotificationResult[] = [];

  // Build push notification payload
  const payload = {
    title: '🚨 IN STOCK!',
    body: event.product.name,
    icon: event.product.imageUrl ?? '/icon-192.png',
    badge: '/badge-72.png',
    tag: `inventory-${event.product.id}`,
    data: {
      url: event.product.addToCartUrl,
      productId: event.product.id,
    },
    actions: [
      {
        action: 'add-to-cart',
        title: 'Add to Cart',
      },
      {
        action: 'view',
        title: 'View Product',
      },
    ],
    requireInteraction: true, // Keep notification visible until user interacts
  };

  // Note: Web Push implementation would go here
  // For now, log that it would be sent
  context.log(`Would send push to ${subscriptions.length} subscriptions`);
  context.log(`Payload: ${JSON.stringify(payload)}`);

  // TODO: Implement actual web push using a library like 'web-push'
  // This requires VAPID keys to be configured

  for (const subscription of subscriptions) {
    results.push({
      requestId: message.requestId,
      success: true, // Placeholder
      channel: 'push',
      timestamp: new Date().toISOString(),
    });
  }

  return results;
}

// Register the function
app.serviceBusQueue('notificationSender', {
  connection: 'SERVICE_BUS_CONNECTION', // Uses managed identity via connection name
  queueName: 'notifications',
  handler: notificationSender,
});
