import { logger } from '../config/logger.js';
import * as portalModel from '../models/portalModel.js';

const buildLowAttendanceMessage = (target, threshold) => (
  `Attendance alert: ${target.student_name} (${target.roll_no}) is at ${target.attendance_pct}% attendance, below the ${threshold}% requirement. Please contact the department office if support is needed.`
);

export const sendLowAttendanceAlerts = async ({ filters = {}, triggeredBy = null } = {}) => {
  const threshold = Number(filters.threshold ?? 75);
  const targets = await portalModel.getLowAttendanceAlertTargets({ ...filters, threshold });
  const result = {
    threshold,
    total_targets: targets.length,
    sent: [],
    skipped: [],
  };

  for (const target of targets) {
    const existing = await portalModel.findEmailLogToday({
      student_id: target.student_id,
      parent_id: target.parent_id,
      subject: null,
    });

    if (existing) {
      result.skipped.push({
        student_id: target.student_id,
        parent_id: target.parent_id,
        reason: 'already_sent_today',
      });
      continue;
    }

    const message = buildLowAttendanceMessage(target, threshold);
    await portalModel.createEmailLog({
      student_id: target.student_id,
      parent_id: target.parent_id,
      parent_email: target.parent_email,
      attendance_pct: target.attendance_pct,
      status: 'sent',
      message,
      triggered_by: triggeredBy,
    });

    logger.info('parent_attendance_email_sent', {
      student_id: target.student_id,
      parent_id: target.parent_id,
      parent_email: target.parent_email,
      attendance_pct: target.attendance_pct,
    });

    result.sent.push({
      student_id: target.student_id,
      student_name: target.student_name,
      parent_id: target.parent_id,
      parent_email: target.parent_email,
      attendance_pct: target.attendance_pct,
    });
  }

  return result;
};
