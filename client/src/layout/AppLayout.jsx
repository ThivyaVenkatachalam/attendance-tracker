import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard, Users, ClipboardList,
  FileText, LogOut, Menu, Upload, CalendarDays, Clock,
} from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = {
  admin: [
    { to: '/admin/dashboard',  label: 'Dashboard',      icon: LayoutDashboard },
    { to: '/admin/students',   label: 'Students',        icon: Users           },
    { to: '/admin/leave',      label: 'Leave Requests',  icon: FileText        },
    { to: '/admin/sessions',   label: 'Sessions',        icon: ClipboardList   },
    { to: '/admin/timetable',  label: 'Timetable',       icon: Clock           },
    { to: '/admin/calendar',   label: 'Calendar',        icon: CalendarDays    },
  ],
  hod: [
    { to: '/hod/dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
    { to: '/hod/leave',        label: 'Leave Approvals', icon: FileText        },
    { to: '/hod/timetable',    label: 'Timetable',       icon: Clock           },
    { to: '/hod/calendar',     label: 'Calendar',        icon: CalendarDays    },
  ],
  faculty: [
    { to: '/faculty/dashboard',label: 'Dashboard',       icon: LayoutDashboard },
    { to: '/faculty/sessions', label: 'My Sessions',     icon: ClipboardList   },
    { to: '/faculty/leave',    label: 'Leave Reviews',   icon: FileText        },
    { to: '/faculty/timetable',label: 'Timetable',       icon: Clock           },
    { to: '/faculty/calendar', label: 'Calendar',        icon: CalendarDays    },
    { to: '/faculty/import',   label: 'Import CSV',      icon: Upload          },
  ],
  student: [
    { to: '/student/dashboard',label: 'Dashboard',       icon: LayoutDashboard },
    { to: '/student/attendance',label: 'My Attendance',  icon: ClipboardList   },
    { to: '/student/leave',    label: 'Leave',           icon: FileText        },
    { to: '/student/timetable',label: 'Timetable',       icon: Clock           },
    { to: '/student/calendar', label: 'Calendar',        icon: CalendarDays    },
  ],
  parent: [
    { to: '/parent/dashboard', label: 'Dashboard',       icon: LayoutDashboard },
    { to: '/parent/timetable', label: 'Timetable',       icon: Clock           },
    { to: '/parent/calendar',  label: 'Calendar',        icon: CalendarDays    },
  ],
};

function Sidebar({ open, onClose }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const links = NAV_LINKS[user?.role] ?? [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleColors = {
    admin:   'bg-primary text-white',
    hod:     'bg-primary text-white',
    faculty: 'bg-success text-white',
    student: 'bg-warning text-white',
    parent:  'bg-neutral-700 text-white',
  };

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-neutral-200
        z-30 flex flex-col transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-neutral-200">
          <h1 className="text-lg font-bold text-neutral-900">📋 AttendEase</h1>
          <p className="text-xs text-neutral-400 mt-0.5">Attendance Management</p>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${roleColors[user?.role]}`}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">{user?.name}</p>
              <p className="text-xs text-neutral-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                font-medium transition-colors mb-0.5
                ${isActive
                  ? 'bg-primary-light text-primary'
                  : 'text-neutral-600 hover:bg-neutral-100'
                }
              `}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-neutral-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                       font-medium text-neutral-600 hover:bg-danger-light hover:text-danger
                       transition-colors w-full"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

export function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={22} className="text-neutral-600" />
          </button>
          <h1 className="font-semibold text-neutral-900">AttendEase</h1>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
