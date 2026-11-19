import CrudPage from '../components/CrudPage.jsx';
import { Badge, formatDate, PersonCell } from '../components/ui.jsx';

const ROLES = ['Sales Executive', 'Manager', 'Admin'];

const fields = [
  { name: 'name', label: 'Full name', required: true, maxLength: 100 },
  { name: 'email', label: 'Email', type: 'email', required: true },
  {
    name: 'password', label: 'Password', type: 'password', requiredOnCreate: true, minLength: 8,
    pattern: '(?=.*[A-Za-z])(?=.*\\d).{8,}', title: 'At least 8 characters with a letter and a number',
    hint: 'Leave empty when editing to keep the current password.'
  },
  { name: 'role', label: 'Role', type: 'select', options: ROLES },
  { name: 'isActive', label: 'Account status', type: 'select', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] }
];

const columns = [
  { label: 'User', render: u => <PersonCell name={u.name} sub={u.email} /> },
  { label: 'Role', render: u => <Badge value={u.role} /> },
  {
    label: 'Status',
    render: u => (
      <div className="flex gap-1.5">
        <Badge value={u.isActive ? 'Active' : 'Inactive'} />
        {u.locked && <Badge value="Locked" />}
      </div>
    )
  },
  { label: 'Joined', render: u => <span className="whitespace-nowrap text-slate-500">{formatDate(u.createdAt, false)}</span> }
];

const permissions = [
  { role: 'Admin', text: 'Everything, including users, audit log and reports.' },
  { role: 'Manager', text: 'All sales pages and reports. Can delete records.' },
  { role: 'Sales Executive', text: 'All sales pages. Can add and edit, but not delete.' }
];

const intro = (
  <div className="mb-6 grid gap-3 sm:grid-cols-3">
    {permissions.map(p => (
      <div key={p.role} className="card p-4">
        <Badge value={p.role} />
        <p className="mt-2 text-sm text-slate-600">{p.text}</p>
      </div>
    ))}
  </div>
);

export default function Users() {
  return (
    <CrudPage
      title="Users & roles"
      subtitle="Add team members, set their role and activate or deactivate accounts. Saving a user also unlocks it."
      endpoint="/api/users"
      singular="User"
      fields={fields}
      columns={columns}
      filter={{ name: 'role', label: 'roles', options: ROLES }}
      intro={intro}
    />
  );
}
