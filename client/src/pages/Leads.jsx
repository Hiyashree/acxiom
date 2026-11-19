import { UserCheck } from 'lucide-react';
import { api } from '../api.js';
import CrudPage from '../components/CrudPage.jsx';
import { Badge, Code, money, PersonCell } from '../components/ui.jsx';

const STATUSES = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'];

const fields = [
  { name: 'name', label: 'Lead name', required: true, maxLength: 100 },
  { name: 'company', label: 'Company', maxLength: 100 },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'name@company.com' },
  { name: 'phone', label: 'Phone', type: 'tel', pattern: '\\d{10}', title: 'Enter a 10-digit phone number', placeholder: '10-digit mobile number' },
  { name: 'source', label: 'Source', type: 'select', options: ['Website', 'Referral', 'Social Media', 'Email', 'Other'] },
  { name: 'status', label: 'Status', type: 'select', required: true, options: STATUSES },
  { name: 'expectedValue', label: 'Expected value (₹)', type: 'number', min: 0, max: 10000000 }
];

const columns = [
  { label: 'Code', render: l => <Code value={l.code} /> },
  { label: 'Lead', render: l => <PersonCell name={l.name} sub={l.company} /> },
  { label: 'Contact', render: l => <div><p>{l.email || '—'}</p><p className="text-xs text-slate-500">{l.phone}</p></div> },
  { label: 'Source', key: 'source' },
  { label: 'Status', render: l => <Badge value={l.status} /> },
  { label: 'Expected value', render: l => <span className="font-semibold text-slate-800">{money(l.expectedValue)}</span> }
];

// Qualified leads get a "Convert" button that creates a customer from the lead.
function rowActions(lead, { reload, toast }) {
  if (lead.status !== 'Qualified') return null;
  async function convert() {
    try {
      const customer = await api(`/api/leads/${lead._id}/convert`, { method: 'POST' });
      toast.success(`${lead.name} is now customer ${customer.code}.`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }
  return (
    <button
      onClick={convert}
      className="mr-1 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
    >
      <UserCheck size={14} /> Convert
    </button>
  );
}

export default function Leads() {
  return (
    <CrudPage
      title="Leads"
      subtitle="Potential customers. Qualify them, then convert them into customers."
      endpoint="/api/leads"
      singular="Lead"
      fields={fields}
      columns={columns}
      filter={{ name: 'status', label: 'statuses', options: STATUSES }}
      rowActions={rowActions}
    />
  );
}
