-- Add 'snacks' to the food_items category CHECK constraint.
-- The original inline constraint excluded 'snacks', causing inserts
-- with category = 'snacks' to fail with a constraint violation error.
-- PostgreSQL auto-names inline constraints as <table>_<column>_check.

ALTER TABLE public.food_items
  DROP CONSTRAINT IF EXISTS food_items_category_check;

ALTER TABLE public.food_items
  ADD CONSTRAINT food_items_category_check
  CHECK (category IN ('main', 'side', 'snacks', 'dessert', 'beverage', 'setup'));

NOTIFY pgrst, 'reload schema';
