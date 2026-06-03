// Canonical list of supported cities. Used in profile and event creation
// dropdowns so values stay consistent across the app for filtering.
export const SUPPORTED_CITIES = [
  'Calgary',
  'Edmonton',
  'Vancouver',
  'Toronto',
  'Ottawa',
  'Montreal',
  'Winnipeg',
  'Saskatoon',
  'Regina',
  'Hamilton',
  'Halifax',
  'Quebec City',
  'Victoria',
  'Kitchener',
  'London',
  'Other',
] as const;

export type SupportedCity = (typeof SUPPORTED_CITIES)[number];
