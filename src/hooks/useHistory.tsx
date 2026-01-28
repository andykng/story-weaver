import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { GitHubRepo } from '@/lib/github';

export interface HistoryEntry {
  id: string;
  user_id: string;
  repo_full_name: string;
  repo_name: string;
  repo_owner: string;
  repo_description: string | null;
  repo_language: string | null;
  repo_stars: number;
  repo_url: string;
  viewed_at: string;
}

// Fetch user's history
export function useHistory(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['history', user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .order('viewed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as HistoryEntry[];
    },
    enabled: !!user,
  });
}

// Add to history
export function useAddToHistory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (repo: GitHubRepo) => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('history')
        .insert({
          user_id: user.id,
          repo_full_name: repo.full_name,
          repo_name: repo.name,
          repo_owner: repo.owner.login,
          repo_description: repo.description,
          repo_language: repo.language,
          repo_stars: repo.stargazers_count,
          repo_url: repo.html_url,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
}

// Clear history
export function useClearHistory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('history')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
}
