import * as dashboardService from '../services/dashboardService.js';
import { success } from '../utils/responseHelper.js';

// Role-aware: one endpoint, three different payloads
export const getDashboard = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    let data;

    if (role === 'admin') {
      const filters = {
        department: req.query.department,
        semester:   req.query.semester,
      };
      data = await dashboardService.getAdminDashboard(filters);
    } else if (role === 'faculty') {
      data = await dashboardService.getFacultyDashboard(id);
    } else {
      // student
      data = await dashboardService.getStudentDashboard(id);
    }

    return success(res, data);
  } catch (err) { next(err); }
};

// Admin only: warning report (students below 75%)
export const getWarningReport = async (req, res, next) => {
  try {
    const filters = {
      department: req.query.department,
      semester:   req.query.semester,
    };
    const data = await dashboardService.getWarningReport(filters);
    return success(res, data);
  } catch (err) { next(err); }
};
