import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import {
  PrismaClient,
  ModelCategory,
  EngineType,
  WorkerStatus,
  DeploymentState,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Starting YOYO production cloud seed...');

  // 1. Seed Super Admin User
  const adminEmail = 'admin@yoyo.ai';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash('Admin@Yoyo2026!', salt);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            fullName: 'Super Admin',
            companyName: 'YOYO Platform Infrastructure',
          },
        },
        quota: {
          create: {
            monthlyTokenLimit: BigInt(100000000), // 100M tokens for admin
            monthlyRequestLimit: 500000,
            resetsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          },
        },
        creditBalance: {
          create: {
            balanceUsd: 500.0,
            currency: 'USD',
          },
        },
      },
    });
    console.log(`[SEED] Created default Super Admin account: ${admin.email}`);
  }

  // 2. Create or update Default Cloud GPU Worker Nodes
  const worker1 = await prisma.modelWorker.upsert({
    where: { workerName: 'cloud-gpu-node-01' },
    update: {
      endpointUrl: process.env.VLLM_WORKER_0_URL || 'http://localhost:8000',
      status: WorkerStatus.ONLINE,
    },
    create: {
      workerName: 'cloud-gpu-node-01',
      endpointUrl: process.env.VLLM_WORKER_0_URL || 'http://localhost:8000',
      engineType: EngineType.VLLM,
      status: WorkerStatus.ONLINE,
      gpuDeviceIndex: 0,
      gpuModelName: 'NVIDIA H100 80GB SXM5',
      totalVramBytes: BigInt(85899345920), // 80GB VRAM
    },
  });

  const worker2 = await prisma.modelWorker.upsert({
    where: { workerName: 'cloud-gpu-node-02' },
    update: {
      endpointUrl: process.env.OLLAMA_WORKER_0_URL || 'http://localhost:11434',
      status: WorkerStatus.ONLINE,
    },
    create: {
      workerName: 'cloud-gpu-node-02',
      endpointUrl: process.env.OLLAMA_WORKER_0_URL || 'http://localhost:11434',
      engineType: EngineType.OLLAMA,
      status: WorkerStatus.ONLINE,
      gpuDeviceIndex: 1,
      gpuModelName: 'NVIDIA A100 80GB PCIe',
      totalVramBytes: BigInt(85899345920), // 80GB VRAM
    },
  });

  // 3. Foundation Models to Seed
  const defaultModels = [
    {
      apiIdentifier: 'llama-3.3-70b',
      name: 'Llama 3.3 70B Instruct',
      providerFamily: 'Meta',
      category: ModelCategory.GENERAL,
      description: 'Meta flagship 70B open-weights model for enterprise reasoning and production agents.',
      license: 'Llama 3.3 Community License',
      defaultContextWindow: 131072,
      pricing: { input: 0.80, output: 1.60 },
      version: {
        tag: '70b-instruct-fp16',
        parameterSize: BigInt(70000000000),
        quantizationLevel: 'FP16',
        diskSizeBytes: BigInt(140000000000),
        vramRequiredBytes: BigInt(145000000000),
      },
      workerId: worker1.id,
    },
    {
      apiIdentifier: 'llama3.3:8b',
      name: 'Llama 3.3 8B Instruct',
      providerFamily: 'Meta',
      category: ModelCategory.GENERAL,
      description: 'Meta state-of-the-art 8B multilingual instruction-tuned model.',
      license: 'Llama 3.3 Community License',
      defaultContextWindow: 131072,
      pricing: { input: 0.15, output: 0.30 },
      version: {
        tag: '8b-instruct-q4_K_M',
        parameterSize: BigInt(8000000000),
        quantizationLevel: 'Q4_K_M',
        diskSizeBytes: BigInt(4900000000),
        vramRequiredBytes: BigInt(5600000000),
      },
      workerId: worker2.id,
    },
    {
      apiIdentifier: 'qwen-2.5-coder-32b',
      name: 'Qwen 2.5 Coder 32B Instruct',
      providerFamily: 'Alibaba Cloud',
      category: ModelCategory.CODING,
      description: 'Specialized 32B coding foundation model for architectural reasoning and repository generation.',
      license: 'Apache 2.0',
      defaultContextWindow: 131072,
      pricing: { input: 0.40, output: 0.80 },
      version: {
        tag: '32b-instruct-fp16',
        parameterSize: BigInt(32500000000),
        quantizationLevel: 'FP16',
        diskSizeBytes: BigInt(65000000000),
        vramRequiredBytes: BigInt(70000000000),
      },
      workerId: worker1.id,
    },
    {
      apiIdentifier: 'qwen2.5-coder:7b',
      name: 'Qwen 2.5 Coder 7B Instruct',
      providerFamily: 'Alibaba Cloud',
      category: ModelCategory.CODING,
      description: 'Ultra-fast code generation, debugging and reasoning model with 128k context.',
      license: 'Apache 2.0',
      defaultContextWindow: 131072,
      pricing: { input: 0.18, output: 0.35 },
      version: {
        tag: '7b-instruct-q4_K_M',
        parameterSize: BigInt(7000000000),
        quantizationLevel: 'Q4_K_M',
        diskSizeBytes: BigInt(4700000000),
        vramRequiredBytes: BigInt(5400000000),
      },
      workerId: worker2.id,
    },
    {
      apiIdentifier: 'deepseek-r1-70b',
      name: 'DeepSeek R1 Distill 70B',
      providerFamily: 'DeepSeek',
      category: ModelCategory.REASONING,
      description: 'State-of-the-art chain-of-thought mathematical and logic reasoning model distilled from DeepSeek R1.',
      license: 'MIT',
      defaultContextWindow: 131072,
      pricing: { input: 0.80, output: 1.60 },
      version: {
        tag: '70b-fp16',
        parameterSize: BigInt(70000000000),
        quantizationLevel: 'FP16',
        diskSizeBytes: BigInt(140000000000),
        vramRequiredBytes: BigInt(145000000000),
      },
      workerId: worker1.id,
    },
    {
      apiIdentifier: 'deepseek-r1:8b',
      name: 'DeepSeek R1 Distill Llama 8B',
      providerFamily: 'DeepSeek',
      category: ModelCategory.REASONING,
      description: 'Advanced reasoning, logic, and chain-of-thought distillation.',
      license: 'MIT',
      defaultContextWindow: 65536,
      pricing: { input: 0.20, output: 0.40 },
      version: {
        tag: '8b-q4_K_M',
        parameterSize: BigInt(8000000000),
        quantizationLevel: 'Q4_K_M',
        diskSizeBytes: BigInt(4900000000),
        vramRequiredBytes: BigInt(5800000000),
      },
      workerId: worker2.id,
    },
    {
      apiIdentifier: 'mistral-large-2411',
      name: 'Mistral Large 2411 123B',
      providerFamily: 'Mistral AI',
      category: ModelCategory.GENERAL,
      description: 'Flagship open multilingual model with unmatched reasoning and coding prowess.',
      license: 'Mistral Research License',
      defaultContextWindow: 131072,
      pricing: { input: 1.20, output: 2.40 },
      version: {
        tag: '123b-fp16',
        parameterSize: BigInt(123000000000),
        quantizationLevel: 'FP16',
        diskSizeBytes: BigInt(246000000000),
        vramRequiredBytes: BigInt(250000000000),
      },
      workerId: worker1.id,
    },
    {
      apiIdentifier: 'nomic-embed-text:latest',
      name: 'Nomic Embed Text v1.5',
      providerFamily: 'Nomic AI',
      category: ModelCategory.EMBEDDING,
      description: 'High-performance text embedding model with 8192 context window.',
      license: 'Apache 2.0',
      defaultContextWindow: 8192,
      pricing: { input: 0.05, output: 0.0 },
      version: {
        tag: 'latest',
        parameterSize: BigInt(137000000),
        quantizationLevel: 'F16',
        diskSizeBytes: BigInt(274000000),
        vramRequiredBytes: BigInt(500000000),
      },
      workerId: worker2.id,
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
        providerFamily: item.providerFamily,
        license: item.license,
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
          workerId: item.workerId,
        },
      },
      update: {
        state: DeploymentState.LOADED,
      },
      create: {
        modelId: model.id,
        workerId: item.workerId,
        state: DeploymentState.LOADED,
      },
    });

    // Seed pricing matrix
    await prisma.modelPricing.upsert({
      where: { modelIdentifier: item.apiIdentifier },
      update: {
        inputCostPerMillion: item.pricing.input,
        outputCostPerMillion: item.pricing.output,
      },
      create: {
        modelIdentifier: item.apiIdentifier,
        inputCostPerMillion: item.pricing.input,
        outputCostPerMillion: item.pricing.output,
      },
    });
  }

  console.log('[SEED] All cloud models, GPU worker deployments, pricing, and admin seeded successfully.');
}

main()
  .catch((e) => {
    console.error('[SEED] Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
