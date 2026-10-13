import { Module } from '@nestjs/common';
import { StockModule } from '../../stock/stock.module';
import { AuthModule } from '../auth/auth.module';
import { PartyModule } from '../parties/party.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [AuthModule, PartyModule, StockModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
