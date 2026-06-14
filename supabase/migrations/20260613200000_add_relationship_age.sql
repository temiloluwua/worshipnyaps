/*
  # Add relationship_status and age to user profiles

  Both optional. relationship_status is a small enum so the UI can render
  a clean dropdown without us worrying about free-text inputs that need
  moderation.
*/

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS relationship_status text
    CHECK (relationship_status IN ('single', 'married', 'in_a_relationship', 'engaged', 'prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS age integer
    CHECK (age IS NULL OR (age BETWEEN 13 AND 120));

NOTIFY pgrst, 'reload schema';
