import { Test, TestingModule } from '@nestjs/testing';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

describe('ProgressController', () => {
  let controller: ProgressController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressController],
      providers: [
        {
          provide: ProgressService,
          useValue: {
            getStudentProgress: jest.fn(),
            advanceProgress: jest.fn(),
            getCertificates: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProgressController>(ProgressController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
