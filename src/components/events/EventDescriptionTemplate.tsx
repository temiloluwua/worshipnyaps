import React from 'react';
import { ClipboardList, MapPin, Phone, AlertCircle, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DescriptionTemplate } from '../../lib/supabase';

interface EventDescriptionDisplayProps {
  template: DescriptionTemplate;
}

export const EventDescriptionDisplay: React.FC<EventDescriptionDisplayProps> = ({ template }) => {
  const { t } = useTranslation();

  const hasContent = template.whatToExpect || (template.whatToBring && template.whatToBring.length > 0) ||
    template.parkingDirections || template.contactInfo || template.specialNotes;

  if (!hasContent) return null;

  return (
    <div className="space-y-4">
      {template.whatToExpect && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-sm">
              {t('eventTemplate.whatToExpect')}
            </h4>
          </div>
          <p className="text-blue-800 dark:text-blue-300 text-sm leading-relaxed whitespace-pre-wrap">
            {template.whatToExpect}
          </p>
        </div>
      )}

      {template.whatToBring && template.whatToBring.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="w-4 h-4 text-green-600 dark:text-green-400" />
            <h4 className="font-semibold text-green-900 dark:text-green-200 text-sm">
              {t('eventTemplate.whatToBring')}
            </h4>
          </div>
          <ul className="space-y-1">
            {template.whatToBring.map((item, i) => (
              <li key={i} className="text-green-800 dark:text-green-300 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {template.parkingDirections && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h4 className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
              {t('eventTemplate.parkingDirections')}
            </h4>
          </div>
          <p className="text-amber-800 dark:text-amber-300 text-sm leading-relaxed whitespace-pre-wrap">
            {template.parkingDirections}
          </p>
        </div>
      )}

      {template.contactInfo && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h4 className="font-semibold text-gray-900 dark:text-gray-200 text-sm">
              {t('eventTemplate.contactInfo')}
            </h4>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm">{template.contactInfo}</p>
        </div>
      )}

      {template.specialNotes && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <h4 className="font-semibold text-red-900 dark:text-red-200 text-sm">
              {t('eventTemplate.specialNotes')}
            </h4>
          </div>
          <p className="text-red-800 dark:text-red-300 text-sm leading-relaxed whitespace-pre-wrap">
            {template.specialNotes}
          </p>
        </div>
      )}
    </div>
  );
};

interface EventDescriptionFormProps {
  template: DescriptionTemplate;
  onChange: (template: DescriptionTemplate) => void;
}

export const EventDescriptionForm: React.FC<EventDescriptionFormProps> = ({ template, onChange }) => {
  const { t } = useTranslation();
  const [bringItem, setBringItem] = React.useState('');

  const addBringItem = () => {
    if (!bringItem.trim()) return;
    onChange({
      ...template,
      whatToBring: [...(template.whatToBring || []), bringItem.trim()],
    });
    setBringItem('');
  };

  const removeBringItem = (index: number) => {
    onChange({
      ...template,
      whatToBring: (template.whatToBring || []).filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('eventTemplate.whatToExpect')}
        </label>
        <textarea
          value={template.whatToExpect || ''}
          onChange={(e) => onChange({ ...template, whatToExpect: e.target.value })}
          placeholder={t('eventTemplate.whatToExpectPlaceholder')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('eventTemplate.whatToBring')}
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={bringItem}
            onChange={(e) => setBringItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBringItem())}
            placeholder={t('eventTemplate.whatToBringPlaceholder')}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
          <button
            type="button"
            onClick={addBringItem}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 text-sm"
          >
            {t('eventTemplate.addItem')}
          </button>
        </div>
        {(template.whatToBring || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(template.whatToBring || []).map((item, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
                {item}
                <button type="button" onClick={() => removeBringItem(i)} className="hover:text-red-500">
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('eventTemplate.parkingDirections')}
        </label>
        <textarea
          value={template.parkingDirections || ''}
          onChange={(e) => onChange({ ...template, parkingDirections: e.target.value })}
          placeholder={t('eventTemplate.parkingPlaceholder')}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('eventTemplate.contactInfo')}
        </label>
        <input
          type="text"
          value={template.contactInfo || ''}
          onChange={(e) => onChange({ ...template, contactInfo: e.target.value })}
          placeholder={t('eventTemplate.contactPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('eventTemplate.specialNotes')}
        </label>
        <textarea
          value={template.specialNotes || ''}
          onChange={(e) => onChange({ ...template, specialNotes: e.target.value })}
          placeholder={t('eventTemplate.specialNotesPlaceholder')}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
        />
      </div>
    </div>
  );
};
