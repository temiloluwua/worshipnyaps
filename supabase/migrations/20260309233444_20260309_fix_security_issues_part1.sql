/*
  # Security Fix Part 1: Add Missing Foreign Key Index

  1. Issue Fixed
    - Added missing index on event_help_requests.assigned_user_id for better query performance
    - This index was referenced by a foreign key but lacked a covering index
  
  2. Changes
    - Creates index on `event_help_requests(assigned_user_id)` for optimal query performance
    
  3. Performance Impact
    - Improves query performance for operations involving assigned_user_id lookups
*/

CREATE INDEX IF NOT EXISTS idx_event_help_requests_assigned_user_id 
  ON public.event_help_requests(assigned_user_id);
