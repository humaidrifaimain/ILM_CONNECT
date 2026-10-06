import { MessageService } from './message.service';

describe('Conversation boundaries', () => {
  const prisma = { user: { findUnique: jest.fn() }, message: { findMany: jest.fn(), create: jest.fn() } };
  const presence = { recordActivity: jest.fn() };
  const service = new MessageService(prisma as any, presence as any);
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue({ status: 'ACTIVE', deletedAt: null });
  });
  it.each(['', '   ', undefined])('rejects empty content %s before writing', async content => {
    await expect(service.sendMessage('student-a', 'lecturer', content as any)).rejects.toThrow();
    expect(prisma.message.create).not.toHaveBeenCalled();
  });
  it('rejects injecting a third participant into an existing thread', async () => {
    prisma.message.findMany.mockResolvedValue([{ senderId: 'student-a', recipientId: 'lecturer' }]);
    await expect(service.sendMessage('student-b', 'lecturer', 'Private reply', 'existing-thread')).rejects.toThrow('another conversation');
    expect(prisma.message.create).not.toHaveBeenCalled();
  });
  it('does not reveal historical messages from a mixed-participant thread', async () => {
    prisma.message.findMany.mockResolvedValue([
      { senderId: 'student-a', recipientId: 'lecturer' },
      { senderId: 'student-b', recipientId: 'lecturer' },
    ]);
    await expect(service.getMessagesInThread('student-b', 'existing-thread')).rejects.toThrow('not a participant');
  });
});
