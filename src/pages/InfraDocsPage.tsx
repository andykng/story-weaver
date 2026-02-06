import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  Server, 
  FileJson,
  Building2,
  Home,
  BookOpen,
  Plus,
  X,
  Linkedin,
  Copy,
  Layers
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Link } from "react-router-dom";
import { ScriptViewer } from "@/components/ScriptViewer";

interface InfraData {
  metadata?: {
    collected_at: string;
    collector_version: string;
    collector_type: string;
  };
  system?: {
    hostname: string;
    os: string;
    kernel: string;
    architecture: string;
    uptime?: {
      days: number;
      hours: number;
    };
  };
  cpu?: {
    model: string;
    cores: number;
    threads: number;
  };
  memory?: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
  };
  disks?: Array<{
    device: string;
    mount_point: string;
    size: string;
    used: string;
    usage_percent: number;
  }>;
  docker?: {
    installed: boolean;
    containers: Array<{
      name: string;
      status: string;
    }>;
  };
  [key: string]: unknown;
}

interface ServerFile {
  id: string;
  name: string;
  data: InfraData;
}

type DocMode = "single" | "multi" | "linkedin";

const InfraDocsPage = () => {
  const [serverFiles, setServerFiles] = useState<ServerFile[]>([]);
  const [projectName, setProjectName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [linkedinContent, setLinkedinContent] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<"upload" | "configure" | "generating" | "preview">("upload");
  const [docMode, setDocMode] = useState<DocMode>("single");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newServerFiles: ServerFile[] = [];

    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.json')) {
        toast.error(`${file.name}: Fichier non JSON ignoré`);
        continue;
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text) as InfraData;
        
        if (!data.system && !data.metadata) {
          toast.error(`${file.name}: Données d'infrastructure invalides`);
          continue;
        }

        newServerFiles.push({
          id: crypto.randomUUID(),
          name: data.system?.hostname || file.name.replace('.json', ''),
          data
        });
      } catch {
        toast.error(`${file.name}: Erreur de lecture`);
      }
    }

    if (newServerFiles.length > 0) {
      setServerFiles(prev => [...prev, ...newServerFiles]);
      
      if (newServerFiles.length === 1 && serverFiles.length === 0) {
        setProjectName(newServerFiles[0].name);
      }
      
      setStep("configure");
      toast.success(`${newServerFiles.length} fichier(s) importé(s)`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeServer = (id: string) => {
    setServerFiles(prev => prev.filter(s => s.id !== id));
    if (serverFiles.length <= 1) {
      setStep("upload");
    }
  };

  const handleGenerate = async () => {
    if (serverFiles.length === 0) return;

    setIsGenerating(true);
    setStep("generating");

    try {
      if (docMode === "linkedin") {
        // Générer article LinkedIn
        const { data, error } = await supabase.functions.invoke("generate-linkedin-article", {
          body: {
            servers: serverFiles.map(s => s.data),
            projectName: projectName || undefined,
            companyName: companyName || undefined,
          },
        });

        if (error) throw error;

        if (data?.content) {
          setLinkedinContent(data.content);
          setStep("preview");
          toast.success("Article LinkedIn généré !");
        }
      } else {
        // Générer documentation HTML (single ou multi)
        const { data, error } = await supabase.functions.invoke("generate-infra-docs", {
          body: {
            infraData: docMode === "multi" ? serverFiles.map(s => s.data) : serverFiles[0].data,
            projectName: projectName || undefined,
            companyName: companyName || undefined,
            multiServer: docMode === "multi",
          },
        });

        if (error) throw error;

        if (data?.html) {
          setGeneratedHtml(data.html);
          setStep("preview");
          toast.success("Documentation générée !");
        }
      }
    } catch (error) {
      console.error("Error generating docs:", error);
      toast.error("Erreur lors de la génération");
      setStep("configure");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!generatedHtml && !linkedinContent) return;

    const zip = new JSZip();
    const docName = projectName || serverFiles[0]?.name || "infrastructure";
    
    if (generatedHtml) {
      zip.file(`${docName}-documentation.html`, generatedHtml);
    }
    
    if (linkedinContent) {
      zip.file(`${docName}-linkedin-article.md`, linkedinContent);
    }
    
    // Ajouter les JSON sources
    serverFiles.forEach((server, index) => {
      const suffix = serverFiles.length > 1 ? `-${index + 1}` : '';
      zip.file(`${server.name}${suffix}-data.json`, JSON.stringify(server.data, null, 2));
    });

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${docName}-docs.zip`);
    toast.success("Documentation téléchargée !");
  };

  const handleOpenNewTab = () => {
    if (!generatedHtml) return;
    const blob = new Blob([generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const copyLinkedinContent = () => {
    if (!linkedinContent) return;
    navigator.clipboard.writeText(linkedinContent);
    toast.success("Contenu copié dans le presse-papiers !");
  };

  const resetForm = () => {
    setServerFiles([]);
    setProjectName("");
    setCompanyName("");
    setGeneratedHtml(null);
    setLinkedinContent(null);
    setStep("upload");
    setDocMode("single");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Tableau comparatif des serveurs
  const renderComparisonTable = () => {
    if (serverFiles.length < 2) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5" />
            Comparaison des serveurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Caractéristique</th>
                  {serverFiles.map(server => (
                    <th key={server.id} className="text-left p-2 font-medium">
                      {server.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">OS</td>
                  {serverFiles.map(server => (
                    <td key={server.id} className="p-2">{server.data.system?.os || "-"}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">CPU</td>
                  {serverFiles.map(server => (
                    <td key={server.id} className="p-2">
                      {server.data.cpu?.cores || "-"} cores
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">RAM</td>
                  {serverFiles.map(server => (
                    <td key={server.id} className="p-2">
                      {server.data.memory?.total_gb ? Number(server.data.memory.total_gb).toFixed(1) : "-"} GB
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">Stockage</td>
                  {serverFiles.map(server => (
                    <td key={server.id} className="p-2">
                      {server.data.disks?.[0]?.size || "-"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 text-muted-foreground">Docker</td>
                  {serverFiles.map(server => (
                    <td key={server.id} className="p-2">
                      {server.data.docker?.installed ? (
                        <span className="text-success">✓ {server.data.docker.containers?.length || 0} containers</span>
                      ) : (
                        <span className="text-muted-foreground">Non installé</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/home" className="p-2 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
              <Server className="h-6 w-6 text-primary" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">InfraDocs</h1>
              <p className="text-sm text-muted-foreground">Documentation d'Infrastructure</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/home">
                <Home className="h-4 w-4 mr-2" />
                Accueil
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <BookOpen className="h-4 w-4 mr-2" />
                GitHub Docs
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {step === "upload" && (
          <div className="space-y-8">
            {/* Introduction */}
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">
                Documentez votre infrastructure automatiquement
              </h2>
              <p className="text-muted-foreground text-lg">
                Collectez les informations de vos serveurs avec nos scripts et générez 
                une documentation technique complète en quelques clics.
              </p>
            </div>

            {/* Scripts de collecte - Affichage direct */}
            <ScriptViewer />

            {/* Upload JSON */}
            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  Étape 2: Importer le(s) fichier(s) JSON
                </CardTitle>
                <CardDescription>
                  Uploadez un ou plusieurs fichiers infra-data.json générés par les scripts.
                  Vous pouvez combiner plusieurs serveurs pour une documentation globale.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">Cliquez pour sélectionner des fichiers</p>
                    <p className="text-sm text-muted-foreground">
                      Sélectionnez un ou plusieurs fichiers JSON
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "configure" && serverFiles.length > 0 && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-success mb-6">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">{serverFiles.length} serveur(s) importé(s)</span>
            </div>

            {/* Liste des serveurs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Serveurs importés</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </CardHeader>
              <CardContent className="space-y-2">
                {serverFiles.map(server => (
                  <div 
                    key={server.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Server className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{server.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {server.data.system?.os} • {server.data.cpu?.cores || "?"} cores • {server.data.memory?.total_gb ? Number(server.data.memory.total_gb).toFixed(1) : "?"} GB RAM
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeServer(server.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Tableau comparatif */}
            {renderComparisonTable()}

            {/* Type de documentation */}
            <Card>
              <CardHeader>
                <CardTitle>Type de documentation</CardTitle>
                <CardDescription>
                  Choisissez le format de sortie
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={docMode} onValueChange={(v) => setDocMode(v as DocMode)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="single" disabled={serverFiles.length === 0}>
                      <FileText className="h-4 w-4 mr-2" />
                      Simple
                    </TabsTrigger>
                    <TabsTrigger value="multi" disabled={serverFiles.length < 2}>
                      <Layers className="h-4 w-4 mr-2" />
                      Multi-serveurs
                    </TabsTrigger>
                    <TabsTrigger value="linkedin">
                      <Linkedin className="h-4 w-4 mr-2" />
                      Article LinkedIn
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="single" className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      Génère une documentation HTML complète pour le premier serveur de la liste.
                    </p>
                  </TabsContent>
                  <TabsContent value="multi" className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      Génère une documentation unifiée avec tableau comparatif et diagrammes d'architecture globale pour tous les serveurs.
                    </p>
                  </TabsContent>
                  <TabsContent value="linkedin" className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      Génère un article professionnel structuré pour LinkedIn avec sections, statistiques clés et recommandations.
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="projectName">Nom du projet / infrastructure</Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="ex: Infrastructure Production Web"
                  />
                </div>
                <div>
                  <Label htmlFor="companyName">Nom de l'entreprise (optionnel)</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ex: Ma Société"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button variant="outline" onClick={resetForm}>
                Recommencer
              </Button>
              <Button onClick={handleGenerate} className="flex-1">
                {docMode === "linkedin" ? (
                  <>
                    <Linkedin className="h-4 w-4 mr-2" />
                    Générer l'article LinkedIn
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Générer la documentation
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Génération en cours...</h3>
              <p className="text-muted-foreground">
                {docMode === "linkedin" 
                  ? "L'IA rédige votre article LinkedIn professionnel"
                  : "L'IA analyse vos données et génère la documentation"
                }
              </p>
            </div>
          </div>
        )}

        {step === "preview" && (generatedHtml || linkedinContent) && (
          <div className="space-y-6">
            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  {docMode === "linkedin" ? "Article LinkedIn généré" : "Documentation générée"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Nouvelle documentation
                </Button>
                {generatedHtml && (
                  <Button variant="outline" onClick={handleOpenNewTab}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Nouvel onglet
                  </Button>
                )}
                {linkedinContent && (
                  <Button variant="outline" onClick={copyLinkedinContent}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copier
                  </Button>
                )}
                <Button onClick={handleDownloadZip}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger ZIP
                </Button>
              </div>
            </div>

            {/* Preview HTML */}
            {generatedHtml && (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-muted/50 border-b px-4 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-destructive" />
                      <div className="w-3 h-3 rounded-full bg-warning" />
                      <div className="w-3 h-3 rounded-full bg-success" />
                    </div>
                    <span className="text-sm text-muted-foreground ml-2">
                      {projectName || serverFiles[0]?.name || "infrastructure"}-documentation.html
                    </span>
                  </div>
                  <iframe
                    srcDoc={generatedHtml}
                    className="w-full h-[700px] border-0"
                    title="Documentation Preview"
                    sandbox="allow-scripts"
                  />
                </CardContent>
              </Card>
            )}

            {/* Preview LinkedIn */}
            {linkedinContent && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Linkedin className="h-5 w-5 text-[#0A66C2]" />
                    Article LinkedIn
                  </CardTitle>
                  <CardDescription>
                    Copiez ce contenu et collez-le dans un nouvel article LinkedIn
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-6 prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {linkedinContent}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default InfraDocsPage;
