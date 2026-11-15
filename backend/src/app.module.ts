import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { ModelsModule } from './modules/models/models.module';
import { InferenceModule } from './modules/inference/inference.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { AdminModule } from './modules/admin/admin.module';
import { BillingModule } from './modules/billing/billing.module';
import { BatchesModule } from './modules/batches/batches.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { AdaptersModule } from './modules/adapters/adapters.module';
import { FineTuningModule } from './modules/fine-tuning/fine-tuning.module';
import { AuditModule } from './modules/audit/audit.module';
import { GuardrailsModule } from './modules/guardrails/guardrails.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { ComplianceInterceptor } from './common/interceptors/compliance.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    ApiKeysModule,
    ModelsModule,
    InferenceModule,
    TelemetryModule,
    AdminModule,
    BillingModule,
    BatchesModule,
    WebhooksModule,
    OrganizationsModule,
    AdaptersModule,
    FineTuningModule,
    AuditModule,
    GuardrailsModule,
    EvaluationsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ComplianceInterceptor,
    },
  ],
})
export class AppModule {}
