import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookMarked, 
  Folder, 
  Clock, 
  Plus, 
  Trash2, 
  Edit, 
  Star,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFavorites, useCollections, useRemoveFavorite, useCreateCollection, Favorite } from '@/hooks/useFavorites';
import { useHistory, useClearHistory } from '@/hooks/useHistory';
import { useAuth } from '@/hooks/useAuth';
import { getLanguageColor, formatStarCount, formatRelativeDate } from '@/lib/github';
import { cn } from '@/lib/utils';

function FavoriteItem({ favorite, onRemove }: { favorite: Favorite; onRemove: () => void }) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link 
              to={`/repo/${favorite.repo_owner}/${favorite.repo_name}`}
              className="font-semibold hover:text-primary transition-colors"
            >
              {favorite.repo_owner}/{favorite.repo_name}
            </Link>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {favorite.repo_description || 'No description'}
            </p>
            <div className="flex items-center gap-4 mt-2">
              {favorite.repo_language && (
                <div className="flex items-center gap-1.5">
                  <span 
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: getLanguageColor(favorite.repo_language) }}
                  />
                  <span className="text-xs">{favorite.repo_language}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Star className="h-3 w-3" />
                <span className="text-xs">{formatStarCount(favorite.repo_stars)}</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              onRemove();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        {favorite.notes && (
          <div className="mt-3 p-2 bg-muted rounded text-sm text-muted-foreground">
            {favorite.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LibraryPage() {
  const { user } = useAuth();
  const { data: favorites, isLoading: favoritesLoading } = useFavorites();
  const { data: collections } = useCollections();
  const { data: history, isLoading: historyLoading } = useHistory();
  const removeFavorite = useRemoveFavorite();
  const createCollection = useCreateCollection();
  const clearHistory = useClearHistory();

  const [newCollectionName, setNewCollectionName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      createCollection.mutate({ name: newCollectionName.trim() });
      setNewCollectionName('');
      setIsDialogOpen(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <BookMarked className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign in to access your library</h2>
            <p className="text-muted-foreground mb-4">
              Save repositories, organize collections, and track your history.
            </p>
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <BookMarked className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Library</h1>
        </div>

        <Tabs defaultValue="favorites" className="space-y-6">
          <TabsList>
            <TabsTrigger value="favorites" className="gap-2">
              <Star className="h-4 w-4" />
              Favorites ({favorites?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="collections" className="gap-2">
              <Folder className="h-4 w-4" />
              Collections ({collections?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Favorites Tab */}
          <TabsContent value="favorites">
            {favoritesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : favorites && favorites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {favorites.map((fav) => (
                  <FavoriteItem
                    key={fav.id}
                    favorite={fav}
                    onRemove={() => removeFavorite.mutate(fav.repo_full_name)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No favorites yet. Start exploring repositories and save the ones you like!
                  </p>
                  <Link to="/" className="mt-4 inline-block">
                    <Button variant="outline">Explore Repositories</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Collections Tab */}
          <TabsContent value="collections">
            <div className="space-y-4">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Collection
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Collection</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input
                      placeholder="Collection name"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
                    />
                    <Button onClick={handleCreateCollection} className="w-full">
                      Create
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {collections && collections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collections.map((collection) => {
                    const collectionFavorites = favorites?.filter(
                      (f) => f.collection_id === collection.id
                    );
                    return (
                      <Card key={collection.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: collection.color }}
                            />
                            <CardTitle className="text-lg">{collection.name}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {collectionFavorites?.length || 0} repositories
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Create collections to organize your saved repositories.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <div className="space-y-4">
              {history && history.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearHistory.mutate()}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear History
                  </Button>
                </div>
              )}

              {historyLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : history && history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((entry) => (
                    <Link
                      key={entry.id}
                      to={`/repo/${entry.repo_owner}/${entry.repo_name}`}
                      className="block"
                    >
                      <Card className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="font-medium hover:text-primary">
                                {entry.repo_owner}/{entry.repo_name}
                              </span>
                              {entry.repo_language && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {entry.repo_language}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatRelativeDate(entry.viewed_at)}
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Your browsing history will appear here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
