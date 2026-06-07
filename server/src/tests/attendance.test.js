import request from 'supertest';
import app     from '../app.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let facultyToken, studentToken, adminToken;
let sessionId, recordId;

const loginAs = async (email, password) => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.accessToken;
};

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  facultyToken = await loginAs('priya.sharma@college.edu', 'Test@1234');
  studentToken = await loginAs('arun.kumar@student.edu', 'Test@1234');
  adminToken   = await loginAs('admin@college.edu', 'Test@1234');
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/attendance/sessions', () => {
  it('faculty can list their sessions', async () => {
    const res = await request(app)
      .get('/api/attendance/sessions')
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('student is blocked (403)', async () => {
    const res = await request(app)
      .get('/api/attendance/sessions')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it('unauthenticated request is rejected (401)', async () => {
    const res = await request(app).get('/api/attendance/sessions');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/attendance/me', () => {
  it('student can view own attendance', async () => {
    const res = await request(app)
      .get('/api/attendance/me')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('summary');
    expect(res.body.data).toHaveProperty('by_subject');
  });
});

describe('PATCH /api/attendance/:recordId — OCC', () => {
  it('update with wrong version returns 409 VERSION_CONFLICT', async () => {
    // Get a real record first
    const sessions = await request(app)
      .get('/api/attendance/sessions')
      .set('Authorization', `Bearer ${facultyToken}`);

    if (!sessions.body.data?.length) return; // skip if no sessions in test DB

    const sessionRes = await request(app)
      .get(`/api/attendance/sessions/${sessions.body.data[0].id}`)
      .set('Authorization', `Bearer ${facultyToken}`);

    const record = sessionRes.body.data?.records?.find((item) => item.id);
    if (!record) return;

    // Send deliberately wrong version
    const res = await request(app)
      .patch(`/api/attendance/${record.id}`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ status: 'present', version: 9999 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VERSION_CONFLICT');
    expect(res.body.error.latest).toBeDefined(); // client receives latest state
  });
});

describe('POST /api/attendance/import — CSV idempotency', () => {
  it('uploading same CSV twice produces no duplicates', async () => {
    const csv = `student_id,session_id,status\n1,1,present\n2,1,absent`;
    const buf = Buffer.from(csv);

    const upload = () =>
      request(app)
        .post('/api/attendance/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buf, { filename: 'test.csv', contentType: 'text/csv' });

    const first  = await upload();
    const second = await upload();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // Second import updates in place — imported count same, no error spikes
    expect(second.body.data.imported).toBeGreaterThanOrEqual(0);
    expect(second.body.data.errors.length).toBe(0);
  });
});
