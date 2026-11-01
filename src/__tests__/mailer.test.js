const { sendMail } = require('../utils/mailer');

describe('EmailJS mail delivery', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.EMAILJS_SERVICE_ID = 'service_test';
    process.env.EMAILJS_MAIL_TEMPLATE_ID = 'template_mail';
    process.env.EMAILJS_PUBLIC_KEY = 'public_test';
    process.env.EMAILJS_PRIVATE_KEY = 'private_test';
    process.env.NODE_ENV = 'test';
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends email content through the configured EmailJS template', async () => {
    const mail = {
      to: 'customer@example.com',
      subject: 'Reply to your inquiry',
      html: '<p>Thank you for contacting us.</p>',
      text: 'Thank you for contacting us.',
    };

    await expect(sendMail(mail)).resolves.toEqual({ accepted: [mail.to] });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.emailjs.com/api/v1.0/email/send',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 'service_test',
          template_id: 'template_mail',
          user_id: 'public_test',
          accessToken: 'private_test',
          template_params: {
            to_email: mail.to,
            subject: mail.subject,
            message_html: mail.html,
            message_text: mail.text,
          },
        }),
      }),
    );
  });

  it('reports EmailJS failures without breaking non-production requests', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Invalid template',
    });

    await expect(sendMail({
      to: 'customer@example.com',
      subject: 'Reply',
      html: '<p>Reply</p>',
    })).resolves.toEqual({
      simulated: true,
      to: 'customer@example.com',
      subject: 'Reply',
    });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('EmailJS email failed with status 400'),
    );
  });
});
