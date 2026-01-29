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

    const systemPrompt = `You are an expert technical documentation writer. Generate comprehensive, well-structured documentation in HTML format with embedded CSS.

The documentation must:
1. Be styled like GitHub README (clean, readable, monospace for code)
2. Include a complete HTML page with embedded CSS
3. Use modern, responsive design
4. Include syntax highlighting for code blocks
5. Generate Mermaid.js diagrams for architecture and data flow where relevant
6. Be self-contained (single HTML file with all CSS inline)

Structure the documentation with:
- Project Overview
- Features
- Architecture (with Mermaid diagram)
- Installation & Setup
- Usage Examples
- API Reference (if applicable)
- Data Flow (with Mermaid diagram if complex)
- File Structure
- Contributing Guidelines
- License Information

Use this CSS framework for GitHub-like styling:
- Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif
- Code font: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace
- Primary color: #0969da for links
- Background: #ffffff, secondary: #f6f8fa
- Border color: #d0d7de
- Max-width: 1012px centered

IMPORTANT: Your response must be ONLY the complete HTML document, starting with <!DOCTYPE html> and ending with </html>. No markdown, no explanations.`;

    const userPrompt = `Generate complete HTML/CSS documentation for this GitHub repository:

**Repository**: ${repoFullName}
**Name**: ${repoName}
**Description**: ${description || 'No description provided'}
**Primary Language**: ${language || 'Not specified'}
**Topics**: ${topics?.join(', ') || 'None'}

**File Structure**:
${fileTree}

**README Content**:
${readme}

Generate a complete, production-ready HTML documentation page with:
1. Architecture diagram using Mermaid.js syntax (wrapped in <pre class="mermaid">)
2. Data flow diagram if the project has complex data handling
3. All sections properly formatted
4. Responsive design
5. Include Mermaid.js CDN script for diagram rendering`;

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
