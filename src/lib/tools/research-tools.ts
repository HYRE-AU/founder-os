import { tavilyClient } from "../tavily";

export interface ResearchResult {
  topic: string;
  results: {
    title: string;
    url: string;
    content: string;
    publishedDate?: string;
  }[];
}

// Optimized search topics for weekly research
export const RESEARCH_TOPICS = [
  {
    id: "academic-research",
    query: "hiring interview research study field experiment academic paper published 2024 2025",
    topic: "Academic Hiring Research",
  },
  {
    id: "competitors",
    query: "Alex.com Sapia.ai HireVue Paradox Metaview BrightHire Pillar Tengai news funding product",
    topic: "AI Interview Competitors",
  },
  {
    id: "voice-ai",
    query: "voice AI conversational AI speech technology interview automation 2024 2025",
    topic: "Voice AI & Conversational AI",
  },
  {
    id: "anz-market",
    query: "Australia New Zealand recruitment talent acquisition hiring market trends 2024 2025",
    topic: "ANZ Recruiting Market",
  },
  {
    id: "uk-us-market",
    query: "UK USA United Kingdom United States recruitment talent acquisition hiring trends 2024 2025",
    topic: "UK & US Recruiting Market",
  },
  {
    id: "ai-regulation",
    query: "AI hiring regulation bias audit law Australia USA UK EU EEOC algorithmic 2024 2025",
    topic: "AI Hiring Regulation",
  },
  {
    id: "recruitment-funding",
    query: "HR tech recruitment technology startup funding seed Series A B C D 2024 2025",
    topic: "Recruitment Tech Funding",
  },
  {
    id: "future-of-work",
    query: "future of work future of hiring skills based hiring AI recruitment trends 2025",
    topic: "Future of Work & Hiring",
  },
];

export async function searchTopic(
  query: string,
  topic: string
): Promise<ResearchResult> {
  try {
    const response = await tavilyClient.search(query, {
      searchDepth: "advanced",
      maxResults: 10,
      includeAnswer: true,
      topic: "news",
    });

    return {
      topic,
      results: response.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        publishedDate: r.publishedDate,
      })),
    };
  } catch (error) {
    console.error(`Error searching topic "${topic}":`, error);
    return { topic, results: [] };
  }
}

export async function runFullResearch(): Promise<ResearchResult[]> {
  console.log("Starting weekly research...");
  console.log(`Searching ${RESEARCH_TOPICS.length} topics...`);

  const allResults: ResearchResult[] = [];

  for (const topic of RESEARCH_TOPICS) {
    console.log(`Searching: ${topic.topic}`);
    const result = await searchTopic(topic.query, topic.topic);
    console.log(`  Found ${result.results.length} results`);
    allResults.push(result);

    // Small delay between searches to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const totalResults = allResults.reduce((acc, r) => acc + r.results.length, 0);
  console.log(
    `Research complete! Total: ${totalResults} sources across ${RESEARCH_TOPICS.length} topics`
  );

  return allResults;
}

export function formatResearchForLLM(results: ResearchResult[]): string {
  let formatted = "# Weekly Research Results\n\n";

  for (const topicResult of results) {
    formatted += `## ${topicResult.topic}\n\n`;

    if (topicResult.results.length === 0) {
      formatted += "_No results found for this topic._\n\n";
      continue;
    }

    for (const result of topicResult.results) {
      formatted += `### ${result.title}\n`;
      formatted += `**Source:** ${result.url}\n`;
      if (result.publishedDate) {
        formatted += `**Published:** ${result.publishedDate}\n`;
      }
      formatted += `\n${result.content}\n\n`;
      formatted += "---\n\n";
    }
  }

  return formatted;
}

export function formatResearchSummaryForEmail(
  summary: string,
  results: ResearchResult[]
): string {
  const sourceCount = results.reduce((acc, r) => acc + r.results.length, 0);
  const topicCount = results.filter((r) => r.results.length > 0).length;

  // Build sources section
  let sourcesHtml = "";
  for (const topicResult of results) {
    if (topicResult.results.length === 0) continue;

    sourcesHtml += `<h3>${topicResult.topic}</h3><ul>`;
    for (const result of topicResult.results) {
      sourcesHtml += `<li><a href="${result.url}">${result.title}</a>`;
      if (result.publishedDate) {
        sourcesHtml += ` <span style="color: #64748b; font-size: 12px;">(${result.publishedDate})</span>`;
      }
      sourcesHtml += `</li>`;
    }
    sourcesHtml += `</ul>`;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    h3 { color: #333; font-weight: normal; font-size: 16px; margin-top: 20px; }
    .stats { background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .insight { background: #fff; border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0; }
    .topic { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .sources { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .sources h3 { margin-top: 15px; margin-bottom: 5px; }
    .sources ul { margin: 5px 0 15px 0; padding-left: 20px; }
    .sources li { margin: 3px 0; font-size: 14px; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
    ul { margin: 10px 0; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  <h1>📊 Weekly Research Report</h1>
  
  <div class="stats">
    <strong>This Week:</strong> ${sourceCount} sources analyzed across ${topicCount} topics<br>
    <strong>Topics Covered:</strong> ${results.map((r) => r.topic).join(" • ")}
  </div>

  ${summary}

  <h2>🔗 All Sources</h2>
  <div class="sources">
    ${sourcesHtml}
  </div>

  <div class="footer">
    <p>This report was automatically generated by your Research Agent.</p>
    <p>Ready-to-post content has been created by your Content Agent.</p>
  </div>
</body>
</html>
  `;
}