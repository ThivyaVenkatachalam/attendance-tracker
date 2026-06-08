import nodemailer from 'nodemailer';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import * as portalModel from '../models/portalModel.js';

// ── Mailer setup ──────────────────────────────────────────────
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn('SMTP credentials not configured — emails will be logged only');
    return null;
  }

  transporter = nodemailer.createTransport({
    host:   env.SMTP_HOST,
    port:   env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    pool:             false,
    socketTimeout:    15000,
    greetingTimeout:  15000,
    connectionTimeout: 15000,
  });

  return transporter;
}

// ── HTML email template ───────────────────────────────────────
function buildEmailHtml({ student_name, roll_no, attendance_pct, threshold, department, semester }) {
  const isWarning  = attendance_pct < threshold;
  const isCritical = attendance_pct < 60;
  const color      = isCritical ? '#DC2626' : '#D97706';
  const bgColor    = isCritical ? '#FEE2E2' : '#FEF3C7';
  const label      = isCritical ? '⚠️ Critical' : '⚠️ Warning';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background:#0F172A;padding:24px 28px;display:flex;align-items:center;gap:12px;">
          <span style="font-size:22px;">📋</span>
          <div>
            <h1 style="margin:0;font-size:18px;color:#fff;font-weight:700;">AttendEase</h1>
            <p style="margin:0;font-size:12px;color:#94A3B8;">Attendance Management System</p>
          </div>
        </div>

        <!-- Alert banner -->
        <div style="background:${bgColor};border-left:4px solid ${color};padding:14px 28px;">
          <p style="margin:0;font-size:13px;font-weight:700;color:${color};">${label} — Low Attendance</p>
        </div>

        <!-- Body -->
        <div style="padding:28px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;">Dear Parent / Guardian,</p>
          <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
            This is an automated alert from <strong>AttendEase</strong>. Your ward's attendance has
            fallen below the required threshold of <strong>${threshold}%</strong>.
          </p>

          <!-- Student info card -->
          <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:18px;margin-bottom:20px;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr>
                <td style="padding:6px 0;color:#6B7280;width:140px;">Student Name</td>
                <td style="padding:6px 0;color:#111827;font-weight:600;">${student_name}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6B7280;">Roll Number</td>
                <td style="padding:6px 0;color:#111827;font-weight:600;">${roll_no}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6B7280;">Department</td>
                <td style="padding:6px 0;color:#111827;">${department ?? 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6B7280;">Semester</td>
                <td style="padding:6px 0;color:#111827;">Sem ${semester ?? 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6B7280;">Current Attendance</td>
                <td style="padding:6px 0;">
                  <span style="font-size:20px;font-weight:800;color:${color};">${Number(attendance_pct).toFixed(1)}%</span>
                  <span style="font-size:12px;color:#9CA3AF;margin-left:6px;">(required: ${threshold}%)</span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Progress bar -->
          <div style="margin-bottom:20px;">
            <div style="background:#E5E7EB;border-radius:99px;height:10px;overflow:hidden;">
              <div style="width:${Math.min(attendance_pct, 100)}%;height:100%;background:${color};border-radius:99px;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:#9CA3AF;margin-top:4px;">
              <span>0%</span>
              <span style="color:${color};font-weight:600;">${Number(attendance_pct).toFixed(1)}%</span>
              <span>100%</span>
            </div>
          </div>

          <p style="font-size:13px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Students with attendance below <strong>75%</strong> may be <strong>detained from examinations</strong>
            as per college regulations. We urge you to please encourage regular attendance.
          </p>

          <p style="font-size:13px;color:#374151;line-height:1.6;margin:0 0 24px;">
            For further details, please contact the department office or log in to the parent portal.
          </p>

          <!-- CTA button -->
          <div style="text-align:center;margin-bottom:8px;">
            <a href="${env.CLIENT_URL}/login"
              style="display:inline-block;background:#0F172A;color:#fff;padding:12px 28px;
                     border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">
              View Parent Portal →
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 28px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;">
            This is an automated message from AttendEase. Please do not reply to this email.<br/>
            © ${new Date().getFullYear()} AttendEase — Attendance Management System
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
}

// ── Send single email ─────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();

  if (!transport) {
    logger.info('email_skipped_no_smtp', { to, subject });
    return { success: false, reason: 'no_smtp_config' };
  }

  try {
    const info = await transport.sendMail({
      from:    env.SMTP_FROM,
      to,
      subject,
      html,
    });
    transporter = null; // reset so next email gets a fresh connection
    logger.info('email_sent', { to, subject, messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    transporter = null; // reset on failure too
    logger.error('email_send_failed', { to, subject, error: err.message });
    return { success: false, reason: err.message };
  }
}

// ── Main export ───────────────────────────────────────────────
export const sendLowAttendanceAlerts = async ({ filters = {}, triggeredBy = null } = {}) => {
  const threshold = Number(filters.threshold ?? 75);
  const targets   = await portalModel.getLowAttendanceAlertTargets({ ...filters, threshold });

  const result = {
    threshold,
    total_targets: targets.length,
    sent:    [],
    skipped: [],
    failed:  [],
  };

  for (const target of targets) {
    // Skip if already emailed today
    const existing = await portalModel.findEmailLogToday({
      student_id: target.student_id,
      parent_id:  target.parent_id,
      subject:    null,
    });

    if (existing) {
      result.skipped.push({
        student_id: target.student_id,
        parent_id:  target.parent_id,
        reason:     'already_sent_today',
      });
      continue;
    }

    // Build and send email
    const subject  = `⚠️ Attendance Alert — ${target.student_name} (${target.attendance_pct}%)`;
    const html     = buildEmailHtml({
      student_name:   target.student_name,
      roll_no:        target.roll_no,
      attendance_pct: target.attendance_pct,
      threshold,
      department:     target.department,
      semester:       target.semester,
    });

    const emailResult = await sendEmail({ to: target.parent_email, subject, html });

    // Log to DB regardless of success
    await portalModel.createEmailLog({
      student_id:     target.student_id,
      parent_id:      target.parent_id,
      parent_email:   target.parent_email,
      attendance_pct: target.attendance_pct,
      status:         emailResult.success ? 'sent' : 'failed',
      message:        `Attendance alert: ${target.student_name} at ${target.attendance_pct}%`,
      triggered_by:   triggeredBy,
    });

    if (emailResult.success) {
      result.sent.push({
        student_id:     target.student_id,
        student_name:   target.student_name,
        parent_id:      target.parent_id,
        parent_email:   target.parent_email,
        attendance_pct: target.attendance_pct,
      });
    } else {
      result.failed.push({
        student_id:  target.student_id,
        parent_email: target.parent_email,
        reason:       emailResult.reason,
      });
    }
  }

  logger.info('low_attendance_alerts_complete', {
    sent:    result.sent.length,
    skipped: result.skipped.length,
    failed:  result.failed.length,
  });

  return result;
};