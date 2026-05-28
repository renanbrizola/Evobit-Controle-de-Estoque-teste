

import { useState } from 'react';
import { Pencil, Plus, Trash2, Zap, Flame, Package } from 'lucide-react';
import { formatBRL } from '../../modules/ficha-tecnica/utils/index';
import {
  ActionButton,
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
  createElectricEquipment,
  createGasBottle,
  createGasEquipment,
  deleteElectricEquipment,
  deleteGasBottle,
  deleteGasEquipment,
  updateElectricEquipment,
  updateGasBottle,
  updateGasEquipment,
  type ElectricEquipmentPayload,
  type GasBottlePayload,
  type GasEquipmentPayload,
} from '../../modules/ficha-tecnica/lib/workbook-management-api';
import { useAuthStore } from '../../modules/ficha-tecnica/mock/auth.store';

const emptyElectricForm: ElectricEquipmentPayload = { name: '', powerWatts: 0, sortOrder: 0 };
const emptyGasEquipmentForm: GasEquipmentPayload = { name: '', kgPerHour: 0, bottleKg: 13, sortOrder: 0 };
const emptyGasBottleForm: GasBottlePayload = { code: '', capacityKg: 0, price: null, sortOrder: 0 };

type ElectricRow = ReturnType<typeof useWorkbookSnapshot>['data']['utilities']['electricEquipments'][number];
type GasEquipRow = ReturnType<typeof useWorkbookSnapshot>['data']['utilities']['gasEquipments'][number];
type GasBottleRow = ReturnType<typeof useWorkbookSnapshot>['data']['utilities']['gasBottles'][number];

type Panel = 'electric' | 'gas' | 'bottle' | null;

function TableHeader({ cols }: { cols: Array<{ label: string; align?: 'right' | 'left' }> }) {
  return (
    <thead>
      <tr className="border-b border-[var(--line-soft)] bg-[var(--bg-subtle)]">
        {cols.map((col) => (
          <th
            key={col.label}
            className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)] ${col.align === 'right' ? 'text-right' : 'text-left'}`}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function EmptySection({
  icon: Icon,
  message,
  sub,
  onAdd,
  disabled,
}: {
  icon: React.ElementType;
  message: string;
  sub: string;
  onAdd: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-subtle)]">
        <Icon size={20} className="text-[var(--text-muted)]" />
      </div>
      <p className="text-sm font-medium text-[var(--text-strong)]">{message}</p>
      <p className="mt-1 text-xs text-[var(--text-soft)] max-w-xs">{sub}</p>
      {!disabled ? (
        <button onClick={onAdd} className="mt-4 text-sm font-semibold text-[var(--brand-accent-600)] hover:underline">
          Adicionar
        </button>
      ) : null}
    </div>
  );
}

export default function EquipmentPage() {
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
  const { data, reload } = useWorkbookSnapshot(isDemoSession);

  const [panel, setPanel] = useState<Panel>(null);
  const [electricForm, setElectricForm] = useState<ElectricEquipmentPayload>(emptyElectricForm);
  const [gasEquipForm, setGasEquipForm] = useState<GasEquipmentPayload>(emptyGasEquipmentForm);
  const [gasBottleForm, setGasBottleForm] = useState<GasBottlePayload>(emptyGasBottleForm);
  const [editingElectricId, setEditingElectricId] = useState<string | null>(null);
  const [editingGasEquipId, setEditingGasEquipId] = useState<string | null>(null);
  const [editingGasBottleId, setEditingGasBottleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const closePanel = () => setPanel(null);

  const openNewElectric = () => { setEditingElectricId(null); setElectricForm(emptyElectricForm); setPanel('electric'); };
  const openEditElectric = (row: ElectricRow) => { setEditingElectricId(row.id); setElectricForm({ name: row.name, powerWatts: row.powerWatts, sortOrder: row.sortOrder }); setPanel('electric'); };

  const openNewGas = () => { setEditingGasEquipId(null); setGasEquipForm(emptyGasEquipmentForm); setPanel('gas'); };
  const openEditGas = (row: GasEquipRow) => { setEditingGasEquipId(row.id); setGasEquipForm({ name: row.name, kgPerHour: row.kgPerHour, bottleKg: row.bottleKg, sortOrder: row.sortOrder }); setPanel('gas'); };

  const openNewBottle = () => { setEditingGasBottleId(null); setGasBottleForm(emptyGasBottleForm); setPanel('bottle'); };
  const openEditBottle = (row: GasBottleRow) => { setEditingGasBottleId(row.id); setGasBottleForm({ code: row.code, capacityKg: row.capacityKg, price: row.price, sortOrder: row.sortOrder }); setPanel('bottle'); };

  const runMutation = async (action: () => Promise<unknown>, successText: string, onSuccess?: () => void) => {
    setSaving(true);
    setMessage(null);
    try {
      await action();
      reload();
      setMessage({ tone: 'success', text: successText });
      onSuccess?.();
    } catch (error) {
      setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível salvar a alteração.') });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = (message: string, action: () => Promise<unknown>, successText: string, onSuccess?: () => void) => {
    setPendingConfirm({
      message,
      onConfirm: async () => { await runMutation(action, successText, onSuccess); },
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

      {/* Elétricos */}
      <SheetBlock title="Equipamentos elétricos" emphasis="· consumo de energia">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            {data.utilities.electricEquipments.length} equipamento{data.utilities.electricEquipments.length !== 1 ? 's' : ''} cadastrado{data.utilities.electricEquipments.length !== 1 ? 's' : ''}
          </p>
          <ActionButton onClick={openNewElectric} disabled={isDemoSession} className="gap-1.5">
            <Plus size={13} /> Novo equipamento
          </ActionButton>
        </div>

        {data.utilities.electricEquipments.length === 0 ? (
          <EmptySection
            icon={Zap}
            message="Nenhum equipamento elétrico"
            sub="Cadastre os equipamentos para calcular o custo de energia por minuto."
            onAdd={openNewElectric}
            disabled={isDemoSession}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--line-soft)]">
            <table className="min-w-full text-sm">
              <TableHeader cols={[
                { label: 'Equipamento' },
                { label: 'Potência (W)', align: 'right' },
                { label: 'Custo/min', align: 'right' },
                { label: 'kWh', align: 'right' },
                { label: '', align: 'right' },
              ]} />
              <tbody>
                {data.utilities.electricEquipments.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--line-soft)] transition-colors last:border-0 hover:bg-[var(--bg-subtle)]">
                    <td className="px-4 py-3 font-medium text-[var(--text-strong)]">{row.name}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-muted)]">{row.powerWatts.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--brand-accent-600)]">{formatBRL(row.minuteCost)}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-muted)]">{row.kwhLabel}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => openEditElectric(row)} title="Editar" className="rounded-lg p-1.5 text-[var(--text-soft)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-strong)]"><Pencil size={14} /></button>
                        <button
                          onClick={() => handleDeleteConfirm(`Excluir "${row.name}"?`, () => deleteElectricEquipment(row.id), 'Equipamento removido.', editingElectricId === row.id ? closePanel : undefined)}
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

      {/* A gás */}
      <SheetBlock title="Equipamentos a gás" emphasis="· consumo de gás">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            {data.utilities.gasEquipments.length} equipamento{data.utilities.gasEquipments.length !== 1 ? 's' : ''} cadastrado{data.utilities.gasEquipments.length !== 1 ? 's' : ''}
          </p>
          <ActionButton onClick={openNewGas} disabled={isDemoSession} className="gap-1.5">
            <Plus size={13} /> Novo equipamento
          </ActionButton>
        </div>

        {data.utilities.gasEquipments.length === 0 ? (
          <EmptySection
            icon={Flame}
            message="Nenhum equipamento a gás"
            sub="Cadastre fogões, fornos e outros equipamentos que consomem gás."
            onAdd={openNewGas}
            disabled={isDemoSession}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--line-soft)]">
            <table className="min-w-full text-sm">
              <TableHeader cols={[
                { label: 'Equipamento' },
                { label: 'Consumo (kg/h)', align: 'right' },
                { label: 'Botijão (kg)', align: 'right' },
                { label: 'Custo/min', align: 'right' },
                { label: '', align: 'right' },
              ]} />
              <tbody>
                {data.utilities.gasEquipments.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--line-soft)] transition-colors last:border-0 hover:bg-[var(--bg-subtle)]">
                    <td className="px-4 py-3 font-medium text-[var(--text-strong)]">{row.name}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-muted)]">{row.kgPerHour.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-muted)]">{row.bottleKg}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--brand-accent-600)]">{formatBRL(row.minuteCost)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => openEditGas(row)} title="Editar" className="rounded-lg p-1.5 text-[var(--text-soft)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-strong)]"><Pencil size={14} /></button>
                        <button
                          onClick={() => handleDeleteConfirm(`Excluir "${row.name}"?`, () => deleteGasEquipment(row.id), 'Equipamento removido.', editingGasEquipId === row.id ? closePanel : undefined)}
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

      {/* Botijões + Módulo energia lado a lado */}
      <div className="grid gap-5 xl:grid-cols-2">
        <SheetBlock title="Botijões de gás" emphasis="· preços de referência">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm text-[var(--text-muted)]">
              {data.utilities.gasBottles.length} botijão{data.utilities.gasBottles.length !== 1 ? 'ões' : ''} cadastrado{data.utilities.gasBottles.length !== 1 ? 's' : ''}
            </p>
            <ActionButton onClick={openNewBottle} disabled={isDemoSession} className="gap-1.5">
              <Plus size={13} /> Novo botijão
            </ActionButton>
          </div>

          {data.utilities.gasBottles.length === 0 ? (
            <EmptySection
              icon={Package}
              message="Nenhum botijão cadastrado"
              sub="Cadastre os botijões e seus preços para calcular o custo de gás."
              onAdd={openNewBottle}
              disabled={isDemoSession}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--line-soft)]">
              <table className="min-w-full text-sm">
                <TableHeader cols={[
                  { label: 'Código' },
                  { label: 'Capacidade (kg)', align: 'right' },
                  { label: 'Preço', align: 'right' },
                  { label: '', align: 'right' },
                ]} />
                <tbody>
                  {data.utilities.gasBottles.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--line-soft)] transition-colors last:border-0 hover:bg-[var(--bg-subtle)]">
                      <td className="px-4 py-3 font-medium text-[var(--text-strong)]">{row.code}</td>
                      <td className="px-4 py-3 text-right text-[var(--text-muted)]">{row.capacityKg}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--text-strong)]">{row.price === null ? '—' : formatBRL(row.price)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button onClick={() => openEditBottle(row)} title="Editar" className="rounded-lg p-1.5 text-[var(--text-soft)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-strong)]"><Pencil size={14} /></button>
                          <button
                            onClick={() => handleDeleteConfirm(`Excluir botijão "${row.code}"?`, () => deleteGasBottle(row.id), 'Botijão removido.', editingGasBottleId === row.id ? closePanel : undefined)}
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

        <SheetBlock title="Módulo de energia" emphasis="· referência kWh">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--bg-subtle)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">Outros custos elétricos</p>
                <p className="mt-1.5 text-xl font-bold text-[var(--text-strong)]">{formatBRL(data.profile.electricOtherCosts)}</p>
              </div>
              <div className="rounded-xl border border-[var(--brand-accent-600)]/25 bg-[var(--brand-accent-100)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-accent-800)]">Preço do kWh</p>
                <p className="mt-1.5 text-xl font-bold text-[var(--brand-accent-600)]">{formatBRL(data.profile.kwhPrice)}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--line-soft)]">
              <table className="min-w-full text-sm">
                <TableHeader cols={[
                  { label: 'Descrição' },
                  { label: 'kWs', align: 'right' },
                  { label: 'Preço/kWh', align: 'right' },
                ]} />
                <tbody>
                  {data.utilities.energyBands.map((row) => (
                    <tr key={row.description} className="border-b border-[var(--line-soft)] last:border-0">
                      <td className="px-4 py-3 text-[var(--text-muted)]">{row.description}</td>
                      <td className="px-4 py-3 text-right text-[var(--text-muted)]">{row.kws.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--text-strong)]">
                        {row.pricePerKwh === null ? '—' : formatBRL(row.pricePerKwh)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SheetBlock>
      </div>

      {/* Painel elétrico */}
      <SlidePanel open={panel === 'electric'} onClose={closePanel} title={editingElectricId ? 'Editar equipamento elétrico' : 'Novo equipamento elétrico'} description="O custo por minuto é calculado com base na potência e no preço do kWh.">
        <div className="space-y-5">
          <Field label="Nome do equipamento">
            <TextInput value={electricForm.name} placeholder="ex: Forno elétrico, Liquidificador..." onChange={(e) => setElectricForm((c) => ({ ...c, name: e.target.value }))} disabled={saving} />
          </Field>
          <Field label="Potência (Watts)">
            <TextInput type="number" step="1" value={electricForm.powerWatts} onChange={(e) => setElectricForm((c) => ({ ...c, powerWatts: Number(e.target.value) }))} disabled={saving} />
          </Field>
          <div className="border-t border-[var(--line-soft)] pt-5 flex gap-3">
            <ActionButton onClick={() => runMutation(() => editingElectricId ? updateElectricEquipment(editingElectricId, electricForm) : createElectricEquipment(electricForm), `Equipamento ${editingElectricId ? 'atualizado' : 'criado'}.`, closePanel)} disabled={saving || !electricForm.name.trim()} className="flex-1 justify-center">
              {saving ? 'Salvando...' : editingElectricId ? 'Salvar alterações' : 'Criar equipamento'}
            </ActionButton>
            <ActionButton tone="secondary" onClick={closePanel} disabled={saving}>Cancelar</ActionButton>
          </div>
        </div>
      </SlidePanel>

      {/* Painel gás */}
      <SlidePanel open={panel === 'gas'} onClose={closePanel} title={editingGasEquipId ? 'Editar equipamento a gás' : 'Novo equipamento a gás'} description="Consumo usado para calcular o custo de gás por minuto.">
        <div className="space-y-5">
          <Field label="Nome do equipamento">
            <TextInput value={gasEquipForm.name} placeholder="ex: Fogão industrial, Forno a gás..." onChange={(e) => setGasEquipForm((c) => ({ ...c, name: e.target.value }))} disabled={saving} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Consumo por hora (kg/h)">
              <TextInput type="number" step="0.001" value={gasEquipForm.kgPerHour} onChange={(e) => setGasEquipForm((c) => ({ ...c, kgPerHour: Number(e.target.value) }))} disabled={saving} />
            </Field>
            <Field label="Capacidade do botijão (kg)">
              <TextInput type="number" step="0.01" value={gasEquipForm.bottleKg} onChange={(e) => setGasEquipForm((c) => ({ ...c, bottleKg: Number(e.target.value) }))} disabled={saving} />
            </Field>
          </div>
          <div className="border-t border-[var(--line-soft)] pt-5 flex gap-3">
            <ActionButton onClick={() => runMutation(() => editingGasEquipId ? updateGasEquipment(editingGasEquipId, gasEquipForm) : createGasEquipment(gasEquipForm), `Equipamento ${editingGasEquipId ? 'atualizado' : 'criado'}.`, closePanel)} disabled={saving || !gasEquipForm.name.trim()} className="flex-1 justify-center">
              {saving ? 'Salvando...' : editingGasEquipId ? 'Salvar alterações' : 'Criar equipamento'}
            </ActionButton>
            <ActionButton tone="secondary" onClick={closePanel} disabled={saving}>Cancelar</ActionButton>
          </div>
        </div>
      </SlidePanel>

      {/* Painel botijão */}
      <SlidePanel open={panel === 'bottle'} onClose={closePanel} title={editingGasBottleId ? 'Editar botijão' : 'Novo botijão'} description="Preço de referência usado no cálculo do custo de gás por minuto.">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Código">
              <TextInput value={gasBottleForm.code} placeholder="ex: P13, P45..." onChange={(e) => setGasBottleForm((c) => ({ ...c, code: e.target.value }))} disabled={saving} />
            </Field>
            <Field label="Capacidade (kg)">
              <TextInput type="number" step="0.01" value={gasBottleForm.capacityKg} onChange={(e) => setGasBottleForm((c) => ({ ...c, capacityKg: Number(e.target.value) }))} disabled={saving} />
            </Field>
          </div>
          <Field label="Preço (R$)">
            <TextInput type="number" step="0.01" value={gasBottleForm.price ?? ''} onChange={(e) => setGasBottleForm((c) => ({ ...c, price: e.target.value === '' ? null : Number(e.target.value) }))} disabled={saving} />
          </Field>
          <div className="border-t border-[var(--line-soft)] pt-5 flex gap-3">
            <ActionButton onClick={() => runMutation(() => editingGasBottleId ? updateGasBottle(editingGasBottleId, gasBottleForm) : createGasBottle(gasBottleForm), `Botijão ${editingGasBottleId ? 'atualizado' : 'criado'}.`, closePanel)} disabled={saving || !gasBottleForm.code.trim()} className="flex-1 justify-center">
              {saving ? 'Salvando...' : editingGasBottleId ? 'Salvar alterações' : 'Criar botijão'}
            </ActionButton>
            <ActionButton tone="secondary" onClick={closePanel} disabled={saving}>Cancelar</ActionButton>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
