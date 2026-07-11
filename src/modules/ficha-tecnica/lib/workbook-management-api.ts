'use client';

// Fase 2 (Opcao C): persistencia real online-first via Supabase, sem ocupar
// colecoes do RxDB. Espelha o padrao de api.teams (services/api.js).
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUser, canTeamMember } from '../../../services/authHelper';

export interface WorkbookSettingsPayload {
  workDaysPerWeek: number;
  workHoursPerDay: number;
  targetMarginPercent: number;
  averageMonthlyKwh: number;
  electricOtherCosts: number;
  kwhPrice: number;
  cardFeePercent?: number;
  deliveryFeePercent?: number;
  commissionPercent?: number;
  taxPercent?: number;
  operationalCostPercent?: number;
}

export interface OperatingExpensePayload {
  type: 'FIXED' | 'VARIABLE';
  name: string;
  amount: number;
  sortOrder?: number;
}

export interface DepreciationAssetPayload {
  category: string;
  assetName: string;
  invoiceValue: number;
  linear: boolean;
  sortOrder?: number;
}

export interface StaffMemberPayload {
  isActive: boolean;
  name: string;
  role: string;
  salary: number;
  fgts: number;
  thirteenth: number;
  vacation: number;
  fgtsVacation: number;
  weeklyHours: number;
  sortOrder?: number;
}

export interface ElectricEquipmentPayload {
  name: string;
  powerWatts: number;
  sortOrder?: number;
}

export interface GasEquipmentPayload {
  name: string;
  kgPerHour: number;
  bottleKg: number;
  sortOrder?: number;
}

export interface GasBottlePayload {
  code: string;
  capacityKg: number;
  price?: number | null;
  sortOrder?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
type Row = Record<string, unknown>;

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    throw new Error('Sessao expirada. Faca login novamente para salvar os dados.');
  }
  // Modo equipe: membro precisa da permissão de ficha técnica liberada pelo
  // dono; os dados do workbook pertencem ao dono da loja (user_id = ownerId).
  if (!canTeamMember(user, ['technical_sheet_write'])) {
    throw new Error('Você não tem permissão para editar a ficha técnica. Peça ao proprietário da conta.');
  }
  return user.ownerId || user.id;
}

const nowIso = () => new Date().toISOString();

async function insertRow(table: string, row: Row) {
  const user_id = await requireUserId();
  const { data, error } = await supabase.from(table).insert({ ...row, user_id }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateRow(table: string, id: string, row: Row) {
  await requireUserId(); // valida sessão + permissão de equipe
  const { data, error } = await supabase
    .from(table)
    .update({ ...row, updated_at: nowIso() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function softDeleteRow(table: string, id: string) {
  await requireUserId(); // valida sessão + permissão de equipe
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: nowIso(), updated_at: nowIso() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ─── Configuracoes (singleton por usuario) ─────────────────────────────────
export async function saveWorkbookSettings(payload: WorkbookSettingsPayload) {
  const user_id = await requireUserId();
  const row = {
    user_id,
    work_days_per_week: payload.workDaysPerWeek,
    work_hours_per_day: payload.workHoursPerDay,
    target_margin_percent: payload.targetMarginPercent,
    average_monthly_kwh: payload.averageMonthlyKwh,
    electric_other_costs: payload.electricOtherCosts,
    kwh_price: payload.kwhPrice,
    card_fee_percent: payload.cardFeePercent ?? 0,
    delivery_fee_percent: payload.deliveryFeePercent ?? 0,
    commission_percent: payload.commissionPercent ?? 0,
    tax_percent: payload.taxPercent ?? 0,
    operational_cost_percent: payload.operationalCostPercent ?? 0,
    updated_at: nowIso(),
  };
  const { data, error } = await supabase
    .from('ft_workbook_settings')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ─── Despesas operacionais ─────────────────────────────────────────────────
const expenseRow = (p: OperatingExpensePayload): Row => ({
  type: p.type,
  name: p.name,
  amount: p.amount,
  sort_order: p.sortOrder ?? 0,
});

export const createExpense = (payload: OperatingExpensePayload) =>
  insertRow('ft_operating_expenses', expenseRow(payload));
export const updateExpense = (id: string, payload: OperatingExpensePayload) =>
  updateRow('ft_operating_expenses', id, expenseRow(payload));
export const deleteExpense = (id: string) => softDeleteRow('ft_operating_expenses', id);

// ─── Depreciacao de ativos ─────────────────────────────────────────────────
const depreciationRow = (p: DepreciationAssetPayload): Row => ({
  category: p.category,
  asset_name: p.assetName,
  invoice_value: p.invoiceValue,
  linear: p.linear,
  sort_order: p.sortOrder ?? 0,
});

export const createDepreciationAsset = (payload: DepreciationAssetPayload) =>
  insertRow('ft_depreciation_assets', depreciationRow(payload));
export const updateDepreciationAsset = (id: string, payload: DepreciationAssetPayload) =>
  updateRow('ft_depreciation_assets', id, depreciationRow(payload));
export const deleteDepreciationAsset = (id: string) => softDeleteRow('ft_depreciation_assets', id);

// ─── Funcionarios ──────────────────────────────────────────────────────────
const staffRow = (p: StaffMemberPayload): Row => ({
  is_active: p.isActive,
  name: p.name,
  role: p.role,
  salary: p.salary,
  fgts: p.fgts,
  thirteenth: p.thirteenth,
  vacation: p.vacation,
  fgts_vacation: p.fgtsVacation,
  weekly_hours: p.weeklyHours,
  sort_order: p.sortOrder ?? 0,
});

export const createStaffMember = (payload: StaffMemberPayload) =>
  insertRow('ft_staff', staffRow(payload));
export const updateStaffMember = (id: string, payload: StaffMemberPayload) =>
  updateRow('ft_staff', id, staffRow(payload));
export const deleteStaffMember = (id: string) => softDeleteRow('ft_staff', id);

// ─── Equipamentos eletricos ────────────────────────────────────────────────
const electricRow = (p: ElectricEquipmentPayload): Row => ({
  name: p.name,
  power_watts: p.powerWatts,
  sort_order: p.sortOrder ?? 0,
});

export const createElectricEquipment = (payload: ElectricEquipmentPayload) =>
  insertRow('ft_electric_equipment', electricRow(payload));
export const updateElectricEquipment = (id: string, payload: ElectricEquipmentPayload) =>
  updateRow('ft_electric_equipment', id, electricRow(payload));
export const deleteElectricEquipment = (id: string) => softDeleteRow('ft_electric_equipment', id);

// ─── Equipamentos a gas ────────────────────────────────────────────────────
const gasEquipmentRow = (p: GasEquipmentPayload): Row => ({
  name: p.name,
  kg_per_hour: p.kgPerHour,
  bottle_kg: p.bottleKg,
  sort_order: p.sortOrder ?? 0,
});

export const createGasEquipment = (payload: GasEquipmentPayload) =>
  insertRow('ft_gas_equipment', gasEquipmentRow(payload));
export const updateGasEquipment = (id: string, payload: GasEquipmentPayload) =>
  updateRow('ft_gas_equipment', id, gasEquipmentRow(payload));
export const deleteGasEquipment = (id: string) => softDeleteRow('ft_gas_equipment', id);

// ─── Botijoes de gas ───────────────────────────────────────────────────────
const gasBottleRow = (p: GasBottlePayload): Row => ({
  code: p.code,
  capacity_kg: p.capacityKg,
  price: p.price ?? null,
  sort_order: p.sortOrder ?? 0,
});

export const createGasBottle = (payload: GasBottlePayload) =>
  insertRow('ft_gas_bottles', gasBottleRow(payload));
export const updateGasBottle = (id: string, payload: GasBottlePayload) =>
  updateRow('ft_gas_bottles', id, gasBottleRow(payload));
export const deleteGasBottle = (id: string) => softDeleteRow('ft_gas_bottles', id);
