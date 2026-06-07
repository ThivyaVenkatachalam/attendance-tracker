import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import * as userModel from '../models/userModel.js';
import { success } from '../utils/responseHelper.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /api/users/students — admin + faculty can list students
router.get('/students', authorize('admin', 'faculty'), async (req, res, next) => {
  try {
    const { department, semester, min_attendance, max_attendance, leave_status } = req.query;
    const students = await userModel.findAllStudents({
      department,
      semester,
      min_attendance,
      max_attendance,
      leave_status,
    });
    return success(res, { students });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/students/search — search by name or roll_no
router.get('/students/search', authorize('admin', 'faculty'), async (req, res, next) => {
  try {
    const { q, department, semester, min_attendance, max_attendance, leave_status } = req.query;
    const students = await userModel.searchStudents({
      query: q,
      department,
      semester,
      min_attendance,
      max_attendance,
      leave_status,
    });
    return success(res, { students });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/faculty — admin only
router.get('/faculty', authorize('admin'), async (req, res, next) => {
  try {
    const faculty = await userModel.findAllFaculty();
    return success(res, { faculty });
  } catch (err) {
    next(err);
  }
});

export default router;
