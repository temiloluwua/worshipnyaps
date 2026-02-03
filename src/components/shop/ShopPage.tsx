import React, { useState } from 'react';
import { Store } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { AuthModal } from '../auth/AuthModal';
import { stripeProducts } from '../../stripe-config';

export function ShopPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <Store className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Worship & Yapps Store
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover faith-building resources and community merchandise to enhance your spiritual journey
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
            <p className="text-gray-500 text-lg">No products available at the moment.</p>
            <p className="text-gray-400 mt-2">Check back soon for new items!</p>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signup"
      />
    </div>
  );
}