import React, { useState } from 'react';
import { Store } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { AuthModal } from '../auth/AuthModal';
import { stripeProducts } from '../../stripe-config';

export function ShopPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);

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
            onAuthRequired={() => setShowAuthModal(true)}
          />
        ))}
      </div>

      {stripeProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No products available at the moment.</p>
          <p className="text-gray-400 dark:text-gray-500 mt-2">Check back soon for new items!</p>
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signup"
      />
    </div>
  );
}