import { BarChart3, CalendarClock, Target } from 'lucide-react';

const highlights = [
  { icon: Target, title: 'Track every lead', text: 'From first contact to converted customer.' },
  { icon: CalendarClock, title: 'Never miss a follow-up', text: 'See what is due today and what is overdue.' },
  { icon: BarChart3, title: 'Know your pipeline', text: 'Live numbers and charts for the whole team.' }
];

// Two-column layout used by the login and register pages.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen bg-white">
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-plum-950 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-plum-500/30 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-9 w-9" />
          <span className="text-xl font-extrabold tracking-tight">Acxiom<span className="text-rose-400">CRM</span></span>
        </div>

        <div className="relative">
          <h2 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">
            Close more deals,<br />with less chaos.
          </h2>
          <div className="mt-10 space-y-6">
            {highlights.map(({ icon: Icon, title: t, text }) => (
              <div key={t} className="flex gap-4">
                <div className="rounded-xl bg-white/10 p-2.5 text-rose-300"><Icon size={20} /></div>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-sm text-plum-300">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-plum-400">© {new Date().getFullYear()} AcxiomCRM</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm animate-pop">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <span className="text-lg font-extrabold text-slate-900">Acxiom<span className="text-rose-500">CRM</span></span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-sm text-slate-500">{footer}</p>
        </div>
      </div>
    </div>
  );
}
