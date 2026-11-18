export interface BenchmarkSample {
  id: string;
  title: string;
  prompt: string;
  expectedCriteria: string;
  category: 'coding' | 'reasoning' | 'safety' | 'general';
}

export interface BenchmarkSuite {
  id: string;
  name: string;
  description: string;
  category: string;
  samples: BenchmarkSample[];
}

export interface RunEvaluationDto {
  modelA: string;
  modelB: string;
  judgeModel?: string;
  benchmarkSuiteId: string;
  samples?: BenchmarkSample[];
}

export interface CriterionScores {
  accuracy: number; // 1-10
  reasoning: number; // 1-10
  adherence: number; // 1-10
  overall: number; // 1-10
}

export interface JudgeVerdict {
  winner: 'modelA' | 'modelB' | 'tie';
  scoreA: CriterionScores;
  scoreB: CriterionScores;
  reasoning: string;
}

export interface SampleResult {
  sampleId: string;
  sampleTitle: string;
  prompt: string;
  responseA: {
    content: string;
    latencyMs: number;
    tokens: number;
  };
  responseB: {
    content: string;
    latencyMs: number;
    tokens: number;
  };
  judge: JudgeVerdict;
}

export interface EvaluationSummary {
  winsA: number;
  winsB: number;
  ties: number;
  winRateA: number; // Percentage 0-100
  winRateB: number;
  avgLatencyMsA: number;
  avgLatencyMsB: number;
  avgOverallScoreA: number;
  avgOverallScoreB: number;
  categoryScoresA: {
    accuracy: number;
    reasoning: number;
    adherence: number;
  };
  categoryScoresB: {
    accuracy: number;
    reasoning: number;
    adherence: number;
  };
}

export interface EvaluationRunResult {
  id: string;
  createdAt: string;
  modelA: string;
  modelB: string;
  judgeModel: string;
  suiteId: string;
  suiteName: string;
  totalSamples: number;
  summary: EvaluationSummary;
  sampleResults: SampleResult[];
}

export interface LeaderboardEntry {
  rank: number;
  model: string;
  elo: number;
  matches: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number; // 0-100%
  avgScore: number; // 0-10
  avgLatencyMs: number;
}

export interface GenerateSuiteDto {
  domain: string;
  category?: 'coding' | 'reasoning' | 'safety' | 'general';
  testCount?: number;
  generatorModel?: string;
}

export interface QualityGateDto {
  candidateModel: string;
  baselineModel: string;
  benchmarkSuiteId: string;
  judgeModel?: string;
  minWinRate?: number; // default 50%
  minOverallScore?: number; // default 7.5 / 10
  minAccuracyScore?: number; // default 7.0 / 10
  maxLatencyMs?: number; // default 2000ms
  failOnThreshold?: boolean; // if true, throws 422 Unprocessable Entity
}

export interface QualityGateViolation {
  criterion: string;
  expected: string;
  actual: string;
}

export interface QualityGateResult {
  passed: boolean;
  deploymentApproved: boolean;
  candidateModel: string;
  baselineModel: string;
  suiteId: string;
  suiteName: string;
  evaluatedAt: string;
  metrics: {
    winRate: number;
    baselineWinRate: number;
    overallScore: number;
    baselineOverallScore: number;
    accuracyScore: number;
    baselineAccuracyScore: number;
    avgLatencyMs: number;
    baselineLatencyMs: number;
  };
  thresholds: {
    minWinRate: number;
    minOverallScore: number;
    minAccuracyScore: number;
    maxLatencyMs: number;
  };
  violations: QualityGateViolation[];
  runId: string;
}

export interface ModelDriftReport {
  model: string;
  driftDetected: boolean;
  historicalRunsCount: number;
  baselineScore: number;
  currentScore: number;
  scoreDelta: number;
  scoreDeltaPct: number;
  baselineLatencyMs: number;
  currentLatencyMs: number;
  latencyDeltaMs: number;
  status: 'STABLE' | 'DEGRADED' | 'IMPROVED' | 'INSUFFICIENT_DATA';
  recommendation: string;
  evaluatedAt: string;
}

export interface AuditReportExport {
  runId: string;
  suiteId: string;
  suiteName: string;
  modelA: string;
  modelB: string;
  judgeModel: string;
  winner: string;
  evaluatedAt: string;
  exportFormat: 'json' | 'csv' | 'markdown';
  content: string;
  complianceHash: string; // SHA-256 tamper-evident integrity hash
}
