import React, { useState } from 'react';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { StripeProduct } from '../../stripe-config';
import { useAuth } from '../../hooks/useAuth';
import { createCheckoutSession } from '../../lib/stripe';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: StripeProduct;
  onAuthRequired: () => void;
}

export function ProductCard({ product, onAuthRequired }: ProductCardProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      onAuthRequired();
      return;
    }

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
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="aspect-w-16 aspect-h-9 bg-gray-200">
        <img
          src="https://images.pexels.com/photos/4705997/pexels-photo-4705997.jpeg"
          alt={product.name}
          className="w-full h-48 object-cover"
        />
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
        <p className="text-gray-600 mb-4 text-sm leading-relaxed">{product.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-indigo-600">
            C${product.price.toFixed(2)}
          </div>
          
          <button
            onClick={handlePurchase}
            disabled={isLoading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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