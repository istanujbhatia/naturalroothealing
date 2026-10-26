import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import type { AppConfig } from './config.js';

const config: AppConfig = {
  nodeEnv: 'test',
  port: 4001,
  mongodbUri: 'mongodb://127.0.0.1:27017/natural_root_healing_test',
  frontendOrigins: ['http://localhost:5173'],
  logLevel: 'silent',
  jsonBodyLimit: '100kb',
  rateLimitWindowMs: 900000,
  rateLimitMax: 100,
  authRateLimitWindowMs: 900000,
  authRateLimitMax: 10,
};

describe('backend foundation', () => {
  it('reports a degraded health response when MongoDB is not connected', async () => {
    const response = await request(createApp(config))
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:5173');

    expect(response.status).toBe(503);
    expect(response.body.data.status).toBe('degraded');
    expect(response.body.data.database).toBe('disconnected');
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('does not grant CORS access to origins that are not explicitly configured', async () => {
    const response = await request(createApp(config))
      .get('/api/v1/health')
      .set('Origin', 'https://untrusted.example');

    expect(response.status).toBe(503);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.body.data.status).toBe('degraded');
  });

  it('returns a structured not-found error', async () => {
    const response = await request(createApp(config)).get('/api/v1/missing');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.requestId).toBeTruthy();
  });

  it('limits repeated authentication attempts', async () => {
    const limitedConfig = { ...config, authRateLimitMax: 1 };
    const app = createApp(limitedConfig);

    await request(app).post('/api/v1/auth/login').send({});
    const response = await request(app).post('/api/v1/auth/login').send({});

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('AUTH_RATE_LIMITED');
  });
});
