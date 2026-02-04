import { InvocationContext } from '@azure/functions';

/**
 * Structured logger for Azure Functions with Application Insights integration
 * 
 * Logs are automatically sent to Application Insights when configured.
 * This wrapper provides consistent structured logging across all functions.
 */
export class Logger {
  constructor(
    private context: InvocationContext,
    private component: string
  ) {}

  /**
   * Log an informational message
   */
  info(message: string, properties?: Record<string, unknown>): void {
    this.log('info', message, properties);
  }

  /**
   * Log a warning message
   */
  warn(message: string, properties?: Record<string, unknown>): void {
    this.log('warn', message, properties);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, properties?: Record<string, unknown>): void {
    const errorProps = error
      ? {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          ...properties,
        }
      : properties;
    this.log('error', message, errorProps);
  }

  /**
   * Log a metric (numeric value)
   */
  metric(name: string, value: number, properties?: Record<string, unknown>): void {
    this.context.log({
      name,
      value,
      component: this.component,
      ...properties,
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(subComponent: string): Logger {
    return new Logger(this.context, `${this.component}.${subComponent}`);
  }

  private log(level: 'info' | 'warn' | 'error', message: string, properties?: Record<string, unknown>): void {
    const logEntry = {
      level,
      message,
      component: this.component,
      timestamp: new Date().toISOString(),
      ...properties,
    };

    switch (level) {
      case 'info':
        this.context.log(JSON.stringify(logEntry));
        break;
      case 'warn':
        this.context.warn(JSON.stringify(logEntry));
        break;
      case 'error':
        this.context.error(JSON.stringify(logEntry));
        break;
    }
  }
}

/**
 * Create a logger for an Azure Function
 */
export function createLogger(context: InvocationContext, component: string): Logger {
  return new Logger(context, component);
}

/**
 * Log custom events to Application Insights
 */
export interface CustomEvent {
  name: string;
  properties?: Record<string, string>;
  measurements?: Record<string, number>;
}

/**
 * Standard event names for the application
 */
export const EventNames = {
  // Inventory events
  INVENTORY_CHECK_STARTED: 'InventoryCheckStarted',
  INVENTORY_CHECK_COMPLETED: 'InventoryCheckCompleted',
  INVENTORY_STATUS_CHANGED: 'InventoryStatusChanged',
  INVENTORY_AVAILABLE: 'InventoryAvailable',
  INVENTORY_UNAVAILABLE: 'InventoryUnavailable',

  // Notification events
  NOTIFICATION_QUEUED: 'NotificationQueued',
  NOTIFICATION_SENT: 'NotificationSent',
  NOTIFICATION_FAILED: 'NotificationFailed',

  // API events
  API_REQUEST: 'ApiRequest',
  API_ERROR: 'ApiError',

  // Provider events
  PROVIDER_API_CALL: 'ProviderApiCall',
  PROVIDER_API_ERROR: 'ProviderApiError',
  PROVIDER_RATE_LIMITED: 'ProviderRateLimited',
} as const;

/**
 * Standard metric names for the application
 */
export const MetricNames = {
  // Inventory metrics
  INVENTORY_CHECK_DURATION_MS: 'InventoryCheckDurationMs',
  INVENTORY_CHECK_COUNT: 'InventoryCheckCount',
  PRODUCTS_IN_STOCK: 'ProductsInStock',
  PRODUCTS_OUT_OF_STOCK: 'ProductsOutOfStock',

  // Notification metrics
  NOTIFICATION_LATENCY_MS: 'NotificationLatencyMs',
  NOTIFICATION_QUEUE_DEPTH: 'NotificationQueueDepth',

  // API metrics
  API_RESPONSE_TIME_MS: 'ApiResponseTimeMs',
  API_ERROR_COUNT: 'ApiErrorCount',

  // Provider metrics
  PROVIDER_LATENCY_MS: 'ProviderLatencyMs',
  PROVIDER_ERROR_COUNT: 'ProviderErrorCount',
} as const;
