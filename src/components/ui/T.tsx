import React from 'react';
import { useTranslatedText } from '../../hooks/useTranslatedText';

// Auto-translating text node. Wrap any plain English string and it renders in
// the active language via the shared (free, cached) translation pipeline:
//   <T>Because community</T>
// Use for dynamic/marketing copy that isn't worth hand-authoring i18n keys for.
export const T: React.FC<{ children: string }> = ({ children }) => {
  return <>{useTranslatedText(children)}</>;
};
