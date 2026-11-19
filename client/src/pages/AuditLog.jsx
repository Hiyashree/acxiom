import CrudPage from '../components/CrudPage.jsx';
import { formatDateTime } from '../components/ui.jsx';

const ACTIONS = ['Login', 'Login Failed', 'Account Locked', 'Logout', 'Register', 'Create', 'Update', 'Delete', 'Role Change', 'Convert'];

const actionColors = {
  Create: 'text-emerald-600', Update: 'text-sky-600', Delete: 'text-red-600', Convert: 'text-emerald-600',
  'Login Failed': 'text-red-600', 'Account Locked': 'text-red-700', 'Role Change': 'text-plum-600'
};

const columns = [
  { label: 'When', render: a => <span className="whitespace-nowrap text-slate-500">{formatDateTime(a.createdAt)}</span> },
  { label: 'User', render: a => <div><p className="font-medium text-slate-800">{a.userName}</p><p className="text-xs text-slate-500">{a.userEmail}</p></div> },
  { label: 'Action', render: a => <span className={`whitespace-nowrap font-semibold ${actionColors[a.action] || 'text-slate-700'}`}>{a.action}</span> },
  { label: 'Module', key: 'entity' },
  { label: 'Details', render: a => <span className="text-slate-600">{a.details || '—'}</span> },
  { label: 'IP', render: a => <span className="font-mono text-xs text-slate-400">{a.ip}</span> }
];

export default function AuditLog() {
  return (
    <CrudPage
      title="Audit log"
      subtitle="Read-only record of sign-ins and every change made in the system."
      endpoint="/api/audit"
      singular="Entry"
      columns={columns}
      filter={{ name: 'action', label: 'actions', options: ACTIONS }}
      readOnly
    />
  );
}
