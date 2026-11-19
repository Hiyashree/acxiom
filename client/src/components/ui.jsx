import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Inbox, X } from 'lucide-react';

// ---------- Formatting helpers ----------
export const todayStr = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

export function money(n) {
  return n == null || n === '' ? '—' : '₹' + Math.round(Number(n)).toLocaleString('en-IN');
}

// Dates picked in a date input are stored as UTC midnight, so they are shown in UTC.
// Timestamps such as createdAt are shown in local time (utc = false).
export function formatDate(d, utc = true) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', ...(utc ? { timeZone: 'UTC' } : {})
  });
}

export function formatDateTime(d) {
  return d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

// ---------- Small components ----------
const buttonStyles = {
  primary: 'bg-rose-600 text-white shadow-sm shadow-rose-600/20 hover:bg-rose-700',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700'
};

export function Button({ variant = 'primary', type = 'button', className = '', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition
        disabled:cursor-not-allowed disabled:opacity-50 ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  );
}

export function IconButton({ danger, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`rounded-md p-1.5 transition ${danger
        ? 'text-slate-400 hover:bg-red-50 hover:text-red-600'
        : 'text-slate-400 hover:bg-plum-50 hover:text-plum-700'} ${className}`}
      {...props}
    />
  );
}

const badgeColors = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Inactive: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  New: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  Contacted: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  Qualified: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Unqualified: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Converted: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Lost: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  Qualification: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  Proposal: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  Negotiation: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Won: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Planned: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Missed: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  Cancelled: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Open: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  Locked: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  Admin: 'bg-plum-50 text-plum-700 ring-plum-600/20',
  Manager: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  'Sales Executive': 'bg-amber-50 text-amber-700 ring-amber-600/20'
};

export function Badge({ value }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset
      ${badgeColors[value] || 'bg-slate-100 text-slate-600 ring-slate-500/20'}`}>
      {value}
    </span>
  );
}

const avatarColors = [
  'bg-rose-100 text-rose-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-800',
  'bg-emerald-100 text-emerald-700', 'bg-sky-100 text-sky-700', 'bg-fuchsia-100 text-fuchsia-700'
];

export function Avatar({ name = '?', size = 'md' }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const color = avatarColors[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % avatarColors.length];
  const sizes = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-11 w-11 text-sm' };
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${sizes[size]} ${color}`}>
      {initials}
    </span>
  );
}

// Name with avatar and a small second line, used in tables.
export function PersonCell({ name, sub }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} />
      <div className="min-w-0">
        <p className="whitespace-nowrap font-semibold text-slate-800">{name}</p>
        {sub && <p className="truncate text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

export function Code({ value }) {
  return value
    ? <span className="whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">{value}</span>
    : <span className="text-slate-300">—</span>;
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ title, text }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 rounded-full bg-plum-50 p-3 text-plum-500"><Inbox size={22} /></div>
      <p className="font-semibold text-slate-700">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
    </div>
  );
}

const tones = {
  rose: 'bg-rose-50 text-rose-600',
  plum: 'bg-plum-100 text-plum-700',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  sky: 'bg-sky-50 text-sky-600',
  slate: 'bg-slate-100 text-slate-500',
  violet: 'bg-violet-50 text-violet-600'
};

export function StatCard({ icon: Icon, label, value, hint, tone = 'plum', to }) {
  const body = (
    <div className="card flex h-full items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`rounded-xl p-2.5 ${tones[tone]}`}><Icon size={20} /></div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export function Modal({ open, title, subtitle, onClose, children, width = 'max-w-2xl' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-[8vh] backdrop-blur-[2px]"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className={`w-full ${width} animate-pop rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          <IconButton onClick={onClose} aria-label="Close"><X size={18} /></IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalFooter({ children }) {
  return (
    <div className="flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/70 px-6 py-4">
      {children}
    </div>
  );
}

// ---------- Toast notifications ----------
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((type, text) => {
    const id = Date.now() + Math.random();
    setToasts(list => [...list, { id, type, text }]);
    setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), 3500);
  }, []);

  const value = useMemo(() => ({
    success: text => push('success', text),
    error: text => push('error', text)
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className="flex animate-slide items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-sm shadow-lg">
            {t.type === 'success'
              ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" />
              : <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />}
            <p className="text-slate-700">{t.text}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
