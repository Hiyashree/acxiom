import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  ArrowRight, Briefcase, CalendarClock, CircleDollarSign, Target, Trophy, UserPlus, Users, XCircle
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { formatDate, money, StatCard, todayStr, useToast } from '../components/ui.jsx';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);
ChartJS.defaults.font.family = '"Plus Jakarta Sans", system-ui, sans-serif';
ChartJS.defaults.color = '#64748b';

const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'];
const LEAD_COLORS = ['#38bdf8', '#a78bfa', '#fbbf24', '#cbd5e1', '#34d399', '#fb7185'];
const STAGES = ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];
const STAGE_COLORS = ['#38bdf8', '#a78bfa', '#fbbf24', '#34d399', '#fb7185'];

// Value for each label, or 0 when the server has no data for it.
const valuesFor = (labels, rows, field) => labels.map(l => (rows.find(r => r._id === l) || {})[field] || 0);

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// The last 6 months as YYYY-MM, oldest first.
function lastSixMonths() {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(d.toLocaleDateString('en-CA').slice(0, 7));
  }
  return months;
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <h3 className="mb-4 font-semibold text-slate-800">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    api('/api/stats').then(setStats).catch(err => toast.error(err.message));
    api('/api/followups')
      .then(list => setUpcoming(list
        .filter(f => f.status === 'Planned')
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5)))
      .catch(() => {});
  }, [toast]);

  const s = stats || {};
  const show = v => (stats ? v : '—');
  const months = lastSixMonths();
  const noLegend = { maintainAspectRatio: false, plugins: { legend: { display: false } } };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{greeting()}, {user.name.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-slate-500">Here's what's happening with your sales today.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/leads" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Target size={16} /> Leads
          </Link>
          <Link to="/customers" className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700">
            <UserPlus size={16} /> Add customer
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} tone="plum" label="Total customers" value={show(s.customers)} to="/customers" />
        <StatCard icon={Target} tone="sky" label="Total leads" value={show(s.leads)} hint={stats && `${s.openLeads} still open`} to="/leads" />
        <StatCard icon={Briefcase} tone="violet" label="Open opportunities" value={show(s.openOpportunities)} to="/opportunities" />
        <StatCard icon={CircleDollarSign} tone="rose" label="Pipeline value" value={show(money(s.pipelineValue))} hint="Open opportunities" to="/opportunities" />
        <StatCard icon={Trophy} tone="emerald" label="Won deals" value={show(s.won)} to="/opportunities" />
        <StatCard icon={XCircle} tone="slate" label="Lost deals" value={show(s.lost)} to="/opportunities" />
        <StatCard icon={Target} tone="amber" label="Open leads" value={show(s.openLeads)} hint="Not converted or lost" to="/leads" />
        <StatCard icon={CalendarClock} tone="violet" label="Pending follow-ups" value={show(s.pendingFollowUps)} to="/follow-ups" />
      </div>

      {stats && (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <ChartCard title="Leads by status">
            <Doughnut
              data={{ labels: LEAD_STATUSES, datasets: [{ data: valuesFor(LEAD_STATUSES, s.leadStatus, 'count'), backgroundColor: LEAD_COLORS, borderWidth: 0 }] }}
              options={{ maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } } } }}
            />
          </ChartCard>

          <ChartCard title="Pipeline by stage (₹)" className="lg:col-span-2">
            <Bar
              data={{ labels: STAGES, datasets: [{ data: valuesFor(STAGES, s.pipelineByStage, 'amount'), backgroundColor: STAGE_COLORS, borderRadius: 8, maxBarThickness: 48 }] }}
              options={{ ...noLegend, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f5f9' } } } }}
            />
          </ChartCard>

          <ChartCard title="Won sales, last 6 months (₹)" className="lg:col-span-2">
            <Line
              data={{
                labels: months.map(m => new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short' })),
                datasets: [{
                  data: valuesFor(months, s.monthlySales, 'amount'),
                  borderColor: '#e11d48',
                  backgroundColor: 'rgba(225, 29, 72, 0.08)',
                  pointBackgroundColor: '#e11d48',
                  fill: true,
                  tension: 0.35
                }]
              }}
              options={{ ...noLegend, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f5f9' }, beginAtZero: true } } }}
            />
          </ChartCard>

          <div className="card flex flex-col p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Upcoming follow-ups</h3>
              <Link to="/follow-ups" className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {upcoming.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Nothing planned. Enjoy the quiet!</p>}
            <ul className="space-y-3">
              {upcoming.map(f => {
                const overdue = f.date.slice(0, 10) < todayStr();
                return (
                  <li key={f._id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                    <div className={`rounded-lg px-2 py-1 text-center text-xs font-bold ${overdue ? 'bg-red-50 text-red-600' : 'bg-plum-50 text-plum-700'}`}>
                      {formatDate(f.date).split(' ').slice(0, 2).join(' ')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{f.subject}</p>
                      <p className="truncate text-xs text-slate-500">{f.customer ? f.customer.name : '—'} · {f.type}</p>
                    </div>
                    {overdue && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-600">Overdue</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
