import { useEffect, useState } from 'react';
import {
  ActionButton,
  Field,
  StatusMessage,
  TextInput,
} from '../../modules/ficha-tecnica/components/management-primitives';
import { SheetBlock } from '../../modules/ficha-tecnica/components/page-primitives';
import { getApiErrorMessage } from '../../modules/ficha-tecnica/lib/api-errors';
import { saveWorkbookSettings } from '../../modules/ficha-tecnica/lib/workbook-management-api';
import { useWorkbookSnapshot } from '../../modules/ficha-tecnica/lib/workbook-api';
import { useAuthStore } from '../../modules/ficha-tecnica/mock/auth.store';

type SettingsForm = {
  workDaysPerWeek: number;
  workHoursPerDay: number;
  targetMarginPercent: number;
  averageMonthlyKwh: number;
  electricOtherCosts: number;
  kwhPrice: number;
  cardFeePercent: number;
  deliveryFeePercent: number;
  commissionPercent: number;
  taxPercent: number;
  operationalCostPercent: number;
};

function InfoRow({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-[var(--bg-subtle)] px-4 py-3">
      <div className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[var(--brand-accent-600)]" />
      <div>
        <p className="text-sm font-medium text-[var(--text-strong)]">{label}</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
  const { data, reload } = useWorkbookSnapshot(isDemoSession);
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Não sobrescreve o formulário se o usuário já começou a editar — o profile
    // chega do Supabase depois do primeiro paint (carregamento incremental).
    if (dirty) return;
    const { profile } = data;
    setForm({
      workDaysPerWeek: profile.workDaysPerWeek ?? 7,
      workHoursPerDay: profile.workHoursPerDay ?? 8,
      targetMarginPercent: profile.targetMarginPercent ?? 25,
      averageMonthlyKwh: profile.averageMonthlyKwh ?? 0,
      electricOtherCosts: profile.electricOtherCosts ?? 0,
      kwhPrice: profile.kwhPrice ?? 0.65,
      cardFeePercent: profile.cardFeePercent ?? 0,
      deliveryFeePercent: profile.deliveryFeePercent ?? 0,
      commissionPercent: profile.commissionPercent ?? 0,
      taxPercent: profile.taxPercent ?? 0,
      operationalCostPercent: profile.operationalCostPercent ?? 0,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps restritas de proposito (fetch-on-mount/por-filtro; padrao legado auditado)
  }, [data.profile, dirty]);

  function set(field: keyof SettingsForm, raw: string) {
    const value = raw === '' ? 0 : Number(raw);
    if (isNaN(value)) return;
    setDirty(true);
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function handleSave() {
    if (!form || isDemoSession) return;
    try {
      setLoading(true);
      setMessage(null);
      await saveWorkbookSettings(form);
      setDirty(false);
      reload();
      setMessage({ tone: 'success', text: 'Configurações salvas com sucesso.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível salvar as configurações.') });
    } finally {
      setLoading(false);
    }
  }

  if (!form) return null;

  const totalFeesPercent = (form.cardFeePercent ?? 0) + (form.deliveryFeePercent ?? 0) + (form.commissionPercent ?? 0) + (form.taxPercent ?? 0) + (form.operationalCostPercent ?? 0);
  const effectiveMarginDivisor = 1 - (totalFeesPercent + (form.targetMarginPercent ?? 25)) / 100;
  const markupMultiplier = effectiveMarginDivisor > 0 ? (1 / effectiveMarginDivisor).toFixed(2) : '—';

  return (
    <div className="space-y-6">
      {isDemoSession ? <StatusMessage tone="error" message="Entre com a API para salvar configurações reais." /> : null}
      {message ? <StatusMessage tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.7fr]">
        <div className="space-y-5">
          <SheetBlock title="Precificação padrão">
            <p className="mb-4 text-sm text-[var(--text-muted)]">
              Estes valores são usados como padrão no simulador de precificação. Cada produto pode sobrescrever individualmente.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Margem de lucro desejada (%)">
                <TextInput
                  type="number"
                  step="0.01"
                  value={form.targetMarginPercent}
                  onChange={(e) => set('targetMarginPercent', e.target.value)}
                  disabled={loading || isDemoSession}
                />
              </Field>
              <Field label="Taxa de cartão (%)">
                <TextInput
                  type="number"
                  step="0.01"
                  value={form.cardFeePercent}
                  onChange={(e) => set('cardFeePercent', e.target.value)}
                  disabled={loading || isDemoSession}
                />
              </Field>
              <Field label="Taxa de delivery (%)">
                <TextInput
                  type="number"
                  step="0.01"
                  value={form.deliveryFeePercent}
                  onChange={(e) => set('deliveryFeePercent', e.target.value)}
                  disabled={loading || isDemoSession}
                />
              </Field>
              <Field label="Comissão (%)">
                <TextInput
                  type="number"
                  step="0.01"
                  value={form.commissionPercent}
                  onChange={(e) => set('commissionPercent', e.target.value)}
                  disabled={loading || isDemoSession}
                />
              </Field>
              <Field label="Impostos (%)">
                <TextInput
                  type="number"
                  step="0.01"
                  value={form.taxPercent}
                  onChange={(e) => set('taxPercent', e.target.value)}
                  disabled={loading || isDemoSession}
                />
              </Field>
              <Field label="Custo operacional extra (%)">
                <TextInput
                  type="number"
                  step="0.01"
                  value={form.operationalCostPercent}
                  onChange={(e) => set('operationalCostPercent', e.target.value)}
                  disabled={loading || isDemoSession}
                />
              </Field>
            </div>
          </SheetBlock>

          <SheetBlock title="Operacional">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Dias de trabalho por semana">
                <TextInput
                  type="number"
                  step="0.5"
                  value={form.workDaysPerWeek}
                  onChange={(e) => set('workDaysPerWeek', e.target.value)}
                  disabled={loading || isDemoSession}
                />
              </Field>
              <Field label="Horas de trabalho por dia">
                <TextInput
                  type="number"
                  step="0.5"
                  value={form.workHoursPerDay}
                  onChange={(e) => set('workHoursPerDay', e.target.value)}
                  disabled={loading || isDemoSession}
                />
              </Field>
              <Field label="Consumo elétrico médio mensal (kWh)">
                <TextInput
                  type="number"
                  step="1"
                  value={form.averageMonthlyKwh}
                  onChange={(e) => set('averageMonthlyKwh', e.target.value)}
                  disabled={loading || isDemoSession}
                />
              </Field>
              <Field label="Preço do kWh (R$)">
                <TextInput
                  type="number"
                  step="0.01"
                  value={form.kwhPrice}
                  onChange={(e) => set('kwhPrice', e.target.value)}
                  disabled={loading || isDemoSession}
                />
              </Field>
              <Field label="Outros custos elétricos (R$)">
                <TextInput
                  type="number"
                  step="0.01"
                  value={form.electricOtherCosts}
                  onChange={(e) => set('electricOtherCosts', e.target.value)}
                  disabled={loading || isDemoSession}
                />
              </Field>
            </div>
          </SheetBlock>

          <div className="flex">
            <ActionButton onClick={() => void handleSave()} disabled={loading || isDemoSession}>
              {loading ? 'Salvando…' : 'Salvar configurações'}
            </ActionButton>
          </div>
        </div>

        <div className="space-y-5">
          <SheetBlock title="Resumo de precificação">
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--bg-subtle)] p-4 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-soft)]">Total de deduções</p>
                <p className="mt-1.5 text-3xl font-bold text-red-500">{totalFeesPercent.toFixed(2).replace('.', ',')}%</p>
                <p className="mt-0.5 text-xs text-[var(--text-soft)]">taxas + impostos + extras</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--bg-subtle)] p-4 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-soft)]">Margem alvo</p>
                  <p className="mt-1.5 text-2xl font-bold text-[var(--brand-accent-600)]">{form.targetMarginPercent.toFixed(0)}%</p>
                </div>
                <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--bg-subtle)] p-4 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-soft)]">Markup</p>
                  <p className="mt-1.5 text-2xl font-bold text-[var(--text-strong)]">{markupMultiplier}×</p>
                </div>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                <p className="text-xs font-medium text-amber-700">
                  Com estas configurações, um produto com custo de <span className="font-bold">R$ 10,00</span> teria preço sugerido de{' '}
                  <span className="font-bold">
                    R$ {effectiveMarginDivisor > 0 ? (10 / effectiveMarginDivisor).toFixed(2).replace('.', ',') : '—'}
                  </span>.
                </p>
              </div>
            </div>
          </SheetBlock>

          <SheetBlock title="O que cada campo representa">
            <div className="space-y-2">
              <InfoRow label="Margem de lucro" description="Percentual do preço final que você deseja como lucro (contribuição)." />
              <InfoRow label="Taxa de cartão" description="Percentual cobrado pela maquininha ou gateway de pagamento." />
              <InfoRow label="Taxa de delivery" description="Comissão do app de delivery (iFood, Rappi, etc.)." />
              <InfoRow label="Comissão" description="Comissão de vendedores ou representantes comerciais." />
              <InfoRow label="Impostos" description="Alíquota total de impostos sobre a receita (Simples, ISS, etc.)." />
              <InfoRow label="Custo operacional extra" description="Percentual adicional para cobrir custos não mapeados." />
            </div>
          </SheetBlock>
        </div>
      </div>
    </div>
  );
}
