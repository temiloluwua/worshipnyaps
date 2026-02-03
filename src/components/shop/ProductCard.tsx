import React, { useState } from 'react';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { StripeProduct } from '../../stripe-config';
import { createCheckoutSession } from '../../lib/stripe';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: StripeProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      const { url } = await createCheckoutSession({
        priceId: product.priceId,
        mode: product.mode,
        successUrl: `${window.location.origin}/shop/success`,
        cancelUrl: `${window.location.origin}/shop`,
      });

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      toast.error('Failed to start checkout process');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700">
      <div className="aspect-w-16 aspect-h-9 bg-gray-100 dark:bg-gray-700">
        <img
          src="https://images.pexels.com/photos/4705997/pexels-photo-4705997.jpeg"
          alt={product.name}
          className="w-full h-48 object-cover"
        />
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{product.name}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm leading-relaxed">{product.description}</p>

        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            C${product.price.toFixed(2)}
          </div>

          <button
            onClick={handlePurchase}
            disabled={isLoading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
            {product.mode === 'subscription' ? 'Subscribe' : 'Buy Now'}
          </button>
        </div>
      </div>
    </div>
  );
}