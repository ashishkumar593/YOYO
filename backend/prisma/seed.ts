import { PrismaClient, ModelCategory, EngineType, WorkerStatus, DeploymentState } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Seeding default models and inference worker...');

  // 1. Create or update Default Worker Node
  const worker = await prisma.modelWorker.upsert({
    where: { workerName: 'worker-gpu-01' },
    update: {
      endpointUrl: process.env.OLLAMA_WORKER_0_URL || 'http://localhost:11434',
      status: WorkerStatus.ONLINE,
    },
    create: {
      workerName: 'worker-gpu-01',
      endpointUrl: process.env.OLLAMA_WORKER_0_URL || 'http://localhost:11434',
      engineType: EngineType.OLLAMA,
      status: WorkerStatus.ONLINE,
      gpuDeviceIndex: 0,
      gpuModelName: 'NVIDIA RTX 4090 / Cloud GPU',
      totalVramBytes: BigInt(25769803776), // 24GB VRAM
    },
  });

  // 2. Foundation Models to Seed
  const defaultModels = [
    {
      apiIdentifier: 'llama3.3:8b',
      name: 'Llama 3.3 8B Instruct',
      providerFamily: 'Meta',
      category: ModelCategory.GENERAL,
      description: 'Meta state-of-the-art 8B multilingual instruction-tuned model.',
      license: 'Llama 3.3 Community License',
      defaultContextWindow: 131072,
      version: {
        tag: '8b-instruct-q4_K_M',
        parameterSize: BigInt(8000000000),
        quantizationLevel: 'Q4_K_M',
        diskSizeBytes: BigInt(4900000000),
        vramRequiredBytes: BigInt(5600000000),
      },
    },
    {
      apiIdentifier: 'qwen2.5-coder:7b',
      name: 'Qwen 2.5 Coder 7B Instruct',
      providerFamily: 'Alibaba Cloud',
      category: ModelCategory.CODING,
      description: 'Specialized code generation, debugging and reasoning model with 128k context.',
      license: 'Apache 2.0',
      defaultContextWindow: 131072,
      version: {
        tag: '7b-instruct-q4_K_M',
        parameterSize: BigInt(7000000000),
        quantizationLevel: 'Q4_K_M',
        diskSizeBytes: BigInt(4700000000),
        vramRequiredBytes: BigInt(5400000000),
      },
    },
    {
      apiIdentifier: 'deepseek-r1:8b',
      name: 'DeepSeek R1 Distill Llama 8B',
      providerFamily: 'DeepSeek',
      category: ModelCategory.REASONING,
      description: 'Advanced reasoning, logic, and chain-of-thought distillation.',
      license: 'MIT',
      defaultContextWindow: 65536,
      version: {
        tag: '8b-q4_K_M',
        parameterSize: BigInt(8000000000),
        quantizationLevel: 'Q4_K_M',
        diskSizeBytes: BigInt(4900000000),
        vramRequiredBytes: BigInt(5800000000),
      },
    },
    {
      apiIdentifier: 'nomic-embed-text:latest',
      name: 'Nomic Embed Text v1.5',
      providerFamily: 'Nomic AI',
      category: ModelCategory.EMBEDDING,
      description: 'High-performance text embedding model with 8192 context window.',
      license: 'Apache 2.0',
      defaultContextWindow: 8192,
      version: {
        tag: 'latest',
        parameterSize: BigInt(137000000),
        quantizationLevel: 'F16',
        diskSizeBytes: BigInt(274000000),
        vramRequiredBytes: BigInt(500000000),
      },
    },
  ];

  for (const item of defaultModels) {
    const model = await prisma.model.upsert({
      where: { apiIdentifier: item.apiIdentifier },
      update: {
        name: item.name,
        category: item.category,
        description: item.description,
        defaultContextWindow: item.defaultContextWindow,
      },
      create: {
        apiIdentifier: item.apiIdentifier,
        name: item.name,
        providerFamily: item.providerFamily,
        category: item.category,
        description: item.description,
        license: item.license,
        defaultContextWindow: item.defaultContextWindow,
      },
    });

    await prisma.modelVersion.upsert({
      where: {
        modelId_tag: {
          modelId: model.id,
          tag: item.version.tag,
        },
      },
      update: {},
      create: {
        modelId: model.id,
        tag: item.version.tag,
        parameterSize: item.version.parameterSize,
        quantizationLevel: item.version.quantizationLevel,
        diskSizeBytes: item.version.diskSizeBytes,
        vramRequiredBytes: item.version.vramRequiredBytes,
      },
    });

    await prisma.modelDeployment.upsert({
      where: {
        modelId_workerId: {
          modelId: model.id,
          workerId: worker.id,
        },
      },
      update: {
        state: DeploymentState.LOADED,
      },
      create: {
        modelId: model.id,
        workerId: worker.id,
        state: DeploymentState.LOADED,
      },
    });
  }

  console.log('[SEED] Default models and deployments seeded successfully.');
}

main()
  .catch((e) => {
    console.error('[SEED] Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

