// Discussion Topics for Calgary Bible Study Community
// Upload your existing topics here by replacing this sample data

export interface Topic {
  id: string;
  title: string;
  category: string;
  bibleReference: string;
  questions: string[];
  authorName: string;
  createdAt: string;
  comments: number;
  tags: string[];
  likes: number;
  views: number;
  isPinned: boolean;
  content?: string;
  topic_type?: 'preselected' | 'community';
  bible_verse?: string;
}

// Sample topics - replace with your actual topics
export const discussionTopics: Topic[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    title: 'Is pretty privilege real?',
    category: 'life-questions',
    bibleReference: 'Ecclesiastes 9:8-11; 1 Peter 3:3-4; Ephesians 4:11',
    questions: [
      'How to discern with the heart vs flesh?',
      'What prevents us from seeing people like Jesus?',
      'How much should we play into the physical beauty?',
      'False validation, without respect from people',
      'How does society\'s beauty standards affect our self-worth?',
      'What does the Bible say about inner vs outer beauty?',
    ],
    authorName: 'Sarah M.',
    createdAt: '2 hours ago',
    comments: 12,
    tags: ['beauty', 'identity', 'society'],
    likes: 8,
    views: 45,
    isPinned: false,
  },
  {
    id: 'b2c3d4e5-f6g7-8901-2345-678901bcdefg',
    title: 'How do we handle comparison?',
    category: 'life-questions',
    bibleReference: 'Galatians 6:4; 2 Corinthians 10:12; Philippians 2:3',
    questions: [
      'Why do we compare ourselves to others?',
      'How can we find contentment in Christ?',
      'What does healthy self-reflection look like?',
      'Breaking free from social media comparison',
      'How do we celebrate others without feeling inadequate?',
      'What role does gratitude play in overcoming comparison?',
    ],
    authorName: 'David K.',
    createdAt: '4 hours ago',
    comments: 18,
    tags: ['comparison', 'contentment', 'identity'],
    likes: 15,
    views: 67,
    isPinned: true,
  },
  {
    id: 'c3d4e5f6-g7h8-9012-3456-789012cdefgh',
    title: 'What does it mean to be a good yapper in faith?',
    category: 'community',
    bibleReference: 'Proverbs 27:17; Ecclesiastes 4:12; James 1:19',
    questions: [
      'How can good conversation build community?',
      'What makes someone a great discussion partner?',
      'How do we balance talking and listening?',
      'What role does asking good questions play in discipleship?',
      'How can we create safe spaces for deep conversations?',
      'What does it mean to "sharpen" each other through dialogue?',
    ],
    authorName: 'Jessica P.',
    createdAt: '1 day ago',
    comments: 24,
    tags: ['conversation', 'community', 'discipleship'],
    likes: 22,
    views: 89,
    isPinned: false,
  },
];

// Instructions for uploading your topics:
// 1. Replace the sample topics above with your actual topics
// 2. Follow the same format for each topic
// 3. Make sure to include all required fields
// 4. You can add as many topics as you want to the array