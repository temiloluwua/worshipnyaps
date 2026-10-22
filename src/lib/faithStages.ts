// Single source of truth for the optional "where are you in your faith"
// selector shown during onboarding and editable in the profile. Stored as a
// single text value on users.faith_stage (nullable — users can skip it).

export interface FaithStage {
  value: string;
  emoji: string;
  label: string;
}

export const FAITH_STAGES: FaithStage[] = [
  { value: 'curious', emoji: '🔎', label: 'Just curious' },
  { value: 'new',     emoji: '🌱', label: 'New in faith' },
  { value: 'growing', emoji: '🌿', label: 'Growing' },
  { value: 'mature',  emoji: '🌳', label: 'Mature' },
];

// Resolve a stored value to its display definition (null if unset/unknown).
export const faithStageInfo = (value?: string | null): FaithStage | null =>
  FAITH_STAGES.find((s) => s.value === value) ?? null;
