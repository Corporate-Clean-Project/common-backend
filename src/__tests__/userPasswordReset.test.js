const request = require('supertest');
const { createApp } = require('../app');
const User = require('../models/User');
const { verifyAccessToken } = require('../utils/jwt');

jest.mock('../models/User', () => ({
  findById: jest.fn(),
}));
jest.mock('../utils/jwt', () => ({
  verifyAccessToken: jest.fn(),
}));

describe('PATCH /api/users/:id/reset-password', () => {
  const app = createApp();
  const superAdmin = { _id: 'super-admin', role: 'super_admin', status: 'active' };
  let targetUser;

  beforeEach(() => {
    jest.clearAllMocks();
    targetUser = {
      _id: 'member-id',
      name: 'Jordan Lee',
      password: 'old-password',
      passwordResetToken: 'existing-token',
      passwordResetExpires: new Date(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    verifyAccessToken.mockImplementation((token) => ({ sub: token }));
    User.findById.mockImplementation(async (id) => {
      if (id === superAdmin._id) return superAdmin;
      if (id === targetUser._id) return targetUser;
      return null;
    });
  });

  it('lets an authenticated super admin set the selected user password', async () => {
    const response = await request(app)
      .patch('/api/users/member-id/reset-password')
      .set('Authorization', 'Bearer super-admin')
      .send({ password: 'new-password-123' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'Password reset successfully' });
    expect(targetUser.password).toBe('new-password-123');
    expect(targetUser.passwordResetToken).toBeUndefined();
    expect(targetUser.passwordResetExpires).toBeUndefined();
    expect(targetUser.save).toHaveBeenCalledTimes(1);
  });

  it('rejects unauthenticated password resets', async () => {
    const response = await request(app)
      .patch('/api/users/member-id/reset-password')
      .send({ password: 'new-password-123' });

    expect(response.statusCode).toBe(401);
    expect(targetUser.save).not.toHaveBeenCalled();
  });

  it('rejects password resets from users without the super admin role', async () => {
    User.findById.mockImplementation(async (id) => (
      id === 'admin' ? { _id: 'admin', role: 'admin', status: 'active' } :
        id === targetUser._id ? targetUser : null
    ));

    const response = await request(app)
      .patch('/api/users/member-id/reset-password')
      .set('Authorization', 'Bearer admin')
      .send({ password: 'new-password-123' });

    expect(response.statusCode).toBe(403);
    expect(targetUser.save).not.toHaveBeenCalled();
  });

  it('rejects passwords shorter than eight characters', async () => {
    const response = await request(app)
      .patch('/api/users/member-id/reset-password')
      .set('Authorization', 'Bearer super-admin')
      .send({ password: 'short' });

    expect(response.statusCode).toBe(400);
    expect(targetUser.save).not.toHaveBeenCalled();
  });

  it('returns not found when the selected user does not exist', async () => {
    const response = await request(app)
      .patch('/api/users/unknown/reset-password')
      .set('Authorization', 'Bearer super-admin')
      .send({ password: 'new-password-123' });

    expect(response.statusCode).toBe(404);
  });
});
