import { commsAdvisor } from "./comms-advisor";
import { researchAgent } from "./research-agent";
import { contentAgent } from "./content-agent";
import { AgentConfig } from "./types";

export const agents: AgentConfig[] = [
  commsAdvisor,
  researchAgent,
  contentAgent,
];

export function getAgent(id: string): AgentConfig | undefined {
  return agents.find((agent) => agent.id === id);
}

export { commsAdvisor, researchAgent, contentAgent };