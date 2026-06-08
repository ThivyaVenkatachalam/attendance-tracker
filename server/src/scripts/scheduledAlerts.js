import cron from 'node-cron';
import { sendLowAttendanceAlerts } from '../services/notificationService.js';
import { logger } from '../config/logger.js';

// Runs every day at 8:00 PM
cron.schedule('0 20 * * *', async () => {
  logger.info('Running scheduled low attendance alerts...');
  const result = await sendLowAttendanceAlerts({ 
    filters: { threshold: 75 }, 
    triggeredBy: null 
  });
  logger.info('Scheduled alerts complete', result);
});