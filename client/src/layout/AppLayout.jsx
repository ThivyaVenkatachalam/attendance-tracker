import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard, Users, ClipboardList,
  FileText, LogOut, Menu, Upload, CalendarDays, Clock, Moon, Sun, Bell, X,
  AlertTriangle, CheckCircle, Info,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';

const NAV_LINKS = {
  admin: [
    { to: '/admin/dashboard',  label: 'Dashboard',      icon: LayoutDashboard },
    { to: '/admin/students',   label: 'Students',        icon: Users           },
    { to: '/admin/leave',      label: 'Leave Requests',  icon: FileText        },
    { to: '/admin/sessions',   label: 'Sessions',        icon: ClipboardList   },
    { to: '/admin/timetable',  label: 'Timetable',       icon: Clock           },
  ],
  hod: [
    { to: '/hod/dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
    { to: '/hod/leave',        label: 'Leave Approvals', icon: FileText        },
    { to: '/hod/timetable',    label: 'Timetable',       icon: Clock           },
  ],
  faculty: [
    { to: '/faculty/dashboard', label: 'Dashboard',      icon: LayoutDashboard },
    { to: '/faculty/sessions',  label: 'My Sessions',    icon: ClipboardList   },
    { to: '/faculty/leave',     label: 'Leave Reviews',  icon: FileText        },
    { to: '/faculty/timetable', label: 'Timetable',      icon: Clock           },
    { to: '/faculty/import',    label: 'Import CSV',     icon: Upload          },
  ],
  student: [
    { to: '/student/dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
    { to: '/student/attendance', label: 'My Attendance', icon: ClipboardList   },
    { to: '/student/leave',      label: 'Leave',         icon: FileText        },
    { to: '/student/timetable',  label: 'Timetable',     icon: Clock           },
  ],
  parent: [
    { to: '/parent/dashboard',  label: 'Dashboard',      icon: LayoutDashboard },
    { to: '/parent/timetable',  label: 'Timetable',      icon: Clock           },
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
    if (dark) { root.classList.add('dark'); }
    else { root.classList.remove('dark'); }
    localStorage.setItem('attendease-dark-mode', String(dark));
  }, [dark]);

  return [dark, setDark];
}

// ── Notifications hook ────────────────────────────────────────
function useNotifications(user) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;

    // Generate role-specific notifications
    const now = new Date();
    const roleNotifications = {
      admin: [
        { id: 1, type: 'warning', message: '3 students below 75% attendance this week', time: new Date(now - 1000 * 60 * 30) },
        { id: 2, type: 'info',    message: '2 pending leave requests awaiting approval', time: new Date(now - 1000 * 60 * 90) },
        { id: 3, type: 'success', message: 'CSV import completed: 54 records added',     time: new Date(now - 1000 * 60 * 180) },
      ],
      faculty: [
        { id: 1, type: 'warning', message: "Today's attendance not yet marked for Data Structures", time: new Date(now - 1000 * 60 * 20) },
        { id: 2, type: 'info',    message: '1 new leave request submitted by a student',            time: new Date(now - 1000 * 60 * 60) },
        { id: 3, type: 'success', message: 'Attendance saved successfully for Session #8',          time: new Date(now - 1000 * 60 * 240) },
      ],
      hod: [
        { id: 1, type: 'warning', message: '5 students at risk — attendance below 65%', time: new Date(now - 1000 * 60 * 45) },
        { id: 2, type: 'info',    message: '3 leave requests pending your approval',     time: new Date(now - 1000 * 60 * 120) },
      ],
      student: [
        { id: 1, type: 'warning', message: 'Your attendance dropped below 75% in DBMS', time: new Date(now - 1000 * 60 * 60) },
        { id: 2, type: 'success', message: 'Leave request approved for 10–12 Jun',       time: new Date(now - 1000 * 60 * 300) },
        { id: 3, type: 'info',    message: 'New session added: Data Structures today',   time: new Date(now - 1000 * 60 * 480) },
      ],
      parent: [
        { id: 1, type: 'warning', message: "Your child's attendance is 68% — below required 75%", time: new Date(now - 1000 * 60 * 90) },
        { id: 2, type: 'info',    message: 'Leave request submitted on behalf of your child',      time: new Date(now - 1000 * 60 * 200) },
      ],
    };

    const stored = localStorage.getItem(`attendease-notifications-read-${user.id}`);
    const readIds = stored ? JSON.parse(stored) : [];
    const base = roleNotifications[user.role] ?? [];
    setNotifications(base.map(n => ({ ...n, read: readIds.includes(n.id) })));
  }, [user]);

  const markAllRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      const ids = updated.map(n => n.id);
      localStorage.setItem(`attendease-notifications-read-${user.id}`, JSON.stringify(ids));
      return updated;
    });
  };

  const dismiss = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  return { notifications, unreadCount, markAllRead, dismiss };
}

function timeAgo(date) {
  const diff = Math.floor((new Date() - date) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return format(date, 'dd MMM');
}

// ── Notification Bell ─────────────────────────────────────────
function NotificationBell({ user }) {
  const { notifications, unreadCount, markAllRead, dismiss } = useNotifications(user);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const iconMap = {
    warning: <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />,
    success: <CheckCircle   size={14} className="text-success shrink-0 mt-0.5" />,
    info:    <Info          size={14} className="text-primary shrink-0 mt-0.5" />,
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(v => !v); if (!open) markAllRead(); }}
        className="relative p-2 rounded-lg text-neutral-500 dark:text-neutral-400
                   hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-danger text-white
                           text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white dark:bg-neutral-900
                        border border-neutral-200 dark:border-neutral-700 rounded-xl
                        shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3
                          border-b border-neutral-100 dark:border-neutral-800">
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">Notifications</p>
            {notifications.length > 0 && (
              <button onClick={markAllRead}
                className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-neutral-50 dark:divide-neutral-800">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-neutral-400">
                No notifications
              </div>
            ) : notifications.map(n => (
              <div key={n.id}
                className={`flex gap-3 px-4 py-3 transition-colors
                  ${!n.read ? 'bg-primary-light/40 dark:bg-primary/10' : ''}
                  hover:bg-neutral-50 dark:hover:bg-neutral-800`}
              >
                {iconMap[n.type]}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-700 dark:text-neutral-200 leading-snug">
                    {n.message}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">{timeAgo(n.time)}</p>
                </div>
                <button onClick={() => dismiss(n.id)}
                  className="text-neutral-300 hover:text-neutral-500 dark:hover:text-neutral-300 shrink-0">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ open, onClose, dark, onToggleDark, user }) {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const links = NAV_LINKS[user?.role] ?? [];

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const roleColors = {
    admin:   'bg-primary text-white',
    hod:     'bg-primary text-white',
    faculty: 'bg-success text-white',
    student: 'bg-warning text-white',
    parent:  'bg-neutral-700 text-white',
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={onClose} />}

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
            <NavLink key={to} to={to} onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5
                ${isActive
                  ? 'bg-primary-light text-primary dark:bg-primary/20 dark:text-primary'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }
              `}
            >
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>

        {/* Dark mode + Logout */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-700 space-y-1">
          <button onClick={() => onToggleDark(!dark)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                       text-neutral-600 dark:text-neutral-300
                       hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors w-full"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            {dark ? 'Light Mode' : 'Dark Mode'}
            <span className="ml-auto">
              <span className={`inline-flex h-5 w-9 rounded-full transition-colors duration-200 relative ${dark ? 'bg-primary' : 'bg-neutral-300'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${dark ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </span>
            </span>
          </button>

          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                       text-neutral-600 dark:text-neutral-300
                       hover:bg-danger-light hover:text-danger dark:hover:bg-red-900/30 dark:hover:text-red-400
                       transition-colors w-full"
          >
            <LogOut size={18} />Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

// ── AppLayout ─────────────────────────────────────────────────
export function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useDarkMode();
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} dark={dark} onToggleDark={setDark} user={user} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top header — desktop + mobile */}
        <header className="sticky top-0 z-10 bg-white dark:bg-neutral-900
                           border-b border-neutral-200 dark:border-neutral-700
                           px-4 py-3 flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu size={22} className="text-neutral-600 dark:text-neutral-300" />
          </button>
          <h1 className="font-semibold text-neutral-900 dark:text-white lg:hidden">AttendEase</h1>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Notification bell + dark mode toggle — always visible in header */}
          <NotificationBell user={user} />
          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400
                       hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
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
