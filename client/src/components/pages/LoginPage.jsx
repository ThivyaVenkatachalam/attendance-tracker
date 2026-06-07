import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Spinner } from '@/components/shared';

const ROLE_HOME = {
  admin: '/admin/dashboard',
  hod: '/hod/dashboard',
  faculty: '/faculty/dashboard',
  student: '/student/dashboard',
  parent: '/parent/dashboard',
};

export default function LoginPage() {
  const { login, loading, user } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  // Already logged in
  if (user) return null;

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const result = await login(form);
    if (result.success) {
      const from = location.state?.from?.pathname ?? ROLE_HOME[result.role];
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-white to-neutral-100
                    flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
                          bg-primary text-white text-2xl mb-4 shadow-lg">
            📋
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">AttendEase</h1>
          <p className="text-neutral-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="mb-4">
              <label className="label">Email address</label>
              <input
                type="email"
                className={`input ${errors.email ? 'border-danger focus:ring-danger' : ''}`}
                placeholder="you@college.edu"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
              {errors.email && <p className="text-xs text-danger mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="label">Password</label>
              <input
                type="password"
                className={`input ${errors.password ? 'border-danger focus:ring-danger' : ''}`}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
              />
              {errors.password && <p className="text-xs text-danger mt-1">{errors.password}</p>}
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-5 border-t border-neutral-100">
            <p className="text-xs text-neutral-400 text-center mb-3">Demo credentials</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { role: 'Admin',   email: 'admin@college.edu'        },
                { role: 'HOD',     email: 'hod.cs@college.edu'       },
                { role: 'Faculty', email: 'priya.sharma@college.edu' },
                { role: 'Student', email: 'arun.kumar@student.edu'   },
                { role: 'Parent',  email: 'parent.arun@example.com'  },
              ].map(({ role, email }) => (
                <button
                  key={role}
                  type="button"
                  className="text-left p-2 rounded-lg bg-neutral-50 hover:bg-primary-light
                             transition-colors border border-neutral-200"
                  onClick={() => setForm({ email, password: 'Test@1234' })}
                >
                  <p className="font-medium text-neutral-700">{role}</p>
                  <p className="text-neutral-400 truncate">{email.split('@')[0]}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
