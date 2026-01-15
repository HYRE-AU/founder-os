export interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: Tool[];
  model?: string;
}

// Alias for backwards compatibility
export type AgentConfig = Agent;

export interface Tool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}