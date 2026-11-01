import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  Headers,
  Req,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@CurrentUser() user: any) {
    return this.billingService.getBalance(user.id);
  }

  @Get('pricing')
  async getPricing() {
    return this.billingService.getPricing();
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getTransactions(
    @CurrentUser() user: any,
    @Query('limit') limit?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.billingService.getTransactions(user.id, limitNum);
  }

  @Post('topup')
  @UseGuards(JwtAuthGuard)
  async topup(
    @CurrentUser() user: any,
    @Body('amountUsd') amountUsd: number
  ) {
    return this.billingService.createTopup(user.id, amountUsd);
  }

  @Post('webhook/stripe')
  async stripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: any
  ) {
    // Webhook receiver for Stripe checkout.session.completed events
    return this.billingService.handleStripeWebhook(req.body, signature);
  }
}

