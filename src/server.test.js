import request from 'supertest';
import app from './app.js';

describe('EdTech Platform API', () => {
  describe('GET /', () => {
    it('should return Hello EdTech Platform!', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body.message).toBe('Hello EdTech Platform!');
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/tenant/:id/courses', () => {
    it('should return courses for valid tenant', async () => {
      const response = await request(app)
        .get('/api/tenant/stanford/courses')
        .expect(200);
      
      expect(response.body.tenantId).toBe('stanford');
      expect(Array.isArray(response.body.courses)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should return empty array for unknown tenant', async () => {
      const response = await request(app)
        .get('/api/tenant/unknown/courses')
        .expect(200);
      
      expect(response.body.courses).toEqual([]);
      expect(response.body.count).toBe(0);
    });
  });

  describe('POST /api/live/start', () => {
    it('should start a live session', async () => {
      const sessionData = {
        sessionId: 'test-session-1',
        title: 'Test Course',
        instructor: 'Test Instructor',
        tenantId: 'stanford'
      };

      const response = await request(app)
        .post('/api/live/start')
        .send(sessionData)
        .expect(201);
      
      expect(response.body.message).toContain('started');
      expect(response.body.session.status).toBe('active');
      expect(response.body.session.sessionId).toBe('test-session-1');
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/live/start')
        .send({ sessionId: 'test' })
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/live/stop', () => {
    it('should stop a live session', async () => {
      // First start a session
      const sessionData = {
        sessionId: 'test-session-2',
        title: 'Test Course',
        instructor: 'Test Instructor',
        tenantId: 'mit'
      };

      await request(app)
        .post('/api/live/start')
        .send(sessionData);

      // Then stop it
      const response = await request(app)
        .post('/api/live/stop')
        .send({ sessionId: 'test-session-2' })
        .expect(200);
      
      expect(response.body.message).toContain('stopped');
      expect(response.body.session.status).toBe('stopped');
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .post('/api/live/stop')
        .send({ sessionId: 'non-existent' })
        .expect(404);
      
      expect(response.body.error).toBeDefined();
    });
  });
});

