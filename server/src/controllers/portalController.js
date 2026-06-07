import * as portalService from '../services/portalService.js';
import { success } from '../utils/responseHelper.js';

export const getTimetable = async (req, res, next) => {
  try {
    const data = await portalService.getTimetable(req.user, req.query);
    return success(res, data);
  } catch (err) { next(err); }
};

export const getCalendar = async (req, res, next) => {
  try {
    const data = await portalService.getCalendar(req.user, req.query);
    return success(res, data);
  } catch (err) { next(err); }
};

export const getParentPortal = async (req, res, next) => {
  try {
    const data = await portalService.getParentPortal(req.user.id);
    return success(res, data);
  } catch (err) { next(err); }
};

export const getHodPortal = async (req, res, next) => {
  try {
    const data = await portalService.getHodPortal(req.user);
    return success(res, data);
  } catch (err) { next(err); }
};

export const sendLowAttendanceAlerts = async (req, res, next) => {
  try {
    const data = await portalService.sendLowAttendanceAlerts(req.user, req.body);
    return success(res, data, 200, 'Low-attendance parent alerts processed');
  } catch (err) { next(err); }
};
