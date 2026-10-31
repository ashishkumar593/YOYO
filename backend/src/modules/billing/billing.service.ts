import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async getBalance(userId: string) {
    let credit = await this.prisma.creditBalance.findUnique({
      where: { userId },
    });

    if (!credit) {
      credit = await this.prisma.creditBalance.create({
        data: {
          userId,
          balanceUsd: 10.0, // Complimentary $10 starting balance
          currency: 'USD',
        },
      });
    }

    return {
      balanceUsd: Number(credit.balanceUsd),
      currency: credit.currency,
      autoRecharge: credit.autoRecharge,
      updatedAt: credit.updatedAt,
    };
  }

  async getPricing() {
    const defaultPricings = [
      {
        modelIdentifier: 'llama3.3:8b',
        name: 'Meta Llama 3.3 8B',
        inputCostPerMillion: 0.15,
        outputCostPerMillion: 0.30,
        freeQuotaEligible: true,
      },
      {
        modelIdentifier: 'qwen2.5-coder:7b',
        name: 'Qwen 2.5 Coder 7B',
        inputCostPerMillion: 0.18,
        outputCostPerMillion: 0.35,
        freeQuotaEligible: true,
      },
      {
        modelIdentifier: 'deepseek-r1:8b',
        name: 'DeepSeek R1 Distill 8B',
        inputCostPerMillion: 0.20,
        outputCostPerMillion: 0.40,
        freeQuotaEligible: true,
      },
      {
        modelIdentifier: 'nomic-embed-text:latest',
        name: 'Nomic Embed Text v1.5',
        inputCostPerMillion: 0.05,
        outputCostPerMillion: 0.0,
        freeQuotaEligible: true,
      },
      {
        modelIdentifier: 'llama3.3:70b',
        name: 'Meta Llama 3.3 70B Instruct',
        inputCostPerMillion: 0.80,
        outputCostPerMillion: 1.60,
        freeQuotaEligible: false,
      },
    ];

    return defaultPricings;
  }

  async createTopup(userId: string, amountUsd: number) {
    if (amountUsd < 5 || amountUsd > 1000) {
      throw new BadRequestException('Top-up amount must be between $5.00 and $1,000.00.');
    }

    const sessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // In production, integrate Stripe Checkout session creation:
    // const session = await stripe.checkout.sessions.create({...});
    // For local / self-hosted environments, we simulate verified instant crediting

    await this.prisma.$transaction(async (tx) => {
      // 1. Record billing transaction
      await tx.billingTransaction.create({
        data: {
          userId,
          amountUsd,
          type: 'TOPUP',
          description: `Credit pack purchase via Stripe (${sessionId})`,
          stripeSessionId: sessionId,
        },
      });

      // 2. Increment user credit balance
      await tx.creditBalance.upsert({
        where: { userId },
        update: {
          balanceUsd: { increment: amountUsd },
        },
        create: {
          userId,
          balanceUsd: 10.0 + amountUsd,
        },
      });
    });

    return {
      success: true,
      sessionId,
      amountUsd,
      message: `Successfully credited $${amountUsd.toFixed(2)} USD to your balance.`,
    };
  }

  async getTransactions(userId: string, limit = 20) {
    const transactions = await this.prisma.billingTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions.map((t) => ({
      id: t.id,
      amountUsd: Number(t.amountUsd),
      type: t.type,
      description: t.description,
      createdAt: t.createdAt,
    }));
  }
}

