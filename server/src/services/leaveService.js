import { AppError } from '../utils/AppError.js';
import * as leaveModel from '../models/leaveModel.js';
import * as attendanceModel from '../models/attendanceModel.js';
import { logger } from '../config/logger.js';

// ─── Submit Leave ────────────────────────────────────────────────────────────

export const submitLeave = async ({ start_date, end_date, reason, document_url }, student) => {
  // Date validation
  const start = new Date(start_date);
  const end   = new Date(end_date);
  if (end < start) throw new AppError('end_date must be after start_date', 400, 'INVALID_DATE_RANGE');

  // Max 30-day leave per request
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  if (days > 30) throw new AppError('Single leave request cannot exceed 30 days', 400, 'LEAVE_TOO_LONG');

  // Overlap check
  const conflicts = await leaveModel.findOverlappingLeave(student.id, start_date, end_date);
  if (conflicts.length > 0) {
    throw new AppError('You already have a pending or approved leave in this date range', 409, 'LEAVE_OVERLAP');
  }

  const id = await leaveModel.createLeaveRequest({
    student_id: student.id,
    start_date,
    end_date,
    reason,
    document_url,
  });

  logger.info({ actor_id: student.id, action: 'leave_submitted', leave_id: id, days });
  return leaveModel.findLeaveById(id);
};

// ─── Get Leave (student sees own, admin/faculty see all) ─────────────────────

export const getLeaveById = async (leaveId, requestingUser) => {
  const leave = await leaveModel.findLeaveById(leaveId);
  if (!leave) throw new AppError('Leave request not found', 404, 'LEAVE_NOT_FOUND');

  if (requestingUser.role === 'student' && leave.student_id !== requestingUser.id) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  if (['faculty', 'hod'].includes(requestingUser.role) && requestingUser.department !== leave.department) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  return leave;
};

export const getMyLeaves = async (studentId, filters) => {
  return leaveModel.findLeavesByStudent(studentId, filters);
};

export const getAllLeaves = async (filters, requestingUser = null) => {
  const scoped = { ...filters };
  if (requestingUser?.role === 'hod' || requestingUser?.role === 'faculty') {
    scoped.department = requestingUser.department;
  }
  return leaveModel.findAllLeaves(scoped);
};

// ─── Approve / Reject (Admin only) ──────────────────────────────────────────

export const reviewLeave = async (leaveId, { status, admin_note }, admin) => {
  if (!['recommended', 'approved', 'rejected'].includes(status)) {
    throw new AppError('status must be "recommended", "approved", or "rejected"', 400, 'INVALID_STATUS');
  }

  const leave = await leaveModel.findLeaveById(leaveId);
  if (!leave) throw new AppError('Leave request not found', 404, 'LEAVE_NOT_FOUND');

  if (['faculty', 'hod'].includes(admin.role) && admin.department !== leave.department) {
    throw new AppError('Leave request is outside your department', 403, 'FORBIDDEN');
  }

  if (admin.role === 'faculty') {
    if (!['recommended', 'rejected'].includes(status)) {
      throw new AppError('Class tutor can only recommend or reject leave', 403, 'FACULTY_REVIEW_ONLY');
    }
    if (leave.status !== 'pending') {
      throw new AppError(`Leave is already ${leave.status}`, 409, 'LEAVE_ALREADY_REVIEWED');
    }

    const facultyAffected = status === 'recommended'
      ? await leaveModel.recommendLeave(leaveId, admin.id, admin_note)
      : await leaveModel.updateLeaveStatus(leaveId, 'rejected', admin.id, admin_note);
    if (facultyAffected === 0) {
      throw new AppError('Update failed - leave may have been modified', 409, 'CONCURRENT_UPDATE');
    }

    logger.info({
      actor_id: admin.id,
      action:   `leave_${status}`,
      leave_id: leaveId,
      student_id: leave.student_id,
    });

    return {
      leave: await leaveModel.findLeaveById(leaveId),
      adjusted_attendance: null,
    };
  }

  if (admin.role === 'hod' && status === 'recommended') {
    throw new AppError('HOD must approve or reject recommended leave', 400, 'INVALID_HOD_ACTION');
  }

  if (status === 'approved' && admin.role === 'hod' && leave.status !== 'recommended') {
    throw new AppError('Leave must be recommended before HOD final approval', 409, 'LEAVE_NOT_RECOMMENDED');
  }

  if (!['pending', 'recommended'].includes(leave.status)) {
    throw new AppError(`Leave is already ${leave.status}`, 409, 'LEAVE_ALREADY_REVIEWED');
  }

  const affected = await leaveModel.updateLeaveStatus(leaveId, status, admin.id, admin_note);
  if (affected === 0) throw new AppError('Update failed — leave may have been modified', 409, 'CONCURRENT_UPDATE');

  logger.info({
    actor_id: admin.id,
    action:   `leave_${status}`,
    leave_id: leaveId,
    student_id: leave.student_id,
  });

  // If approved, recalculate student's adjusted attendance percentage
  let adjustedAttendance = null;
  if (status === 'approved') {
    await leaveModel.markAttendanceAsLeave(leave.student_id, leave.start_date, leave.end_date, admin.id);
    adjustedAttendance = await recalcAttendanceWithLeave(leave.student_id);
  }

  return {
    leave: await leaveModel.findLeaveById(leaveId),
    adjusted_attendance: adjustedAttendance,
  };
};

// ─── Attendance Recalculation ────────────────────────────────────────────────

/**
 * When a leave is approved, the student's absence during approved leave days
 * should be excluded from the denominator (total sessions).
 * This is a best-effort recalculation — the actual DB record isn't overwritten,
 * just a computed field returned for the UI.
 */
export const recalcAttendanceWithLeave = async (studentId) => {
  const [summary, approvedDays] = await Promise.all([
    attendanceModel.getStudentAttendanceSummary(studentId),
    leaveModel.countApprovedLeaveDays(studentId),
  ]);

  const adjustedTotal = Math.max(summary.total_sessions - approvedDays, 0);
  const adjustedPct   = adjustedTotal === 0
    ? 0
    : Math.round((summary.present_count / adjustedTotal) * 100 * 100) / 100;

  return {
    raw_pct:          summary.attendance_pct,
    approved_leave_days: approvedDays,
    adjusted_total:   adjustedTotal,
    adjusted_pct:     adjustedPct,
  };
};
