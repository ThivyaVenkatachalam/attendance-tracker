import request from 'supertest';
import app     from '../app.js';

/**
 * Concurrency test:
 * Two simultaneous PATCH requests with the same `version`.
 * Only ONE should succeed (200). The other must get 409 VERSION_CONFLICT.
 * This proves OCC is working correctly.
 */

let facultyToken;

const loginAs = async (email, password) => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.accessToken;
};

beforeAll(async () => {
  facultyToken = await loginAs('priya.sharma@college.edu', 'Test@1234');
});

describe('OCC — concurrent updates', () => {
  it('only one of two simultaneous updates with same version succeeds', async () => {
    // Step 1: get a real attendance record to work with
    const sessionsRes = await request(app)
      .get('/api/attendance/sessions')
      .set('Authorization', `Bearer ${facultyToken}`);

    if (!sessionsRes.body.data?.length) {
      console.warn('⚠  No sessions found — seed the DB and rerun');
      return;
    }

    const sessionRes = await request(app)
      .get(`/api/attendance/sessions/${sessionsRes.body.data[0].id}`)
      .set('Authorization', `Bearer ${facultyToken}`);

    const record = sessionRes.body.data?.records?.find((item) => item.id);
    if (!record) {
      console.warn('⚠  No attendance records found — seed the DB and rerun');
      return;
    }

    // Step 2: fire two requests simultaneously with the SAME version
    const makeUpdate = (status) =>
      request(app)
        .patch(`/api/attendance/${record.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ status, version: record.version });

    const [resA, resB] = await Promise.all([
      makeUpdate('present'),
      makeUpdate('absent'),
    ]);

    const statuses = [resA.status, resB.status].sort();

    // One must succeed, one must conflict
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);

    // The 409 must include the latest record for the client to compare
    const conflicted = resA.status === 409 ? resA : resB;
    expect(conflicted.body.error.code).toBe('VERSION_CONFLICT');
    expect(conflicted.body.error.latest).toBeDefined();
    expect(conflicted.body.error.latest.id).toBe(record.id);
  });
});
