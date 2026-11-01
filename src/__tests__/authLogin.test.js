const request = require('supertest');
const { createApp } = require('../app');
const User = require('../models/User');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');

jest.mock('../models/User', () => ({
  findOne: jest.fn(),
}));
jest.mock('../utils/jwt', () => ({
  signAccessToken: jest.fn(() => 'access-token'),
  signRefreshToken: jest.fn(() => 'refresh-token'),
}));

describe('POST /api/auth/login', () => {
  const app = createApp();
  let invitedUser;

  beforeEach(() => {
    jest.clearAllMocks();
    invitedUser = {
      _id: 'invited-user-id',
      email: 'member@example.com',
      name: 'Team Member',
      role: 'editor',
      status: 'invited',
      comparePassword: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(undefined),
      toSafeObject: jest.fn(() => ({
        id: 'invited-user-id',
        email: 'member@example.com',
        name: 'Team Member',
        role: 'editor',
        status: invitedUser.status,
      })),
    };
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(invitedUser),
    });
  });

  it('activates an invited account after successful login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: invitedUser.email, password: 'temporary-password' });

    expect(response.statusCode).toBe(200);
    expect(invitedUser.status).toBe('active');
    expect(invitedUser.lastLoginAt).toBeInstanceOf(Date);
    expect(invitedUser.save).toHaveBeenCalledTimes(1);
    expect(response.body.user.status).toBe('active');
    expect(signAccessToken).toHaveBeenCalledWith(invitedUser);
    expect(signRefreshToken).toHaveBeenCalledWith(invitedUser);
  });
});
