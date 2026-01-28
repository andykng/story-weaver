import { useState, FormEvent } from 'react';
import { Search, Link } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (query: string, isUrl: boolean) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({ 
  onSearch, 
  placeholder = "Search repositories or paste a GitHub URL...",
  className,
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  const isGitHubUrl = (text: string) => {
    return text.includes('github.com/') || /^[^\/]+\/[^\/]+$/.test(text);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), isGitHubUrl(query.trim()));
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className="relative flex items-center">
        <div className="absolute left-4 text-muted-foreground">
          {isGitHubUrl(query) ? (
            <Link className="h-5 w-5" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </div>
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="h-14 pl-12 pr-24 text-base rounded-xl border-2 border-border focus:border-primary transition-colors"
          autoFocus={autoFocus}
        />
        <Button 
          type="submit" 
          className="absolute right-2 h-10 px-6 rounded-lg"
          disabled={!query.trim()}
        >
          Search
        </Button>
      </div>
      {query && isGitHubUrl(query) && (
        <p className="text-sm text-muted-foreground mt-2 ml-1">
          Detected GitHub URL - will open repository directly
        </p>
      )}
    </form>
  );
}
