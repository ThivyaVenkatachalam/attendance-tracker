import { z } from 'zod';

export const submitLeaveSchema = z.object({
  start_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be YYYY-MM-DD'),
  end_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be YYYY-MM-DD'),
  reason:       z.string().min(10, 'Reason must be at least 10 characters').max(1000),
  document_url: z.string().url('document_url must be a valid URL').optional(),
}).refine(
  d => d.start_date <= d.end_date,
  { message: 'end_date must be on or after start_date', path: ['end_date'] }
);

export const reviewLeaveSchema = z.object({
  status:     z.enum(['recommended', 'approved', 'rejected'], {
    required_error: 'status is required',
    invalid_type_error: 'status must be "recommended", "approved", or "rejected"',
  }),
  admin_note: z.string().max(500).optional(),
});

export const leaveQuerySchema = z.object({
  status:     z.enum(['pending', 'recommended', 'approved', 'rejected']).optional(),
  department: z.string().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit:      z.coerce.number().int().min(1).max(100).optional(),
  offset:     z.coerce.number().int().min(0).optional(),
});
