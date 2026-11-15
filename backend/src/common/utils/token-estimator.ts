import { ChatMessage, ContentPart } from '../types/openai.types';

export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  const rawEstimate = Math.ceil(text.length / 4);
  return Math.max(1, Math.ceil(rawEstimate * 1.15));
}

export function estimateContentTokens(content: any): number {
  if (!content) return 0;
  if (typeof content === 'string') {
    return estimateTokens(content);
  }
  if (Array.isArray(content)) {
    let total = 0;
    for (const part of content) {
      if (part.type === 'text' && typeof part.text === 'string') {
        total += estimateTokens(part.text);
      } else if (part.type === 'image_url') {
        const detail = part.image_url?.detail || 'auto';
        // Standard OpenAI/vLLM Vision token cost: low = 85 tokens, high/auto = 500 tokens
        total += detail === 'low' ? 85 : 500;
      }
    }
    return total;
  }
  return 0;
}

export function estimateMessagesTokens(messages: ChatMessage[]): number {
  if (!messages || messages.length === 0) return 0;
  let total = 0;
  for (const msg of messages) {
    total += 4;
    if (msg.role) total += estimateTokens(msg.role);
    if (msg.content) total += estimateContentTokens(msg.content);
    if (msg.name) total += estimateTokens(msg.name);
  }
  total += 3;
  return total;
}

