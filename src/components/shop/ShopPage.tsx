import React from 'react';
import { Store, ShoppingBag } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { stripeProducts } from '../../stripe-config';

export function ShopPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <Store className="w-14 h-14 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Community Shop
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
          Support our community with faith-building resources and merchandise
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stripeProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}
      </div>

      {stripeProducts.length === 0 && (
        <div className="text-center py-16 px-6 max-w-md mx-auto">
          <ShoppingBag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Stocking the shelves</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            New merch and community resources are on the way. In the meantime, join an event or start a conversation.
          </p>
        </div>
      )}
    </div>
  );
}