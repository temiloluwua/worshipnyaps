import { useState, useCallback } from 'react';
import { supabase, Topic, UserProfile } from '../lib/supabase';
import { useAuth } from './useAuth';
import { Hashtag } from './useHashtags';

export type SearchTab = 'all' | 'people' | 'topics' | 'hashtags';

interface SearchResults {
  people: UserProfile[];
  topics: Topic[];
  hashtags: Hashtag[];
}

export const useSearch = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    people: [],
    topics: [],
    hashtags: []
  });
  const [loading, setLoading] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);

  const search = useCallback(async (searchQuery: string, tab: SearchTab = 'all') => {
    if (!searchQuery.trim()) {
      setResults({ people: [], topics: [], hashtags: [] });
      return;
    }

    setLoading(true);
    setQuery(searchQuery);

    try {
      const newResults: SearchResults = { people: [], topics: [], hashtags: [] };

      if (tab === 'all' || tab === 'people') {
        const { data: people } = await supabase
          .from('users')
          .select('*')
          .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(tab === 'all' ? 5 : 20);

        newResults.people = people || [];
      }

      if (tab === 'all' || tab === 'topics') {
        const { data: topics } = await supabase
          .from('topics')
          .select(`
            *,
            users!topics_author_id_fkey (
              id,
              name,
              avatar_url
            )
          `)
          .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
          .order('created_at', { ascending: false })
          .limit(tab === 'all' ? 5 : 20);

        newResults.topics = topics || [];
      }

      if (tab === 'all' || tab === 'hashtags') {
        const { data: hashtags } = await supabase
          .from('hashtags')
          .select('*')
          .ilike('name', `%${searchQuery}%`)
          .order('usage_count', { ascending: false })
          .limit(tab === 'all' ? 5 : 20);

        newResults.hashtags = hashtags || [];
      }

      setResults(newResults);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSuggestedUsers = useCallback(async () => {
    if (!user) {
      setSuggestedUsers([]);
      return;
    }

    try {
      const { data: connections } = await supabase
        .from('connections')
        .select('connected_user_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const connectedIds = (connections || []).map(c => c.connected_user_id);
      connectedIds.push(user.id);

      const { data: currentProfile } = await supabase
        .from('users')
        .select('interests')
        .eq('id', user.id)
        .maybeSingle();

      const userInterests = currentProfile?.interests || [];

      let query = supabase
        .from('users')
        .select('*')
        .not('id', 'in', `(${connectedIds.join(',')})`)
        .limit(10);

      const { data: potentialUsers } = await query;

      if (!potentialUsers || potentialUsers.length === 0) {
        setSuggestedUsers([]);
        return;
      }

      const scoredUsers = potentialUsers.map(potentialUser => {
        let score = 0;

        if (userInterests.length > 0 && potentialUser.interests) {
          const sharedInterests = userInterests.filter(
            (i: string) => potentialUser.interests.includes(i)
          );
          score += sharedInterests.length * 10;
        }

        return { ...potentialUser, score };
      });

      scoredUsers.sort((a, b) => b.score - a.score);

      setSuggestedUsers(scoredUsers.slice(0, 5));
    } catch (error) {
      console.error('Error fetching suggested users:', error);
    }
  }, [user]);

  const searchByInterests = useCallback(async (interests: string[]) => {
    if (interests.length === 0) return [];

    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .overlaps('interests', interests)
        .limit(20);

      return data || [];
    } catch (error) {
      console.error('Error searching by interests:', error);
      return [];
    }
  }, []);

  const clearResults = useCallback(() => {
    setQuery('');
    setResults({ people: [], topics: [], hashtags: [] });
  }, []);

  return {
    query,
    results,
    loading,
    suggestedUsers,
    search,
    fetchSuggestedUsers,
    searchByInterests,
    clearResults
  };
};
