import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  onSuccess?: () => void;
}

export function PhoneVerificationModal({ isOpen, onClose, phoneNumber, onSuccess }: PhoneVerificationModalProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      toast.error('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: code,
        type: 'sms',
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Phone number verified successfully!');
        setCode('');
        onSuccess?.();
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close verification modal"
          className="absolute top-3 right-3 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-gray-700 shadow-md p-2 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Phone</h2>
          <p className="text-gray-600 mb-6">
            We sent a verification code to {phoneNumber}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Verify'
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 text-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
