import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Server, 
  FileText, 
  Zap, 
  Shield, 
  GitBranch, 
  Terminal,
  Download,
  Globe,
  Users,
  BarChart3,
  Network,
  HardDrive,
  Cpu,
  Lock,
  BookOpen,
  ArrowRight,
  Calculator,
  Github
} from "lucide-react";
import { Link } from "react-router-dom";

const LandingPage = () => {
  const features = [
    {
      icon: Server,
      title: "Documentation d'Infrastructure",
      description: "Générez automatiquement une documentation complète de vos serveurs à partir de données JSON collectées."
    },
    {
      icon: GitBranch,
      title: "Documentation GitHub",
      description: "Analysez n'importe quel dépôt GitHub et obtenez une documentation technique détaillée avec diagrammes."
    },
    {
      icon: Terminal,
      title: "Scripts de Collecte",
      description: "Scripts Bash et Python prêts à l'emploi pour collecter les informations système de vos serveurs."
    },
    {
      icon: Zap,
      title: "Génération par IA",
      description: "L'intelligence artificielle analyse vos données et génère des documents professionnels en français."
    },
    {
      icon: Shield,
      title: "Analyse de Sécurité",
      description: "Identification automatique des configurations de sécurité, pare-feu, et recommandations."
    },
    {
      icon: Download,
      title: "Export Flexible",
      description: "Prévisualisez en direct et téléchargez au format HTML ou ZIP avec toutes les ressources."
    }
  ];

  const infraCapabilities = [
    { icon: Cpu, label: "CPU & Performances" },
    { icon: HardDrive, label: "Stockage & Disques" },
    { icon: Network, label: "Réseau & Ports" },
    { icon: Lock, label: "Sécurité & Firewall" },
    { icon: BarChart3, label: "Services Actifs" },
    { icon: Globe, label: "Configuration Docker" },
  ];

  const useCases = [
    {
      title: "Administrateurs Système",
      description: "Automatisez la documentation de vos serveurs et gagnez des heures de travail.",
      icon: Terminal
    },
    {
      title: "Équipes DevOps",
      description: "Maintenez une documentation à jour de votre infrastructure cloud et on-premise.",
      icon: Server
    },
    {
      title: "Développeurs",
      description: "Documentez rapidement vos projets GitHub avec des diagrammes d'architecture.",
      icon: GitBranch
    },
    {
      title: "Entreprises",
      description: "Standardisez la documentation technique à travers toute l'organisation.",
      icon: Users
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">GitDocs</h1>
              <p className="text-xs text-muted-foreground">Documentation Automatisée</p>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/">GitHub Docs</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/infra">Infra Docs</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/tools">
                <Calculator className="h-4 w-4 mr-2" />
                Outils
              </Link>
            </Button>
            <Button asChild>
              <Link to="/infra">
                Commencer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            Propulsé par l'Intelligence Artificielle
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Documentation d'Infrastructure
            <br />
            <span className="text-primary">Automatisée par l'IA</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Transformez les données de vos serveurs en documentation technique professionnelle.
            Collectez, analysez et générez en quelques clics.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/infra">
                <Server className="mr-2 h-5 w-5" />
                Documentation Infrastructure
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/">
                <Github className="mr-2 h-5 w-5" />
                Documentation GitHub
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
            {[
              { value: "100%", label: "En Français" },
              { value: "< 30s", label: "Temps de génération" },
              { value: "HTML", label: "Format exportable" },
              { value: "Gratuit", label: "Open Source" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Fonctionnalités Principales</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Un outil complet pour automatiser la documentation de votre infrastructure IT
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-2">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works - Infrastructure */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Comment ça fonctionne ?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              En trois étapes simples, documentez l'ensemble de votre infrastructure
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Collectez",
                description: "Exécutez notre script Bash ou Python sur vos serveurs pour collecter toutes les informations système.",
                icon: Terminal
              },
              {
                step: "2",
                title: "Importez",
                description: "Uploadez le fichier JSON généré sur notre plateforme et configurez les options de documentation.",
                icon: FileText
              },
              {
                step: "3",
                title: "Générez",
                description: "L'IA analyse vos données et génère une documentation professionnelle avec diagrammes et recommandations.",
                icon: Zap
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="relative mx-auto w-16 h-16 mb-6">
                  <div className="absolute inset-0 bg-primary/10 rounded-2xl rotate-6" />
                  <div className="absolute inset-0 bg-primary rounded-2xl flex items-center justify-center">
                    <item.icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
                <div className="text-sm font-medium text-primary mb-2">Étape {item.step}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure Capabilities */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">
                Collecte Complète des Données
              </h2>
              <p className="text-muted-foreground mb-8">
                Nos scripts collectent automatiquement toutes les informations essentielles
                de vos serveurs Linux, macOS et Windows.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {infraCapabilities.map((cap, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                    <cap.icon className="h-5 w-5 text-primary" />
                    <span className="font-medium">{cap.label}</span>
                  </div>
                ))}
              </div>

              <Button className="mt-8" asChild>
                <Link to="/infra">
                  Voir les Scripts
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="bg-card border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <div className="w-3 h-3 rounded-full bg-warning" />
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-sm text-muted-foreground ml-2">infra-data.json</span>
              </div>
              <pre className="text-sm text-muted-foreground overflow-x-auto">
{`{
  "system": {
    "hostname": "web-server-01",
    "os": "Ubuntu 22.04 LTS",
    "kernel": "5.15.0-91-generic"
  },
  "cpu": {
    "model": "Intel Xeon E5-2686 v4",
    "cores": 8,
    "usage_percent": 23.5
  },
  "memory": {
    "total_gb": 32,
    "used_gb": 12.4,
    "available_gb": 19.6
  },
  "docker": {
    "installed": true,
    "containers": [...]
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Pour Qui ?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              GitDocs s'adapte aux besoins de toute l'équipe IT
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-2">
                    <useCase.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{useCase.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{useCase.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Pourquoi GitDocs ?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Gain de Temps",
                description: "Réduisez le temps de documentation de plusieurs heures à quelques minutes.",
                stat: "95%"
              },
              {
                title: "Standardisation",
                description: "Documentation cohérente et professionnelle pour tous vos serveurs.",
                stat: "100%"
              },
              {
                title: "Toujours à Jour",
                description: "Regénérez facilement la documentation quand votre infrastructure évolue.",
                stat: "24/7"
              }
            ].map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl font-bold mb-4 opacity-90">{benefit.stat}</div>
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="opacity-80">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Prêt à Documenter Votre Infrastructure ?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Commencez dès maintenant à générer de la documentation professionnelle
            pour vos serveurs et projets.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/infra">
                <Server className="mr-2 h-5 w-5" />
                Documenter mon Infrastructure
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/">
                <FileText className="mr-2 h-5 w-5" />
                Documenter un Projet GitHub
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold">GitDocs</span>
              <span className="text-muted-foreground">- Documentation Automatisée par IA</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Projet Open Source</span>
              <span>•</span>
              <span>Développé avec ❤️ pour les Admins Sys</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
