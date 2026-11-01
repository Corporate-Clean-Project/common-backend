const request = require('supertest');
const { createApp } = require('../app');
const User = require('../models/User');
const { sendInvitationEmail } = require('../utils/emailjs');

jest.mock('../models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../utils/emailjs', () => ({
  sendInvitationEmail: jest.fn(),
}));
jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => {
    req.user = { role: 'super_admin' };
    next();
  },
  requireRole: () => (req, res, next) => next(),
}));

describe('POST /api/users/invite', () => {
  const app = createApp();
  let createdUser;

  beforeEach(() => {
    jest.clearAllMocks();
    User.findOne.mockResolvedValue(null);
    createdUser = {
      name: 'Jordan Lee',
      email: 'jordan@example.com',
      role: 'editor',
      deleteOne: jest.fn().mockResolvedValue(undefined),
      toSafeObject: () => ({
        name: 'Jordan Lee',
        email: 'jordan@example.com',
        role: 'editor',
        status: 'invited',
      }),
    };
    User.create.mockResolvedValue(createdUser);
    sendInvitationEmail.mockResolvedValue(undefined);
  });

  it('uses the supplied password and emails it to the invited work email', async () => {
    const response = await request(app)
      .post('/api/users/invite')
      .send({ email: 'Jordan@Example.com', name: 'Jordan Lee', role: 'editor', password: 'secure-password-123' });

    expect(response.statusCode).toBe(201);
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'jordan@example.com',
      name: 'Jordan Lee',
      role: 'editor',
      status: 'invited',
      password: 'secure-password-123',
    }));

    expect(User.create.mock.calls[0][0]).not.toHaveProperty('inviteToken');
    expect(User.create.mock.calls[0][0]).not.toHaveProperty('inviteTokenExpires');
    expect(sendInvitationEmail).toHaveBeenCalledWith({
      to: 'jordan@example.com',
      name: 'Jordan Lee',
      role: 'editor',
      temporaryPassword: 'secure-password-123',
    });
    expect(sendInvitationEmail.mock.calls[0][0]).not.toHaveProperty('inviteUrl');
    expect(response.body.user).not.toHaveProperty('password');
  });

  it('removes the pending user and returns an error when EmailJS fails', async () => {
    sendInvitationEmail.mockRejectedValue(new Error('provider unavailable'));

    const response = await request(app)
      .post('/api/users/invite')
      .send({ email: 'jordan@example.com', password: 'secure-password-123' });

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toContain('Invitation email could not be sent');
    expect(createdUser.deleteOne).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid email addresses', async () => {
    const response = await request(app)
      .post('/api/users/invite')
      .send({ email: 'not-an-email', password: 'secure-password-123' });

    expect(response.statusCode).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
    expect(sendInvitationEmail).not.toHaveBeenCalled();
  });

  it('rejects passwords shorter than eight characters', async () => {
    const response = await request(app)
      .post('/api/users/invite')
      .send({ email: 'jordan@example.com', password: 'short' });

    expect(response.statusCode).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
    expect(sendInvitationEmail).not.toHaveBeenCalled();
  });
});
