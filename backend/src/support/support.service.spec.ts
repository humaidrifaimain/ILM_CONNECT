import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from './support.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

describe('SupportService', () => {
  let service: SupportService;
  let prisma: PrismaService;

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
            studentProfile: { findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.each(['', '   ', 42, null])('rejects an invalid reply without writing it: %p', async message => {
    await expect(service.addTicketMessage('ticket', { id: 'owner', role: Role.SUPER_ADMIN }, message as string)).rejects.toThrow('Write a reply');
    expect(prisma.supportTicketMessage.create).not.toHaveBeenCalled();
    expect(prisma.supportTicket.update).not.toHaveBeenCalled();
  });

  it('prevents the requester from choosing an administrator status', async () => {
    await expect(service.addTicketMessage('ticket', { id: 'student', role: Role.STUDENT }, 'Reply', 'RESOLVED')).rejects.toThrow('Only administrators');
    expect(prisma.supportTicketMessage.create).not.toHaveBeenCalled();
  });

  it('rejects unsupported status values without updating the ticket', async () => {
    await expect(service.updateTicketStatus('ticket', 'UNKNOWN')).rejects.toThrow('Choose PENDING');
    expect(prisma.supportTicket.update).not.toHaveBeenCalled();
  });
  it('keeps a new student request open until a lecturer is assigned', async () => {
    jest.spyOn(prisma.supportTicket, 'findUnique').mockResolvedValue({ id: 'request', userId: 'student', type: 'STUDENT_REGISTRATION' } as any);
    jest.spyOn(prisma.studentProfile, 'findUnique').mockResolvedValue({ assignedLecturerId: null } as any);
    await expect(service.updateTicketStatus('request', 'RESOLVED')).rejects.toThrow('Assign a lecturer');
    expect(prisma.supportTicket.update).not.toHaveBeenCalled();
    await expect(service.addTicketMessage('request', { id: 'admin', role: Role.ADMIN }, 'Reply', 'RESOLVED')).rejects.toThrow('Assign a lecturer');
    expect(prisma.supportTicketMessage.create).not.toHaveBeenCalled();
  });
});
