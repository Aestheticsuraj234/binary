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
 * `remembered` are its memories closest to the new message (Chapter 12);
 * `room` says who else is in the conversation (Chapter 13).
 */
export function buildSystemPrompt(
  {name, role, instructions, avatar}: AgentProfile,
  remembered: string[] = [],
  room?: {name: string; members: {name: string; role: string}[]},
): string {
  const {personality} = CHARACTERS[characterOf(avatar)];
  const lines = [
    `You are ${name}, an AI coworker in Binary.`,
    `Your role: ${role}`,
    `Your personality: ${personality} Stay in character.`,
  ];
  if (instructions) {
    lines.push('', instructions);
  }
  if (room) {
    const others = room.members.filter((member) => member.name !== name);
    lines.push(
      '',
      `You are in a room called "${room.name}" with the user and: ${others.map((member) => `${member.name} (${member.role})`).join('; ')}.`,
      'Messages from the others start with [Name]. Answer only your part, build on what they said, and do not repeat it.',
      'Do not start your answer with your own name: the chat already shows who is talking.',
      'To hand part of the task to a teammate, mention them with @Name; they will answer after you.',
    );
  }
  if (remembered.length > 0) {
    lines.push(
      '',
      'What you remember about the user from earlier chats (it may be out of date; ask if unsure):',
      ...remembered.map((memory) => `- ${memory}`),
    );
  }
  return lines.join('\n');
}
