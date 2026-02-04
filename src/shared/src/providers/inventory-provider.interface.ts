import type { RetailerId, InventoryStatus, StoreLocation } from '../models/index.js';

/**
 * Result of an inventory check
 */
export interface InventoryCheckResult {
  /** Inventory status */
  status: InventoryStatus;
  /** Product page URL */
  productUrl: string;
  /** Direct add-to-cart URL */
  addToCartUrl: string;
  /** Product image URL (if available) */
  imageUrl?: string;
  /** Product name from retailer (for validation/updates) */
  productName?: string;
}

/**
 * Configuration for an inventory provider
 */
export interface InventoryProviderConfig {
  /** API key or authentication token */
  apiKey: string;
  /** Rate limiting configuration */
  rateLimit?: {
    /** Maximum requests per second */
    requestsPerSecond: number;
    /** Maximum requests per day */
    requestsPerDay?: number;
  };
}

/**
 * Interface for retailer-specific inventory providers
 * 
 * Implement this interface to add support for new retailers.
 * Each provider handles the specifics of communicating with
 * a retailer's API and normalizing the response.
 */
export interface IInventoryProvider {
  /**
   * Unique identifier for this retailer
   */
  readonly retailerId: RetailerId;

  /**
   * Human-readable name for this retailer
   */
  readonly retailerName: string;

  /**
   * Check inventory for a product
   * 
   * @param sku - Retailer-specific product identifier
   * @param storeLocations - Optional store locations to check (for in-store pickup)
   * @returns Inventory status and related URLs
   * @throws Error if the API call fails or product is not found
   */
  checkInventory(
    sku: string,
    storeLocations?: StoreLocation[]
  ): Promise<InventoryCheckResult>;

  /**
   * Generate a direct add-to-cart URL for a product
   * 
   * @param sku - Retailer-specific product identifier
   * @returns URL that adds the product to cart when visited
   */
  getAddToCartUrl(sku: string): string;

  /**
   * Generate a product page URL
   * 
   * @param sku - Retailer-specific product identifier
   * @returns URL to the product's page on the retailer's website
   */
  getProductUrl(sku: string): string;

  /**
   * Validate that a SKU exists and is monitorable
   * 
   * @param sku - Retailer-specific product identifier
   * @returns true if the SKU is valid and can be monitored
   */
  validateSku(sku: string): Promise<boolean>;

  /**
   * Search for stores near a ZIP code
   * 
   * @param zipCode - ZIP/postal code to search near
   * @param maxResults - Maximum number of stores to return
   * @returns List of store locations
   */
  findStores?(zipCode: string, maxResults?: number): Promise<StoreLocation[]>;
}

/**
 * Factory for creating inventory providers
 */
export interface IInventoryProviderFactory {
  /**
   * Get a provider for a specific retailer
   * 
   * @param retailerId - Retailer identifier
   * @returns The inventory provider, or undefined if not supported
   */
  getProvider(retailerId: RetailerId): IInventoryProvider | undefined;

  /**
   * Get all supported retailer IDs
   */
  getSupportedRetailers(): RetailerId[];

  /**
   * Register a new provider
   * 
   * @param provider - The provider instance to register
   */
  registerProvider(provider: IInventoryProvider): void;
}
