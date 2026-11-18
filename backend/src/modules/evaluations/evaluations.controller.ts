import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import {
  RunEvaluationDto,
  BenchmarkSuite,
  EvaluationRunResult,
  LeaderboardEntry,
  GenerateSuiteDto,
  QualityGateDto,
  QualityGateResult,
  ModelDriftReport,
  AuditReportExport,
} from './evaluations.types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('v1/evaluations')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Get('benchmarks')
  listBenchmarks(): BenchmarkSuite[] {
    return this.evaluationsService.listBenchmarkSuites();
  }

  @Get('benchmarks/:id')
  getBenchmark(@Param('id') id: string): BenchmarkSuite {
    return this.evaluationsService.getBenchmarkSuite(id);
  }

  @Get('leaderboard')
  getLeaderboard(): LeaderboardEntry[] {
    return this.evaluationsService.getLeaderboard();
  }

  @Get('history')
  getHistory(@Query('limit') limit?: string): EvaluationRunResult[] {
    const num = limit ? parseInt(limit, 10) : 20;
    return this.evaluationsService.getHistory(num);
  }

  @Get('history/:id')
  getHistoryById(@Param('id') id: string): EvaluationRunResult {
    return this.evaluationsService.getHistoryById(id);
  }

  @Get('history/:id/export')
  exportReport(
    @Param('id') id: string,
    @Query('format') format?: 'json' | 'csv' | 'markdown'
  ): AuditReportExport {
    return this.evaluationsService.exportAuditReport(id, format || 'markdown');
  }

  @Get('drift/:modelId')
  detectDrift(@Param('modelId') modelId: string): ModelDriftReport {
    return this.evaluationsService.detectModelDrift(modelId);
  }

  @Post('assert')
  @HttpCode(HttpStatus.OK)
  async assertQualityGate(
    @Body() dto: QualityGateDto,
    @CurrentUser() user: any
  ): Promise<QualityGateResult> {
    return this.evaluationsService.assertQualityGate(dto, user);
  }

  @Post('generate-suite')
  @HttpCode(HttpStatus.OK)
  async generateSuite(
    @Body() dto: GenerateSuiteDto,
    @CurrentUser() user: any
  ): Promise<BenchmarkSuite> {
    return this.evaluationsService.generateSyntheticSuite(dto, user);
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async runEvaluation(
    @Body() dto: RunEvaluationDto,
    @CurrentUser() user: any
  ): Promise<EvaluationRunResult> {
    return this.evaluationsService.runEvaluation(dto, user);
  }
}
