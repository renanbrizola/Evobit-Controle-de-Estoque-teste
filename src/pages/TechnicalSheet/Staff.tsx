import { useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { formatBRL } from '../../modules/ficha-tecnica/utils';
import {
  ActionButton,
  CheckInput,
  ConfirmDialog,
  Field,
  StatusMessage,
  TextInput,
} from '../../modules/ficha-tecnica/components/management-primitives';
import { SlidePanel } from '../../modules/ficha-tecnica/components/slide-panel';
import { SheetBlock } from '../../modules/ficha-tecnica/components/page-primitives';
import { getApiErrorMessage } from '../../modules/ficha-tecnica/lib/api-errors';
import { useWorkbookSnapshot } from '../../modules/ficha-tecnica/lib/workbook-api';
import {
  createStaffMember,
  deleteStaffMember,
  updateStaffMember,
  type StaffMemberPayload,
} from '../../modules/ficha-tecnica/lib/workbook-management-api';
import { useAuthStore } from '../../modules/ficha-tecnica/mock/auth.store';

const emptyForm: StaffMemberPayload = {
  isActive: true,
  name: '',
  role: '',
  salary: 0,
  fgts: 0,
  thirteenth: 0,
  vacation: 0,
  fgtsVacation: 0,
  weeklyHours: 44,
  sortOrder: 0,
};

type StaffRow = ReturnType<typeof useWorkbookSnapshot>['data']['staff'][number];

export default function StaffPage() {
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
  const { data, reload } = useWorkbookSnapshot(isDemoSession);
  const [form, setForm] = useState<StaffMemberPayload>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setPanelOpen(true);
  };

  const openEdit = (row: StaffRow) => {
    setEditingId(row.id);
    setForm({
      isActive: row.active,
      name: row.name,
      role: row.role,
      salary: row.salary,
      fgts: row.fgts,
      thirteenth: row.thirteenth,
      vacation: row.vacation,
      fgtsVacation: row.fgtsVacation,
      weeklyHours: row.weeklyHours,
      sortOrder: row.sortOrder,
    });
    setPanelOpen(true);
  };

  const closePanel = () => setPanelOpen(false);

  const setNum = (field: keyof StaffMemberPayload, value: string) =>
    setForm((c) => ({ ...c, [field]: Number(value) }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      if (editingId) {
        await updateStaffMember(editingId, form);
      } else {
        await createStaffMember(form);
      }
      reload();
      setMessage({ tone: 'success', text: `Funcionário ${editingId ? 'atualizado' : 'criado'} com sucesso.` });
      closePanel();
    } catch (error) {
      setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível salvar o funcionário.') });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setPendingConfirm({
      message: `Deseja excluir o funcionário "${name}"?`,
      onConfirm: async () => {
        try {
          await deleteStaffMember(id);
          reload();
          setMessage({ tone: 'success', text: 'Funcionário removido.' });
          if (editingId === id) closePanel();
        } catch (error) {
          setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível excluir.') });
        }
      },
    });
  };

  return (
    <div className="space-y-5">
      {pendingConfirm ? (
        <ConfirmDialog
          message={pendingConfirm.message}
          onConfirm={() => { void (pendingConfirm.onConfirm as () => Promise<void>)(); setPendingConfirm(null); }}
          onCancel={() => setPendingConfirm(null)}
        />
      ) : null}

      {message ? <StatusMessage tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} /> : null}
      {isDemoSession ? <StatusMessage tone="error" message="Entre com a API para cadastrar e editar dados reais." /> : null}

      <SheetBlock title="Funcionários" emphasis="· custo por minuto">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            {data.staff.length}{' '}
            {data.staff.length === 1 ? 'funcionário cadastrado' : 'funcionários cadastrados'}
          </p>
          <ActionButton onClick={openCreate} disabled={isDemoSession} className="gap-1.5">
            <Plus size={13} />
            Novo funcionário
          </ActionButton>
        </div>

        {data.staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-subtle)]">
              <Users size={22} className="text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-strong)]">Nenhum funcionário cadastrado</p>
            <p className="mt-1 text-xs text-[var(--text-soft)] max-w-xs">
              Adicione sua equipe para calcular o custo por minuto de produção automaticamente.
            </p>
            {!isDemoSession ? (
              <button onClick={openCreate} className="mt-4 text-sm font-semibold text-[var(--brand-accent-600)] hover:underline">
                Adicionar primeiro funcionário
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--line-soft)]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line-soft)] bg-[var(--bg-subtle)]">
                  {['Status', 'Nome', 'Cargo', 'Salário bruto', 'Custo total', 'Custo/min', ''].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)] ${h === '' || h === 'Salário bruto' || h === 'Custo total' || h === 'Custo/min' ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.staff.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--line-soft)] transition-colors last:border-0 hover:bg-[var(--bg-subtle)]"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          row.active ? 'bg-emerald-50 text-emerald-700' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                        }`}
                      >
                        {row.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--text-strong)]">{row.name}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{row.role || '—'}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-muted)]">{formatBRL(row.salary)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--text-strong)]">{formatBRL(row.totalCost)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--brand-accent-600)]">{formatBRL(row.minuteCost)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => openEdit(row)}
                          title="Editar"
                          className="rounded-lg p-1.5 text-[var(--text-soft)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-strong)]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(row.id, row.name)}
                          title="Excluir"
                          className="rounded-lg p-1.5 text-[var(--text-soft)] transition-colors hover:bg-[var(--state-danger-100)] hover:text-[var(--state-danger-700)]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SheetBlock>

      <SlidePanel
        open={panelOpen}
        onClose={closePanel}
        title={editingId ? 'Editar funcionário' : 'Novo funcionário'}
        description="Preencha os dados para calcular o custo por minuto de produção."
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo">
              <TextInput
                value={form.name}
                placeholder="ex: João Silva"
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                disabled={saving}
              />
            </Field>
            <Field label="Cargo / Função">
              <TextInput
                value={form.role}
                placeholder="ex: Confeiteiro"
                onChange={(e) => setForm((c) => ({ ...c, role: e.target.value }))}
                disabled={saving}
              />
            </Field>
          </div>

          <CheckInput
            aria-label="Funcionário ativo"
            checked={form.isActive}
            onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))}
            disabled={saving}
          />

          <div className="border-t border-[var(--line-soft)] pt-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-soft)]">Remuneração</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Salário bruto (R$)">
                <TextInput
                  type="number"
                  step="0.01"
                  value={form.salary}
                  onChange={(e) => setNum('salary', e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="Horas semanais">
                <TextInput
                  type="number"
                  step="0.5"
                  value={form.weeklyHours}
                  onChange={(e) => setNum('weeklyHours', e.target.value)}
                  disabled={saving}
                />
              </Field>
            </div>
          </div>

          <div className="border-t border-[var(--line-soft)] pt-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-soft)]">Encargos (valor mensal R$)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="FGTS">
                <TextInput type="number" step="0.01" value={form.fgts} onChange={(e) => setNum('fgts', e.target.value)} disabled={saving} />
              </Field>
              <Field label="Décimo terceiro">
                <TextInput type="number" step="0.01" value={form.thirteenth} onChange={(e) => setNum('thirteenth', e.target.value)} disabled={saving} />
              </Field>
              <Field label="Férias">
                <TextInput type="number" step="0.01" value={form.vacation} onChange={(e) => setNum('vacation', e.target.value)} disabled={saving} />
              </Field>
              <Field label="FGTS férias">
                <TextInput type="number" step="0.01" value={form.fgtsVacation} onChange={(e) => setNum('fgtsVacation', e.target.value)} disabled={saving} />
              </Field>
            </div>
          </div>

          <div className="border-t border-[var(--line-soft)] pt-5 flex gap-3">
            <ActionButton
              onClick={handleSubmit}
              disabled={saving || !form.name.trim()}
              className="flex-1 justify-center"
            >
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar funcionário'}
            </ActionButton>
            <ActionButton tone="secondary" onClick={closePanel} disabled={saving}>
              Cancelar
            </ActionButton>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
