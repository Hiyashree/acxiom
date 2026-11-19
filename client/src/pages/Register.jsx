import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import AuthShell from '../components/AuthShell.jsx';
import { Button } from '../components/ui.jsx';

export default function Register() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const update = e => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    setBusy(true);
    setError('');
    try {
      await register({ name: form.name, email: form.email, password: form.password });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="The first account on a new system becomes the Admin."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-rose-600 hover:underline">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Full name</span>
          <input name="name" required maxLength={100} value={form.name} onChange={update} className="input py-2.5" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Work email</span>
          <input name="email" type="email" required autoComplete="username" value={form.email} onChange={update} className="input py-2.5" placeholder="you@company.com" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Password</span>
          <input
            name="password" type="password" required minLength={8} autoComplete="new-password"
            pattern="(?=.*[A-Za-z])(?=.*\d).{8,}" title="At least 8 characters with a letter and a number"
            value={form.password} onChange={update} className="input py-2.5"
          />
          <span className="mt-1 block text-xs text-slate-400">At least 8 characters, with a letter and a number.</span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Confirm password</span>
          <input name="confirm" type="password" required autoComplete="new-password" value={form.confirm} onChange={update} className="input py-2.5" />
        </label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full py-2.5">{busy ? 'Creating account…' : 'Create account'}</Button>
      </form>
    </AuthShell>
  );
}
