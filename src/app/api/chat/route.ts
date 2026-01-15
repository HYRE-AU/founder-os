import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAgent } from "@/lib/agents";
import { executeTool } from "@/lib/tools";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  let assistantId: string | null = null;
  
  try {
    const { agentId, message, threadId } = await req.json();

    // 1. Get agent config
    const agent = getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // 2. Get or create thread
    let currentThreadId = threadId;
    if (!currentThreadId) {
      const thread = await openai.beta.threads.create();
      currentThreadId = thread.id;
    }

    // 3. Add user message to thread
    await openai.beta.threads.messages.create(currentThreadId, {
      role: "user",
      content: message,
    });

    // 4. Create assistant
    const assistant = await openai.beta.assistants.create({
      name: agent.name,
      instructions: agent.systemPrompt,
      model: agent.model || "gpt-4o",
      tools: agent.tools.map((t) => ({
        type: "function" as const,
        function: t.function,
      })) as OpenAI.Beta.Assistants.AssistantTool[],
    });
    assistantId = assistant.id;

    // 5. Create run
    let run = await openai.beta.threads.runs.createAndPoll(currentThreadId, {
      assistant_id: assistant.id,
    });

    // 6. Handle tool calls (loop until done)
    while (run.status === "requires_action") {
      const toolCalls = run.required_action?.submit_tool_outputs.tool_calls || [];

      const toolOutputs = await Promise.all(
        toolCalls.map(async (toolCall) => {
          console.log(`Executing tool: ${toolCall.function.name}`);
          console.log(`Arguments: ${toolCall.function.arguments}`);

          const result = await executeTool(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments)
          );

          console.log(`Result:`, result);

          return {
            tool_call_id: toolCall.id,
            output: JSON.stringify(result),
          };
        })
      );

      // Submit tool outputs
      run = await openai.beta.threads.runs.submitToolOutputsAndPoll(
        run.id,
        {
          thread_id: currentThreadId,
          tool_outputs: toolOutputs,
        }
      );
    }

    // 7. Check for failure
    if (run.status === "failed") {
      console.error("Run failed:", run.last_error);
      if (assistantId) await openai.beta.assistants.delete(assistantId);
      return NextResponse.json({ error: "Assistant run failed" }, { status: 500 });
    }

    // 8. Get response
    const messages = await openai.beta.threads.messages.list(currentThreadId);
    const lastMessage = messages.data[0];

    let responseText = "";
    if (lastMessage.content[0].type === "text") {
      responseText = lastMessage.content[0].text.value;
    }

    // 9. Cleanup
    if (assistantId) await openai.beta.assistants.delete(assistantId);

    return NextResponse.json({
      threadId: currentThreadId,
      message: responseText,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    if (assistantId) {
      try {
        await openai.beta.assistants.delete(assistantId);
      } catch {}
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}