import api from './axiosInstance';

export const leaveApi = {
  apply:       (data)           => api.post('/leave', data),
  getMyLeaves: ()               => api.get('/leave/me'),
  getAll:      (params)         => api.get('/leave', { params }),
  getById:     (id)             => api.get(`/leave/${id}`),
  review:      (id, data)       => api.patch(`/leave/${id}/status`, data),
};
