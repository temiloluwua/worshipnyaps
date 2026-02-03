import React from 'react';
import { CheckCircle, ArrowLeft, Home } from 'lucide-react';

interface SuccessPageProps {
  onBackToShop?: () => void;
  onBackToHome?: () => void;
}

export function SuccessPage({ onBackToShop, onBackToHome }: SuccessPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Payment Successful!
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Thank you for your purchase! You'll receive a confirmation email shortly with your order details.
          </p>

          <div className="space-y-3">
            {onBackToShop && (
              <button
                onClick={onBackToShop}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Continue Shopping
              </button>
            )}

            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
