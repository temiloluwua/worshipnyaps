import React, { useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  if (!isOpen) return null;

  const handleSuccess = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Continue-as-guest CTA takes the pressure off — most people land
            here before they're ready to sign up, and we'd rather they keep
            exploring than bounce. */}
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-bold shadow-sm hover:bg-blue-700 hover:shadow-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Continue as guest
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {mode === 'login' ? (
            <LoginForm
              onSuccess={handleSuccess}
              onSwitchToSignup={() => setMode('signup')}
            />
          ) : (
            <SignupForm
              onSuccess={handleSuccess}
              onSwitchToLogin={() => setMode('login')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
