/*
  # Add role to event_cohosts

  Lets a host assign a specific leadership role (Worship, Bible Discussion,
  Prayer, Hospitality, Tech/Setup, Other) to each co-host. This supports
  the "people want to host but not lead" pattern — host can delegate
  specific parts of a Bible study to people who can lead them, and the app
  generates a copy-pasteable invite message tying the role to the person.

  - role: short slug from a fixed set (worship, discussion, prayer,
    hospitality, tech, other). Nullable so existing co-hosts keep working.
  - custom_role_label: free text shown when role = 'other'.
*/

ALTER TABLE public.event_cohosts
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS custom_role_label text;

NOTIFY pgrst, 'reload schema';
