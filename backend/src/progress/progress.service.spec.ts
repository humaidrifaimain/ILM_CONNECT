import { Test, TestingModule } from '@nestjs/testing';
import { ProgressService } from './progress.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProgressService', () => {
  let service: ProgressService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        {
          provide: PrismaService,
          useValue: {
            studentProgress: {
              findUnique: jest.fn(),
            },
            certificate: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProgressService>(ProgressService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
