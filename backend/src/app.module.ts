import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { ModelsModule } from './modules/models/models.module';
import { InferenceModule } from './modules/inference/inference.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { AdminModule } from './modules/admin/admin.module';
import { BillingModule } from './modules/billing/billing.module';

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
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
