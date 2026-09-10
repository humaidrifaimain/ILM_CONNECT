import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config'; // Ensure env variables are loaded before constructor runs

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('CRITICAL: DATABASE_URL is undefined in PrismaService constructor!');
    }
    const isLocal = connectionString?.includes('localhost') || connectionString?.includes('127.0.0.1');
    const ssl = isLocal ? false : { rejectUnauthorized: false };
    const pool = new Pool({ connectionString, ssl });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (e) {
      console.warn('⚠️  Prisma database connection failed to initialize on startup. Ensure DATABASE_URL is configured in your .env file.');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
