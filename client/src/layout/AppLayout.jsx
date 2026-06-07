import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard, Users, ClipboardList,
  FileText, LogOut, Menu, Upload, CalendarDays, Clock, Moon, Sun,
} from 'lucide-react';
import { useState, useEffect } from 'react';

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

// ── Dark mode hook ────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('attendease-dark-mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('attendease-dark-mode', String(dark));
  }, [dark]);

  return [dark, setDark];
}

function Sidebar({ open, onClose, dark, onToggleDark }) {
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
        fixed top-0 left-0 h-full w-64
        bg-white dark:bg-neutral-900
        border-r border-neutral-200 dark:border-neutral-700
        z-30 flex flex-col transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-700">
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white">📋 AttendEase</h1>
          <p className="text-xs text-neutral-400 mt-0.5">Attendance Management</p>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${roleColors[user?.role]}`}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{user?.name}</p>
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
                  ? 'bg-primary-light text-primary dark:bg-primary/20 dark:text-primary'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }
              `}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Dark mode toggle + Logout */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-700 space-y-1">
          {/* Dark mode toggle */}
          <button
            onClick={() => onToggleDark(!dark)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                       font-medium text-neutral-600 dark:text-neutral-300
                       hover:bg-neutral-100 dark:hover:bg-neutral-800
                       transition-colors w-full"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            {dark ? 'Light Mode' : 'Dark Mode'}
            {/* Toggle pill */}
            <span className="ml-auto">
              <span className={`
                inline-flex h-5 w-9 rounded-full transition-colors duration-200
                ${dark ? 'bg-primary' : 'bg-neutral-300'}
                relative
              `}>
                <span className={`
                  absolute top-0.5 h-4 w-4 rounded-full bg-white shadow
                  transition-transform duration-200
                  ${dark ? 'translate-x-4' : 'translate-x-0.5'}
                `} />
              </span>
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                       font-medium text-neutral-600 dark:text-neutral-300
                       hover:bg-danger-light hover:text-danger dark:hover:bg-red-900/30 dark:hover:text-red-400
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
  const [dark, setDark] = useDarkMode();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        dark={dark}
        onToggleDark={setDark}
      />

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={22} className="text-neutral-600 dark:text-neutral-300" />
          </button>
          <h1 className="font-semibold text-neutral-900 dark:text-white">AttendEase</h1>

          {/* Dark mode toggle on mobile header too */}
          <button
            onClick={() => setDark(!dark)}
            className="ml-auto p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
