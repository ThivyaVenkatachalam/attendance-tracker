import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/layouts/AppLayout';
import { Spinner } from '@/components/shared';

// Pages
import LoginPage          from '@/pages/LoginPage';
import AdminDashboard     from '@/pages/admin/AdminDashboard';
import AdminStudents      from '@/pages/admin/AdminStudents';
import AdminLeave         from '@/pages/admin/AdminLeave';
import AdminSessions      from '@/pages/admin/AdminSessions';
import FacultyDashboard   from '@/pages/faculty/FacultyDashboard';
import FacultySessions    from '@/pages/faculty/FacultySessions';
import AttendanceSheet    from '@/pages/faculty/AttendanceSheet';
import ImportCSV          from '@/pages/faculty/ImportCSV';
import StudentDashboard   from '@/pages/student/StudentDashboard';
import StudentAttendance  from '@/pages/student/StudentAttendance';
import StudentLeave       from '@/pages/student/StudentLeave';
import HodDashboard       from '@/pages/hod/HodDashboard';
import ParentDashboard    from '@/pages/parent/ParentDashboard';
import TimetablePage      from '@/pages/shared/TimetablePage';
import CalendarPage       from '@/pages/shared/CalendarPage';

// ── Protected route wrapper ───────────────────────────────────
function ProtectedRoute({ children, roles }) {
  const { user, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  const { initAuth } = useAuthStore();

  // Restore session on mount
  useEffect(() => { initAuth(); }, []);

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="/admin/students" element={
        <ProtectedRoute roles={['admin']}><AdminStudents /></ProtectedRoute>
      } />
      <Route path="/admin/leave" element={
        <ProtectedRoute roles={['admin']}><AdminLeave /></ProtectedRoute>
      } />
      <Route path="/admin/sessions" element={
        <ProtectedRoute roles={['admin']}><AdminSessions /></ProtectedRoute>
      } />
      <Route path="/admin/timetable" element={
        <ProtectedRoute roles={['admin']}><TimetablePage /></ProtectedRoute>
      } />
      <Route path="/admin/calendar" element={
        <ProtectedRoute roles={['admin']}><CalendarPage /></ProtectedRoute>
      } />

      {/* HOD routes */}
      <Route path="/hod/dashboard" element={
        <ProtectedRoute roles={['hod']}><HodDashboard /></ProtectedRoute>
      } />
      <Route path="/hod/leave" element={
        <ProtectedRoute roles={['hod']}><AdminLeave /></ProtectedRoute>
      } />
      <Route path="/hod/timetable" element={
        <ProtectedRoute roles={['hod']}><TimetablePage /></ProtectedRoute>
      } />
      <Route path="/hod/calendar" element={
        <ProtectedRoute roles={['hod']}><CalendarPage /></ProtectedRoute>
      } />

      {/* Faculty routes */}
      <Route path="/faculty/dashboard" element={
        <ProtectedRoute roles={['faculty']}><FacultyDashboard /></ProtectedRoute>
      } />
      <Route path="/faculty/sessions" element={
        <ProtectedRoute roles={['faculty']}><FacultySessions /></ProtectedRoute>
      } />
      <Route path="/faculty/sessions/:sessionId/attendance" element={
        <ProtectedRoute roles={['faculty']}><AttendanceSheet /></ProtectedRoute>
      } />
      <Route path="/faculty/leave" element={
        <ProtectedRoute roles={['faculty']}><AdminLeave /></ProtectedRoute>
      } />
      <Route path="/faculty/import" element={
        <ProtectedRoute roles={['faculty']}><ImportCSV /></ProtectedRoute>
      } />
      <Route path="/faculty/timetable" element={
        <ProtectedRoute roles={['faculty']}><TimetablePage /></ProtectedRoute>
      } />
      <Route path="/faculty/calendar" element={
        <ProtectedRoute roles={['faculty']}><CalendarPage /></ProtectedRoute>
      } />

      {/* Student routes */}
      <Route path="/student/dashboard" element={
        <ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>
      } />
      <Route path="/student/attendance" element={
        <ProtectedRoute roles={['student']}><StudentAttendance /></ProtectedRoute>
      } />
      <Route path="/student/leave" element={
        <ProtectedRoute roles={['student']}><StudentLeave /></ProtectedRoute>
      } />
      <Route path="/student/timetable" element={
        <ProtectedRoute roles={['student']}><TimetablePage /></ProtectedRoute>
      } />
      <Route path="/student/calendar" element={
        <ProtectedRoute roles={['student']}><CalendarPage /></ProtectedRoute>
      } />

      {/* Parent routes */}
      <Route path="/parent/dashboard" element={
        <ProtectedRoute roles={['parent']}><ParentDashboard /></ProtectedRoute>
      } />
      <Route path="/parent/timetable" element={
        <ProtectedRoute roles={['parent']}><TimetablePage /></ProtectedRoute>
      } />
      <Route path="/parent/calendar" element={
        <ProtectedRoute roles={['parent']}><CalendarPage /></ProtectedRoute>
      } />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
