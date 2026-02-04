import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

const RETAILERS = [
  { id: 'bestbuy', name: 'Best Buy', icon: '🟡' },
  // Future retailers
  // { id: 'amazon', name: 'Amazon', icon: '📦' },
  // { id: 'walmart', name: 'Walmart', icon: '🔵' },
  // { id: 'target', name: 'Target', icon: '🔴' },
];

export default function AddProduct() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [retailer, setRetailer] = useState('bestbuy');
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');

  const createMutation = useMutation({
    mutationFn: api.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      retailer,
      sku,
      name,
      priority,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Product</h1>
        <p className="text-gray-500 mt-1">Start monitoring a new product for inventory availability</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Retailer selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Retailer
          </label>
          <div className="grid grid-cols-2 gap-3">
            {RETAILERS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRetailer(r.id)}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  retailer === r.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl mr-2">{r.icon}</span>
                <span className="font-medium">{r.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SKU input */}
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-2">
            Product SKU / ID
          </label>
          <input
            id="sku"
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="e.g., 6505727"
            className="input"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Find this in the product URL or product details page
          </p>
        </div>

        {/* Name input */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Product Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., PlayStation 5 Console"
            className="input"
            required
          />
        </div>

        {/* Priority selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPriority('normal')}
              className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                priority === 'normal'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">Normal</div>
              <div className="text-sm text-gray-500">Check every 30 seconds</div>
            </button>
            <button
              type="button"
              onClick={() => setPriority('high')}
              className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                priority === 'high'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">⚡ High Priority</div>
              <div className="text-sm text-gray-500">Check every 10 seconds</div>
            </button>
          </div>
        </div>

        {/* Error message */}
        {createMutation.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">
              {(createMutation.error as Error).message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || !sku || !name}
            className="btn btn-primary flex-1"
          >
            {createMutation.isPending ? 'Adding...' : 'Add Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
