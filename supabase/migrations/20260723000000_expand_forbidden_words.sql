/*
  # Expand the content-filter deny list

  Adds a broader, curated set of profanity / slurs / sexual / violence /
  self-harm terms to forbidden_words. The matcher (contains_forbidden_content)
  is whole-word, so common inflected forms (e.g. fuck / fucking / fucker) are
  listed explicitly. Idempotent via ON CONFLICT.

  Admins can keep extending this privately from the SQL editor:
    INSERT INTO public.forbidden_words (word, category) VALUES ('word','other')
    ON CONFLICT (word) DO NOTHING;
*/

INSERT INTO public.forbidden_words (word, category) VALUES
  -- General profanity (+ common inflections, since matching is whole-word)
  ('fuck', 'other'), ('fucks', 'other'), ('fucked', 'other'), ('fucker', 'other'),
  ('fuckers', 'other'), ('fucking', 'other'), ('fuckwit', 'other'), ('motherfucker', 'other'),
  ('shit', 'other'), ('shits', 'other'), ('shitty', 'other'), ('bullshit', 'other'),
  ('bitch', 'other'), ('bitches', 'other'), ('bitching', 'other'),
  ('asshole', 'other'), ('assholes', 'other'), ('dickhead', 'other'),
  ('bastard', 'other'), ('bastards', 'other'),
  ('dick', 'sexual'), ('dicks', 'sexual'), ('cock', 'sexual'), ('cocks', 'sexual'),
  ('pussy', 'sexual'), ('pussies', 'sexual'), ('twat', 'sexual'),
  ('whore', 'sexual'), ('whores', 'sexual'), ('slut', 'sexual'), ('sluts', 'sexual'),
  ('cunts', 'sexual'),
  -- Sexual / explicit
  ('cum', 'sexual'), ('cumming', 'sexual'), ('blowjob', 'sexual'), ('handjob', 'sexual'),
  ('dildo', 'sexual'), ('boobs', 'sexual'), ('titties', 'sexual'), ('jerkoff', 'sexual'),
  ('masturbate', 'sexual'), ('creampie', 'sexual'), ('bukkake', 'sexual'),
  ('deepthroat', 'sexual'), ('cumshot', 'sexual'), ('milf', 'sexual'),
  ('nudes', 'sexual'), ('onlyfans', 'sexual'),
  -- Child-safety (zero tolerance)
  ('cp', 'sexual'), ('childporn', 'sexual'), ('lolicon', 'sexual'), ('jailbait', 'sexual'),
  -- Slurs
  ('niggers', 'slur'), ('nigga', 'slur'), ('niggas', 'slur'),
  ('faggots', 'slur'), ('fag', 'slur'), ('fags', 'slur'),
  ('retard', 'slur'), ('retards', 'slur'), ('retarded', 'slur'),
  ('coon', 'slur'), ('coons', 'slur'), ('wetback', 'slur'), ('wetbacks', 'slur'),
  ('beaner', 'slur'), ('beaners', 'slur'), ('gook', 'slur'), ('gooks', 'slur'),
  ('dyke', 'slur'), ('dykes', 'slur'), ('trannies', 'slur'), ('shemale', 'slur'),
  ('towelhead', 'slur'), ('raghead', 'slur'), ('paki', 'slur'), ('negro', 'slur'),
  ('sandnigger', 'slur'), ('cracker', 'slur'), ('whitey', 'slur'),
  -- Violence / threats
  ('rapes', 'violence'), ('raping', 'violence'), ('molest', 'violence'), ('molester', 'violence'),
  ('lynch', 'violence'), ('behead', 'violence'), ('massacre', 'violence'),
  -- Self-harm
  ('kys', 'self_harm'), ('killurself', 'self_harm'), ('suicide', 'self_harm'),
  ('slityourwrists', 'self_harm')
ON CONFLICT (word) DO NOTHING;

NOTIFY pgrst, 'reload schema';
