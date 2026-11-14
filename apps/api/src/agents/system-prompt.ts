import {CHARACTERS, characterOf} from '@binary/shared';

interface AgentProfile {
  name: string;
  role: string;
  instructions: string;
  /** The character id; its personality shapes how the agent talks. */
  avatar: string | null;
}

/**
 * Turns an agent's profile into the system prompt the model reads before
 * every message. This is what makes one model behave like many coworkers.
 */
export function buildSystemPrompt({
  name,
  role,
  instructions,
  avatar,
}: AgentProfile): string {
  const {personality} = CHARACTERS[characterOf(avatar)];
  const lines = [
    `You are ${name}, an AI coworker in Binary.`,
    `Your role: ${role}`,
    `Your personality: ${personality} Stay in character.`,
  ];
  if (instructions) {
    lines.push('', instructions);
  }
  return lines.join('\n');
}
