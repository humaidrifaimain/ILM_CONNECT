import { Test, TestingModule } from '@nestjs/testing';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

describe('SupportController', () => {
  let controller: SupportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupportController],
      providers: [
        {
          provide: SupportService,
          useValue: {
            createSupportTicket: jest.fn(),
            getMyTickets: jest.fn(),
            getAllTickets: jest.fn(),
            getTicketById: jest.fn(),
            addTicketMessage: jest.fn(),
            updateTicketStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SupportController>(SupportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
