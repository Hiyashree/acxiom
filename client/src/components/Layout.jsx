import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3, Briefcase, CalendarClock, ClipboardList, LayoutDashboard, LogOut, Menu,
  ShieldCheck, Target, UserCog, Users
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { Avatar } from './ui.jsx';

// Sidebar menu. "roles" limits a link to some roles; without it everyone sees it.
const NAV = [
  {
    section: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }]
  },
  {
    section: 'Sales',
    items: [
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/leads', label: 'Leads', icon: Target },
      { to: '/opportunities', label: 'Opportunities', icon: Briefcase },
      { to: '/follow-ups', label: 'Follow-ups', icon: CalendarClock },
      { to: '/activities', label: 'Activities', icon: ClipboardList }
    ]
  },
  {
    section: 'Management',
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['Admin', 'Manager'] },
      { to: '/users', label: 'Users & roles', icon: UserCog, roles: ['Admin'] },
      { to: '/audit-log', label: 'Audit log', icon: ShieldCheck, roles: ['Admin'] }
    ]
  }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const sections = NAV
    .map(s => ({ ...s, items: s.items.filter(i => !i.roles || i.roles.includes(user.role)) }))
    .filter(s => s.items.length > 0);
  const currentPage = NAV.flatMap(s => s.items).find(i => i.to === location.pathname);
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="min-h-screen lg:pl-64">
      {menuOpen && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setMenuOpen(false)} />}

      <aside className={`no-print fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-plum-950 text-plum-200 transition-transform
        lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center gap-2.5 px-6">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-extrabold tracking-tight text-white">Acxiom<span className="text-rose-400">CRM</span></span>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {sections.map(section => (
            <div key={section.section}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-plum-400">{section.section}</p>
              <div className="space-y-0.5">
                {section.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) => `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition
                      ${isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute -left-3 top-1.5 bottom-1.5 w-1 rounded-r bg-rose-500" />}
                        <Icon size={18} className={isActive ? 'text-rose-400' : 'text-plum-400 group-hover:text-plum-200'} />
                        {label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="truncate text-xs text-plum-400">{user.role}</p>
            </div>
            <button onClick={logout} title="Log out" className="rounded-md p-1.5 text-plum-400 transition hover:bg-white/10 hover:text-white">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur sm:px-8">
        <button onClick={() => setMenuOpen(true)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{currentPage ? currentPage.label : 'AcxiomCRM'}</p>
          <p className="hidden text-xs text-slate-400 sm:block">{today}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-right sm:block">
            <span className="block text-sm font-semibold text-slate-800">{user.name}</span>
            <span className="block text-xs text-slate-400">{user.email}</span>
          </span>
          <Avatar name={user.name} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
