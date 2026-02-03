import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  BookOpen
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
  };
  [key: string]: unknown;
}

const InfraDocsPage = () => {
  const [infraData, setInfraData] = useState<InfraData | null>(null);
  const [projectName, setProjectName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<"upload" | "configure" | "generating" | "preview">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error("Veuillez sélectionner un fichier JSON");
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text) as InfraData;
      
      // Validation basique
      if (!data.system && !data.metadata) {
        toast.error("Le fichier JSON ne semble pas contenir des données d'infrastructure valides");
        return;
      }

      setInfraData(data);
      
      // Pré-remplir le nom du projet avec le hostname si disponible
      if (data.system?.hostname) {
        setProjectName(data.system.hostname);
      }
      
      setStep("configure");
      toast.success("Fichier JSON importé avec succès");
    } catch {
      toast.error("Erreur lors de la lecture du fichier JSON");
    }
  };

  const handleGenerate = async () => {
    if (!infraData) return;

    setIsGenerating(true);
    setStep("generating");

    try {
      const { data, error } = await supabase.functions.invoke("generate-infra-docs", {
        body: {
          infraData,
          projectName: projectName || undefined,
          companyName: companyName || undefined,
        },
      });

      if (error) throw error;

      if (data?.html) {
        setGeneratedHtml(data.html);
        setStep("preview");
        toast.success("Documentation générée avec succès !");
      } else {
        throw new Error("Aucun contenu HTML généré");
      }
    } catch (error) {
      console.error("Error generating docs:", error);
      toast.error("Erreur lors de la génération de la documentation");
      setStep("configure");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!generatedHtml) return;

    const zip = new JSZip();
    const docName = projectName || infraData?.system?.hostname || "infrastructure";
    zip.file(`${docName}-documentation.html`, generatedHtml);
    
    // Ajouter le JSON source
    if (infraData) {
      zip.file(`${docName}-data.json`, JSON.stringify(infraData, null, 2));
    }

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

  const resetForm = () => {
    setInfraData(null);
    setProjectName("");
    setCompanyName("");
    setGeneratedHtml(null);
    setStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
                  Étape 2: Importer le fichier JSON
                </CardTitle>
                <CardDescription>
                  Uploadez le fichier infra-data.json généré par le script
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">Cliquez pour sélectionner un fichier</p>
                    <p className="text-sm text-muted-foreground">ou glissez-déposez votre fichier JSON ici</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "configure" && infraData && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-success mb-6">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Données importées avec succès</span>
            </div>

            {/* Résumé des données */}
            <Card>
              <CardHeader>
                <CardTitle>Aperçu des données</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {infraData.system && (
                  <>
                    <p><strong>Hostname:</strong> {infraData.system.hostname}</p>
                    <p><strong>OS:</strong> {infraData.system.os}</p>
                    <p><strong>Architecture:</strong> {infraData.system.architecture}</p>
                  </>
                )}
                {infraData.metadata && (
                  <p><strong>Collecté le:</strong> {new Date(infraData.metadata.collected_at).toLocaleString('fr-FR')}</p>
                )}
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Configuration de la documentation
                </CardTitle>
                <CardDescription>
                  Personnalisez les informations de la documentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="projectName">Nom du projet</Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="ex: Serveur Production Web"
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
                Générer la documentation
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
                L'IA analyse vos données et génère la documentation
              </p>
            </div>
          </div>
        )}

        {step === "preview" && generatedHtml && (
          <div className="space-y-6">
            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Documentation générée</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Nouvelle documentation
                </Button>
                <Button variant="outline" onClick={handleOpenNewTab}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Nouvel onglet
                </Button>
                <Button onClick={handleDownloadZip}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger ZIP
                </Button>
              </div>
            </div>

            {/* Preview */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-muted/50 border-b px-4 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-destructive" />
                      <div className="w-3 h-3 rounded-full bg-warning" />
                      <div className="w-3 h-3 rounded-full bg-success" />
                    </div>
                  <span className="text-sm text-muted-foreground ml-2">
                    {projectName || infraData?.system?.hostname || "infrastructure"}-documentation.html
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
          </div>
        )}
      </main>
    </div>
  );
};

export default InfraDocsPage;
