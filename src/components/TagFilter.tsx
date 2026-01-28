import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const POPULAR_TAGS = [
  { label: 'javascript', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { label: 'typescript', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  { label: 'python', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' },
  { label: 'ai', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  { label: 'rust', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  { label: 'go', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300' },
  { label: 'react', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' },
  { label: 'nextjs', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  { label: 'machine-learning', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300' },
  { label: 'web', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
];

interface TagFilterProps {
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  className?: string;
}

export function TagFilter({ selectedTag, onSelectTag, className }: TagFilterProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Badge
        variant={selectedTag === null ? "default" : "outline"}
        className="cursor-pointer hover:bg-primary/10 transition-colors"
        onClick={() => onSelectTag(null)}
      >
        All
      </Badge>
      {POPULAR_TAGS.map((tag) => (
        <Badge
          key={tag.label}
          variant="outline"
          className={cn(
            "cursor-pointer transition-colors",
            selectedTag === tag.label ? tag.color : "hover:bg-muted"
          )}
          onClick={() => onSelectTag(selectedTag === tag.label ? null : tag.label)}
        >
          {tag.label}
        </Badge>
      ))}
    </div>
  );
}
