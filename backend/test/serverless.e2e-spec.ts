import express from 'express';
import type { Server } from 'node:http';
import request from 'supertest';
import handler from '../src/serverless';

jest.setTimeout(60000);

/**
 * The serverless entry point, exercised the way a function host calls it: one
 * exported handler, no `listen()`.
 *
 * Worth a test of its own because the failure mode is silent and total. A
 * handler that never finishes wiring, or one that answers before the app is
 * ready, deploys green and 404s every route — which is exactly what a
 * NestJS app deployed to Vercel without this file does.
 */
describe('Serverless handler (e2e)', () => {
  let server: Server;

  beforeAll(() => {
    // A throwaway server that forwards to the handler, so supertest can speak
    // HTTP to it the way the platform does.
    const shim = express();
    shim.all(/.*/, (req, res) => void handler(req, res));
    server = shim.listen(0);
  });

  afterAll(() => {
    server.close();
  });

  it('answers a route through the handler, with no port of its own', async () => {
    const res = await request(server).get('/api/v1/health').expect(200);
    expect(res.body.data.status).toBeDefined();
  });

  it('keeps the security headers and the API prefix', async () => {
    const res = await request(server).get('/api/v1/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');

    // Outside the prefix there is nothing — the same 404 a wrong path gets.
    await request(server).get('/health').expect(404);
  });

  it('still refuses an unauthenticated request', async () => {
    await request(server).get('/api/v1/companies/current').expect(401);
  });

  it('builds the application once, not per request', async () => {
    // Three requests, one application. If each rebuilt it, a cold read would
    // cost seconds and the database would run out of connections.
    const first = Date.now();
    await request(server).get('/api/v1/health').expect(200);
    const warm = Date.now() - first;

    await request(server).get('/api/v1/health').expect(200);
    const second = Date.now();
    await request(server).get('/api/v1/health').expect(200);
    expect(Date.now() - second).toBeLessThanOrEqual(warm + 2000);
  });
});
