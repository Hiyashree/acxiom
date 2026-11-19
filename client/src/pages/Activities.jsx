import { CheckSquare, Mail, Phone, Users } from 'lucide-react';
import CrudPage from '../components/CrudPage.jsx';
import { Badge, formatDate } from '../components/ui.jsx';

const TYPES = ['Call', 'Meeting', 'Email', 'Task'];
const typeIcons = { Call: Phone, Meeting: Users, Email: Mail, Task: CheckSquare };

const fields = [
  { name: 'type', label: 'Type', type: 'select', options: TYPES },
  { name: 'subject', label: 'Subject', required: true, maxLength: 100 },
  { name: 'customer', label: 'Customer', type: 'select', options: 'customers', required: true },
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'status', label: 'Status', type: 'select', options: ['Open', 'Completed'] },
  { name: 'description', label: 'Description', type: 'textarea', maxLength: 500, wide: true }
];

function TypeCell({ type }) {
  const Icon = typeIcons[type] || CheckSquare;
  return (
    <span className="inline-flex items-center gap-2 font-medium text-slate-700">
      <span className="rounded-lg bg-plum-50 p-1.5 text-plum-600"><Icon size={14} /></span>
      {type}
    </span>
  );
}

const columns = [
  { label: 'Type', render: a => <TypeCell type={a.type} /> },
  { label: 'Subject', render: a => <span className="font-semibold text-slate-800">{a.subject}</span> },
  { label: 'Customer', render: a => (a.customer ? a.customer.name : <span className="text-slate-400">(deleted)</span>) },
  { label: 'Date', render: a => <span className="whitespace-nowrap">{formatDate(a.date)}</span> },
  { label: 'Status', render: a => <Badge value={a.status} /> },
  { label: 'Description', render: a => <span className="line-clamp-2 max-w-xs text-slate-500">{a.description || '—'}</span> }
];

export default function Activities() {
  return (
    <CrudPage
      title="Activities"
      subtitle="A log of calls, meetings, emails and tasks with customers."
      endpoint="/api/activities"
      singular="Activity"
      fields={fields}
      columns={columns}
      filter={{ name: 'type', label: 'types', options: TYPES }}
    />
  );
}
