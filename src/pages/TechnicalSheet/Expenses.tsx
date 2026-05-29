import { useState } from 'react';
import { Pencil, Plus, Trash2, Receipt, TrendingDown } from 'lucide-react';
import { formatBRL } from '../../modules/ficha-tecnica/utils';
import {
  ActionButton,
  CheckInput,
  ConfirmDialog,
  Field,
  SelectInput,
  StatusMessage,
  TextInput,
} from '../../modules/ficha-tecnica/components/management-primitives';
import { SlidePanel } from '../../modules/ficha-tecnica/components/slide-panel';
import { SheetBlock } from '../../modules/ficha-tecnica/components/page-primitives';
import { getApiErrorMessage } from '../../modules/ficha-tecnica/lib/api-errors';
import { useWorkbookSnapshot } from '../../modules/ficha-tecnica/lib/workbook-api';
import {
  createDepreciationAsset,
  createExpense,
  deleteDepreciationAsset,
  deleteExpense,
  updateDepreciationAsset,
  updateExpense,
  type DepreciationAssetPayload,
  type OperatingExpensePayload,
} from '../../modules/ficha-tecnica/lib/workbook-management-api';
import { useAuthStore } from '../../modules/ficha-tecnica/mock/auth.store';

const emptyExpenseForm: OperatingExpensePayload = { type: 'FIXED', name: '', amount: 0, sortOrder: 0 };
const emptyDepreciationForm: DepreciationAssetPayload = { category: '', assetName: '', invoiceValue: 0, linear: true, sortOrder: 0 };

type ExpenseRow = ReturnType<typeof useWorkbookSnapshot>['data']['expenses']['fixed'][number];
type DepreciationRow = ReturnType<typeof useWorkbookSnapshot>['data']['expenses']['depreciation'][number];

type Panel = 'expense' | 'depreciation' | null;

type ColumnProps = {
  fixedRows: ExpenseRow[];
  fixedTotal: number;
  monthlyPayroll: number;
  variableRows: ExpenseRow[];
  variableTotal: number;
  isDemoSession: boolean;
  onNewExpense: (type: 'FIXED' | 'VARIABLE') => void;
  onEditExpense: (row: ExpenseRow) => void;
  onDeleteExpense: (id: string, name: string) => void;
};

function FixedExpensesColumn({ fixedRows, fixedTotal, monthlyPayroll, isDemoSession, onNewExpense, onEditExpense, onDeleteExpense }: Omit<ColumnProps, 'variableRows' | 'variableTotal'>) {
  return (
    <SheetBlock title="Despesas fixas">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-[var(--text-muted)]">
          {fixedRows.length + 1} {fixedRows.length + 1 === 1 ? 'item' : 'itens'}
          <span className="ml-1 font-semibold text-[var(--text-strong)]">· {formatBRL(fixedTotal)}</span>
        </p>
        <ActionButton onClick={() => onNewExpense('FIXED')} disabled={isDemoSession} className="gap-1.5">
          <Plus size={13} /> Nova
        </ActionButton>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--line-soft)]">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line-soft)] bg-[var(--bg-subtle)]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">Descrição</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">Valor</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--line-soft)] bg-emerald-50/40">
              <td className="px-4 py-3">
                <span className="font-medium text-[var(--text-strong)]">Folha de pagamento</span>
                <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">auto</span>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-[var(--text-strong)]">{formatBRL(monthlyPayroll)}</td>
              <td className="px-4 py-3 text-right">
                <span className="text-[11px] text-[var(--text-soft)]">dos funcionários</span>
              </td>
            </tr>
            {fixedRows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--line-soft)] transition-colors last:border-0 hover:bg-[var(--bg-subtle)]">
                <td className="px-4 py-3 font-medium text-[var(--text-strong)]">{row.name}</td>
                <td className="px-4 py-3 text-right font-semibold text-[var(--text-strong)]">{formatBRL(row.amount)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => onEditExpense(row)} title="Editar" className="rounded-lg p-1.5 text-[var(--text-soft)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-strong)]"><Pencil size={14} /></button>
                    <button onClick={() => onDeleteExpense(row.id, row.name)} title="Excluir" className="rounded-lg p-1.5 text-[var(--text-soft)] transition-colors hover:bg-[var(--state-danger-100)] hover:text-[var(--state-danger-700)]"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {fixedRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                  {!isDemoSession ? (
                    <button onClick={() => onNewExpense('FIXED')} className="font-semibold text-[var(--brand-accent-600)] hover:underline">
                      Adicionar despesa fixa
                    </button>
                  ) : 'Nenhuma outra despesa fixa.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </SheetBlock>
  );
}

function VariableExpensesColumn({ variableRows, variableTotal, isDemoSession, onNewExpense, onEditExpense, onDeleteExpense }: Omit<ColumnProps, 'fixedRows' | 'fixedTotal' | 'monthlyPayroll'>) {
  return (
    <SheetBlock title="Despesas variáveis">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-[var(--text-muted)]">
          {variableRows.length} {variableRows.length === 1 ? 'item' : 'itens'}
          {variableRows.length > 0 && <span className="ml-1 font-semibold text-[var(--text-strong)]">· {formatBRL(variableTotal)}</span>}
        </p>
        <ActionButton onClick={() => onNewExpense('VARIABLE')} disabled={isDemoSession} className="gap-1.5">
          <Plus size={13} /> Nova
        </ActionButton>
      </div>

      {variableRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-subtle)]">
            <Receipt size={18} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text-strong)]">Nenhuma despesa variável</p>
          {!isDemoSession ? (
            <button onClick={() => onNewExpense('VARIABLE')} className="mt-3 text-sm font-semibold text-[var(--brand-accent-600)] hover:underline">
              Adicionar
            </button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--line-soft)]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line-soft)] bg-[var(--bg-subtle)]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">Descrição</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">Valor</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]"></th>
              </tr>
            </thead>
            <tbody>
              {variableRows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--line-soft)] transition-colors last:border-0 hover:bg-[var(--bg-subtle)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-strong)]">{row.name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[var(--text-strong)]">{formatBRL(row.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => onEditExpense(row)} title="Editar" className="rounded-lg p-1.5 text-[var(--text-soft)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-strong)]"><Pencil size={14} /></button>
                      <button onClick={() => onDeleteExpense(row.id, row.name)} title="Excluir" className="rounded-lg p-1.5 text-[var(--text-soft)] transition-colors hover:bg-[var(--state-danger-100)] hover:text-[var(--state-danger-700)]"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SheetBlock>
  );
}

export default function ExpensesPage() {
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
  const { data, reload } = useWorkbookSnapshot(isDemoSession);

  const [panel, setPanel] = useState<Panel>(null);
  const [expenseForm, setExpenseForm] = useState<OperatingExpensePayload>(emptyExpenseForm);
  const [depreciationForm, setDepreciationForm] = useState<DepreciationAssetPayload>(emptyDepreciationForm);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingDepreciationId, setEditingDepreciationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const openNewExpense = (type: 'FIXED' | 'VARIABLE' = 'FIXED') => {
    setEditingExpenseId(null);
    setExpenseForm({ ...emptyExpenseForm, type });
    setPanel('expense');
  };

  const openEditExpense = (row: ExpenseRow) => {
    setEditingExpenseId(row.id);
    setExpenseForm({ type: row.type as 'FIXED'|'VARIABLE', name: row.name, amount: row.amount, sortOrder: row.sortOrder });
    setPanel('expense');
  };

  const openNewDepreciation = () => {
    setEditingDepreciationId(null);
    setDepreciationForm(emptyDepreciationForm);
    setPanel('depreciation');
  };

  const openEditDepreciation = (row: DepreciationRow) => {
    setEditingDepreciationId(row.id);
    setDepreciationForm({ category: row.category, assetName: row.assetName, invoiceValue: row.invoiceValue, linear: row.linear, sortOrder: row.sortOrder });
    setPanel('depreciation');
  };

  const closePanel = () => setPanel(null);

  const handleExpenseSubmit = async () => {
    if (!expenseForm.name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      if (editingExpenseId) {
        await updateExpense(editingExpenseId, expenseForm);
      } else {
        await createExpense(expenseForm);
      }
      reload();
      setMessage({ tone: 'success', text: `Despesa ${editingExpenseId ? 'atualizada' : 'criada'} com sucesso.` });
      closePanel();
    } catch (error) {
      setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível salvar a despesa.') });
    } finally {
      setSaving(false);
    }
  };

  const handleDepreciationSubmit = async () => {
    if (!depreciationForm.assetName.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      if (editingDepreciationId) {
        await updateDepreciationAsset(editingDepreciationId, depreciationForm);
      } else {
        await createDepreciationAsset(depreciationForm);
      }
      reload();
      setMessage({ tone: 'success', text: `Ativo ${editingDepreciationId ? 'atualizado' : 'criado'} com sucesso.` });
      closePanel();
    } catch (error) {
      setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível salvar o ativo.') });
    } finally {
      setSaving(false);
    }
  };

  const handleExpenseDelete = (id: string, name: string) => {
    setPendingConfirm({
      message: `Deseja excluir a despesa "${name}"?`,
      onConfirm: async () => {
        try {
          await deleteExpense(id);
          reload();
          setMessage({ tone: 'success', text: 'Despesa removida.' });
          if (editingExpenseId === id) closePanel();
        } catch (error) {
          setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível excluir.') });
        }
      },
    });
  };

  const handleDepreciationDelete = (id: string, name: string) => {
    setPendingConfirm({
      message: `Deseja excluir o ativo "${name}"?`,
      onConfirm: async () => {
        try {
          await deleteDepreciationAsset(id);
          reload();
          setMessage({ tone: 'success', text: 'Ativo removido.' });
          if (editingDepreciationId === id) closePanel();
        } catch (error) {
          setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível excluir.') });
        }
      },
    });
  };

  const isPayrollRow = (row: { id: string; name: string }) =>
    row.id === 'payroll' || row.name.toLowerCase().includes('folha');

  const fixedRows = data.expenses.fixed.filter((e) => !isPayrollRow(e));
  const monthlyPayroll = data.profile.monthlyPayroll;
  const fixedTotal = monthlyPayroll + fixedRows.reduce((sum, e) => sum + e.amount, 0);
  const variableTotal = data.expenses.variable.reduce((sum, e) => sum + e.amount, 0);

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

      <div className="grid gap-5 xl:grid-cols-2">
        <FixedExpensesColumn
          fixedRows={fixedRows}
          fixedTotal={fixedTotal}
          monthlyPayroll={monthlyPayroll}
          isDemoSession={isDemoSession}
          onNewExpense={openNewExpense}
          onEditExpense={openEditExpense}
          onDeleteExpense={handleExpenseDelete}
        />
        <VariableExpensesColumn
          variableRows={data.expenses.variable}
          variableTotal={variableTotal}
          isDemoSession={isDemoSession}
          onNewExpense={openNewExpense}
          onEditExpense={openEditExpense}
          onDeleteExpense={handleExpenseDelete}
        />
      </div>

      <SheetBlock title="Depreciação de ativos">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            {data.expenses.depreciation.length}{' '}
            {data.expenses.depreciation.length === 1 ? 'ativo cadastrado' : 'ativos cadastrados'}
          </p>
          <ActionButton onClick={openNewDepreciation} disabled={isDemoSession} className="gap-1.5">
            <Plus size={13} />
            Novo ativo
          </ActionButton>
        </div>

        {data.expenses.depreciation.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-subtle)]">
              <TrendingDown size={20} className="text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-strong)]">Nenhum ativo cadastrado</p>
            <p className="mt-1 text-xs text-[var(--text-soft)] max-w-xs">
              Registre equipamentos e bens para calcular a depreciação mensal.
            </p>
            {!isDemoSession ? (
              <button onClick={openNewDepreciation} className="mt-4 text-sm font-semibold text-[var(--brand-accent-600)] hover:underline">
                Adicionar primeiro ativo
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--line-soft)]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line-soft)] bg-[var(--bg-subtle)]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">Categoria</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">Ativo</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">Valor nota</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">Método</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]"></th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.depreciation.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--line-soft)] transition-colors last:border-0 hover:bg-[var(--bg-subtle)]">
                    <td className="px-4 py-3 text-[var(--text-muted)]">{row.category}</td>
                    <td className="px-4 py-3 font-medium text-[var(--text-strong)]">{row.assetName}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--text-strong)]">{formatBRL(row.invoiceValue)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        row.linear ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                      }`}>
                        {row.linear ? 'Linear' : 'Acelerada'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => openEditDepreciation(row)}
                          title="Editar"
                          className="rounded-lg p-1.5 text-[var(--text-soft)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-strong)]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDepreciationDelete(row.id, row.assetName)}
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
        open={panel === 'expense'}
        onClose={closePanel}
        title={editingExpenseId ? 'Editar despesa' : 'Nova despesa'}
        description="Despesas fixas e variáveis entram no custo operacional mensal."
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo">
              <SelectInput
                value={expenseForm.type}
                onChange={(e) => setExpenseForm((c) => ({ ...c, type: e.target.value as 'FIXED' | 'VARIABLE' }))}
                disabled={saving}
              >
                <option value="FIXED">Fixa</option>
                <option value="VARIABLE">Variável</option>
              </SelectInput>
            </Field>
            <Field label="Valor mensal (R$)">
              <TextInput
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm((c) => ({ ...c, amount: Number(e.target.value) }))}
                disabled={saving}
              />
            </Field>
          </div>
          <Field label="Descrição">
            <TextInput
              value={expenseForm.name}
              placeholder="ex: Aluguel, Internet, Embalagens..."
              onChange={(e) => setExpenseForm((c) => ({ ...c, name: e.target.value }))}
              disabled={saving}
            />
          </Field>
          <div className="border-t border-[var(--line-soft)] pt-5 flex gap-3">
            <ActionButton
              onClick={handleExpenseSubmit}
              disabled={saving || !expenseForm.name.trim()}
              className="flex-1 justify-center"
            >
              {saving ? 'Salvando...' : editingExpenseId ? 'Salvar alterações' : 'Criar despesa'}
            </ActionButton>
            <ActionButton tone="secondary" onClick={closePanel} disabled={saving}>
              Cancelar
            </ActionButton>
          </div>
        </div>
      </SlidePanel>

      <SlidePanel
        open={panel === 'depreciation'}
        onClose={closePanel}
        title={editingDepreciationId ? 'Editar ativo' : 'Novo ativo'}
        description="Registre bens para calcular a depreciação mensal automática."
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria">
              <TextInput
                value={depreciationForm.category}
                placeholder="ex: Equipamentos, Móveis..."
                onChange={(e) => setDepreciationForm((c) => ({ ...c, category: e.target.value }))}
                disabled={saving}
              />
            </Field>
            <Field label="Valor da nota (R$)">
              <TextInput
                type="number"
                step="0.01"
                value={depreciationForm.invoiceValue}
                onChange={(e) => setDepreciationForm((c) => ({ ...c, invoiceValue: Number(e.target.value) }))}
                disabled={saving}
              />
            </Field>
          </div>
          <Field label="Nome do ativo">
            <TextInput
              value={depreciationForm.assetName}
              placeholder="ex: Forno industrial, Batedeira..."
              onChange={(e) => setDepreciationForm((c) => ({ ...c, assetName: e.target.value }))}
              disabled={saving}
            />
          </Field>
          <CheckInput
            aria-label="Cálculo linear"
            checked={depreciationForm.linear}
            onChange={(e) => setDepreciationForm((c) => ({ ...c, linear: e.target.checked }))}
            disabled={saving}
          />
          <div className="border-t border-[var(--line-soft)] pt-5 flex gap-3">
            <ActionButton
              onClick={handleDepreciationSubmit}
              disabled={saving || !depreciationForm.assetName.trim()}
              className="flex-1 justify-center"
            >
              {saving ? 'Salvando...' : editingDepreciationId ? 'Salvar alterações' : 'Criar ativo'}
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
