import * as leaveService from '../services/leaveService.js';
import { success, created } from '../utils/responseHelper.js';
import { metricsTracker } from '../utils/metricsTracker.js';
import { auditLog } from '../config/logger.js';

export const submitLeave = async (req, res, next) => {
  try {
    const leave = await leaveService.submitLeave(req.body, req.user);
    return created(res, leave, 'Leave request submitted');
  } catch (err) { next(err); }
};

export const getLeave = async (req, res, next) => {
  try {
    const leave = await leaveService.getLeaveById(req.params.id, req.user);
    return success(res, leave);
  } catch (err) { next(err); }
};

export const getMyLeaves = async (req, res, next) => {
  try {
    const filters = { status: req.query.status };
    const leaves = await leaveService.getMyLeaves(req.user.id, filters);
    return success(res, leaves);
  } catch (err) { next(err); }
};

// Admin: list all leave requests with optional filters
export const getAllLeaves = async (req, res, next) => {
  try {
    const filters = {
      status:     req.query.status,
      department: req.query.department,
      start_date: req.query.start_date,
      end_date:   req.query.end_date,
      limit:      req.query.limit  || 20,
      offset:     req.query.offset || 0,
    };
    const leaves = await leaveService.getAllLeaves(filters, req.user);
    return success(res, leaves);
  } catch (err) { next(err); }
};

// Admin: approve or reject
export const reviewLeave = async (req, res, next) => {
  const t0 = Date.now();
  try {
    const result = await leaveService.reviewLeave(
      req.params.id,
      req.body,   // { status, admin_note }
      req.user
    );
    const latencyMs = Date.now() - t0;
    metricsTracker.record(`leave_${req.body.status}`, latencyMs);
    auditLog({
      actorId: req.user.id,
      studentId: result.leave.student_id,
      action: `leave.${req.body.status}`,
      status: 'success',
      latencyMs,
      meta: { leave_id: Number(req.params.id) },
    });
    return success(res, result, 200, `Leave ${req.body.status}`);
  } catch (err) {
    const latencyMs = Date.now() - t0;
    metricsTracker.record(`leave_${req.body?.status || 'review'}_failure`, latencyMs);
    auditLog({
      actorId: req.user?.id,
      studentId: null,
      action: `leave.${req.body?.status || 'review'}`,
      status: 'failure',
      latencyMs,
      meta: { leave_id: Number(req.params.id), error_code: err.code },
    });
    next(err);
  }
};

// Student or admin: recalc adjusted attendance
export const getAdjustedAttendance = async (req, res, next) => {
  try {
    const studentId = req.user.role === 'student' ? req.user.id : Number(req.params.studentId);
    const result = await leaveService.recalcAttendanceWithLeave(studentId);
    return success(res, result);
  } catch (err) { next(err); }
};
