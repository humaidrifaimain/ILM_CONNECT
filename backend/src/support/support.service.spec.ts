import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from './support.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SupportService', () => {
  let service: SupportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        {
          provide: PrismaService,
          useValue: {
            supportTicket: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            supportTicketMessage: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
