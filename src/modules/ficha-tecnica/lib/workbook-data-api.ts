'use client';

// Fase 2 (Opcao C): leitura real das secoes do workbench a partir do Supabase,
// montando o formato esperado pelo snapshot (WorkbookSnapshotDto).
import { supabase } from '../../../lib/supabaseClient';

const MONTHS_PER_WEEK = 52 / 12; // ~4.333 semanas por mes
const FALLBACK_MONTHLY_HOURS = 220; // convencao do cost-calculator.ts

type AnyRow = Record<string, unknown>;

const num = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

async function fetchTable(table: string): Promise<AnyRow[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AnyRow[];
}

/**
 * Busca as secoes do workbench (config, despesas, funcionarios, utilidades)
 * e devolve no formato das secoes do WorkbookSnapshotDto. RLS no Supabase
 * ja restringe ao dono/equipe, entao nao filtramos user_id aqui.
 */
export async function fetchWorkbookSections() {
  const [settingsRes, expenses, depreciation, staff, electric, gas, bottles] = await Promise.all([
    supabase.from('ft_workbook_settings').select('*').limit(1),
    fetchTable('ft_operating_expenses'),
    fetchTable('ft_depreciation_assets'),
    fetchTable('ft_staff'),
    fetchTable('ft_electric_equipment'),
    fetchTable('ft_gas_equipment'),
    fetchTable('ft_gas_bottles'),
  ]);

  if (settingsRes.error) throw new Error(settingsRes.error.message);
  const s = (settingsRes.data?.[0] ?? {}) as AnyRow;

  const workDaysPerWeek = num(s.work_days_per_week, 6);
  const workHoursPerDay = num(s.work_hours_per_day, 8);
  const kwhPrice = num(s.kwh_price);
  const averageMonthlyKwh = num(s.average_monthly_kwh);

  // ── Funcionarios ──────────────────────────────────────────────
  const staffSection = staff.map((row, index) => {
    const totalCost =
      num(row.salary) + num(row.fgts) + num(row.thirteenth) + num(row.vacation) + num(row.fgts_vacation);
    const weeklyHours = num(row.weekly_hours);
    const monthlyHours = weeklyHours > 0 ? weeklyHours * MONTHS_PER_WEEK : FALLBACK_MONTHLY_HOURS;
    const minuteCost = monthlyHours > 0 ? totalCost / (monthlyHours * 60) : 0;
    return {
      id: String(row.id),
      active: Boolean(row.is_active),
      name: String(row.name ?? ''),
      role: String(row.role ?? ''),
      salary: num(row.salary),
      fgts: num(row.fgts),
      thirteenth: num(row.thirteenth),
      vacation: num(row.vacation),
      fgtsVacation: num(row.fgts_vacation),
      totalCost,
      weeklyHours,
      minuteCost,
      sortOrder: num(row.sort_order, index),
    };
  });

  const monthlyPayroll = staffSection
    .filter((row) => row.active)
    .reduce((sum, row) => sum + row.totalCost, 0);

  // ── Despesas ──────────────────────────────────────────────────
  const fixed = expenses
    .filter((row) => row.type === 'FIXED')
    .map((row, index) => ({
      id: String(row.id),
      type: 'FIXED' as const,
      name: String(row.name ?? ''),
      amount: num(row.amount),
      sortOrder: num(row.sort_order, index),
    }));

  const variable = expenses
    .filter((row) => row.type === 'VARIABLE')
    .map((row, index) => ({
      id: String(row.id),
      type: 'VARIABLE' as const,
      name: String(row.name ?? ''),
      amount: num(row.amount),
      sortOrder: num(row.sort_order, index),
    }));

  const depreciationSection = depreciation.map((row, index) => ({
    id: String(row.id),
    category: String(row.category ?? ''),
    assetName: String(row.asset_name ?? ''),
    invoiceValue: num(row.invoice_value),
    linear: Boolean(row.linear),
    sortOrder: num(row.sort_order, index),
  }));

  const monthlyOperatingCost = [...fixed, ...variable].reduce((sum, row) => sum + row.amount, 0);

  // ── Custo operacional (derivacoes padrao) ─────────────────────
  const workDaysPerMonth = workDaysPerWeek * MONTHS_PER_WEEK;
  const totalMonthlyCost = monthlyOperatingCost + monthlyPayroll;
  const operationalCostDay = workDaysPerMonth > 0 ? totalMonthlyCost / workDaysPerMonth : 0;
  const operationalCostHour = workHoursPerDay > 0 ? operationalCostDay / workHoursPerDay : 0;
  const operationalCostMinute = operationalCostHour / 60;

  // ── Utilidades ────────────────────────────────────────────────
  const electricEquipments = electric.map((row, index) => {
    const powerWatts = num(row.power_watts);
    // kWh por minuto * preco do kWh
    const minuteCost = ((powerWatts / 1000) * kwhPrice) / 60;
    return {
      id: String(row.id),
      name: String(row.name ?? ''),
      powerWatts,
      minuteCost,
      kwhLabel: '',
      sortOrder: num(row.sort_order, index),
    };
  });

  const gasEquipments = gas.map((row, index) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    kgPerHour: num(row.kg_per_hour),
    bottleKg: num(row.bottle_kg),
    // custo/minuto do gas depende do preco do botijao; refinado em etapa futura
    minuteCost: 0,
    sortOrder: num(row.sort_order, index),
  }));

  const gasBottles = bottles.map((row, index) => ({
    id: String(row.id),
    code: String(row.code ?? ''),
    capacityKg: num(row.capacity_kg),
    price: row.price == null ? null : num(row.price),
    sortOrder: num(row.sort_order, index),
  }));

  const energyBands = (() => {
    const bands = [
      { description: 'Ate 30 kWs', size: 30 },
      { description: '31 a 100 kWs', size: 70 },
      { description: '101 a 220 kWs', size: 120 },
      { description: 'Acima de 220 kWs', size: Infinity },
    ];
    let remaining = averageMonthlyKwh;
    return bands.map((band) => {
      const kws = band.size === Infinity ? Math.max(remaining, 0) : Math.min(Math.max(remaining, 0), band.size);
      remaining = band.size === Infinity ? 0 : Math.max(remaining - kws, 0);
      return { description: band.description, kws, pricePerKwh: kwhPrice };
    });
  })();

  return {
    profile: {
      workDaysPerWeek,
      workHoursPerDay,
      targetMarginPercent: num(s.target_margin_percent),
      activeEmployees: staffSection.filter((row) => row.active).length,
      monthlyPayroll,
      monthlyOperatingCost,
      operationalCostDay,
      operationalCostHour,
      operationalCostMinute,
      averageMonthlyKwh,
      electricOtherCosts: num(s.electric_other_costs),
      kwhPrice,
      cardFeePercent: num(s.card_fee_percent),
      deliveryFeePercent: num(s.delivery_fee_percent),
      commissionPercent: num(s.commission_percent),
      taxPercent: num(s.tax_percent),
      operationalCostPercent: num(s.operational_cost_percent),
    },
    expenses: { fixed, variable, depreciation: depreciationSection },
    staff: staffSection,
    utilities: { electricEquipments, gasEquipments, gasBottles, energyBands },
  };
}

/**
 * Seções do workbook VAZIAS (sem dados mock). Usado como estado inicial e como
 * fallback quando a sessão é real, para nunca exibir os cadastros fictícios.
 */
export function emptyWorkbookSections() {
  return {
    profile: {
      workDaysPerWeek: 6,
      workHoursPerDay: 8,
      targetMarginPercent: 0,
      activeEmployees: 0,
      monthlyPayroll: 0,
      monthlyOperatingCost: 0,
      operationalCostDay: 0,
      operationalCostHour: 0,
      operationalCostMinute: 0,
      averageMonthlyKwh: 0,
      electricOtherCosts: 0,
      kwhPrice: 0,
      cardFeePercent: 0,
      deliveryFeePercent: 0,
      commissionPercent: 0,
      taxPercent: 0,
      operationalCostPercent: 0,
    },
    expenses: { fixed: [], variable: [], depreciation: [] },
    staff: [],
    utilities: { electricEquipments: [], gasEquipments: [], gasBottles: [], energyBands: [] },
  };
}
