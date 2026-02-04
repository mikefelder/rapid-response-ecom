import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { api } from '../api/client';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProduct(id!),
    enabled: Boolean(id),
    refetchInterval: 10000,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['product-history', id],
    queryFn: () => api.getProductHistory(id!, 20),
    enabled: Boolean(id),
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteProduct(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (isActive: boolean) => api.updateProduct(id!, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  if (productLoading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!product) {
    return (
      <div className="card text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Product not found</h2>
        <Link to="/products" className="btn btn-primary mt-4">
          Back to Products
        </Link>
      </div>
    );
  }

  const isAvailable = product.currentStatus.online.available || 
    product.currentStatus.stores.some(s => s.available);

  const history = historyData?.entries ?? [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm">
        <Link to="/products" className="text-primary-600 hover:text-primary-700">
          Products
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-500">{product.name}</span>
      </nav>

      {/* Product header */}
      <div className="card">
        <div className="flex gap-6">
          {/* Image */}
          <div className="flex-shrink-0">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-32 h-32 object-contain rounded-lg bg-gray-50"
              />
            ) : (
              <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-5xl">📦</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-grow">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                <p className="text-gray-500 mt-1">
                  {product.retailer.toUpperCase()} • SKU: {product.sku}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge text-sm ${isAvailable ? 'badge-green' : 'badge-red'}`}>
                  {isAvailable ? '✓ In Stock' : '✕ Out of Stock'}
                </span>
                {product.priority === 'high' && (
                  <span className="badge badge-yellow">⚡ High Priority</span>
                )}
                {!product.isActive && (
                  <span className="badge badge-gray">⏸ Paused</span>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Last checked:</span>
                <span className="ml-2 text-gray-900">
                  {formatDistanceToNow(new Date(product.lastCheckedAt), { addSuffix: true })}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Status changed:</span>
                <span className="ml-2 text-gray-900">
                  {product.lastStatusChangeAt 
                    ? formatDistanceToNow(new Date(product.lastStatusChangeAt), { addSuffix: true })
                    : 'Never'}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              {isAvailable && (
                <a
                  href={product.addToCartUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  🛒 Add to Cart
                </a>
              )}
              <a
                href={product.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                View on {product.retailer}
              </a>
              <button
                onClick={() => toggleMutation.mutate(!product.isActive)}
                className="btn btn-secondary"
                disabled={toggleMutation.isPending}
              >
                {product.isActive ? '⏸ Pause Monitoring' : '▶ Resume Monitoring'}
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this product?')) {
                    deleteMutation.mutate();
                  }
                }}
                className="btn btn-danger"
                disabled={deleteMutation.isPending}
              >
                🗑 Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Availability details */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Availability</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Online</span>
            <span className={`badge ${product.currentStatus.online.available ? 'badge-green' : 'badge-red'}`}>
              {product.currentStatus.online.available ? 'Available' : 'Unavailable'}
            </span>
          </div>
          {product.storeLocations?.map((store) => {
            const storeStatus = product.currentStatus.stores.find(s => s.storeId === store.storeId);
            return (
              <div key={store.storeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{store.storeName}</span>
                  <span className="text-gray-500 text-sm ml-2">{store.zipCode}</span>
                </div>
                <span className={`badge ${storeStatus?.available ? 'badge-green' : 'badge-red'}`}>
                  {storeStatus?.available ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* History */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory History</h2>
        
        {historyLoading ? (
          <div className="text-center py-8 text-gray-500">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No inventory changes recorded yet
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 border-l-4 bg-gray-50 rounded-r-lg"
                style={{
                  borderLeftColor: entry.eventType === 'in_stock' ? '#22c55e' : '#ef4444',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {entry.eventType === 'in_stock' ? '📈' : '📉'}
                  </span>
                  <div>
                    <span className="font-medium">
                      {entry.eventType === 'in_stock' ? 'Came in stock' : 'Went out of stock'}
                    </span>
                    {entry.durationInStockMs && (
                      <span className="text-gray-500 text-sm ml-2">
                        (was in stock for {formatDuration(entry.durationInStockMs)})
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
