import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [PrismaModule, PricingModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
