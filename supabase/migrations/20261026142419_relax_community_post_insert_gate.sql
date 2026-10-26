/*
  # Relax the community_posts INSERT gate

  ## Why
  The previous policy required a *confirmed email* (public.email_verified())
  to create a community post. But many users sign in via phone, Apple, or
  Google (or email-confirmation is disabled), leaving auth.users.email_confirmed_at
  NULL — so their inserts were rejected with an opaque RLS error. This broke
  normal posting, including the "plan an event" poll flow (the poll hangs off a
  community_posts row).

  ## What
  The email gate was an anti-spam measure; that concern is now covered
  server-side by the spam guardrails (20261023203836_spam_guardrails.sql:
  rate limit + link gate + content filter) plus Turnstile at signup. So this
  brings community_posts in line with topics/comments: a user may insert a post
  as themselves. (email_verified() is left in place for any future use.)
*/

DROP POLICY IF EXISTS "Verified users can post" ON public.community_posts;
DROP POLICY IF EXISTS "Anyone authenticated can post" ON public.community_posts;

CREATE POLICY "Authenticated users can post"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (author_id = (select auth.uid()));

NOTIFY pgrst, 'reload schema';
