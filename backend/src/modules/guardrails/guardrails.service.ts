import { Injectable, Logger } from '@nestjs/common';
import {
  ModerationResponse,
  ModerationResult,
  ModerationCategories,
  ModerationCategoryScores,
  GuardrailViolation,
  GuardrailPolicy,
  SanitizeResult,
} from './guardrails.types';
import { ChatMessage } from '../../common/types/openai.types';

@Injectable()
export class GuardrailsService {
  private readonly logger = new Logger(GuardrailsService.name);

  // Default system-wide policy
  private currentPolicy: GuardrailPolicy = {
    maskPii: true,
    blockPromptInjection: true,
    toxicityThreshold: 0.7,
    action: 'mask_and_proceed',
  };

  // High-performance regex patterns for PII
  private readonly PII_PATTERNS = {
    SSN: /\b(?!000|666|9\d{2})\d{3}[- ]?(?!00)\d{2}[- ]?(?!0000)\d{4}\b/g,
    CREDIT_CARD: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    EMAIL: /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g,
    PHONE: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    API_KEY: /\b(?:sk-[a-zA-Z0-9]{20,}|yoyo-[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16})\b/g,
    PRIVATE_KEY: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
  };

  // Known prompt injection / jailbreak markers
  private readonly JAILBREAK_PATTERNS = [
    /(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|directions|rules)/i,
    /(?:system\s+prompt\s+(?:leak|reveal|output|display|show|print))/i,
    /(?:you\s+are\s+now\s+in\s+developer\s+mode)/i,
    /(?:dan\s+mode|jailbreak\s+mode|unfiltered\s+mode|god\s+mode)/i,
    /(?:bypass\s+(?:all\s+)?(?:safety|content)\s+(?:filters|guidelines|policies))/i,
    /(?:roleplay\s+as\s+an\s+(?:unrestricted|evil|unfiltered)\s+ai)/i,
  ];

  // Content safety lexical dictionaries
  private readonly HATE_TERMS = ['kill all', 'exterminate', 'inferior race', 'hate speech'];
  private readonly VIOLENCE_TERMS = ['build a bomb', 'make explosives', 'commit murder', 'assassinate'];
  private readonly SELF_HARM_TERMS = ['how to suicide', 'commit suicide', 'end my life', 'self-harm instructions'];
  private readonly SEXUAL_TERMS = ['explicit porn', 'sexual assault', 'csam', 'nonconsensual'];

  getPolicy(): GuardrailPolicy {
    return { ...this.currentPolicy };
  }

  updatePolicy(updates: Partial<GuardrailPolicy>): GuardrailPolicy {
    this.currentPolicy = {
      ...this.currentPolicy,
      ...updates,
    };
    this.logger.log(`Guardrails policy updated: ${JSON.stringify(this.currentPolicy)}`);
    return this.getPolicy();
  }

  /**
   * Evaluates text inputs and produces an OpenAI-compatible /v1/moderations response
   */
  evaluateModeration(input: string | string[], model: string = 'yoyo-guardrails-v1'): ModerationResponse {
    const inputs = Array.isArray(input) ? input : [input];
    const results: ModerationResult[] = inputs.map((text) => this.evaluateSingleText(text));

    return {
      id: `modr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      model,
      results,
    };
  }

  private evaluateSingleText(text: string): ModerationResult {
    const lower = (text || '').toLowerCase();

    // Check PII presence
    let piiHits = 0;
    for (const pattern of Object.values(this.PII_PATTERNS)) {
      const matches = text.match(pattern);
      if (matches) piiHits += matches.length;
    }
    const piiScore = Math.min(1.0, piiHits * 0.35);

    // Check Jailbreak presence
    let jailbreakHits = 0;
    for (const pattern of this.JAILBREAK_PATTERNS) {
      if (pattern.test(text)) jailbreakHits += 1;
    }
    const jailbreakScore = jailbreakHits > 0 ? 0.95 : 0.01;

    // Toxicity lexical scoring
    const hateHits = this.HATE_TERMS.filter((t) => lower.includes(t)).length;
    const violenceHits = this.VIOLENCE_TERMS.filter((t) => lower.includes(t)).length;
    const selfHarmHits = this.SELF_HARM_TERMS.filter((t) => lower.includes(t)).length;
    const sexualHits = this.SEXUAL_TERMS.filter((t) => lower.includes(t)).length;

    const hateScore = Math.min(1.0, hateHits > 0 ? 0.85 + (hateHits - 1) * 0.05 : 0.001);
    const violenceScore = Math.min(1.0, violenceHits > 0 ? 0.85 + (violenceHits - 1) * 0.05 : 0.001);
    const selfHarmScore = Math.min(1.0, selfHarmHits > 0 ? 0.9 + (selfHarmHits - 1) * 0.05 : 0.0005);
    const sexualScore = Math.min(1.0, sexualHits > 0 ? 0.85 + (sexualHits - 1) * 0.05 : 0.001);

    const scores: ModerationCategoryScores = {
      hate: hateScore,
      'hate/threatening': Math.min(1.0, hateScore * 1.1),
      'self-harm': selfHarmScore,
      sexual: sexualScore,
      'sexual/minors': sexualHits > 0 && lower.includes('minor') ? 0.99 : 0.0001,
      violence: violenceScore,
      'violence/graphic': Math.min(1.0, violenceScore * 1.2),
      pii_exposure: piiScore,
      jailbreak_attempt: jailbreakScore,
    };

    const threshold = this.currentPolicy.toxicityThreshold;
    const categories: ModerationCategories = {
      hate: hateScore >= threshold,
      'hate/threatening': scores['hate/threatening'] >= threshold,
      'self-harm': selfHarmScore >= threshold,
      sexual: sexualScore >= threshold,
      'sexual/minors': scores['sexual/minors'] >= 0.5,
      violence: violenceScore >= threshold,
      'violence/graphic': scores['violence/graphic'] >= threshold,
      pii_exposure: piiScore >= 0.5,
      jailbreak_attempt: jailbreakScore >= 0.5,
    };

    const flagged = Object.values(categories).some((val) => val === true);

    return {
      flagged,
      categories,
      category_scores: scores,
    };
  }

  /**
   * Scans and sanitizes a raw string, masking PII and detecting jailbreak attacks.
   */
  inspectAndSanitize(content: string, customPolicy?: Partial<GuardrailPolicy>): SanitizeResult {
    const policy = { ...this.currentPolicy, ...customPolicy };
    let sanitized = content || '';
    const violations: GuardrailViolation[] = [];
    let blocked = false;

    // 1. Jailbreak & Prompt Injection Scan
    for (const pattern of this.JAILBREAK_PATTERNS) {
      const match = sanitized.match(pattern);
      if (match) {
        violations.push({
          category: 'JAILBREAK',
          severity: 'critical',
          detail: 'Detected prompt injection or system override attempt',
          matchedText: match[0],
          score: 0.95,
        });
        if (policy.blockPromptInjection) {
          blocked = true;
        }
      }
    }

    // 2. PII Detection & Masking
    if (policy.maskPii) {
      // SSN
      sanitized = sanitized.replace(this.PII_PATTERNS.SSN, (match) => {
        violations.push({
          category: 'PII',
          severity: 'high',
          detail: 'Social Security Number (SSN) detected',
          matchedText: '***-**-****',
          score: 0.9,
        });
        return '[REDACTED_SSN]';
      });

      // Credit Card
      sanitized = sanitized.replace(this.PII_PATTERNS.CREDIT_CARD, (match) => {
        violations.push({
          category: 'PII',
          severity: 'high',
          detail: 'Credit Card number detected',
          matchedText: '****-****-****-****',
          score: 0.95,
        });
        return '[REDACTED_CREDIT_CARD]';
      });

      // Private Key
      sanitized = sanitized.replace(this.PII_PATTERNS.PRIVATE_KEY, () => {
        violations.push({
          category: 'PII',
          severity: 'critical',
          detail: 'Cryptographic Private Key detected',
          score: 1.0,
        });
        return '[REDACTED_PRIVATE_KEY]';
      });

      // API Key
      sanitized = sanitized.replace(this.PII_PATTERNS.API_KEY, (match) => {
        violations.push({
          category: 'PII',
          severity: 'high',
          detail: 'API Key / Secret Token detected',
          matchedText: `${match.substring(0, 5)}...`,
          score: 0.85,
        });
        return '[REDACTED_API_KEY]';
      });

      // Email
      sanitized = sanitized.replace(this.PII_PATTERNS.EMAIL, (match) => {
        violations.push({
          category: 'PII',
          severity: 'medium',
          detail: 'Email address detected',
          matchedText: match,
          score: 0.6,
        });
        return '[REDACTED_EMAIL]';
      });

      // Phone
      sanitized = sanitized.replace(this.PII_PATTERNS.PHONE, (match) => {
        violations.push({
          category: 'PII',
          severity: 'medium',
          detail: 'Phone number detected',
          matchedText: match,
          score: 0.6,
        });
        return '[REDACTED_PHONE]';
      });
    }

    if (policy.action === 'block' && violations.length > 0) {
      blocked = true;
    }

    return {
      sanitized,
      violations,
      blocked,
    };
  }

  /**
   * Sanitizes all messages in a conversation chain.
   */
  sanitizeMessages(
    messages: ChatMessage[],
    customPolicy?: Partial<GuardrailPolicy>
  ): {
    sanitizedMessages: ChatMessage[];
    violations: GuardrailViolation[];
    blocked: boolean;
  } {
    const allViolations: GuardrailViolation[] = [];
    let isBlocked = false;

    const sanitizedMessages: ChatMessage[] = messages.map((msg) => {
      if (typeof msg.content === 'string') {
        const result = this.inspectAndSanitize(msg.content, customPolicy);
        if (result.violations.length > 0) {
          allViolations.push(...result.violations);
        }
        if (result.blocked) {
          isBlocked = true;
        }
        return {
          ...msg,
          content: result.sanitized,
        };
      } else if (Array.isArray(msg.content)) {
        // Multi-modal message content parts
        const newParts = msg.content.map((part) => {
          if (part.type === 'text' && typeof (part as any).text === 'string') {
            const result = this.inspectAndSanitize((part as any).text, customPolicy);
            if (result.violations.length > 0) {
              allViolations.push(...result.violations);
            }
            if (result.blocked) {
              isBlocked = true;
            }
            return { ...part, text: result.sanitized };
          }
          return part;
        });
        return { ...msg, content: newParts };
      }
      return msg;
    });

    return {
      sanitizedMessages,
      violations: allViolations,
      blocked: isBlocked,
    };
  }
}
