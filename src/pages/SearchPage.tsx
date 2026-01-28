import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Loader2, Filter, LayoutGrid, List } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { RepoCard } from '@/components/RepoCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSearchRepositories } from '@/hooks/useGitHub';
import { parseGitHubUrl } from '@/lib/github';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { value: 'all', label: 'All Languages' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
  { value: 'c++', label: 'C++' },
  { value: 'ruby', label: 'Ruby' },
];

const SORT_OPTIONS = [
  { value: 'stars', label: 'Most Stars' },
  { value: 'forks', label: 'Most Forks' },
  { value: 'updated', label: 'Recently Updated' },
];

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [language, setLanguage] = useState<string>('all');
  const [sort, setSort] = useState<'stars' | 'forks' | 'updated'>('stars');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: results, isLoading, isFetching } = useSearchRepositories(
    query,
    {
      language: language === 'all' ? undefined : language,
      sort,
      perPage: 30,
    }
  );

  const handleSearch = (searchQuery: string, isUrl: boolean) => {
    if (isUrl) {
      const parsed = parseGitHubUrl(searchQuery);
      if (parsed) {
        navigate(`/repo/${parsed.owner}/${parsed.repo}`);
        return;
      }
    }
    setQuery(searchQuery);
  };

  const handleRepoClick = (owner: string, repo: string) => {
    navigate(`/repo/${owner}/${repo}`);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Search className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Search</h1>
        </div>

        {/* Search Bar */}
        <SearchBar 
          onSearch={handleSearch} 
          className="max-w-3xl mb-6"
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
          </div>
          
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results */}
        {query.length < 2 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Enter at least 2 characters to search</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : results && results.items.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {results.total_count.toLocaleString()} repositories found
              {isFetching && <Loader2 className="inline ml-2 h-4 w-4 animate-spin" />}
            </p>
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-3"
            )}>
              {results.items.map((repo) => (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  onClick={() => handleRepoClick(repo.owner.login, repo.name)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No repositories found for "{query}"</p>
            <p className="text-sm mt-2">Try different keywords or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
