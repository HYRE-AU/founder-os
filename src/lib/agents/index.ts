import { commsAdvisor } from "./comms-advisor";
import { researchAgent } from "./research-agent";
import { contentAgent } from "./content-agent";
import { startupMentor } from "./startup-mentor";
import { innerWorkSystemPrompt } from "./inner-work";
import { AgentConfig } from "./types";

// Re-export the type
export type { AgentConfig };

// Create inner work agent config from the system prompt
const innerWork: AgentConfig = {
  id: "inner-work",
  name: "Inner Work",
  description: "Feelings, growth & reflection",
  systemPrompt: innerWorkSystemPrompt,
  tools: [],
};

const agents: AgentConfig[] = [
  commsAdvisor,
  researchAgent,
  contentAgent,
  startupMentor,
  innerWork,
];

export function getAgent(id: string): AgentConfig | undefined {
  return agents.find((agent) => agent.id === id);
}

export function getAllAgents(): AgentConfig[] {
  return agents;
}

// Export individual agents for direct use
export { commsAdvisor, researchAgent, contentAgent, startupMentor, innerWork };
