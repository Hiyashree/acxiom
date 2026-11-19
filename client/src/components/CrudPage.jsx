import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Button, EmptyState, IconButton, Modal, ModalFooter, PageHeader, todayStr, useToast } from './ui.jsx';

const PAGE_SIZE = 8;
const SKIP_IN_SEARCH = ['_id', '__v', 'createdAt', 'updatedAt'];

const optionValue = o => (typeof o === 'object' ? o.value : o);
const optionLabel = o => (typeof o === 'object' ? o.label : o);

// Text used by the search box: every value of the record (a linked customer counts as its name).
function searchText(record) {
  return Object.entries(record)
    .filter(([key]) => !SKIP_IN_SEARCH.includes(key))
    .map(([, v]) => (v && typeof v === 'object' ? v.name : v))
    .join(' ')
    .toLowerCase();
}

// Turns a record into form values (or default values for a new record).
function toFormValues(fields, record) {
  const values = {};
  for (const f of fields) {
    let v = record ? record[f.name] : f.default;
    if (!record && v === undefined && f.type === 'select' && Array.isArray(f.options)) v = optionValue(f.options[0]);
    if (v && typeof v === 'object') v = v._id; // linked customer
    if (f.type === 'date' && v) v = v.slice(0, 10);
    if (typeof v === 'boolean') v = String(v);
    values[f.name] = v ?? '';
  }
  return values;
}

function Field({ field, value, onChange, editing, customers }) {
  const props = {
    id: field.name,
    name: field.name,
    value,
    onChange: e => onChange(field.name, e.target.value),
    required: field.required || (field.requiredOnCreate && !editing),
    className: 'input'
  };

  let input;
  if (field.type === 'select') {
    const options = field.options === 'customers'
      ? customers.map(c => ({ value: c._id, label: c.name }))
      : field.options;
    input = (
      <select {...props}>
        {field.options === 'customers' && <option value="">Select a customer…</option>}
        {options.map(o => <option key={optionValue(o)} value={optionValue(o)}>{optionLabel(o)}</option>)}
      </select>
    );
  } else if (field.type === 'textarea') {
    input = <textarea {...props} rows={3} maxLength={field.maxLength} placeholder={field.placeholder} />;
  } else {
    input = (
      <input
        {...props}
        type={field.type || 'text'}
        placeholder={field.placeholder}
        pattern={field.pattern}
        title={field.title}
        min={field.minToday && !editing ? todayStr() : field.min}
        max={field.max}
        step={field.step}
        maxLength={field.maxLength}
        minLength={field.minLength}
        autoComplete={field.type === 'password' ? 'new-password' : undefined}
      />
    );
  }

  return (
    <label className={`block ${field.wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {field.label}{field.required && <span className="text-rose-500"> *</span>}
      </span>
      {input}
      {field.hint && <span className="mt-1 block text-xs text-slate-400">{field.hint}</span>}
    </label>
  );
}

// A complete list page: search, filter, table, pagination, add/edit form and delete confirmation.
// Each page only describes its fields and columns.
export default function CrudPage({
  title, subtitle, endpoint, singular, fields = [], columns, filter, rowActions, readOnly, intro
}) {
  const { user } = useAuth();
  const toast = useToast();
  const canDelete = user.role === 'Admin' || user.role === 'Manager';
  const needsCustomers = fields.some(f => f.options === 'customers');

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [page, setPage] = useState(1);
  const [customers, setCustomers] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(async () => {
    try {
      setRecords(await api(endpoint));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (needsCustomers && formOpen) api('/api/customers').then(setCustomers).catch(() => {});
  }, [needsCustomers, formOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter(r =>
      (!filter || !filterValue || r[filter.name] === filterValue) &&
      (!q || searchText(r).includes(q)));
  }, [records, query, filter, filterValue]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const shown = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function openForm(record) {
    setEditing(record);
    setValues(toFormValues(fields, record));
    setFormError('');
    setFormOpen(true);
  }

  const closeForm = useCallback(() => setFormOpen(false), []);
  const closeDelete = useCallback(() => setToDelete(null), []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api(editing ? `${endpoint}/${editing._id}` : endpoint, {
        method: editing ? 'PUT' : 'POST',
        body: values
      });
      toast.success(`${singular} ${editing ? 'updated' : 'added'} successfully.`);
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    try {
      await api(`${endpoint}/${toDelete._id}`, { method: 'DELETE' });
      toast.success(`${singular} deleted.`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
    setToDelete(null);
  }

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle}>
        {!readOnly && <Button onClick={() => openForm(null)}><Plus size={16} /> New {singular.toLowerCase()}</Button>}
      </PageHeader>

      {intro}

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              placeholder={`Search ${title.toLowerCase()}…`}
              className="input pl-9"
            />
          </div>
          <div className="flex items-center gap-3">
            {filter && (
              <select value={filterValue} onChange={e => { setFilterValue(e.target.value); setPage(1); }} className="input w-auto">
                <option value="">All {filter.label}</option>
                {filter.options.map(o => <option key={o}>{o}</option>)}
              </select>
            )}
            <span className="whitespace-nowrap text-sm text-slate-500">
              {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {columns.map(c => <th key={c.label} className="whitespace-nowrap px-5 py-3">{c.label}</th>)}
                {!readOnly && <th className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map(r => (
                <tr key={r._id} className="transition hover:bg-plum-50/40">
                  {columns.map(c => (
                    <td key={c.label} className="px-5 py-3 align-middle">{c.render ? c.render(r) : (r[c.key] || '—')}</td>
                  ))}
                  {!readOnly && (
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {rowActions && rowActions(r, { reload: load, toast })}
                        <IconButton title="Edit" onClick={() => openForm(r)}><Pencil size={16} /></IconButton>
                        {canDelete && <IconButton danger title="Delete" onClick={() => setToDelete(r)}><Trash2 size={16} /></IconButton>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {loading && <p className="p-10 text-center text-sm text-slate-400">Loading…</p>}
          {!loading && shown.length === 0 && (
            <EmptyState
              title={records.length ? 'No matching records' : `No ${title.toLowerCase()} yet`}
              text={records.length ? 'Try a different search or filter.'
                : readOnly ? 'Entries will show up here.' : `Click "New ${singular.toLowerCase()}" to add the first one.`}
            />
          )}
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{(currentPage - 1) * PAGE_SIZE + shown.length} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="px-2.5" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-slate-600">Page {currentPage} of {pages}</span>
              <Button variant="secondary" className="px-2.5" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`}
        subtitle={editing ? (editing.code || editing.name || editing.subject) : 'Fields marked * are required.'}
      >
        <form onSubmit={save}>
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            {fields.map(f => (
              <Field
                key={f.name}
                field={f}
                value={values[f.name] ?? ''}
                editing={!!editing}
                customers={customers}
                onChange={(name, value) => setValues(v => ({ ...v, [name]: value }))}
              />
            ))}
          </div>
          {formError && <p className="mx-6 mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
          <ModalFooter>
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : `Add ${singular.toLowerCase()}`}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal open={!!toDelete} onClose={closeDelete} title={`Delete ${singular.toLowerCase()}?`} width="max-w-md">
        <p className="px-6 py-5 text-sm text-slate-600">
          <b className="text-slate-800">{toDelete && (toDelete.name || toDelete.subject)}</b> will be permanently
          deleted. This can't be undone.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={closeDelete}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
