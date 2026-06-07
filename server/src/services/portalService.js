import { AppError } from '../utils/AppError.js';
import * as attendanceModel from '../models/attendanceModel.js';
import * as portalModel from '../models/portalModel.js';
import * as notificationService from './notificationService.js';

const groupCalendar = (sessions) => {
  const days = new Map();
  sessions.forEach((session) => {
    const key = session.session_date instanceof Date
      ? session.session_date.toISOString().slice(0, 10)
      : String(session.session_date).slice(0, 10);
    const day = days.get(key) ?? { date: key, sessions: [] };
    day.sessions.push(session);
    days.set(key, day);
  });
  return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
};

export const getTimetable = async (user, filters) => {
  return portalModel.getSchedule(user, filters);
};

export const getCalendar = async (user, filters) => {
  const sessions = await portalModel.getSchedule(user, filters);
  return groupCalendar(sessions);
};

export const getParentPortal = async (parentId) => {
  const students = await portalModel.getParentStudents(parentId);
  const summaries = await Promise.all(students.map(async (student) => {
    const [summary, subjects] = await Promise.all([
      attendanceModel.getStudentAttendanceSummary(student.id),
      attendanceModel.getStudentAttendanceBySubject(student.id),
    ]);
    return {
      ...student,
      summary,
      subjects,
      is_warned: summary.attendance_pct !== null && summary.attendance_pct < 75,
    };
  }));

  const recent_records = await portalModel.getRecentRecordsForStudents(
    students.map((student) => student.id),
    12
  );

  return {
    students: summaries,
    recent_records,
  };
};

export const getHodPortal = async (user) => {
  if (!user.department) {
    throw new AppError('HOD account must have a department assigned', 400, 'HOD_DEPARTMENT_REQUIRED');
  }

  const [stats, lowAttendance, timetable, emailLogs] = await Promise.all([
    portalModel.getHodStats(user.department),
    attendanceModel.getStudentsBelow75({ department: user.department }),
    portalModel.getSchedule(user, {}),
    portalModel.getEmailLogs({ department: user.department, limit: 10 }),
  ]);

  return {
    department: user.department,
    stats,
    low_attendance: lowAttendance,
    low_attendance_count: lowAttendance.length,
    upcoming_sessions: timetable.slice(0, 10),
    email_logs: emailLogs,
  };
};

export const sendLowAttendanceAlerts = async (user, payload = {}) => {
  const filters = {
    department: user.role === 'hod' ? user.department : payload.department,
    semester: payload.semester,
    threshold: payload.threshold ?? 75,
  };

  return notificationService.sendLowAttendanceAlerts({
    filters,
    triggeredBy: user.id,
  });
};
