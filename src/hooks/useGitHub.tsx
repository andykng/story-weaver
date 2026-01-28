import { useQuery, useMutation } from '@tanstack/react-query';
import {
  fetchRepository,
  searchRepositories,
  fetchTrendingRepositories,
  fetchReadme,
  fetchContents,
  parseGitHubUrl,
  GitHubRepo,
} from '@/lib/github';

// Hook for fetching a single repository
export function useRepository(owner: string, repo: string) {
  return useQuery({
    queryKey: ['repository', owner, repo],
    queryFn: () => fetchRepository(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for searching repositories
export function useSearchRepositories(
  query: string,
  options?: {
    language?: string;
    sort?: 'stars' | 'forks' | 'updated';
    perPage?: number;
    page?: number;
  }
) {
  return useQuery({
    queryKey: ['searchRepositories', query, options],
    queryFn: () => searchRepositories(query, options),
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for fetching trending repositories
export function useTrendingRepositories(language?: string) {
  return useQuery({
    queryKey: ['trendingRepositories', language],
    queryFn: () => fetchTrendingRepositories(language),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for fetching repository README
export function useReadme(owner: string, repo: string) {
  return useQuery({
    queryKey: ['readme', owner, repo],
    queryFn: () => fetchReadme(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for fetching repository contents
export function useContents(owner: string, repo: string, path = '') {
  return useQuery({
    queryKey: ['contents', owner, repo, path],
    queryFn: () => fetchContents(owner, repo, path),
    enabled: !!owner && !!repo,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for resolving a GitHub URL
export function useResolveGitHubUrl() {
  return useMutation({
    mutationFn: async (url: string): Promise<GitHubRepo> => {
      const parsed = parseGitHubUrl(url);
      if (!parsed) {
        throw new Error('Invalid GitHub URL');
      }
      return fetchRepository(parsed.owner, parsed.repo);
    },
  });
}
