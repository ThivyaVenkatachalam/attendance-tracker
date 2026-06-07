import { z } from 'zod';

const VALID_STATUSES = ['present', 'absent', 'leave'];

export const markAttendanceSchema = z.object({
  session_id: z.number({ required_error: 'session_id is required' }).int().positive(),
  student_id: z.number({ required_error: 'student_id is required' }).int().positive(),
  status:     z.enum(VALID_STATUSES, { required_error: 'status is required' }),
});

export const updateAttendanceSchema = z.object({
  status:  z.enum(VALID_STATUSES),
  version: z.number({ required_error: 'version is required for OCC — send the version from your last GET' }).int().min(0),
});

export const bulkMarkSchema = z.object({
  records: z
    .array(
      z.object({
        student_id: z.number().int().positive(),
        status:     z.enum(VALID_STATUSES),
        version:    z.number({ required_error: 'version is required for OCC bulk saves' }).int().min(0),
      })
    )
    .min(1, 'records array must have at least one entry')
    .max(500, 'Maximum 500 records per bulk request'),
});

export const attendanceQuerySchema = z.object({
  subject:    z.string().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be YYYY-MM-DD').optional(),
  end_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be YYYY-MM-DD').optional(),
  limit:      z.coerce.number().int().min(1).max(100).optional(),
  offset:     z.coerce.number().int().min(0).optional(),
}).refine(
  d => !d.start_date || !d.end_date || d.start_date <= d.end_date,
  { message: 'start_date must be before or equal to end_date', path: ['end_date'] }
);
