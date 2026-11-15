import { ChatMessage } from '../../../common/types/openai.types';

export type RoutingStrategy =
  | 'auto'
  | 'auto:fast'
  | 'auto:cost-optimized'
  | 'auto:reasoning'
  | 'auto:balanced';

export class SemanticRouter {
  /**
   * Classifies user chat messages and selects an optimal model based on intent, complexity, and media.
   */
  static classifyQuery(messages: ChatMessage[], modelIdentifier: string = 'auto'): string {
    if (!messages || messages.length === 0) {
      return 'llama-3.3-70b';
    }

    // 1. Multi-modal vision input check
    const hasImages = messages.some((m) =>
      Array.isArray(m.content) && m.content.some((p) => p.type === 'image_url')
    );
    if (hasImages) {
      return 'llama-3.2-11b-vision';
    }

    // Combine user and system text
    const fullText = messages
      .map((m) => {
        if (typeof m.content === 'string') return m.content;
        if (Array.isArray(m.content)) {
          return m.content
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join(' ');
        }
        return '';
      })
      .join('\n');

    const lower = fullText.toLowerCase();

    // Strategy-specific rules
    if (modelIdentifier === 'auto:fast' || modelIdentifier === 'auto:cost-optimized') {
      return 'llama-3.3-8b';
    }
    if (modelIdentifier === 'auto:reasoning') {
      return 'deepseek-r1-70b';
    }

    // 2. Heavy code detection
    const isCode =
      fullText.includes('```') ||
      /\b(function|def|class|async|import\s+[\w{}]+|console\.log|SELECT\s+.*FROM|def\s+\w+\(|git\s+commit)\b/.test(
        fullText
      );
    if (isCode) {
      return 'qwen-2.5-coder-32b';
    }

    // 3. Deep reasoning / mathematics / formal proof detection
    const isReasoning =
      /\b(step[- ]by[- ]step|prove\b|derive\b|mathematical|formal logic|analyze\s+thoroughly|root cause|chain of thought|explain the math)\b/i.test(
        lower
      ) || fullText.length > 2500;
    if (isReasoning) {
      return 'deepseek-r1-70b';
    }

    // 4. Default: Short messages go to 8B, longer to 70B
    return fullText.length > 1000 ? 'llama-3.3-70b' : 'llama-3.3-8b';
  }
}
