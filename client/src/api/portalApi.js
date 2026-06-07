import api from './axiosInstance';

export const portalApi = {
  getTimetable: (params) => api.get('/portal/timetable', { params }),
  getCalendar:  (params) => api.get('/portal/calendar', { params }),
  getHod:       () => api.get('/portal/hod'),
  getParent:    () => api.get('/portal/parent'),
  sendLowAttendanceAlerts: (data = {}) => api.post('/portal/alerts/low-attendance', data),
};
