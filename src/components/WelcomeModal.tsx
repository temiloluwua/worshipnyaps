import React from 'react';
import { Layers, MapPin, Users, Spade } from 'lucide-react';
import { Modal } from './ui/Modal';
import { T } from './ui/T';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// A quick, one-screen intro shown once to new visitors so they understand what
// the app is and how to move around it (the four bottom-nav destinations).
// Dismissed state is persisted by the caller via localStorage.
const items = [
  { Icon: Layers, label: 'Topics', blurb: "A fresh Bible-study question every day — swipe, react, and discuss." },
  { Icon: MapPin, label: 'Events', blurb: 'Find or host local meetups: studies, hikes, hangouts.' },
  { Icon: Users, label: 'Community', blurb: 'Connect with other believers and message them directly.' },
  { Icon: Spade, label: 'The card game', blurb: 'Love it in person? Grab the physical deck to play at your table.' },
];

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Welcome to Worship N Yaps 👋" size="md">
      <div className="space-y-5">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <T>Real conversations about faith, with believers near and far. Here's the quick tour — use the tabs at the bottom to jump around anytime.</T>
        </p>

        <ul className="space-y-3">
          {items.map(({ Icon, label, blurb }) => (
            <li key={label} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white"><T>{label}</T></p>
                <p className="text-xs text-gray-500 dark:text-gray-400"><T>{blurb}</T></p>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
        >
          <T>Start exploring</T>
        </button>
      </div>
    </Modal>
  );
}
