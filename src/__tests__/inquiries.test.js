const request = require('supertest');
const { createApp } = require('../app');
const Inquiry = require('../models/Inquiry');
const { sendMail } = require('../utils/mailer');

jest.mock('../models/Inquiry', () => ({ create: jest.fn() }));
jest.mock('../utils/mailer', () => ({ sendMail: jest.fn() }));

describe('Public inquiry endpoints', () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
    Inquiry.create.mockImplementation(async (inquiry) => inquiry);
    sendMail.mockResolvedValue({ simulated: true });
  });

  it('accepts the contact and general inquiry form fields', async () => {
    const payload = {
      fullName: 'Jordan Lee',
      companyName: 'Northstar Offices',
      email: 'JORDAN@example.com',
      phone: '+1 604 555 0123',
      inquiryType: 'Partnership',
      message: 'Please contact me about facility cleaning.',
    };

    const response = await request(app).post('/api/inquiries').send(payload);

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(sendMail).not.toHaveBeenCalled();
    expect(Inquiry.create).toHaveBeenCalledWith({
      type: 'general',
      ...payload,
      email: 'jordan@example.com',
    });
  });

  it('requires authentication to list client inquiries', async () => {
    const response = await request(app).get('/api/inquiries');

    expect(response.statusCode).toBe(401);
  });

  it('accepts the cleaning quote form fields without making up an instant estimate', async () => {
    const payload = {
      contactName: 'Taylor Morgan',
      companyName: 'Example Property Group',
      email: 'taylor@example.com',
      phone: '+1 604 555 0100',
      serviceType: 'Commercial Office Cleaning',
      facilitySize: '5000',
      cleaningSchedule: 'Weekly',
      startDate: '2026-11-01',
      budgetRange: '$1,000 - $3,000/mo',
      notes: 'Please include the reception and meeting rooms.',
    };

    const response = await request(app).post('/api/inquiries/quote').send(payload);

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.estimate).toBeUndefined();
    expect(Inquiry.create).toHaveBeenCalledWith(expect.objectContaining({
      type: 'quote',
      fullName: 'Taylor Morgan',
      companyName: 'Example Property Group',
      email: 'taylor@example.com',
      phone: '+1 604 555 0100',
      serviceType: 'Commercial Office Cleaning',
      facilitySize: 5000,
      cleaningSchedule: 'Weekly',
      startDate: '2026-11-01',
      budgetRange: '$1,000 - $3,000/mo',
      notes: 'Please include the reception and meeting rooms.',
      message: 'Please include the reception and meeting rooms.',
    }));
  });

  it('rejects invalid contact email and missing required quote fields', async () => {
    const invalidInquiry = await request(app)
      .post('/api/inquiries')
      .send({
        fullName: 'Jordan Lee',
        email: 'not-an-email',
        phone: '+1 604 555 0123',
        inquiryType: 'General Inquiry',
        message: 'Hello.',
      });
    const invalidQuote = await request(app)
      .post('/api/inquiries/quote')
      .send({ contactName: 'Taylor Morgan' });

    expect(invalidInquiry.statusCode).toBe(400);
    expect(invalidQuote.statusCode).toBe(400);
    expect(Inquiry.create).not.toHaveBeenCalled();
  });
});
