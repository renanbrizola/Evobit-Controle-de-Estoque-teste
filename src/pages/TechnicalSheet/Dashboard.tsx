

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChefHat,
  Package,
  Tag,
  TrendingUp,
  Users,
  Zap,
  Flame,
} from 'lucide-react';
import { formatBRL } from '../../modules/ficha-tecnica/utils/index';
import {
  ActionButton,
  Field,
  StatusMessage,
  TextInput,
} from '../../modules/ficha-tecnica/components/management-primitives';
import { getApiErrorMessage } from '../../modules/ficha-tecnica/lib/api-errors';
import { useWorkbookSnapshot } from '../../modules/ficha-tecnica/lib/workbook-api';
import { saveWorkbookSettings, type WorkbookSettingsPayload } from '../../modules/ficha-tecnica/lib/workbook-management-api';
import { useAuthStore } from '../../modules/ficha-tecnica/mock/auth.store';

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-[var(--line-soft)] bg-[var(--bg-surface)] px-5 py-4 shadow-[var(--shadow-panel)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-soft)]">{label}</p>
      <p className={`mt-2.5 text-[26px] font-bold leading-none tracking-tight ${accent ? 'text-[var(--brand-accent-600)]' : 'text-[var(--text-strong)]'}`}>
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-xs text-[var(--text-muted)]">{sub}</p> : null}
    </div>
  );
}

function CostBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">{label}</span>
        <span className="font-semibold text-[var(--text-strong)]">{formatBRL(value)}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line-soft)]">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="w-9 text-right text-[11px] text-[var(--text-soft)]">{pct}%</span>
      </div>
    </div>
  );
}

function NavCard({
  icon: Icon,
  label,
  value,
  href,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  href: string;
  color: string;
}) {
  return (
    <Link
      to={href}
      className="group flex items-center gap-3 rounded-[var(--radius-panel)] border border-[var(--line-soft)] bg-[var(--bg-surface)] px-4 py-3.5 shadow-[var(--shadow-panel)] transition-all hover:border-[var(--line-strong)] hover:shadow-md"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-soft)]">{label}</p>
        <p className="mt-0.5 text-lg font-bold leading-none text-[var(--text-strong)]">{value}</p>
      </div>
      <ArrowRight size={14} className="shrink-0 text-[var(--line-strong)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text-muted)]" />
    </Link>
  );
}

export default function DashboardPage() {
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
  const { data, source, reload } = useWorkbookSnapshot(isDemoSession);
  const profile = data.profile;

  const [form, setForm] = useState<WorkbookSettingsPayload>({
    workDaysPerWeek: 0,
    workHoursPerDay: 0,
    targetMarginPercent: 0,
    averageMonthlyKwh: 0,
    electricOtherCosts: 0,
    kwhPrice: 0,
  });
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setForm({
      workDaysPerWeek: profile.workDaysPerWeek,
      workHoursPerDay: profile.workHoursPerDay,
      targetMarginPercent: profile.targetMarginPercent,
      averageMonthlyKwh: profile.averageMonthlyKwh,
      electricOtherCosts: profile.electricOtherCosts,
      kwhPrice: profile.kwhPrice,
    });
  }, [profile]);

  const updateField = (field: keyof WorkbookSettingsPayload, value: string) =>
    setForm((c) => ({ ...c, [field]: Number(value) }));

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      await saveWorkbookSettings(form);
      reload();
      setSuccessMessage('Parâmetros salvos.');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Não foi possível salvar os parâmetros.'));
    } finally {
      setSaving(false);
    }
  };

  // Cost breakdown
  // fixedTotal já inclui a folha de pagamento como item de despesa fixa,
  // portanto o total correto é fixedTotal + variableTotal (sem somar payroll novamente)
  const fixedTotal = data.expenses.fixed.reduce((sum, e) => sum + e.amount, 0);
  const variableTotal = data.expenses.variable.reduce((sum, e) => sum + e.amount, 0);
  const otherFixed = fixedTotal - profile.monthlyPayroll;
  const costTotal = fixedTotal + variableTotal;

  return (
    <div className="space-y-5">
      {isDemoSession ? (
        <StatusMessage tone="error" message={`Modo demonstração${source === 'demo' ? ' — dados fictícios' : ''}. Conecte a API para dados reais.`} />
      ) : null}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Custo operacional / mês"
          value={formatBRL(profile.monthlyOperatingCost)}
          sub={`${formatBRL(profile.operationalCostDay)} por dia`}
          accent
        />
        <KpiCard
          label="Custo por minuto"
          value={formatBRL(profile.operationalCostMinute)}
          sub={`${formatBRL(profile.operationalCostHour)} por hora`}
        />
        <KpiCard
          label="Funcionários ativos"
          value={String(profile.activeEmployees)}
          sub={`Folha: ${formatBRL(profile.monthlyPayroll)}`}
        />
        <KpiCard
          label="Margem alvo"
          value={`${profile.targetMarginPercent.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%`}
          sub={`Preço médio: ${formatBRL(data.summary.averageSuggestedPrice)}`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        {/* Composição de custos */}
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line-soft)] bg-[var(--bg-surface)] shadow-[var(--shadow-panel)]">
          <div className="flex items-center gap-2.5 border-b border-[var(--line-soft)] bg-[var(--bg-subtle)] px-5 py-3">
            <div className="h-3 w-[3px] shrink-0 rounded-full bg-[var(--brand-accent-600)]" />
            <h2 className="text-[13px] font-semibold text-[var(--text-strong)]">Composição de custos mensais</h2>
          </div>
          <div className="space-y-4 p-5">
            <CostBar label="Folha de pagamento" value={profile.monthlyPayroll} total={costTotal} color="bg-[var(--state-success-700)]" />
            <CostBar label="Despesas fixas" value={otherFixed} total={costTotal} color="bg-[var(--state-info-700)]" />
            <CostBar label="Despesas variáveis" value={variableTotal} total={costTotal} color="bg-[var(--state-warning-700)]" />

            <div className="mt-2 flex items-center justify-between border-t border-[var(--line-soft)] pt-4">
              <span className="text-sm font-semibold text-[var(--text-strong)]">Total identificado</span>
              <span className="text-lg font-bold text-[var(--text-strong)]">{formatBRL(costTotal)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <Link to="/app/ficha-tecnica/funcionarios" className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--line-soft)] px-3 py-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)]">
                <Users size={12} /> Equipe
              </Link>
              <Link to="/app/ficha-tecnica/despesas" className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--line-soft)] px-3 py-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)]">
                <TrendingUp size={12} /> Despesas
              </Link>
              <Link to="/app/ficha-tecnica/equipamentos" className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--line-soft)] px-3 py-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)]">
                <Zap size={12} /> Equipamentos
              </Link>
            </div>
          </div>
        </div>

        {/* Visão geral do sistema */}
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line-soft)] bg-[var(--bg-surface)] shadow-[var(--shadow-panel)]">
          <div className="flex items-center gap-2.5 border-b border-[var(--line-soft)] bg-[var(--bg-subtle)] px-5 py-3">
            <div className="h-3 w-[3px] shrink-0 rounded-full bg-[var(--brand-accent-600)]" />
            <h2 className="text-[13px] font-semibold text-[var(--text-strong)]">Visão geral do sistema</h2>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <NavCard icon={ChefHat} label="Fichas técnicas" value={data.summary.totalRecipes} href="/app/ficha-tecnica/fichas" color="bg-[var(--brand-accent-600)]" />
            <NavCard icon={Package} label="Insumos" value={data.summary.totalInventoryItems} href="/app/ficha-tecnica/insumos" color="bg-[var(--state-info-700)]" />
            <NavCard icon={Tag} label="Prod. precificados" value={data.summary.totalPricedProducts} href="/app/ficha-tecnica/precificacao" color="bg-[var(--state-success-700)]" />
            <NavCard icon={TrendingUp} label="Preços ativos" value={data.summary.activePrices ?? 0} href="/app/ficha-tecnica/precificacao" color="bg-[var(--brand-primary-600)]" />
            <NavCard icon={Users} label="Funcionários" value={profile.activeEmployees} href="/app/ficha-tecnica/funcionarios" color="bg-[var(--state-warning-700)]" />
            <NavCard icon={Flame} label="Equipamentos" value={`${data.utilities.electricEquipments.length + data.utilities.gasEquipments.length}`} href="/app/ficha-tecnica/equipamentos" color="bg-[var(--state-danger-700)]" />
          </div>
        </div>
      </div>

      {/* Parâmetros operacionais */}
      <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line-soft)] bg-[var(--bg-surface)] shadow-[var(--shadow-panel)]">
        <div className="flex items-center gap-2.5 border-b border-[var(--line-soft)] bg-[var(--bg-subtle)] px-5 py-3">
          <div className="h-3 w-[3px] shrink-0 rounded-full bg-[var(--brand-accent-600)]" />
          <h2 className="text-[13px] font-semibold text-[var(--text-strong)]">Parâmetros operacionais</h2>
          <span className="ml-1 text-[13px] font-normal text-[var(--text-soft)]">· base para cálculo de custos e energia</span>
        </div>
        <div className="p-5 space-y-4">
          {successMessage ? <StatusMessage tone="success" message={successMessage} onDismiss={() => setSuccessMessage('')} /> : null}
          {errorMessage ? <StatusMessage tone="error" message={errorMessage} onDismiss={() => setErrorMessage('')} /> : null}
          {isDemoSession ? <StatusMessage tone="error" message="Entre com a API para salvar alterações reais." /> : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <Field label="Dias por semana">
              <TextInput type="number" min="0" step="0.1" value={form.workDaysPerWeek} onChange={(e) => updateField('workDaysPerWeek', e.target.value)} disabled={saving || isDemoSession} />
            </Field>
            <Field label="Horas por dia">
              <TextInput type="number" min="0" step="0.1" value={form.workHoursPerDay} onChange={(e) => updateField('workHoursPerDay', e.target.value)} disabled={saving || isDemoSession} />
            </Field>
            <Field label="Margem alvo (%)">
              <TextInput type="number" min="0" step="0.1" value={form.targetMarginPercent} onChange={(e) => updateField('targetMarginPercent', e.target.value)} disabled={saving || isDemoSession} />
            </Field>
            <Field label="Consumo médio (kWh)">
              <TextInput type="number" min="0" step="0.1" value={form.averageMonthlyKwh} onChange={(e) => updateField('averageMonthlyKwh', e.target.value)} disabled={saving || isDemoSession} />
            </Field>
            <Field label="Outros custos elét.">
              <TextInput type="number" min="0" step="0.01" value={form.electricOtherCosts} onChange={(e) => updateField('electricOtherCosts', e.target.value)} disabled={saving || isDemoSession} />
            </Field>
            <Field label="Preço do kWh">
              <TextInput type="number" min="0" step="0.01" value={form.kwhPrice} onChange={(e) => updateField('kwhPrice', e.target.value)} disabled={saving || isDemoSession} />
            </Field>
          </div>

          <div className="flex items-center gap-4">
            <ActionButton onClick={handleSave} disabled={saving || isDemoSession}>
              {saving ? 'Salvando...' : 'Salvar parâmetros'}
            </ActionButton>
            <div className="flex gap-6 text-sm text-[var(--text-muted)]">
              <span>Folha mensal: <strong className="text-[var(--state-success-700)]">{formatBRL(profile.monthlyPayroll)}</strong></span>
              <span>Custo mensal: <strong className="text-[var(--brand-accent-600)]">{formatBRL(profile.monthlyOperatingCost)}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
