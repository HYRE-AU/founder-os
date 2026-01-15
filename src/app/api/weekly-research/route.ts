import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { researchAgent } from "@/lib/agents/research-agent";
import { contentAgent } from "@/lib/agents/content-agent";
import { resend, MY_EMAIL } from "@/lib/resend";
import {
  runFullResearch,
  formatResearchSummaryForEmail,
  ResearchResult,
} from "@/lib/tools/research-tools";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Summarize a single topic in detail
async function summarizeTopicInDetail(topic: ResearchResult): Promise<string> {
  if (topic.results.length === 0) {
    return `### ${topic.topic}\nNo significant findings this week.\n`;
  }

  const topicContent = topic.results
    .map(
      (r) =>
        `**${r.title}**\nSource: ${r.url}\n${r.publishedDate ? `Published: ${r.publishedDate}\n` : ""}${r.content}`
    )
    .join("\n\n---\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a research analyst specializing in AI hiring technology and recruitment. Provide detailed, actionable summaries.`,
      },
      {
        role: "user",
        content: `Analyze this research on "${topic.topic}" and provide a DETAILED summary.

Research:
${topicContent}

Provide:
1. **Key Developments** (3-5 bullet points, 2-3 sentences each): What happened? Why does it matter?
2. **Notable Statistics**: Any specific numbers, percentages, or data points worth citing
3. **Implications for AI Hiring**: How does this relate to AI-powered interviewing and screening?
4. **Content Angle**: One specific angle Shenny could use for a LinkedIn or Twitter post

Be specific and detailed. Include company names, numbers, and concrete examples where available.`,
      },
    ],
    temperature: 0.5,
    max_tokens: 1000,
  });

  return `### ${topic.topic}\n${response.choices[0].message.content}\n`;
}

export async function POST(req: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("=== Starting Weekly Research ===");
    console.log("Time:", new Date().toISOString());

    // Step 1: Run Tavily searches across all topics
    const researchResults = await runFullResearch();

    console.log("Research gathered, generating detailed topic summaries...");

    // Step 2: Summarize each topic in detail
    const topicSummaries: string[] = [];
    for (const topic of researchResults) {
      console.log(`Summarizing: ${topic.topic}`);
      const summary = await summarizeTopicInDetail(topic);
      topicSummaries.push(summary);

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const combinedTopicSummaries = topicSummaries.join("\n\n---\n\n");
    console.log("All topics summarized!");

    // Step 3: Generate executive summary from topic summaries
    console.log("Generating executive summary...");
    const executiveSummaryResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: researchAgent.systemPrompt },
        {
          role: "user",
          content: `Based on this week's detailed research summaries, create a COMPREHENSIVE executive summary.

Research Summaries by Topic:
${combinedTopicSummaries}

Create a thorough executive summary with:

## 🔥 Top 5 Findings This Week
For each finding, provide 3-4 sentences explaining:
- What happened
- Why it matters for the recruitment/TA industry
- How it specifically relates to AI-powered hiring and voice interviewing
- What action or insight Shenny should take from this

## 📊 Key Statistics & Data Points Worth Citing
List 5-10 specific numbers, percentages, and metrics. Format as:
- [Stat]: [Context and source]

## 📈 Emerging Trends (3-5 trends)
For each trend, provide:
- What the trend is
- Evidence from this week's research
- Where it's heading
- Implications for HYRE

## 🎯 Competitor Watch
Summarize any competitor activity:
- New products or features
- Funding or partnerships
- Strategic moves
- Weaknesses or gaps identified

## ⚡ Hot Takes & Contrarian Views
What debates are happening? What contrarian positions could Shenny take? What's everyone getting wrong?

## 💡 Top 3 Content Opportunities
Specific, detailed content ideas with:
- The angle/hook
- Why it would resonate now
- Which platform (LinkedIn vs Twitter)
- Key points to include

Be comprehensive and detailed. This should give a complete picture of the week in AI hiring and recruiting.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const executiveSummary =
      executiveSummaryResponse.choices[0].message.content || "";

    // Step 4: Generate content from summaries
    console.log("Generating content...");
    const contentResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: contentAgent.systemPrompt },
        {
          role: "user",
          content: `Based on this week's research, create thought leadership content for LinkedIn and Twitter.

## Executive Summary:
${executiveSummary}

## Detailed Research by Topic:
${combinedTopicSummaries}

Please create:

### LinkedIn Posts (5 posts)
Each post should be 150-250 words. Include:
- A hook that stops the scroll
- A clear insight or perspective
- Specific data or examples where relevant
- End with a thought-provoking question or reflection

Mix of post types:
1. One hot take / contrarian view
2. One insight from research/data
3. One founder journey / building in public
4. One industry observation
5. One future prediction

### Twitter Posts (7 tweets)
Each under 280 characters. Punchy and conversational. No hashtags.

Mix of tweet types:
- 2 hot takes
- 2 insights with stats
- 2 observations / questions
- 1 thread starter (first tweet only)

Make sure all content:
- References specific findings where relevant
- Maintains Shenny's authentic, warm, direct voice
- Provides unique perspective, not just restating facts
- Is ready to copy and post`,
        },
      ],
      temperature: 0.8,
      max_tokens: 3500,
    });

    const contentText = contentResponse.choices[0].message.content || "";

    console.log("Content generated, sending email...");

    // Step 5: Send email with all sections
    const emailHtml = formatResearchSummaryForEmail(
      `
      <h2>📌 Executive Summary</h2>
      <div class="insight">
        ${executiveSummary.replace(/\n/g, "<br>").replace(/## /g, "<strong style='font-size: 18px; display: block; margin-top: 20px;'>").replace(/\*\*/g, "")}
      </div>

      <h2>📚 Research by Topic</h2>
      <div class="topic">
        ${combinedTopicSummaries.replace(/\n/g, "<br>").replace(/### /g, "<strong style='font-size: 16px; display: block; margin-top: 15px; color: #1e40af;'>").replace(/---/g, "<hr style='border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;'>").replace(/\*\*/g, "")}
      </div>

      <h2>✍️ Content Ready to Post</h2>
      <div class="insight">
        ${contentText.replace(/\n/g, "<br>").replace(/### /g, "<strong style='font-size: 16px; display: block; margin-top: 15px;'>").replace(/\*\*/g, "")}
      </div>
      `,
      researchResults
    );

    await resend.emails.send({
      from: "Research Agent <onboarding@resend.dev>",
      to: MY_EMAIL,
      subject: `📊 Weekly Research Report - ${new Date().toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
      html: emailHtml,
    });

    console.log("=== Weekly Research Complete ===");

    return NextResponse.json({
      success: true,
      message: "Weekly research completed and emailed",
      stats: {
        topicsSearched: researchResults.length,
        totalSources: researchResults.reduce(
          (acc, r) => acc + r.results.length,
          0
        ),
      },
    });
  } catch (error) {
    console.error("Weekly research error:", error);
    return NextResponse.json(
      { error: "Weekly research failed", details: String(error) },
      { status: 500 }
    );
  }
}

// Also allow GET for easy testing
export async function GET(req: NextRequest) {
  return POST(req);
}