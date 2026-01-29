import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateDocsRequest {
  repoName: string;
  repoFullName: string;
  description: string | null;
  language: string | null;
  topics: string[];
  readme: string;
  contents: Array<{ name: string; path: string; type: string }>;
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

    const { repoName, repoFullName, description, language, topics, readme, contents }: GenerateDocsRequest = await req.json();

    const fileTree = contents
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map(f => `${f.type === 'dir' ? '📁' : '📄'} ${f.path}`)
      .join('\n');

    // Identify configuration files
    const configFiles = contents.filter(f => 
      f.type === 'file' && (
        f.name.includes('config') ||
        f.name.includes('.env') ||
        f.name.includes('docker') ||
        f.name.includes('yaml') ||
        f.name.includes('yml') ||
        f.name.includes('toml') ||
        f.name.includes('json') ||
        f.name.includes('Makefile') ||
        f.name.includes('Dockerfile') ||
        f.name.includes('.sh') ||
        f.name.includes('nginx') ||
        f.name.includes('apache')
      )
    ).map(f => f.path);

    const systemPrompt = `Tu es un expert en rédaction de documentation technique. Génère une documentation complète et bien structurée en format HTML avec CSS intégré.

IMPORTANT: Toute la documentation doit être rédigée EN FRANÇAIS.

La documentation doit:
1. Être stylisée comme un README GitHub (propre, lisible, monospace pour le code)
2. Inclure une page HTML complète avec CSS intégré
3. Utiliser un design moderne et responsive
4. Inclure la coloration syntaxique pour les blocs de code
5. Générer des diagrammes Mermaid.js pour l'architecture et le flux de données
6. Être autonome (fichier HTML unique avec tout le CSS inline)
7. INCLURE UNE SECTION DÉDIÉE AUX FICHIERS DE CONFIGURATION

Structure de la documentation:
- Vue d'ensemble du projet
- Fonctionnalités principales
- Architecture (avec diagramme Mermaid)
- Fichiers de Configuration (liste détaillée avec explications)
- Installation et Configuration
- Exemples d'utilisation
- Référence API (si applicable)
- Flux de données (avec diagramme Mermaid)
- Structure des fichiers
- Guide de contribution
- Informations de licence

Utilise ce framework CSS pour le style GitHub:
- Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif
- Font code: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace
- Couleur primaire: #0969da pour les liens
- Fond: #ffffff, secondaire: #f6f8fa
- Couleur bordure: #d0d7de
- Max-width: 1012px centré

IMPORTANT: Ta réponse doit être UNIQUEMENT le document HTML complet, commençant par <!DOCTYPE html> et terminant par </html>. Pas de markdown, pas d'explications.`;

    const userPrompt = `Génère une documentation HTML/CSS complète EN FRANÇAIS pour ce dépôt GitHub:

**Dépôt**: ${repoFullName}
**Nom**: ${repoName}
**Description**: ${description || 'Aucune description fournie'}
**Langage principal**: ${language || 'Non spécifié'}
**Thèmes**: ${topics?.join(', ') || 'Aucun'}

**Fichiers de configuration identifiés**:
${configFiles.length > 0 ? configFiles.join('\n') : 'Aucun fichier de configuration détecté'}

**Structure des fichiers**:
${fileTree}

**Contenu du README**:
${readme}

Génère une page de documentation HTML prête pour la production avec:
1. Diagramme d'architecture utilisant la syntaxe Mermaid.js (dans <pre class="mermaid">)
2. Diagramme de flux de données si le projet a une gestion complexe des données
3. Section dédiée aux fichiers de configuration avec:
   - Liste de tous les fichiers de config trouvés
   - Explication du rôle de chaque fichier
   - Variables d'environnement importantes à configurer
4. Toutes les sections correctement formatées
5. Design responsive
6. Script CDN Mermaid.js pour le rendu des diagrammes
7. TOUT LE TEXTE EN FRANÇAIS`;

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
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
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
    console.error("Error in generate-docs:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
