import api from './axiosInstance';

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const withNormalizedData = (request, normalize) =>
  request.then((response) => ({
    ...response,
    data: {
      ...response.data,
      data: normalize(response.data.data ?? {}),
    },
  }));

const normalizeAdminDashboard = (data) => {
  const overview = data.overview ?? {};
  const totalRecords = toNumber(overview.total_records);
  const presentCount = toNumber(overview.total_present);
  const leaveCount = toNumber(overview.total_leave);

  return {
    ...data,
    total_students: toNumber(overview.total_students),
    overall_pct: toNumber(overview.overall_attendance_pct).toFixed(2),
    below_75_count: toNumber(data.warning_count),
    pending_leave_count: toNumber(overview.pending_leaves),
    present_count: presentCount,
    absent_count: Math.max(totalRecords - presentCount - leaveCount, 0),
    leave_count: leaveCount,
    warned_students: (data.warning_students ?? []).map((student) => ({
      ...student,
      student_id: student.student_id ?? student.id,
      overall_attendance_pct: student.overall_attendance_pct ?? student.attendance_pct,
    })),
  };
};

const normalizeFacultyDashboard = (data) => {
  const sessions = data.recent_sessions ?? [];
  const submittedCount = sessions.filter((session) => toNumber(session.total) > 0).length;

  return {
    ...data,
    todays_sessions: sessions.length,
    attendance_submitted: submittedCount,
    attendance_pending: Math.max(sessions.length - submittedCount, 0),
    sessions: sessions.map((session) => ({
      ...session,
      department: session.department ?? '',
      semester: session.semester ?? '',
      submitted: toNumber(session.total) > 0,
    })),
  };
};

const normalizeStudentDashboard = (data) => {
  const summary = data.summary ?? {};

  return {
    ...data,
    total_sessions: toNumber(summary.total_sessions),
    present_count: toNumber(summary.present_count),
    overall_pct: toNumber(summary.attendance_pct).toFixed(2),
    leave_count: toNumber(summary.leave_count),
    absent_count: toNumber(summary.absent_count),
    subject_wise: (data.by_subject ?? []).map((subject) => ({
      ...subject,
      total: toNumber(subject.total ?? subject.total_sessions),
      present: toNumber(subject.present ?? subject.present_count),
      leave_count: toNumber(subject.leave_count),
      absent_count: toNumber(subject.absent_count),
      attendance_pct: toNumber(subject.attendance_pct ?? subject.pct),
    })),
  };
};

export const dashboardApi = {
  getAdminDashboard:   () => withNormalizedData(api.get('/dashboard'), normalizeAdminDashboard),
  getFacultyDashboard: () => withNormalizedData(api.get('/dashboard'), normalizeFacultyDashboard),
  getStudentDashboard: () => withNormalizedData(api.get('/dashboard'), normalizeStudentDashboard),
  getSessions:         (params) => api.get('/dashboard/sessions', { params }),
};
