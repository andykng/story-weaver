import { useState, useRef } from 'react';
import { FileText, Download, Loader2, ExternalLink, AlertCircle, CheckCircle2, FolderArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseGitHubUrl, fetchRepository, fetchReadme, fetchContents } from '@/lib/github';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type GenerationStep = 'idle' | 'fetching' | 'analyzing' | 'generating' | 'complete' | 'error';

export default function GenerateDocsPage() {
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<GenerationStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [repoInfo, setRepoInfo] = useState<{ name: string; fullName: string } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleGenerate = async () => {
    if (!url.trim()) {
      toast.error('Please enter a GitHub URL');
      return;
    }

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      toast.error('Invalid GitHub URL. Please enter a valid repository URL.');
      return;
    }

    setError(null);
    setGeneratedHtml(null);
    setStep('fetching');

    try {
      // Fetch repository info
      const repo = await fetchRepository(parsed.owner, parsed.repo);
      setRepoInfo({ name: repo.name, fullName: repo.full_name });

      // Fetch README
      setStep('analyzing');
      const readme = await fetchReadme(parsed.owner, parsed.repo);
      
      // Fetch file structure
      const contents = await fetchContents(parsed.owner, parsed.repo);

      // Generate documentation
      setStep('generating');
      const { data, error: fnError } = await supabase.functions.invoke('generate-docs', {
        body: {
          repoName: repo.name,
          repoFullName: repo.full_name,
          description: repo.description,
          language: repo.language,
          topics: repo.topics,
          readme: readme || 'No README available',
          contents: contents.map(c => ({ name: c.name, path: c.path, type: c.type })),
        },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setGeneratedHtml(data.html);
      setStep('complete');
      toast.success('Documentation generated successfully!');
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate documentation');
      setStep('error');
      toast.error('Failed to generate documentation');
    }
  };

  const handleDownloadZip = async () => {
    if (!generatedHtml || !repoInfo) return;

    const zip = new JSZip();
    
    // Add main HTML file
    zip.file('index.html', generatedHtml);
    
    // Add a simple README
    const readmeContent = `# ${repoInfo.name} Documentation

Generated with GitDocs Generator

## Files
- index.html - Main documentation page

## Usage
Open index.html in any web browser to view the documentation.
`;
    zip.file('README.md', readmeContent);

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${repoInfo.name}-docs.zip`);
    toast.success('Documentation downloaded!');
  };

  const handleOpenInNewTab = () => {
    if (!generatedHtml) return;
    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const getStepMessage = () => {
    switch (step) {
      case 'fetching':
        return 'Fetching repository information...';
      case 'analyzing':
        return 'Analyzing project structure...';
      case 'generating':
        return 'Generating documentation with AI...';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 px-6 bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileText className="h-10 w-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              GitDocs
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Generate beautiful, comprehensive documentation for any GitHub repository.
            Just paste the URL and let AI do the rest.
          </p>

          {/* URL Input */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              className="flex-1 h-12 text-lg"
              disabled={step !== 'idle' && step !== 'complete' && step !== 'error'}
            />
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={step !== 'idle' && step !== 'complete' && step !== 'error'}
              className="h-12 px-8"
            >
              {step !== 'idle' && step !== 'complete' && step !== 'error' ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5 mr-2" />
                  Generate Docs
                </>
              )}
            </Button>
          </div>

          {/* Progress indicator */}
          {step !== 'idle' && step !== 'complete' && step !== 'error' && (
            <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{getStepMessage()}</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <Alert variant="destructive" className="mt-6 max-w-2xl mx-auto text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </section>

      {/* Results Section */}
      {generatedHtml && (
        <section className="py-8 px-6">
          <div className="max-w-7xl mx-auto">
            {/* Actions Bar */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">
                      Documentation for {repoInfo?.fullName}
                    </CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                    <Button size="sm" onClick={handleDownloadZip}>
                      <FolderArchive className="h-4 w-4 mr-2" />
                      Download ZIP
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Preview your generated documentation below, or download it as a ZIP file.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Preview iframe */}
            <Card className="overflow-hidden">
              <div className="bg-muted/50 border-b px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <div className="w-3 h-3 rounded-full bg-success" />
                </div>
                <span className="text-sm text-muted-foreground ml-2">index.html</span>
              </div>
              <iframe
                ref={iframeRef}
                srcDoc={generatedHtml}
                className="w-full h-[800px] bg-background"
                title="Documentation Preview"
                sandbox="allow-scripts"
              />
            </Card>
          </div>
        </section>
      )}

      {/* Features Section (shown when idle) */}
      {step === 'idle' && (
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-10">
              What You Get
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Complete Documentation
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Project overview, installation guide, API reference, usage examples, and more - all generated automatically.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                    Architecture Diagrams
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Visual diagrams showing project architecture and data flow using Mermaid.js for easy understanding.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Download className="h-5 w-5 text-primary" />
                    Export Ready
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Download as a self-contained HTML file or ZIP archive. Host anywhere or share directly.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
