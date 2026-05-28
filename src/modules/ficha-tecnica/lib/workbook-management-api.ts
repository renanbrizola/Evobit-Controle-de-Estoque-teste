'use client';

import api from '../lib/api';

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

export async function saveWorkbookSettings(payload: WorkbookSettingsPayload) {
  return api.put('/workbook/settings', payload);
}

export async function createExpense(payload: OperatingExpensePayload) {
  return api.post('/workbook/expenses', payload);
}

export async function updateExpense(id: string, payload: OperatingExpensePayload) {
  return api.patch(`/workbook/expenses/${id}`, payload);
}

export async function deleteExpense(id: string) {
  return api.delete(`/workbook/expenses/${id}`);
}

export async function createDepreciationAsset(payload: DepreciationAssetPayload) {
  return api.post('/workbook/depreciation-assets', payload);
}

export async function updateDepreciationAsset(id: string, payload: DepreciationAssetPayload) {
  return api.patch(`/workbook/depreciation-assets/${id}`, payload);
}

export async function deleteDepreciationAsset(id: string) {
  return api.delete(`/workbook/depreciation-assets/${id}`);
}

export async function createStaffMember(payload: StaffMemberPayload) {
  return api.post('/workbook/staff', payload);
}

export async function updateStaffMember(id: string, payload: StaffMemberPayload) {
  return api.patch(`/workbook/staff/${id}`, payload);
}

export async function deleteStaffMember(id: string) {
  return api.delete(`/workbook/staff/${id}`);
}

export async function createElectricEquipment(payload: ElectricEquipmentPayload) {
  return api.post('/workbook/electric-equipments', payload);
}

export async function updateElectricEquipment(id: string, payload: ElectricEquipmentPayload) {
  return api.patch(`/workbook/electric-equipments/${id}`, payload);
}

export async function deleteElectricEquipment(id: string) {
  return api.delete(`/workbook/electric-equipments/${id}`);
}

export async function createGasEquipment(payload: GasEquipmentPayload) {
  return api.post('/workbook/gas-equipments', payload);
}

export async function updateGasEquipment(id: string, payload: GasEquipmentPayload) {
  return api.patch(`/workbook/gas-equipments/${id}`, payload);
}

export async function deleteGasEquipment(id: string) {
  return api.delete(`/workbook/gas-equipments/${id}`);
}

export async function createGasBottle(payload: GasBottlePayload) {
  return api.post('/workbook/gas-bottles', payload);
}

export async function updateGasBottle(id: string, payload: GasBottlePayload) {
  return api.patch(`/workbook/gas-bottles/${id}`, payload);
}

export async function deleteGasBottle(id: string) {
  return api.delete(`/workbook/gas-bottles/${id}`);
}
