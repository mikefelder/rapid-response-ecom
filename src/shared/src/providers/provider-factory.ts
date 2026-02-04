import type { RetailerId } from '../models/index.js';
import type {
  IInventoryProvider,
  IInventoryProviderFactory,
  InventoryProviderConfig,
} from './inventory-provider.interface.js';
import { BestBuyInventoryProvider } from './bestbuy-provider.js';

/**
 * Factory for creating and managing inventory providers
 * 
 * This factory implements the pluggable provider pattern, allowing
 * easy addition of new retailers without modifying core logic.
 */
export class InventoryProviderFactory implements IInventoryProviderFactory {
  private providers: Map<RetailerId, IInventoryProvider> = new Map();

  /**
   * Create a new factory with default providers
   */
  static create(configs: Partial<Record<RetailerId, InventoryProviderConfig>>): InventoryProviderFactory {
    const factory = new InventoryProviderFactory();

    // Register Best Buy provider if config provided
    if (configs.bestbuy?.apiKey) {
      factory.registerProvider(new BestBuyInventoryProvider(configs.bestbuy));
    }

    // Future: Register additional providers here
    // if (configs.amazon?.apiKey) {
    //   factory.registerProvider(new AmazonInventoryProvider(configs.amazon));
    // }

    return factory;
  }

  /**
   * Get a provider for a specific retailer
   */
  getProvider(retailerId: RetailerId): IInventoryProvider | undefined {
    return this.providers.get(retailerId);
  }

  /**
   * Get all supported retailer IDs
   */
  getSupportedRetailers(): RetailerId[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Register a new provider
   */
  registerProvider(provider: IInventoryProvider): void {
    this.providers.set(provider.retailerId, provider);
  }

  /**
   * Check if a retailer is supported
   */
  isSupported(retailerId: RetailerId): boolean {
    return this.providers.has(retailerId);
  }
}
