export interface ModerationCategories {
  hate: boolean;
  'hate/threatening': boolean;
  'self-harm': boolean;
  sexual: boolean;
  'sexual/minors': boolean;
  violence: boolean;
  'violence/graphic': boolean;
  pii_exposure: boolean;
  jailbreak_attempt: boolean;
}

export interface ModerationCategoryScores {
  hate: number;
  'hate/threatening': number;
  'self-harm': number;
  sexual: number;
  'sexual/minors': number;
  violence: number;
  'violence/graphic': number;
  pii_exposure: number;
  jailbreak_attempt: number;
}

export interface ModerationResult {
  flagged: boolean;
  categories: ModerationCategories;
  category_scores: ModerationCategoryScores;
}

export interface ModerationResponse {
  id: string;
  model: string;
  results: ModerationResult[];
}

export interface ModerationRequest {
  input: string | string[];
  model?: string;
}

export interface GuardrailViolation {
  category: 'PII' | 'JAILBREAK' | 'TOXICITY' | 'POLICY';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detail: string;
  matchedText?: string;
  score: number;
}

export interface GuardrailPolicy {
  maskPii: boolean;
  blockPromptInjection: boolean;
  toxicityThreshold: number; // 0.0 to 1.0 (default 0.7)
  action: 'block' | 'mask_and_proceed' | 'audit_only';
}

export interface SanitizeResult {
  sanitized: string;
  violations: GuardrailViolation[];
  blocked: boolean;
}
