import React, { useState } from 'react';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { StripeProduct } from '../../stripe-config';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: StripeProduct;
}

const SHOP_CHECKOUT_URL = 'https://buy.stripe.com/bJeaEX7a38rZ1jv9ao0oM00';

export function ProductCard({ product }: ProductCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handlePurchase = () => {
    setIsLoading(true);
    try {
      const checkoutWindow = window.open(SHOP_CHECKOUT_URL, '_blank', 'noopener,noreferrer');
      if (!checkoutWindow) {
        window.location.assign(SHOP_CHECKOUT_URL);
        return;
      }
      checkoutWindow.opener = null;
      setIsLoading(false);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to redirect to checkout');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700">
      <div className="aspect-w-16 aspect-h-9 bg-gray-100 dark:bg-gray-700">
        {!imageError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-48 object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-48 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-700 dark:to-gray-600">
            <ShoppingCart className="w-16 h-16 text-blue-300 dark:text-gray-500" />
          </div>
        )}
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
