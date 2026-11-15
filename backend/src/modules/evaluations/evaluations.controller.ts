import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { RunEvaluationDto, BenchmarkSuite, EvaluationRunResult } from './evaluations.types';
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

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async runEvaluation(
    @Body() dto: RunEvaluationDto,
    @CurrentUser() user: any
  ): Promise<EvaluationRunResult> {
    return this.evaluationsService.runEvaluation(dto, user);
  }
}
