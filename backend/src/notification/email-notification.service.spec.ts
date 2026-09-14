import {
  EmailNotificationService,
  EmailDispatchPayload,
} from './email-notification.service';

const sendMock = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

describe('EmailNotificationService', () => {
  const originalEnv = process.env;
  const payload: EmailDispatchPayload = {
    toEmail: 'student@example.com',
    recipientName: 'Student',
    subject: 'Session confirmed',
    htmlContent: '<p>Your session is confirmed.</p>',
    textContent: 'Your session is confirmed.',
    eventType: 'BOOKING_CONFIRMED',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 'test-api-key',
      RESEND_FROM_EMAIL: 'IlmConnect <onboarding@resend.dev>',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('sends the existing notification payload through Resend', async () => {
    sendMock.mockResolvedValue({ data: { id: 'email-id' }, error: null });

    await expect(
      new EmailNotificationService().sendEmail(payload),
    ).resolves.toBe(true);

    expect(sendMock).toHaveBeenCalledWith({
      from: 'IlmConnect <onboarding@resend.dev>',
      to: ['student@example.com'],
      subject: 'Session confirmed',
      html: '<p>Your session is confirmed.</p>',
      text: 'Your session is confirmed.',
    });
  });

  it('does not call Resend when the API key is absent', async () => {
    delete process.env.RESEND_API_KEY;

    await expect(
      new EmailNotificationService().sendEmail(payload),
    ).resolves.toBe(true);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('reports provider errors to the caller', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: 'Provider rejected the request' },
    });

    await expect(
      new EmailNotificationService().sendEmail(payload),
    ).rejects.toThrow('Email delivery failed: Provider rejected the request');
  });
});
