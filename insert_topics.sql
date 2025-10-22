-- Insert topics from CSV
-- Note: Using a system user ID for author_id. In production, these should be associated with actual users.

INSERT INTO topics (title, category, bible_verse, content, tags) VALUES
('What does it mean to be a disciple?', 'Faith', 'Matthew 28:19-20, Acts 11:29, 2 Timothy 4:2, (Proverbs 11:14, 26:5-6), Hebrews 10:25', '* What is a disciple? (Matthew 16:23-25 ; 28:19-20)
* Who is disciplining you? (Proverbs 11:14, 26:5-6)
* Who are you disciplining? (Galatians 5:13-14)
• what is the role of elders in community?
• Can your mentor be younger? Spiritual age v real age
• How to get a mentor? Pursue them or wait?', ARRAY['discipleship', 'mentorship']),

('What does it mean to be the light of the world?', 'Faith', 'Matthew 5:14-16 ; John 8:12-19 ; Ephesians 5:8-16 ; 1 John 1:5-2:2; John 1:5', '•What is light and its effect? What does it mean to live in the light?
• How can we be the light of Christ to other people?', ARRAY['witness', 'testimony']),

('Can guys and girls be friends?', 'Relationships', '1 Corinthians 7:1-40', 'What boundaries should be in place to ensure healthy relationships? What does emotional maturity look like?', ARRAY['friendship', 'boundaries']),

('Is pretty privilege real?', 'Relationships', 'Ecclesiastes 9:8-11; 1 Peter 3:3-4; Ephesians 3:11', '* How to discern with the heart and not the flesh?
* What else prevents us from seeing people like Jesus?
* How much should we play into the physical beauty?', ARRAY['beauty', 'discernment', 'new-believer']),

('What is aura and is it demonic?', 'Lifestyle', 'Matthew 7:15-20', 'What is good aura?
 Do you have a persona or wear a mask?
What is our true self?
 Do you act different based on who you''re around?', ARRAY['identity', 'authenticity', 'new-believer']),

('How to be a good friend?', 'Relationships', 'John 15:13: proverbs 27:17; 1 Corinthians 15:33', '* Have you had bad friends before, what happened?
* How to pick a friend?
* What can we learn from Jesus''s life about friendships?', ARRAY['friendship', 'relationships']),

('What does a healthy community look like?', 'Relationships', 'Acts 2:42-47', '* What ruins community?
* What would you like from community?
* How can you serve your community?
* What kind of community did Jesus have?', ARRAY['community', 'fellowship']),

('How to share the gospel?', 'Faith', 'Matthew 28:19-20', '* What are different methods?
* Share testimonies?
* How much of a role do we play in others peoples salvation or is it predestined?
* Pray for _____', ARRAY['evangelism', 'gospel']),

('How to honor your parents as an adult?', 'Relationships', 'Ephesians 6:2; Colossians 3:20', '* How has your relationship changed with your parents as an adult?
* Is it high trust or low trust?', ARRAY['family', 'honor']),

('Secular music', 'Lifestyle', '1 Corinthians 10:23; Galatians 5:13; Proverbs 4:23; Mark 4:24', 'What is permissible?
What is beneficial?
Is everything that deep? Can something be permissible and sinful?', ARRAY['music', 'discernment']),

('Discernment', 'Faith', 'James 1:5; Ephesians 5:6-10', '• how to discern if you bad feeling is a mistake or an opportunity not trusting in your understanding
• How to hear Gods voice? (rhema and logos)
What are Litmus tests?
• which way will make me rely on God more?
• Which way is less selfish?
Share stories that taught you discernment?', ARRAY['discernment', 'wisdom']),

('Soul ties', 'Relationships', 'Matthew 19:4-6; 1 Corinthians 6:13-20', '• what is a soul tie? Are they real?
• Can you have a healthy soul tie? (1 Samuel 18:1)
• How to guard your heart without being guarded(boundaries)? (Proverbs 4:23)
•if you have a soul tie, is there grace/deliverance possible? (Revelation 21:5)', ARRAY['relationships', 'boundaries', 'purity']),

('Gossip vs advice - How to deal with conflict', 'Relationships', 'Matthew 18:15-20, proverbs 27:15, Ephesians 4:15', '• How was conflict resolved in your home?
• How does Jesus tell us to resolve conflict? (Matthew 18:15)
• What attachment style do you have and how can we become secure in relationships? (1 John 4:18)
• How each other accountable to have hard conversations and be at peace… (Matthew 5:23)
• how to deflect gossip?', ARRAY['conflict', 'gossip', 'communication']),

('Is it repentance if you still struggle?', 'Faith', '2 Corinthians 3:16-18 ; 7:8-11 ; James 4:7-10', '• What is sin?
• How do you flee temptation?
• How do you break the cycle of habitual sin?', ARRAY['repentance', 'sin', 'sanctification']),

('How have you encountered the spiritual realm?', 'Faith', 'Ephesians 6:12;  Hebrews 1:14;1 Timothy 4:1; Mark 9:25', 'What opens us up to demons? What role do angels play?
How to activate the power of the name of Jesus?', ARRAY['spiritual-warfare', 'supernatural']),

('What does it mean to greet everyone?', 'Relationships', '1 Peter 5:14; 2 John 1:10; 1 Corinthians 16:20; 1 Corinthians 1:10; 1 Thessalonians 5:11', 'What if it''s not my personality to be social? Why is it important to greet everyone? What are things that cause us to have bias in society? How can acknowledging someone important to their humanity and value? How should we greet people and does it have to be the same?', ARRAY['hospitality', 'community']),

('Is it better to burn with lust or get married? Young marriage', 'Relationships', '1 Corinthians 7:9; 1 Timothy 4:3; Matthew 5:8', 'How to overcome lust? Red flags in dating?', ARRAY['marriage', 'dating', 'purity']),

('Does Christianity and politics mix?', 'Lifestyle', 'Proverbs 21:1-9; Romans 13:1-7; 1 Timothy 2:1-2', 'Is it our responsibility to be involved in politics? Should I vote for the Christian candidate?', ARRAY['politics', 'citizenship']),

('Are you in a situationship or relationship with God?', 'Faith', 'Revelation 3:16; James 4:8', 'What does it mean to have a relationship with God? What are your reservations? Whats the difference in believing in God and loving God?
How can prayer deepen your relationship?', ARRAY['relationship-with-god', 'commitment']),

('Once saved, always saved?', 'Faith', '1 Peter 1:5; Hebrews 6:4-6; 1 Corinthians 9:27; Matthew 7:21-23; Romans 11:29', 'Can you lose your salvation?', ARRAY['salvation', 'theology']);
