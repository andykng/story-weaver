// GitHub API service for fetching repository data

const GITHUB_API_BASE = 'https://api.github.com';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  license: {
    name: string;
    spdx_id: string;
  } | null;
  default_branch: string;
}

export interface GitHubSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepo[];
}

export interface GitHubContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  download_url: string | null;
  content?: string;
}

export interface GitHubReadme {
  content: string;
  encoding: string;
}

// Parse GitHub URL to extract owner and repo
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    // Handle various GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/\?#]+)/,
      /^([^\/]+)\/([^\/]+)$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ''),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Fetch a single repository
export async function fetchRepository(owner: string, repo: string): Promise<GitHubRepo> {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Repository not found');
    }
    throw new Error('Failed to fetch repository');
  }

  return response.json();
}

// Search repositories
export async function searchRepositories(
  query: string,
  options: {
    language?: string;
    sort?: 'stars' | 'forks' | 'updated';
    order?: 'asc' | 'desc';
    perPage?: number;
    page?: number;
  } = {}
): Promise<GitHubSearchResult> {
  const { language, sort = 'stars', order = 'desc', perPage = 20, page = 1 } = options;

  let searchQuery = query;
  if (language) {
    searchQuery += ` language:${language}`;
  }

  const params = new URLSearchParams({
    q: searchQuery,
    sort,
    order,
    per_page: perPage.toString(),
    page: page.toString(),
  });

  const response = await fetch(`${GITHUB_API_BASE}/search/repositories?${params}`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to search repositories');
  }

  return response.json();
}

// Fetch trending repositories (stars gained recently)
export async function fetchTrendingRepositories(
  language?: string,
  perPage = 12
): Promise<GitHubRepo[]> {
  // Get repos created in the last week with high stars
  const date = new Date();
  date.setDate(date.getDate() - 7);
  const dateStr = date.toISOString().split('T')[0];

  let query = `created:>${dateStr} stars:>100`;
  if (language) {
    query += ` language:${language}`;
  }

  const result = await searchRepositories(query, {
    sort: 'stars',
    order: 'desc',
    perPage,
  });

  return result.items;
}

// Fetch repository README
export async function fetchReadme(owner: string, repo: string): Promise<string | null> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data: GitHubReadme = await response.json();
    // Decode base64 content
    return atob(data.content);
  } catch {
    return null;
  }
}

// Fetch repository contents (file tree)
export async function fetchContents(
  owner: string,
  repo: string,
  path = ''
): Promise<GitHubContent[]> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch contents');
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [data];
}

// Fetch file content
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch file content');
  }

  const data = await response.json();
  if (data.content) {
    return atob(data.content);
  }
  throw new Error('File content not available');
}

// Get language color
export function getLanguageColor(language: string | null): string {
  const colors: Record<string, string> = {
    JavaScript: 'hsl(53, 93%, 54%)',
    TypeScript: 'hsl(211, 60%, 48%)',
    Python: 'hsl(207, 51%, 44%)',
    Rust: 'hsl(25, 84%, 58%)',
    Go: 'hsl(194, 63%, 49%)',
    Java: 'hsl(17, 86%, 56%)',
    'C++': 'hsl(336, 70%, 52%)',
    C: 'hsl(222, 20%, 45%)',
    Ruby: 'hsl(0, 69%, 42%)',
    PHP: 'hsl(240, 45%, 55%)',
    Swift: 'hsl(16, 100%, 57%)',
    Kotlin: 'hsl(265, 82%, 51%)',
    Dart: 'hsl(195, 100%, 45%)',
    Vue: 'hsl(153, 48%, 49%)',
    CSS: 'hsl(264, 34%, 49%)',
    HTML: 'hsl(14, 100%, 57%)',
    Shell: 'hsl(120, 24%, 56%)',
  };

  return colors[language || ''] || 'hsl(var(--muted-foreground))';
}

// Format star count
export function formatStarCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

// Format date relative
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
