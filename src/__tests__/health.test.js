const request = require('supertest');
const { createApp } = require('../app');

describe('GET /health', () => {
  it('returns status ok', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
