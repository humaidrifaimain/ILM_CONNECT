import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PayoutService {
  constructor(private prisma: PrismaService) {}

  async getMyPayouts(lecturerId: string) {
    return this.prisma.payout.findMany({
      where: { lecturerId },
      orderBy: { initiatedAt: 'desc' },
    });
  }

  async getBalance(lecturerId: string) {
    const blocks = await this.prisma.sessionBlock.findMany({ where: { lecturerId, status: 'COMPLETED' } });
    return { availableLkr: blocks.reduce((sum, block) => sum + block.payoutAmountLkr, 0) };
  }

  async requestPayout(lecturerId: string, amountLkr: number, method: string) {
    if (typeof amountLkr !== 'number' || !Number.isFinite(amountLkr) || amountLkr <= 0 || Math.abs(amountLkr * 100 - Math.round(amountLkr * 100)) > 0.000001) throw new BadRequestException('Amount must be a positive monetary value');
    if (!['wise', 'bank_transfer', 'wise_lkr'].includes(method)) throw new BadRequestException('Unsupported payout method');
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${lecturerId}))`;
      const completedBlocks = await tx.sessionBlock.findMany({ where: { lecturerId, status: 'COMPLETED' }, orderBy: { completedAt: 'asc' } });
      const totalAvailable = completedBlocks.reduce((sum, block) => sum + block.payoutAmountLkr, 0);
      if (Math.abs(amountLkr - totalAvailable) > 0.001) throw new BadRequestException('Request the full available balance of completed session blocks');
      const blocksToInclude = completedBlocks.map(block => block.id);
      const payout = await tx.payout.create({ data: { lecturerId, amountLkr, method, status: 'PENDING', sessionBlocksIncluded: blocksToInclude } });
      await tx.sessionBlock.updateMany({ where: { id: { in: blocksToInclude }, lecturerId, status: 'COMPLETED' }, data: { status: 'PENDING' } });
      return payout;
    });
  }
}
