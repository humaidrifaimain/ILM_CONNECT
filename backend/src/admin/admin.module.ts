import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PricingModule } from '../pricing/pricing.module';
import { HistoryService } from './history.service';

@Module({
  imports: [PrismaModule, PricingModule],
  controllers: [AdminController],
  providers: [AdminService, HistoryService],
})
export class AdminModule {}
