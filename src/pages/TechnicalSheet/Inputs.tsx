import { useEffect, useMemo, useState } from 'react';
import { StockMovementType } from '../../modules/ficha-tecnica/types/enums';
import { formatBRL, formatDate } from '../../modules/ficha-tecnica/utils';
import {
  ActionButton,
  Field,
  SelectInput,
  StatusMessage,
  TextInput,
} from '../../modules/ficha-tecnica/components/management-primitives';
import { HighlightCard, SheetBlock } from '../../modules/ficha-tecnica/components/page-primitives';
import { getApiErrorMessage } from '../../modules/ficha-tecnica/lib/api-errors';
import { getInventoryItemDetail, registerStockMovement, type InventoryItemDetail } from '../../modules/ficha-tecnica/lib/inventory-management-api';
import { getToneClassName } from '../../modules/ficha-tecnica/mock/technical-sheet-data';
import { useWorkbookSnapshot } from '../../modules/ficha-tecnica/lib/workbook-api';
import { useAuthStore } from '../../modules/ficha-tecnica/mock/auth.store';

const emptyMovementForm = {
  type: StockMovementType.ENTRADA,
  quantity: 1,
  unitCost: 0,
  notes: '',
  reference: '',
};

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  AJUSTE: 'Ajuste',
  PERDA: 'Perda',
};

export default function InputsPage() {
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
  const { data, source, reload } = useWorkbookSnapshot(isDemoSession);
  const [selectedInputId, setSelectedInputId] = useState('');
  const [movementForm, setMovementForm] = useState(emptyMovementForm);
  const [itemDetail, setItemDetail] = useState<InventoryItemDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!selectedInputId && data.inputs[0]?.id) {
      setSelectedInputId(data.inputs[0].id);
    }
  }, [data.inputs, selectedInputId]);

  useEffect(() => {
    let active = true;

    if (!selectedInputId || isDemoSession) {
      setItemDetail(null);
      return;
    }

    setLoadingDetail(true);

    getInventoryItemDetail(selectedInputId)
      .then((detail) => {
        if (!active) return;
        setItemDetail(detail);
      })
      .catch((error) => {
        if (!active) return;
        setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível carregar o histórico do insumo.') });
      })
      .finally(() => {
        if (active) setLoadingDetail(false);
      });

    return () => {
      active = false;
    };
  }, [selectedInputId, isDemoSession]);

  const selectedInput = useMemo(
    () => data.inputs.find((input) => input.id === selectedInputId) ?? data.inputs[0] ?? null,
    [data.inputs, selectedInputId],
  );

  const derivedMetrics = useMemo(() => {
    if (!selectedInput) return { aproveitamentoPercent: 0, perdaPercent: 0, fator: 0, realPrice: 0 };
    const fator = selectedInput.factor;
    const aproveitamentoPercent = fator > 0 ? Math.min(100, (1 / fator) * 100) : 0;
    return {
      aproveitamentoPercent,
      perdaPercent: Math.max(0, 100 - aproveitamentoPercent),
      fator,
      realPrice: selectedInput.price * fator,
    };
  }, [selectedInput]);

  const currentStockLabel = itemDetail
    ? Number(itemDetail.currentStock).toLocaleString('pt-BR')
    : selectedInput ? selectedInput.grossQuantity.toLocaleString('pt-BR') : '—';
  const minStockLabel =
    itemDetail?.minStock !== null && itemDetail?.minStock !== undefined
      ? Number(itemDetail.minStock).toLocaleString('pt-BR')
      : '—';

  async function handleMovementSubmit() {
    if (!selectedInput || isDemoSession) return;
    try {
      setSaving(true);
      setMessage(null);
      await registerStockMovement({
        itemId: selectedInput.id,
        type: movementForm.type,
        quantity: Number(movementForm.quantity),
        unitCost: movementForm.unitCost > 0 ? Number(movementForm.unitCost) : undefined,
        notes: movementForm.notes || undefined,
        reference: movementForm.reference || undefined,
      });
      reload();
      if (!isDemoSession) {
        const detail = await getInventoryItemDetail(selectedInput.id);
        setItemDetail(detail);
      }
      setMovementForm(emptyMovementForm);
      setMessage({ tone: 'success', text: 'Movimentação registrada com sucesso.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível registrar a movimentação.') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <HighlightCard label="Insumos mapeados" value={String(data.inputs.length)} toneClassName={getToneClassName('pink')} />
        <HighlightCard label="Preço médio" value={formatBRL(data.inputs.reduce((sum, row) => sum + row.price, 0) / Math.max(data.inputs.length, 1))} toneClassName={getToneClassName('lime')} />
        <HighlightCard label="Fator médio" value={data.inputs.length ? data.inputs.reduce((sum, row) => sum + row.factor, 0).toFixed(2).replace('.', ',') : '0,00'} toneClassName={getToneClassName('amber')} />
        <HighlightCard label={`Fonte ${source === 'api' ? '(API)' : '(demo)'}`} value={selectedInput ? selectedInput.name : '—'} toneClassName={getToneClassName('green')} />
      </div>

      {isDemoSession ? <StatusMessage tone="error" message="Entre com a API para registrar movimentações e atualizar estoque real." /> : null}
      {message ? <StatusMessage tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SheetBlock title="Visão operacional de insumos">
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {[
                    { label: 'Cód.', align: 'left' },
                    { label: 'Material', align: 'left' },
                    { label: 'Qtd.', align: 'right' },
                    { label: 'Unid.', align: 'left' },
                    { label: 'Preço', align: 'right' },
                    { label: 'Fator', align: 'right' },
                    { label: 'Porção real', align: 'right' },
                    { label: '', align: 'right' },
                  ].map((col) => (
                    <th key={col.label} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.inputs.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-100 transition-colors last:border-0 ${row.id === selectedInput?.id ? 'bg-amber-50/60' : 'hover:bg-gray-50/60'}`}
                  >
                    <td className="px-4 py-3 text-[11px] font-semibold text-[#C9A84C]">{row.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.grossQuantity.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-gray-500">{row.unit}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatBRL(row.price)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.factor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#C9A84C]">{formatBRL(row.price * row.factor)}</td>
                    <td className="px-4 py-3 text-right">
                      <ActionButton tone="secondary" className="px-3 py-1.5 text-xs" onClick={() => setSelectedInputId(row.id)}>
                        Selecionar
                      </ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SheetBlock>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Aproveitamento</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{derivedMetrics.aproveitamentoPercent.toFixed(2).replace('.', ',')}%</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Perda</p>
              <p className="mt-2 text-2xl font-bold text-red-500">{derivedMetrics.perdaPercent.toFixed(2).replace('.', ',')}%</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Fator de correção</p>
              <p className="mt-2 text-2xl font-bold text-[#C9A84C]">{derivedMetrics.fator ? derivedMetrics.fator.toFixed(2).replace('.', ',') : '—'}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Preço real</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{selectedInput ? formatBRL(derivedMetrics.realPrice) : '—'}</p>
            </div>
          </div>

          <SheetBlock title="Movimentação de estoque">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Insumo">
                  <SelectInput value={selectedInputId} onChange={(event) => setSelectedInputId(event.target.value)} disabled={saving}>
                    {data.inputs.map((row) => (
                      <option key={row.id} value={row.id}>{row.name}</option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Tipo">
                  <SelectInput value={movementForm.type} onChange={(event) => setMovementForm((current) => ({ ...current, type: event.target.value as StockMovementType }))} disabled={saving || isDemoSession}>
                    {Object.values(StockMovementType).map((type) => (
                      <option key={type} value={type}>{MOVEMENT_TYPE_LABELS[type] ?? type}</option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Quantidade">
                  <TextInput type="number" min="0.01" step="0.01" value={movementForm.quantity} onChange={(event) => setMovementForm((current) => ({ ...current, quantity: Number(event.target.value) }))} disabled={saving || isDemoSession} />
                </Field>
                <Field label="Custo unitário">
                  <TextInput type="number" min="0" step="0.01" value={movementForm.unitCost} onChange={(event) => setMovementForm((current) => ({ ...current, unitCost: Number(event.target.value) }))} disabled={saving || isDemoSession} />
                </Field>
                <Field label="Referência">
                  <TextInput value={movementForm.reference} onChange={(event) => setMovementForm((current) => ({ ...current, reference: event.target.value }))} disabled={saving || isDemoSession} />
                </Field>
                <Field label="Observações">
                  <TextInput value={movementForm.notes} onChange={(event) => setMovementForm((current) => ({ ...current, notes: event.target.value }))} disabled={saving || isDemoSession} />
                </Field>
              </div>
              <ActionButton onClick={() => void handleMovementSubmit()} disabled={saving || isDemoSession || !selectedInputId || movementForm.quantity <= 0}>
                {saving ? 'Registrando...' : 'Registrar movimentação'}
              </ActionButton>
            </div>
          </SheetBlock>

          <SheetBlock title="Parâmetros do insumo">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Preço base</p>
                <p className="mt-1.5 text-xl font-bold text-gray-900">{selectedInput ? formatBRL(selectedInput.price) : '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Última compra</p>
                <p className="mt-1.5 text-xl font-bold text-gray-900">{selectedInput?.purchaseDate ? formatDate(selectedInput.purchaseDate) : '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Estoque atual</p>
                <p className="mt-1.5 text-xl font-bold text-gray-900">{currentStockLabel}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Estoque mínimo</p>
                <p className="mt-1.5 text-xl font-bold text-gray-900">{minStockLabel}</p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-4 text-sm text-gray-600">
              <p><span className="font-semibold text-gray-800">Fornecedor:</span> {selectedInput?.supplier ?? '—'}</p>
              <p><span className="font-semibold text-gray-800">Categoria:</span> {itemDetail?.category?.name ?? selectedInput?.categoryName ?? '—'}</p>
              <p><span className="font-semibold text-gray-800">Unidade:</span> {itemDetail?.uom?.abbreviation ?? selectedInput?.unit ?? '—'}</p>
            </div>
          </SheetBlock>

          <SheetBlock title="Histórico de movimentações">
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['Data', 'Tipo', 'Qtd.', 'Custo', 'Referência', 'Obs.'].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itemDetail?.stockMovements.length ? (
                    itemDetail.stockMovements.map((movement) => (
                      <tr key={movement.id} className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/60">
                        <td className="px-4 py-3 text-gray-600">{formatDate(movement.movedAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            movement.type === 'ENTRADA' ? 'bg-emerald-50 text-emerald-700'
                            : movement.type === 'SAIDA' ? 'bg-blue-50 text-blue-700'
                            : movement.type === 'PERDA' ? 'bg-red-50 text-red-600'
                            : 'bg-gray-100 text-gray-500'
                          }`}>
                            {MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{Number(movement.quantity).toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-3 text-gray-600">{movement.unitCost == null ? '—' : formatBRL(Number(movement.unitCost))}</td>
                        <td className="px-4 py-3 text-gray-500">{movement.reference ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{movement.notes ?? '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                        {loadingDetail ? 'Carregando histórico...' : 'Nenhuma movimentação encontrada para este insumo.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SheetBlock>
        </div>
      </div>
    </div>
  );
}
