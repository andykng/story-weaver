import { Star, GitFork, ExternalLink, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GitHubRepo, getLanguageColor, formatStarCount, formatRelativeDate } from '@/lib/github';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useAddFavorite, useRemoveFavorite, useFavorites } from '@/hooks/useFavorites';

interface RepoCardProps {
  repo: GitHubRepo;
  onClick?: () => void;
  className?: string;
}

export function RepoCard({ repo, onClick, className }: RepoCardProps) {
  const { user } = useAuth();
  const { data: favorites } = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  const isFavorited = favorites?.some((f) => f.repo_full_name === repo.full_name) ?? false;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    
    if (isFavorited) {
      removeFavorite.mutate(repo.full_name);
    } else {
      addFavorite.mutate(repo);
    }
  };

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 animate-fade-in",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <img 
                src={repo.owner.avatar_url} 
                alt={repo.owner.login}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-sm text-muted-foreground truncate">
                {repo.owner.login}
              </span>
            </div>
            <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
              {repo.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {repo.description || 'No description'}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            {user && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  isFavorited && "text-red-500 hover:text-red-600"
                )}
                onClick={handleFavoriteClick}
              >
                <Heart className={cn("h-4 w-4", isFavorited && "fill-current")} />
              </Button>
            )}
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 flex-wrap">
          {repo.language && (
            <div className="flex items-center gap-1.5">
              <span 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getLanguageColor(repo.language) }}
              />
              <span className="text-sm">{repo.language}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <Star className="h-4 w-4" />
            <span className="text-sm">{formatStarCount(repo.stargazers_count)}</span>
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <GitFork className="h-4 w-4" />
            <span className="text-sm">{formatStarCount(repo.forks_count)}</span>
          </div>

          <span className="text-xs text-muted-foreground ml-auto">
            Updated {formatRelativeDate(repo.updated_at)}
          </span>
        </div>

        {repo.topics && repo.topics.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {repo.topics.slice(0, 4).map((topic) => (
              <Badge key={topic} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
            {repo.topics.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{repo.topics.length - 4}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
