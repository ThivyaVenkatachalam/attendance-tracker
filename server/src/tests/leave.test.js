import request from 'supertest';
import app     from '../app.js';
import { db as pool } from '../config/db.js';

let studentToken, adminToken, leaveId;

const loginAs = async (email, password) => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.accessToken;
};

beforeAll(async () => {
  studentToken = await loginAs('arun.kumar@student.edu', 'Test@1234');
  adminToken   = await loginAs('admin@college.edu', 'Test@1234');
  // Arun Kumar is student_id = 17, clean up any existing test leave requests
  await pool.query(
    `DELETE FROM leave_requests
     WHERE student_id = 17
       AND start_date >= '2025-06-10'
       AND end_date <= '2025-06-13'`
  );
});

// ─── Submit ──────────────────────────────────────────────────────────────────

describe('POST /api/leaves — submit', () => {
  it('student can submit a valid leave request', async () => {
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        start_date: '2025-06-10',
        end_date:   '2025-06-12',
        reason:     'Medical appointment requires rest and follow-up',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    leaveId = res.body.data.id;
  });

  it('rejects leave where end_date < start_date', async () => {
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ start_date: '2025-06-15', end_date: '2025-06-10', reason: 'Test invalid range' });

    expect(res.status).toBe(422);
  });

  it('rejects overlapping leave for same student', async () => {
    const res = await request(app)
      .post('/api/leave')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        start_date: '2025-06-11',
        end_date:   '2025-06-13',
        reason:     'This overlaps with the one above and should be rejected',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LEAVE_OVERLAP');
  });
});

// ─── Approve ─────────────────────────────────────────────────────────────────

describe('PATCH /api/leaves/:id/status — review', () => {
  it('admin can approve a pending leave', async () => {
    if (!leaveId) return;

    const res = await request(app)
      .patch(`/api/leave/${leaveId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved', admin_note: 'Medical leave granted' });

    expect(res.status).toBe(200);
    expect(res.body.data.leave.status).toBe('approved');
    // Adjusted attendance should be present when leave is approved
    expect(res.body.data.adjusted_attendance).toBeDefined();
  });

  it('student cannot approve a leave (403)', async () => {
    if (!leaveId) return;

    const res = await request(app)
      .patch(`/api/leave/${leaveId}/status`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(403);
  });

  it('approving an already-approved leave returns 409', async () => {
    if (!leaveId) return;

    const res = await request(app)
      .patch(`/api/leave/${leaveId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LEAVE_ALREADY_REVIEWED');
  });
});