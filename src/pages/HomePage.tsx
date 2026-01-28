import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { TagFilter } from '@/components/TagFilter';
import { RepoCard } from '@/components/RepoCard';
import { useTrendingRepositories, useSearchRepositories } from '@/hooks/useGitHub';
import { parseGitHubUrl } from '@/lib/github';

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: trendingRepos, isLoading: trendingLoading } = useTrendingRepositories(selectedTag || undefined);
  const { data: searchResults, isLoading: searchLoading } = useSearchRepositories(
    searchQuery,
    { language: selectedTag || undefined }
  );

  const handleSearch = (query: string, isUrl: boolean) => {
    if (isUrl) {
      const parsed = parseGitHubUrl(query);
      if (parsed) {
        navigate(`/repo/${parsed.owner}/${parsed.repo}`);
        return;
      }
    }
    setSearchQuery(query);
  };

  const handleRepoClick = (owner: string, repo: string) => {
    navigate(`/repo/${owner}/${repo}`);
  };

  const displayedRepos = searchQuery ? searchResults?.items : trendingRepos;
  const isLoading = searchQuery ? searchLoading : trendingLoading;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-6 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              GitExplorer
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Discover, analyze, and organize GitHub repositories with the power of AI.
            Paste a URL or search by keywords.
          </p>
          
          <SearchBar 
            onSearch={handleSearch} 
            className="max-w-2xl mx-auto"
            autoFocus
          />

          <div className="mt-8">
            <TagFilter 
              selectedTag={selectedTag} 
              onSelectTag={setSelectedTag}
              className="justify-center"
            />
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">
              {searchQuery ? 'Search Results' : 'Trending Repositories'}
            </h2>
            {selectedTag && (
              <span className="text-muted-foreground">
                in {selectedTag}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : displayedRepos && displayedRepos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedRepos.map((repo) => (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  onClick={() => handleRepoClick(repo.owner.login, repo.name)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              {searchQuery 
                ? 'No repositories found. Try a different search.'
                : 'No trending repositories at the moment.'}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
