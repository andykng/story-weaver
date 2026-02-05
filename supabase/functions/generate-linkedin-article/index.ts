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
  docker?: {
    installed: boolean;
    version?: string;
    containers: Array<{
      name: string;
      image: string;
      status: string;
      ports: string;
    }>;
  };
  services?: {
    running: string;
  };
  security?: {
    user_count: number;
    sudo_users: string;
    ssh_port: number;
    firewall_status: string;
  };
  software?: {
    package_manager: string;
    package_count: number;
    major_software: Array<{
      name: string;
      version: string;
    }>;
  };
}

interface GenerateLinkedinRequest {
  servers: InfraData[];
  projectName?: string;
  companyName?: string;
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

    const { servers, projectName, companyName }: GenerateLinkedinRequest = await req.json();

    if (!servers || servers.length === 0) {
      throw new Error("Au moins un serveur est requis");
    }

    const systemPrompt = `Tu es un expert en rédaction d'articles techniques professionnels pour LinkedIn. Tu dois générer un article structuré et engageant à partir de données d'infrastructure serveur.

IMPORTANT: Rédige ENTIÈREMENT EN FRANÇAIS.

L'article doit:
1. Être professionnel mais accessible
2. Avoir une accroche percutante en introduction
3. Inclure des sections bien structurées avec des titres en markdown
4. Utiliser des statistiques et chiffres clés issus des données
5. Avoir des recommandations concrètes pour les professionnels IT
6. Se terminer par un appel à l'action ou une question d'engagement
7. Inclure 3-5 hashtags pertinents à la fin

Structure recommandée:
1. **Titre accrocheur** (50-70 caractères)
2. **Introduction** - Contexte et problématique (2-3 phrases)
3. **Présentation de l'infrastructure** - Résumé technique accessible
4. **Points clés / Statistiques** - Bullet points avec les métriques importantes
5. **Analyse et recommandations** - Insights pour les professionnels
6. **Conclusion** - Résumé et appel à l'engagement
7. **Hashtags** - #Infrastructure #IT #DevOps etc.

Style:
- Utilise des émojis avec parcimonie (1-2 par section max)
- Phrases courtes et impactantes
- Listes à puces pour la lisibilité
- Ton expert mais accessible
- Évite le jargon excessif

Format de sortie: Texte brut formaté en Markdown, prêt à être copié dans LinkedIn.`;

    // Préparer un résumé des données des serveurs
    const serversSummary = servers.map((server, index) => {
      const summary: string[] = [];
      
      if (server.system) {
        summary.push(`**Serveur ${index + 1}: ${server.system.hostname}**`);
        summary.push(`- OS: ${server.system.os}`);
        summary.push(`- Architecture: ${server.system.architecture}`);
        if (server.system.uptime) {
          summary.push(`- Uptime: ${server.system.uptime.days} jours`);
        }
      }
      
      if (server.cpu) {
        summary.push(`- CPU: ${server.cpu.model} (${server.cpu.cores} cores, ${server.cpu.threads} threads)`);
      }
      
      if (server.memory) {
        const usagePercent = ((server.memory.used_gb / server.memory.total_gb) * 100).toFixed(1);
        summary.push(`- RAM: ${server.memory.total_gb.toFixed(1)} GB (${usagePercent}% utilisé)`);
      }
      
      if (server.disks && server.disks.length > 0) {
        const mainDisk = server.disks[0];
        summary.push(`- Stockage: ${mainDisk.size} (${mainDisk.usage_percent}% utilisé)`);
      }
      
      if (server.docker?.installed) {
        summary.push(`- Docker: ${server.docker.containers?.length || 0} conteneurs actifs`);
      }
      
      if (server.security) {
        summary.push(`- Firewall: ${server.security.firewall_status}`);
        summary.push(`- Utilisateurs: ${server.security.user_count}`);
      }

      return summary.join('\n');
    }).join('\n\n');

    const userPrompt = `Génère un article LinkedIn professionnel EN FRANÇAIS pour documenter cette infrastructure:

${projectName ? `**Projet**: ${projectName}` : ''}
${companyName ? `**Entreprise**: ${companyName}` : ''}

**Nombre de serveurs**: ${servers.length}

**Données détaillées**:
${serversSummary}

Génère un article LinkedIn complet et engageant qui met en valeur cette infrastructure, analyse les points forts et axes d'amélioration, et encourage la discussion dans les commentaires.`;

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
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ content: content.trim() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-linkedin-article:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
