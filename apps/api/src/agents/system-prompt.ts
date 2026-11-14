interface AgentProfile {
  name: string;
  role: string;
  instructions: string;
}

/**
 * Turns an agent's profile into the system prompt the model reads before
 * every message. This is what makes one model behave like many coworkers.
 */
export function buildSystemPrompt({
  name,
  role,
  instructions,
}: AgentProfile): string {
  const lines = [
    `You are ${name}, an AI coworker in Binary.`,
    `Your role: ${role}`,
  ];
  if (instructions) {
    lines.push('', instructions);
  }
  return lines.join('\n');
}
