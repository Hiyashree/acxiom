import CrudPage from '../components/CrudPage.jsx';
import { Badge, formatDate, money } from '../components/ui.jsx';

const STAGES = ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];

const fields = [
  { name: 'name', label: 'Opportunity name', required: true, maxLength: 100 },
  { name: 'customer', label: 'Customer', type: 'select', options: 'customers', required: true },
  { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, min: 1, step: 'any' },
  { name: 'probability', label: 'Probability (%)', type: 'number', required: true, min: 0, max: 100 },
  { name: 'stage', label: 'Stage', type: 'select', options: STAGES },
  { name: 'expectedCloseDate', label: 'Expected close date', type: 'date', required: true, minToday: true }
];

// Shows how likely the deal is as a small progress bar.
function Probability({ value }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-rose-500" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-slate-500">{value}%</span>
    </div>
  );
}

const columns = [
  { label: 'Opportunity', render: o => <span className="font-semibold text-slate-800">{o.name}</span> },
  { label: 'Customer', render: o => (o.customer ? o.customer.name : <span className="text-slate-400">(deleted)</span>) },
  { label: 'Amount', render: o => <span className="font-semibold text-slate-800">{money(o.amount)}</span> },
  { label: 'Probability', render: o => <Probability value={o.probability} /> },
  { label: 'Weighted', render: o => money(o.amount * o.probability / 100) },
  { label: 'Stage', render: o => <Badge value={o.stage} /> },
  { label: 'Close date', render: o => <span className="whitespace-nowrap">{formatDate(o.expectedCloseDate)}</span> }
];

export default function Opportunities() {
  return (
    <CrudPage
      title="Opportunities"
      subtitle="Your sales pipeline. Weighted value = amount × probability."
      endpoint="/api/opportunities"
      singular="Opportunity"
      fields={fields}
      columns={columns}
      filter={{ name: 'stage', label: 'stages', options: STAGES }}
    />
  );
}
