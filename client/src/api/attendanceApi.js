import api from './axiosInstance';

export const attendanceApi = {
  // Get all records for a session
  getBySession:   (sessionId)       => api.get(`/attendance/sessions/${sessionId}`),

  // Mark single attendance
  mark:           (data)            => api.post('/attendance', data),

  // Update with OCC version
  update:         (id, data)        => api.patch(`/attendance/${id}`, data),

  // Bulk mark for a session
  bulkMark:       (sessionId, records) => api.post(`/attendance/sessions/${sessionId}/bulk`, { records }),

  // CSV import
  importCSV:      (formData)        => api.post('/attendance/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  importTimetable: (formData)       => api.post('/attendance/sessions/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Student's own attendance
  getMyAttendance: ()               => api.get('/attendance/me'),

  // Filter attendance records
  filter: (params)                  => api.get('/attendance', { params }),
};
