import { Test, TestingModule } from '@nestjs/testing';
import { ToolsService } from './tools.service';
import { InferenceService } from '../inference/inference.service';

describe('ToolsService & Autonomous Agent Loop', () => {
  let service: ToolsService;
  let mockInferenceService: any;

  beforeEach(async () => {
    mockInferenceService = {
      chatCompletion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolsService,
        {
          provide: InferenceService,
          useValue: mockInferenceService,
        },
      ],
    }).compile();

    service = module.get<ToolsService>(ToolsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list all tool definitions conforming to OpenAI function calling spec', () => {
    const tools = service.getToolDefinitions();
    expect(tools.length).toBeGreaterThanOrEqual(4);
    const names = tools.map((t) => t.function.name);
    expect(names).toContain('calculator');
    expect(names).toContain('get_weather');
    expect(names).toContain('db_query');
    expect(names).toContain('web_search');
  });

  it('should execute calculator tool accurately', async () => {
    const res = await service.executeTool('calculator', {
      expression: '(150 * 0.20) + 10',
    });
    expect(res.result).toBe(40);
  });

  it('should execute weather tool with realistic telemetry', async () => {
    const res = await service.executeTool('get_weather', {
      city: 'Tokyo',
      unit: 'celsius',
    });
    expect(res.city).toBe('Tokyo');
    expect(res.temperature).toBeDefined();
    expect(res.condition).toBeDefined();
  });

  it('should execute db_query tool on analytical tables', async () => {
    const res = await service.executeTool('db_query', {
      table: 'users',
    });
    expect(res.totalUsers).toBeGreaterThan(100000);
    expect(res.activeDevelopers).toBeDefined();
  });

  it('should run multi-step autonomous agent loop with tool calls and synthesis', async () => {
    // Step 1: Model calls calculator
    mockInferenceService.chatCompletion.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_calc_1',
                type: 'function',
                function: {
                  name: 'calculator',
                  arguments: JSON.stringify({ expression: '84.50 * 0.15' }),
                },
              },
            ],
          },
        },
      ],
    });

    // Step 2: Model provides final answer
    mockInferenceService.chatCompletion.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'A 15% tip on $84.50 is $12.675.',
          },
        },
      ],
    });

    const agentResult = await service.runAgentLoop(
      'Calculate a 15% tip on $84.50',
      'qwen2.5-coder:1.5b'
    );

    expect(agentResult).toBeDefined();
    expect(agentResult.steps.length).toBeGreaterThanOrEqual(2);
    expect(agentResult.finalAnswer).toContain('$12.675');
  });
});
