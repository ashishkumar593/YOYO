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
