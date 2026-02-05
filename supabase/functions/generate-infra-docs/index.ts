import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    load_average?: {
      "1min": number;
      "5min": number;
      "15min": number;
    };
  };
  memory?: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
    swap_total_gb: number;
  };
  disks?: Array<{
    device: string;
    mount_point: string;
    filesystem: string;
    size: string;
    used: string;
    available: string;
    usage_percent: number;
  }>;
  network?: {
    interfaces: Array<{
      name: string;
      ip: string;
      mac: string;
      state: string;
    }>;
    listening_ports: string;
    dns_servers: string;
    default_gateway: string;
  };
  services?: {
    running: string;
  };
  docker?: {
    installed: boolean;
    version?: string;
    containers: Array<{
      name: string;
      image: string;
      status: string;
      ports: string;
    }>;
    images: Array<{
      repository: string;
      tag: string;
      size: string;
    }>;
  };
  security?: {
    user_count: number;
    sudo_users: string;
    ssh_port: number;
    firewall_status: string;
  };
  config_files?: string[];
  software?: {
    package_manager: string;
    package_count: number;
    major_software: Array<{
      name: string;
      version: string;
    }>;
  };
}

interface GenerateInfraDocsRequest {
  infraData: InfraData | InfraData[];
  projectName?: string;
  companyName?: string;
  multiServer?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { infraData, projectName, companyName, multiServer }: GenerateInfraDocsRequest = await req.json();

    if (!infraData) {
      throw new Error("Infrastructure data is required");
    }

    const isMultiServer = multiServer && Array.isArray(infraData);
    const formattedData = JSON.stringify(infraData, null, 2);

    const basePromptSuffix = `
Génère les diagrammes Mermaid suivants:
- Architecture système (flowchart TD montrant les composants)
- Topologie réseau (les interfaces et connexions)
- Stack logicielle (les services et leurs interactions)

Utilise ce framework CSS pour le style GitHub:
- Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif
- Font code: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace
- Couleur primaire: #0969da pour les liens
- Fond: #ffffff, secondaire: #f6f8fa
- Couleur bordure: #d0d7de
- Max-width: 1012px centré

Ajoute des badges/indicateurs visuels pour:
- État des services (vert = OK, rouge = erreur)
- Utilisation disque (jauge visuelle)
- Utilisation mémoire (jauge visuelle)

IMPORTANT: Ta réponse doit être UNIQUEMENT le document HTML complet, commençant par <!DOCTYPE html> et terminant par </html>. Pas de markdown, pas d'explications.`;

    const systemPrompt = isMultiServer 
      ? `Tu es un expert en documentation d'infrastructure IT et en architecture système. Génère une documentation technique complète et professionnelle en format HTML avec CSS intégré pour une INFRASTRUCTURE MULTI-SERVEURS.

IMPORTANT: Toute la documentation doit être rédigée EN FRANÇAIS.

La documentation doit:
1. Être stylisée comme un README GitHub (propre, lisible, monospace pour le code)
2. Inclure une page HTML complète avec CSS intégré
3. Utiliser un design moderne et responsive
4. Inclure la coloration syntaxique pour les blocs de code
5. Générer des diagrammes Mermaid.js pour l'architecture système globale
6. Être autonome (fichier HTML unique avec tout le CSS inline)

Structure spécifique MULTI-SERVEURS:
1. **Page de garde** - Nom du projet, entreprise, date, nombre de serveurs
2. **Vue d'ensemble** - Résumé exécutif de l'infrastructure globale
3. **Tableau comparatif** - Tableau HTML comparant tous les serveurs (CPU, RAM, Stockage, OS)
4. **Architecture Globale** (diagramme Mermaid) - Relations et rôles des serveurs
5. **Fiches serveurs individuelles** - Section détaillée pour chaque serveur
6. **Topologie réseau** (diagramme Mermaid) - IPs, connexions entre serveurs
7. **Analyse des ressources** - Jauges visuelles pour chaque serveur
8. **Services et conteneurs** - Vue globale de tous les services
9. **Recommandations** - Suggestions d'amélioration, équilibrage de charge
10. **Annexes** - Données brutes JSON

Utilise des couleurs différentes pour distinguer les serveurs dans les diagrammes.
${basePromptSuffix}`
      : `Tu es un expert en documentation d'infrastructure IT et en architecture système. Génère une documentation technique complète et professionnelle en format HTML avec CSS intégré.

IMPORTANT: Toute la documentation doit être rédigée EN FRANÇAIS.

La documentation doit:
1. Être stylisée comme un README GitHub (propre, lisible, monospace pour le code)
2. Inclure une page HTML complète avec CSS intégré
3. Utiliser un design moderne et responsive
4. Inclure la coloration syntaxique pour les blocs de code
5. Générer des diagrammes Mermaid.js pour l'architecture système
6. Être autonome (fichier HTML unique avec tout le CSS inline)

Structure de la documentation d'infrastructure:
1. **Page de garde** - Nom du projet, entreprise, date de génération
2. **Vue d'ensemble** - Résumé exécutif de l'infrastructure
3. **Spécifications Serveur** - CPU, RAM, Stockage, OS
4. **Architecture Réseau** (avec diagramme Mermaid) - Interfaces, IPs, DNS, Gateway
5. **Stockage** - Montage des disques, capacités, utilisation
6. **Services Actifs** - Liste et état des services
7. **Conteneurisation Docker** (si applicable) - Conteneurs, images
8. **Sécurité** - Firewall, utilisateurs, SSH, ports
9. **Fichiers de Configuration** - Liste et rôle de chaque fichier
10. **Logiciels Installés** - Versions des composants majeurs
11. **Recommandations** - Suggestions d'amélioration basées sur l'analyse
12. **Annexes** - Données brutes JSON
${basePromptSuffix}`;

    const userPrompt = isMultiServer
      ? `Génère une documentation HTML/CSS complète EN FRANÇAIS pour cette infrastructure MULTI-SERVEURS:

${projectName ? `**Nom du Projet**: ${projectName}` : ''}
${companyName ? `**Entreprise**: ${companyName}` : ''}
**Nombre de serveurs**: ${(infraData as InfraData[]).length}

**Données d'Infrastructure Collectées**:
\`\`\`json
${formattedData}
\`\`\`

Génère une documentation complète avec tableau comparatif des serveurs, diagrammes d'architecture globale, et sections détaillées pour chaque serveur.`
      : `Génère une documentation HTML/CSS complète EN FRANÇAIS pour cette infrastructure serveur:

${projectName ? `**Nom du Projet**: ${projectName}` : ''}
${companyName ? `**Entreprise**: ${companyName}` : ''}

**Données d'Infrastructure Collectées**:
\`\`\`json
${formattedData}
\`\`\`

Génère une page de documentation HTML professionnelle et prête pour la production avec:
1. Diagramme d'architecture système utilisant Mermaid.js (dans <pre class="mermaid">)
2. Diagramme de topologie réseau si applicable
3. Tableaux récapitulatifs pour les disques, services, ports
4. Jauges visuelles pour l'utilisation des ressources (CSS pur)
5. Section de recommandations basées sur l'état actuel
6. Design responsive et professionnel
7. Script CDN Mermaid.js pour le rendu des diagrammes
8. TOUT LE TEXTE EN FRANÇAIS`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte. Réessayez plus tard." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés. Veuillez ajouter des crédits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erreur du service IA");
    }

    const data = await response.json();
    let htmlContent = data.choices?.[0]?.message?.content || "";

    // Clean up the response - extract just the HTML
    if (htmlContent.includes("```html")) {
      htmlContent = htmlContent.replace(/```html\n?/g, '').replace(/```\n?/g, '');
    }
    
    // Ensure it starts with DOCTYPE
    if (!htmlContent.trim().startsWith("<!DOCTYPE")) {
      const doctypeIndex = htmlContent.indexOf("<!DOCTYPE");
      if (doctypeIndex !== -1) {
        htmlContent = htmlContent.substring(doctypeIndex);
      }
    }

    return new Response(
      JSON.stringify({ html: htmlContent.trim() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-infra-docs:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
