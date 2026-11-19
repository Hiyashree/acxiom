import { useEffect, useState } from 'react';
import { AlarmClock, CircleDollarSign, Printer, TrendingUp } from 'lucide-react';
import { api } from '../api.js';
import { Badge, Button, formatDateTime, money, PageHeader, StatCard, useToast } from '../components/ui.jsx';

// Small table card used for each report.
function ReportTable({ title, headers, rows }) {
  return (
    <div className="card overflow-hidden">
      <h3 className="border-b border-slate-100 px-5 py-3.5 font-semibold text-slate-800">{title}</h3>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {headers.map(h => <th key={h} className="px-5 py-2.5">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j} className="px-5 py-2.5">{cell}</td>)}</tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={headers.length} className="px-5 py-6 text-center text-slate-400">No data yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function Reports() {
  const toast = useToast();
  const [r, setReport] = useState(null);

  useEffect(() => {
    api('/api/reports').then(setReport).catch(err => toast.error(err.message));
  }, [toast]);

  if (!r) return <p className="py-20 text-center text-sm text-slate-400">Loading reports…</p>;

  const conversionRate = r.totalLeads ? Math.round((r.convertedLeads / r.totalLeads) * 100) : 0;
  const weightedPipeline = r.opportunitiesByStage
    .filter(s => s._id !== 'Won' && s._id !== 'Lost')
    .reduce((sum, s) => sum + s.weighted, 0);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Leads, pipeline, follow-ups and team activity at a glance.">
        <Button variant="secondary" className="no-print" onClick={() => window.print()}>
          <Printer size={16} /> Print / save as PDF
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={TrendingUp} tone="emerald" label="Lead conversion rate" value={`${conversionRate}%`}
          hint={`${r.convertedLeads} of ${r.totalLeads} leads converted`} />
        <StatCard icon={CircleDollarSign} tone="rose" label="Weighted open pipeline" value={money(weightedPipeline)}
          hint="Amount × probability" />
        <StatCard icon={AlarmClock} tone="amber" label="Overdue follow-ups" value={r.overdueFollowUps}
          hint="Planned, date has passed" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportTable
          title="Pipeline by stage"
          headers={['Stage', 'Deals', 'Amount', 'Weighted']}
          rows={r.opportunitiesByStage.map(s => [<Badge key="b" value={s._id} />, s.count, money(s.amount), money(s.weighted)])}
        />
        <ReportTable
          title="Leads by status"
          headers={['Status', 'Leads', 'Expected value']}
          rows={r.leadsByStatus.map(s => [<Badge key="b" value={s._id} />, s.count, money(s.value)])}
        />
        <ReportTable
          title="Leads by source"
          headers={['Source', 'Leads']}
          rows={r.leadsBySource.map(s => [s._id, s.count])}
        />
        <ReportTable
          title="Follow-ups by status"
          headers={['Status', 'Follow-ups']}
          rows={r.followUpsByStatus.map(s => [<Badge key="b" value={s._id} />, s.count])}
        />
        <ReportTable
          title="Activities by type"
          headers={['Type', 'Activities']}
          rows={r.activitiesByType.map(s => [s._id, s.count])}
        />
        <ReportTable
          title="User activity"
          headers={['User', 'Actions', 'Last action']}
          rows={r.userActivity.map(u => [u._id, u.count, formatDateTime(u.lastAction)])}
        />
      </div>
    </div>
  );
}
