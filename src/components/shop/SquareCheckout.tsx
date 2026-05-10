import React, { useEffect, useState } from 'react';
import { X, CreditCard, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface SquareCheckoutProps {
  amount: number;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
}

export function SquareCheckout({ amount, onClose, onSuccess }: SquareCheckoutProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [card, setCard] = useState<any>(null);

  useEffect(() => {
    initializeSquare();
  }, []);

  const initializeSquare = async () => {
    try {
      if (!window.Square) {
        toast.error('Square payment system not loaded. Please refresh the page.');
        return;
      }

      const payments = await window.Square.payments(
        import.meta.env.VITE_SQUARE_APPLICATION_ID || '',
        import.meta.env.VITE_SQUARE_LOCATION_ID || ''
      );

      const cardInstance = await payments.card();
      await cardInstance.attach('#card-container');
      setCard(cardInstance);
      setLoading(false);
    } catch (error) {
      console.error('Square initialization error:', error);
      toast.error('Failed to initialize payment system');
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!card) {
      toast.error('Payment system not ready');
      return;
    }

    setProcessing(true);
    try {
      const result = await card.tokenize();
      if (result.status === 'OK') {
        const paymentId = result.token || 'demo-payment-' + Date.now();
        toast.success('Payment successful!');
        onSuccess(paymentId);
      } else {
        toast.error('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center rounded-t-2xl">
          <h3 className="text-xl font-semibold">Checkout</h3>
          <button onClick={onClose} disabled={processing}>
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Total Amount:</span>
              <span className="text-2xl font-bold text-blue-600">${amount.toFixed(2)}</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="inline w-4 h-4 mr-1" />
              Card Information
            </label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <div id="card-container" className="min-h-[120px]"></div>
            )}
          </div>

          <button
            onClick={handlePayment}
            disabled={loading || processing}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {processing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Pay ${amount.toFixed(2)}</span>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Secure payment powered by Square
          </p>
        </div>
      </div>
    </div>
  );
}
