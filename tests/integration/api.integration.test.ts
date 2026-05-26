import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';

let mongoServer: MongoMemoryServer;
let authToken: string;

const TEST_USER = {
  email: 'integration@test.com',
  password: 'SecurePass123!',
};

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('End-to-end Integration Tests', () => {
  // ─── Auth Flow: Register → Login → Token ───────────────────────────────────

  describe('Authentication Flow', () => {
    it('should register a new user and return a JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(TEST_USER)
        .expect(201);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(TEST_USER.email);
      authToken = res.body.token;
    });

    it('should reject duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(TEST_USER)
        .expect(409);

      expect(res.body).toHaveProperty('code', 'DUPLICATE_EMAIL');
    });

    it('should login with valid credentials and return a JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send(TEST_USER)
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(TEST_USER.email);
      // Use the login token going forward
      authToken = res.body.token;
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: 'WrongPassword1!' })
        .expect(401);

      expect(res.body).toHaveProperty('code', 'AUTH_INVALID_CREDENTIALS');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'SomePass123!' })
        .expect(401);

      expect(res.body).toHaveProperty('code', 'AUTH_INVALID_CREDENTIALS');
    });
  });

  // ─── JWT Authentication ─────────────────────────────────────────────────────

  describe('JWT Authentication', () => {
    it('should allow access to protected endpoints with valid token', async () => {
      const res = await request(app)
        .get('/api/designs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 401 when no token is provided', async () => {
      const res = await request(app)
        .get('/api/designs')
        .expect(401);

      expect(res.body).toHaveProperty('code', 'AUTH_UNAUTHORIZED');
    });

    it('should return 401 when an invalid token is provided', async () => {
      const res = await request(app)
        .get('/api/designs')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(res.body).toHaveProperty('code', 'AUTH_UNAUTHORIZED');
    });

    it('should return 401 when Authorization header is malformed', async () => {
      const res = await request(app)
        .get('/api/designs')
        .set('Authorization', 'NotBearer sometoken')
        .expect(401);

      expect(res.body).toHaveProperty('code', 'AUTH_UNAUTHORIZED');
    });
  });

  // ─── CORS Headers ──────────────────────────────────────────────────────────

  describe('CORS Configuration', () => {
    it('should include CORS headers for allowed origin', async () => {
      const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

      const res = await request(app)
        .options('/api/designs')
        .set('Origin', allowedOrigin)
        .set('Access-Control-Request-Method', 'GET');

      expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should not include CORS allow-origin header for disallowed origin', async () => {
      const res = await request(app)
        .options('/api/designs')
        .set('Origin', 'http://evil-site.com')
        .set('Access-Control-Request-Method', 'GET');

      // When cors is configured with a specific string origin, it only reflects
      // that configured origin. The browser enforces the mismatch — if the
      // response origin doesn't match the request origin, the browser blocks it.
      const allowOrigin = res.headers['access-control-allow-origin'];
      if (allowOrigin) {
        // The allowed origin should be the configured one, not the evil origin
        expect(allowOrigin).not.toBe('http://evil-site.com');
      }
    });

    it('should allow Authorization in allowed headers', async () => {
      const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

      const res = await request(app)
        .options('/api/designs')
        .set('Origin', allowedOrigin)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization');

      expect(res.headers['access-control-allow-headers']).toContain('Authorization');
    });
  });

  // ─── Designs CRUD Cycle ─────────────────────────────────────────────────────

  describe('Designs CRUD Cycle', () => {
    let designId: string;

    const designPayload = {
      name: 'Oak Bookshelf',
      description: 'A tall bookshelf made from solid oak',
      dimensions: {
        length: 36,
        width: 12,
        height: 72,
        unit: 'imperial',
      },
      materials: [
        { name: 'Oak boards', quantity: 8, unit: 'board feet' },
        { name: 'Wood screws', quantity: 24, unit: 'pieces' },
      ],
      notes: 'Use quarter-sawn oak for the shelves',
    };

    it('should create a new design', async () => {
      const res = await request(app)
        .post('/api/designs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(designPayload)
        .expect(201);

      expect(res.body).toHaveProperty('_id');
      expect(res.body.name).toBe(designPayload.name);
      expect(res.body.description).toBe(designPayload.description);
      expect(res.body.dimensions.length).toBe(designPayload.dimensions.length);
      expect(res.body.dimensions.unit).toBe(designPayload.dimensions.unit);
      expect(res.body.materials).toHaveLength(2);
      expect(res.body.notes).toBe(designPayload.notes);
      designId = res.body._id;
    });

    it('should list designs including the created one', async () => {
      const res = await request(app)
        .get('/api/designs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const found = res.body.find((d: { _id: string }) => d._id === designId);
      expect(found).toBeDefined();
      expect(found.name).toBe(designPayload.name);
    });

    it('should get a design by ID', async () => {
      const res = await request(app)
        .get(`/api/designs/${designId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body._id).toBe(designId);
      expect(res.body.name).toBe(designPayload.name);
    });

    it('should update a design', async () => {
      const updatePayload = {
        name: 'Oak Bookshelf (Revised)',
        description: 'Updated description',
        dimensions: {
          length: 40,
          width: 14,
          height: 72,
          unit: 'imperial',
        },
        notes: 'Updated notes',
      };

      const res = await request(app)
        .put(`/api/designs/${designId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatePayload)
        .expect(200);

      expect(res.body.name).toBe(updatePayload.name);
      expect(res.body.description).toBe(updatePayload.description);
      expect(res.body.dimensions.length).toBe(40);
      expect(res.body.notes).toBe(updatePayload.notes);
    });

    it('should delete a design', async () => {
      await request(app)
        .delete(`/api/designs/${designId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify it's gone
      await request(app)
        .get(`/api/designs/${designId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent design', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/designs/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should not allow access to designs without auth', async () => {
      await request(app)
        .post('/api/designs')
        .send(designPayload)
        .expect(401);
    });
  });

  // ─── Multi-tenant Isolation ─────────────────────────────────────────────────

  describe('Multi-tenant Data Isolation', () => {
    let user2Token: string;
    let user1DesignId: string;

    const USER2 = {
      email: 'user2@test.com',
      password: 'AnotherPass456!',
    };

    it('should register a second user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(USER2)
        .expect(201);

      user2Token = res.body.token;
    });

    it('user1 creates a design', async () => {
      const res = await request(app)
        .post('/api/designs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'User1 Private Design',
          dimensions: { length: 10, width: 10, height: 10, unit: 'metric' },
        })
        .expect(201);

      user1DesignId = res.body._id;
    });

    it('user2 should not see user1 designs in list', async () => {
      const res = await request(app)
        .get('/api/designs')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      const found = res.body.find((d: { _id: string }) => d._id === user1DesignId);
      expect(found).toBeUndefined();
    });

    it('user2 should not access user1 design by ID', async () => {
      await request(app)
        .get(`/api/designs/${user1DesignId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);
    });

    it('user2 should not update user1 design', async () => {
      await request(app)
        .put(`/api/designs/${user1DesignId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked!' })
        .expect(404);
    });

    it('user2 should not delete user1 design', async () => {
      await request(app)
        .delete(`/api/designs/${user1DesignId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);
    });
  });

  // ─── Health Check ───────────────────────────────────────────────────────────

  describe('Health Check', () => {
    it('should return ok status', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });
});
