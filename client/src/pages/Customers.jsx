import CrudPage from '../components/CrudPage.jsx';
import { Badge, Code, formatDate, PersonCell } from '../components/ui.jsx';

const fields = [
  { name: 'name', label: 'Full name', required: true, maxLength: 100 },
  { name: 'company', label: 'Company', maxLength: 100 },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'name@company.com' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, pattern: '\\d{10}', title: 'Enter a 10-digit phone number', placeholder: '10-digit mobile number' },
  { name: 'address', label: 'Address', maxLength: 200, wide: true },
  { name: 'city', label: 'City', maxLength: 50 },
  { name: 'state', label: 'State', maxLength: 50 },
  { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
];

const columns = [
  { label: 'Code', render: c => <Code value={c.code} /> },
  { label: 'Customer', render: c => <PersonCell name={c.name} sub={c.company} /> },
  { label: 'Contact', render: c => <div><p>{c.email}</p><p className="text-xs text-slate-500">{c.phone}</p></div> },
  { label: 'Location', render: c => [c.city, c.state].filter(Boolean).join(', ') || '—' },
  { label: 'Status', render: c => <Badge value={c.status} /> },
  { label: 'Added', render: c => <span className="whitespace-nowrap text-slate-500">{formatDate(c.createdAt, false)}</span> }
];

export default function Customers() {
  return (
    <CrudPage
      title="Customers"
      subtitle="Everyone you do business with, in one place."
      endpoint="/api/customers"
      singular="Customer"
      fields={fields}
      columns={columns}
      filter={{ name: 'status', label: 'statuses', options: ['Active', 'Inactive'] }}
    />
  );
}
