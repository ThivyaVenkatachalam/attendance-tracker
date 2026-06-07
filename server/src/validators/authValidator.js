import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100),

  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .toLowerCase(),

  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  role: z.enum(['admin', 'hod', 'faculty', 'student', 'parent'], {
    required_error: 'Role is required',
    invalid_type_error: 'Role must be admin, hod, faculty, student, or parent',
  }),

  // Student-only fields
  roll_no: z.string().max(30).optional(),
  department: z.string().max(100).optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'student') {
    if (!data.roll_no) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['roll_no'], message: 'Roll number is required for students' });
    }
    if (!data.department) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['department'], message: 'Department is required for students' });
    }
    if (!data.semester) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['semester'], message: 'Semester is required for students' });
    }
  }
  if (data.role === 'hod' && !data.department) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['department'], message: 'Department is required for HOD accounts' });
  }
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .toLowerCase(),

  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token is required' }).min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
}).refine(data => data.currentPassword !== data.newPassword, {
  message: 'New password must differ from current password',
  path: ['newPassword'],
});
