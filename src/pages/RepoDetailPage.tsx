import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Star, 
  GitFork, 
  Eye, 
  Calendar, 
  Scale,
  ExternalLink,
  Heart,
  Sparkles,
  MessageSquare,
  FileCode,
  ArrowLeft,
  Loader2,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useRepository, useReadme } from '@/hooks/useGitHub';
import { useAddToHistory } from '@/hooks/useHistory';
import { useAuth } from '@/hooks/useAuth';
import { useAddFavorite, useRemoveFavorite, useFavorites } from '@/hooks/useFavorites';
import { getLanguageColor, formatStarCount, formatRelativeDate } from '@/lib/github';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

export default function RepoDetailPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const { user } = useAuth();
  const { data: repository, isLoading, error } = useRepository(owner || '', repo || '');
  const { data: readme } = useReadme(owner || '', repo || '');
  const { data: favorites } = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const addToHistory = useAddToHistory();

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const isFavorited = favorites?.some((f) => f.repo_full_name === repository?.full_name) ?? false;

  // Add to history when viewing
  useEffect(() => {
    if (repository && user) {
      addToHistory.mutate(repository);
    }
  }, [repository?.id, user?.id]);

  const handleFavoriteClick = () => {
    if (!user || !repository) return;
    
    if (isFavorited) {
      removeFavorite.mutate(repository.full_name);
    } else {
      addFavorite.mutate(repository);
    }
  };

  const handleAnalyze = async () => {
    if (!repository || !readme) return;
    
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-repo', {
        body: {
          repoName: repository.full_name,
          description: repository.description,
          language: repository.language,
          topics: repository.topics,
          readme: readme.slice(0, 5000), // Limit README size
        },
      });

      if (error) throw error;
      setAiAnalysis(data.analysis);
    } catch (err) {
      toast.error('Failed to analyze repository');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !repository) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-repo', {
        body: {
          repoName: repository.full_name,
          description: repository.description,
          language: repository.language,
          topics: repository.topics,
          readme: readme?.slice(0, 3000),
          question: userMessage,
          history: chatMessages.slice(-6), // Last 6 messages for context
        },
      });

      if (error) throw error;
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      toast.error('Failed to get response');
      console.error(err);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !repository) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Repository not found</h1>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
          
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <img 
                src={repository.owner.avatar_url} 
                alt={repository.owner.login}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{repository.owner.login}</span>
                  <span className="text-muted-foreground">/</span>
                  <h1 className="text-2xl font-bold">{repository.name}</h1>
                </div>
                <p className="text-muted-foreground mt-1 max-w-2xl">
                  {repository.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user && (
                <Button
                  variant={isFavorited ? "default" : "outline"}
                  onClick={handleFavoriteClick}
                >
                  <Heart className={cn("mr-2 h-4 w-4", isFavorited && "fill-current")} />
                  {isFavorited ? 'Saved' : 'Save'}
                </Button>
              )}
              <a href={repository.html_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on GitHub
                </Button>
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 flex-wrap">
            {repository.language && (
              <div className="flex items-center gap-1.5">
                <span 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getLanguageColor(repository.language) }}
                />
                <span className="text-sm font-medium">{repository.language}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-muted-foreground">
              <Star className="h-4 w-4" />
              <span className="text-sm">{formatStarCount(repository.stargazers_count)} stars</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <GitFork className="h-4 w-4" />
              <span className="text-sm">{formatStarCount(repository.forks_count)} forks</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span className="text-sm">{formatStarCount(repository.open_issues_count)} issues</span>
            </div>
            {repository.license && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Scale className="h-4 w-4" />
                <span className="text-sm">{repository.license.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Updated {formatRelativeDate(repository.updated_at)}</span>
            </div>
          </div>

          {/* Topics */}
          {repository.topics && repository.topics.length > 0 && (
            <div className="flex gap-1.5 mt-4 flex-wrap">
              {repository.topics.map((topic) => (
                <Badge key={topic} variant="secondary" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="ai" className="space-y-6">
          <TabsList>
            <TabsTrigger value="ai" className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI Analysis
            </TabsTrigger>
            <TabsTrigger value="readme" className="gap-2">
              <FileCode className="h-4 w-4" />
              README
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Q&A Chat
            </TabsTrigger>
          </TabsList>

          {/* AI Analysis Tab */}
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI-Powered Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {aiAnalysis ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {aiAnalysis}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Get an AI-powered summary and analysis of this repository
                    </p>
                    <Button onClick={handleAnalyze} disabled={isAnalyzing || !readme}>
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Analyze Repository
                        </>
                      )}
                    </Button>
                    {!readme && (
                      <p className="text-xs text-muted-foreground mt-2">
                        README not available for analysis
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* README Tab */}
          <TabsContent value="readme">
            <Card>
              <CardContent className="pt-6">
                {readme ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed overflow-x-auto">
                      {readme}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No README available for this repository
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Ask about this repository
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-thin">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Ask questions about this repository's code, architecture, or usage.</p>
                      <p className="text-sm mt-2">Examples:</p>
                      <ul className="text-sm mt-2 space-y-1">
                        <li>"What does this project do?"</li>
                        <li>"How do I get started?"</li>
                        <li>"What technologies does it use?"</li>
                      </ul>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          "p-4 rounded-lg max-w-[80%]",
                          msg.role === 'user'
                            ? "bg-primary text-primary-foreground ml-auto"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))
                  )}
                  {isChatLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  )}
                </div>

                <Separator className="mb-4" />

                {/* Input */}
                <div className="flex gap-2">
                  <Textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question about this repository..."
                    className="resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSubmit();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleChatSubmit} 
                    disabled={!chatInput.trim() || isChatLoading}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
