import CrudPage from '../components/CrudPage.jsx';
import { Badge, formatDate, todayStr } from '../components/ui.jsx';

const STATUSES = ['Planned', 'Completed', 'Missed', 'Cancelled'];

const fields = [
  { name: 'subject', label: 'Subject', required: true, maxLength: 100 },
  { name: 'customer', label: 'Customer', type: 'select', options: 'customers', required: true },
  { name: 'type', label: 'Type', type: 'select', options: ['Call', 'Meeting', 'Email'] },
  { name: 'date', label: 'Date', type: 'date', required: true, minToday: true },
  { name: 'status', label: 'Status', type: 'select', options: STATUSES },
  { name: 'remarks', label: 'Remarks', type: 'textarea', maxLength: 500, wide: true }
];

const isOverdue = f => f.status === 'Planned' && f.date.slice(0, 10) < todayStr();

const columns = [
  { label: 'Subject', render: f => <span className="font-semibold text-slate-800">{f.subject}</span> },
  { label: 'Customer', render: f => (f.customer ? f.customer.name : <span className="text-slate-400">(deleted)</span>) },
  { label: 'Type', key: 'type' },
  {
    label: 'Date',
    render: f => (
      <span className="whitespace-nowrap">
        {formatDate(f.date)}
        {isOverdue(f) && <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-600">Overdue</span>}
      </span>
    )
  },
  { label: 'Status', render: f => <Badge value={f.status} /> },
  { label: 'Remarks', render: f => <span className="line-clamp-2 max-w-xs text-slate-500">{f.remarks || '—'}</span> }
];

export default function FollowUps() {
  return (
    <CrudPage
      title="Follow-ups"
      subtitle="Calls, meetings and emails you have planned with customers."
      endpoint="/api/followups"
      singular="Follow-up"
      fields={fields}
      columns={columns}
      filter={{ name: 'status', label: 'statuses', options: STATUSES }}
    />
  );
}
