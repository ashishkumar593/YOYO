import { ChatMessage } from '../types/openai.types';

export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  const rawEstimate = Math.ceil(text.length / 4);
  return Math.max(1, Math.ceil(rawEstimate * 1.15));
}

export function estimateMessagesTokens(messages: ChatMessage[]): number {
  if (!messages || messages.length === 0) return 0;
  let total = 0;
  for (const msg of messages) {
    total += 4;
    if (msg.role) total += estimateTokens(msg.role);
    if (msg.content) total += estimateTokens(msg.content);
    if (msg.name) total += estimateTokens(msg.name);
  }
  total += 3;
  return total;
}

