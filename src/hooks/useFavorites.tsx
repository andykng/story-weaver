import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { GitHubRepo } from '@/lib/github';
import { toast } from 'sonner';

export interface Favorite {
  id: string;
  user_id: string;
  collection_id: string | null;
  repo_full_name: string;
  repo_name: string;
  repo_owner: string;
  repo_description: string | null;
  repo_language: string | null;
  repo_stars: number;
  repo_forks: number;
  repo_url: string;
  notes: string | null;
  created_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

// Fetch user's favorites
export function useFavorites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Favorite[];
    },
    enabled: !!user,
  });
}

// Check if a repo is favorited
export function useIsFavorited(repoFullName: string) {
  const { data: favorites } = useFavorites();
  return favorites?.some((f) => f.repo_full_name === repoFullName) ?? false;
}

// Add to favorites
export function useAddFavorite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (repo: GitHubRepo) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          repo_full_name: repo.full_name,
          repo_name: repo.name,
          repo_owner: repo.owner.login,
          repo_description: repo.description,
          repo_language: repo.language,
          repo_stars: repo.stargazers_count,
          repo_forks: repo.forks_count,
          repo_url: repo.html_url,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Added to favorites');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Already in favorites');
      } else {
        toast.error('Failed to add to favorites');
      }
    },
  });
}

// Remove from favorites
export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repoFullName: string) => {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('repo_full_name', repoFullName);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Removed from favorites');
    },
    onError: () => {
      toast.error('Failed to remove from favorites');
    },
  });
}

// Update favorite notes
export function useUpdateFavoriteNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from('favorites')
        .update({ notes })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Notes updated');
    },
  });
}

// Fetch collections
export function useCollections() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['collections', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Collection[];
    },
    enabled: !!user,
  });
}

// Create collection
export function useCreateCollection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, description, color }: { name: string; description?: string; color?: string }) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('collections')
        .insert({
          user_id: user.id,
          name,
          description,
          color: color || '#6366f1',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection created');
    },
  });
}

// Add favorite to collection
export function useAddToCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ favoriteId, collectionId }: { favoriteId: string; collectionId: string | null }) => {
      const { error } = await supabase
        .from('favorites')
        .update({ collection_id: collectionId })
        .eq('id', favoriteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Moved to collection');
    },
  });
}
