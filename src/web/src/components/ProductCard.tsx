import { Link } from 'react-router-dom';
import type { Product } from '../api/client';
import { formatDistanceToNow } from 'date-fns';

interface ProductCardProps {
  product: Product;
  onToggleActive?: (id: string, isActive: boolean) => void;
}

export default function ProductCard({ product, onToggleActive }: ProductCardProps) {
  const isAvailable = product.currentStatus.online.available || 
    product.currentStatus.stores.some(s => s.available);
  
  const lastChecked = formatDistanceToNow(new Date(product.lastCheckedAt), { addSuffix: true });
  const lastChanged = product.lastStatusChangeAt 
    ? formatDistanceToNow(new Date(product.lastStatusChangeAt), { addSuffix: true })
    : 'Never';

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Product image */}
        <div className="flex-shrink-0">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-24 h-24 object-contain rounded-lg bg-gray-50"
            />
          ) : (
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-4xl">📦</span>
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="flex-grow min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link 
                to={`/products/${product.id}`}
                className="font-semibold text-gray-900 hover:text-primary-600 line-clamp-2"
              >
                {product.name}
              </Link>
              <p className="text-sm text-gray-500 mt-1">
                {product.retailer.toUpperCase()} • SKU: {product.sku}
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              <span className={`badge ${isAvailable ? 'badge-green' : 'badge-red'}`}>
                {isAvailable ? '✓ In Stock' : '✕ Out of Stock'}
              </span>
              {product.priority === 'high' && (
                <span className="badge badge-yellow">⚡ High Priority</span>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
            <span>Last checked: {lastChecked}</span>
            <span>•</span>
            <span>Status changed: {lastChanged}</span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {isAvailable && (
              <a
                href={product.addToCartUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary text-sm"
              >
                🛒 Add to Cart
              </a>
            )}
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-sm"
            >
              View on {product.retailer}
            </a>
            {onToggleActive && (
              <button
                onClick={() => onToggleActive(product.id, !product.isActive)}
                className={`btn text-sm ${product.isActive ? 'btn-secondary' : 'btn-primary'}`}
              >
                {product.isActive ? '⏸ Pause' : '▶ Resume'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
