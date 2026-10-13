import React from 'react';
import { MapPin, Globe } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { openCardGameBuy } from '../../lib/cardGame';

interface BuyCardGameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Amazon only ships the physical card deck within Canada, so buyers choose
// their region: Canada → Amazon.ca, everywhere else → Stripe checkout.
export function BuyCardGameModal({ isOpen, onClose }: BuyCardGameModalProps) {
  const choose = (region: 'canada' | 'intl') => {
    openCardGameBuy(region);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Where are you ordering from?" size="sm">
      <div className="space-y-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Pick your region so we send you to the right store.
        </p>
        <button
          type="button"
          onClick={() => choose('canada')}
          className="w-full flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors text-left"
        >
          <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium text-gray-900 dark:text-white text-sm">I'm in Canada 🇨🇦</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Order on Amazon.ca</div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => choose('intl')}
          className="w-full flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors text-left"
        >
          <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium text-gray-900 dark:text-white text-sm">Outside Canada 🌍</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Checkout securely with Stripe</div>
          </div>
        </button>
      </div>
    </Modal>
  );
}
