import { SmsClient, SmsSendResult } from '@azure/communication-sms';
import { DefaultAzureCredential } from '@azure/identity';
import { app } from '@azure/functions';

/**
 * SMS notification sender using Azure Communication Services
 */
export class SmsNotificationService {
  private client: SmsClient;
  private fromNumber: string;

  constructor() {
    const endpoint = process.env.ACS_ENDPOINT;
    if (!endpoint) {
      throw new Error('ACS_ENDPOINT environment variable is required');
    }

    // The "from" number must be provisioned in ACS
    this.fromNumber = process.env.ACS_SMS_FROM_NUMBER ?? '';

    // Use connection string if provided (local dev), otherwise managed identity
    const connectionString = process.env.ACS_CONNECTION_STRING;
    if (connectionString) {
      this.client = new SmsClient(connectionString);
    } else {
      this.client = new SmsClient(endpoint, new DefaultAzureCredential());
    }
  }

  /**
   * Send an SMS notification
   * 
   * @param toNumber - Recipient phone number in E.164 format
   * @param message - Message content
   * @returns Send result
   */
  async sendSms(toNumber: string, message: string): Promise<SmsSendResult> {
    const [result] = await this.client.send({
      from: this.fromNumber,
      to: [toNumber],
      message,
    });

    return result;
  }

  /**
   * Format an inventory alert message
   */
  formatAlertMessage(
    productName: string,
    retailer: string,
    addToCartUrl: string,
    location?: string
  ): string {
    const locationText = location ? ` at ${location}` : ' online';
    
    // SMS has 160 char limit for single message, keep it concise
    const baseMessage = `🚨 IN STOCK${locationText}!\n${productName}\n`;
    const urlText = `\n${addToCartUrl}`;
    
    // Truncate product name if needed to fit URL
    const maxProductLength = 160 - baseMessage.length - urlText.length + productName.length;
    const truncatedName = productName.length > maxProductLength
      ? productName.substring(0, maxProductLength - 3) + '...'
      : productName;

    return `🚨 IN STOCK${locationText}!\n${truncatedName}\n${addToCartUrl}`;
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return Boolean(this.fromNumber && process.env.ACS_ENDPOINT);
  }
}

// Singleton instance
let smsServiceInstance: SmsNotificationService | null = null;

/**
 * Get the shared SMS notification service instance
 */
export function getSmsService(): SmsNotificationService {
  if (!smsServiceInstance) {
    smsServiceInstance = new SmsNotificationService();
  }
  return smsServiceInstance;
}
