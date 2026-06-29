'use client';

import { useCallback, useEffect, useState } from 'react';
import { ItemType } from '../types/enums';
import {
  WorkbookInputRowDto,
  WorkbookProductDetailDto,
  WorkbookProductRowDto,
  WorkbookSnapshotDto,
} from '../types/enums';
import api from '../lib/api';
import { listWorkbookInputs } from './inventory-management-api';
import { fetchWorkbookSections, emptyWorkbookSections } from './workbook-data-api';
import {
  depreciationExpenses,
  equipmentEnergyRows,
  equipmentGasRows,
  fixedExpenses,
  getProductDetail,
  homeProfile,
  inputCatalogRows,
  pricingRows,
  staffRows,
  variableExpenses,
} from '../mock/technical-sheet-data';

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function getRegisteredPricingRows() {
  return pricingRows.filter((row) => row.name.trim().length > 0);
}

function buildMockSnapshot(): WorkbookSnapshotDto {
  const registeredPricingRows = getRegisteredPricingRows();
  const monthlyPayroll = staffRows
    .filter((row) => row.active)
    .reduce((sum, row) => sum + row.totalCost, 0);
  const monthlyOperatingCost = [...fixedExpenses, ...variableExpenses].reduce((sum, row) => sum + row.value, 0);
  const averageMonthlyKwh = 60;
  const kwhPrice = 0.65;

  return {
    summary: {
      totalRecipes: registeredPricingRows.length,
      totalInventoryItems: inputCatalogRows.length,
      totalPricedProducts: registeredPricingRows.filter((row) => row.suggestedPrice !== null).length,
      activePrices: registeredPricingRows.filter((row) => row.salePrice !== null).length,
      averageSuggestedPrice: average(registeredPricingRows
        .map((row) => row.suggestedPrice)
        .filter((value): value is number => typeof value === 'number')),
      averageContributionMargin: average(registeredPricingRows
        .map((row) => row.contributionMargin)
        .filter((value): value is number => typeof value === 'number')),
      averageCmvPercent: average(registeredPricingRows
        .map((row) => row.cmvPercent)
        .filter((value): value is number => typeof value === 'number')),
    },
    profile: {
      workDaysPerWeek: homeProfile.workDaysPerWeek,
      workHoursPerDay: homeProfile.workHoursPerDay,
      targetMarginPercent: homeProfile.targetMarginPercent,
      activeEmployees: staffRows.filter((row) => row.active).length,
      monthlyPayroll,
      monthlyOperatingCost,
      operationalCostDay: homeProfile.operationalCostDay,
      operationalCostHour: homeProfile.operationalCostHour,
      operationalCostMinute: homeProfile.operationalCostMinute,
      averageMonthlyKwh,
      electricOtherCosts: 0,
      kwhPrice,
      cardFeePercent: homeProfile.cardFeePercent,
      deliveryFeePercent: homeProfile.deliveryFeePercent,
      commissionPercent: homeProfile.commissionPercent,
      taxPercent: homeProfile.taxPercent,
      operationalCostPercent: homeProfile.operationalCostPercent,
    },
    expenses: {
      fixed: fixedExpenses.map((row, index) => ({
        id: `fixed-${index}`,
        type: 'FIXED',
        name: row.name,
        amount: row.value,
        sortOrder: index,
      })),
      variable: variableExpenses.map((row, index) => ({
        id: `variable-${index}`,
        type: 'VARIABLE',
        name: row.name,
        amount: row.value,
        sortOrder: index,
      })),
      depreciation: depreciationExpenses.map((row, index) => ({
        id: `depreciation-${index}`,
        category: row.category,
        assetName: row.asset,
        invoiceValue: row.invoiceValue,
        linear: row.linear,
        sortOrder: index,
      })),
    },
    staff: staffRows.map((row, index) => ({
      id: `staff-${index}`,
      active: row.active,
      name: row.name,
      role: row.role,
      salary: row.salary,
      fgts: row.fgts,
      thirteenth: row.thirteenth,
      vacation: row.vacation,
      fgtsVacation: row.fgtsVacation,
      totalCost: row.totalCost,
      weeklyHours: row.weeklyHours,
      minuteCost: row.minuteCost,
      sortOrder: index,
    })),
    utilities: {
      electricEquipments: equipmentEnergyRows.map((row, index) => ({
        id: `electric-${index}`,
        name: row.name,
        powerWatts: row.powerWatts,
        minuteCost: row.minuteCost,
        kwhLabel: row.kwhLabel,
        sortOrder: index,
      })),
      gasEquipments: equipmentGasRows.map((row, index) => ({
        id: `gas-${index}`,
        name: row.name,
        kgPerHour: row.kgPerHour,
        bottleKg: row.bottleKg,
        minuteCost: row.minuteCost,
        sortOrder: index,
      })),
      gasBottles: [
        { id: 'gas-bottle-1', code: 'P5', capacityKg: 5, price: null, sortOrder: 1 },
        { id: 'gas-bottle-2', code: 'P13', capacityKg: 13, price: 100, sortOrder: 2 },
        { id: 'gas-bottle-3', code: 'P20', capacityKg: 20, price: null, sortOrder: 3 },
        { id: 'gas-bottle-4', code: 'P45', capacityKg: 45, price: null, sortOrder: 4 },
        { id: 'gas-bottle-5', code: 'P90', capacityKg: 90, price: null, sortOrder: 5 },
      ],
      energyBands: (() => {
        const bands = [
          { description: 'Ate 30 kWs', size: 30 },
          { description: 'Ate 31 a 100 kWs', size: 70 },
          { description: 'Ate 101 a 220 kWs', size: 120 },
          { description: 'Acima de 220 kWs', size: Infinity },
        ];
        let remaining = averageMonthlyKwh;
        return bands.map((band) => {
          const kws = band.size === Infinity ? Math.max(remaining, 0) : Math.min(Math.max(remaining, 0), band.size);
          remaining = band.size === Infinity ? 0 : Math.max(remaining - kws, 0);
          return { description: band.description, kws, pricePerKwh: kwhPrice };
        });
      })(),
    },
    inputs: inputCatalogRows.map<WorkbookInputRowDto>((row) => ({
      id: row.code,
      code: row.code,
      name: row.name,
      type: ItemType.INSUMO,
      grossQuantity: row.grossQuantity,
      netQuantity: row.netQuantity,
      unit: row.unit,
      price: row.price,
      factor: row.factor,
      supplier: row.supplier,
      purchaseDate: row.purchaseDate,
      categoryName: null,
    })),
    products: registeredPricingRows.map<WorkbookProductRowDto>((row) => ({
      code: row.code,
      recipeId: row.code,
      recipeName: row.name || row.code,
      productType: 'FINAL',
      recipeVersionId: row.code,
      versionNumber: 1,
      versionStatus: row.suggestedPrice === null ? 'DRAFT' : 'APPROVED',
      yieldQuantity: row.yieldQuantity,
      yieldUnit: row.unit,
      servingSize: null,
      pricingUnit: row.unit,
      pricingUnitFactor: 1,
      laborCost: row.laborCost,
      ingredientCost: row.ingredientCost,
      packagingCost: row.packagingCost,
      equipmentCost: (row.electricCost ?? 0) + (row.gasCost ?? 0),
      cardFee: row.cardFee,
      deliveryCost: row.deliveryCost,
      taxCost: row.taxCost,
      operationalCost: row.operationalCost,
      totalCost: row.totalCost,
      suggestedPrice: row.suggestedPrice,
      salePrice: row.salePrice,
      contributionMargin: row.contributionMargin,
      marginPercent: row.marginPercent,
      cmvPercent: row.cmvPercent,
      updatedAt: new Date().toISOString(),
    })),
  };
}

function buildMockProductDetail(code: string): WorkbookProductDetailDto | null {
  const detail = getProductDetail(code);

  if (!detail) return null;

  const product = buildMockSnapshot().products.find((row) => row.code === detail.code);

  if (!product) return null;

  const ingredientLines = detail.ingredientRows
    .filter((row) => row.ingredient && row.subtotal !== null)
    .map((row, index) => ({
      itemId: `${detail.code}-ingredient-${index}`,
      name: row.ingredient,
      quantity: row.quantity ?? 0,
      uom: row.unit || 'un',
      unitPrice: row.price ?? 0,
      yieldFactor: 1,
      correctionFactor: 1,
      grossQuantity: row.quantity ?? 0,
      lineCost: row.subtotal ?? 0,
    }));

  const packaging = detail.packagingRows
    .filter((row) => row.value !== null)
    .map((row, index) => ({
      itemId: `${detail.code}-packaging-${index}`,
      name: `Embalagem ${index + 1}`,
      quantity: row.quantity ?? 0,
      unitPrice: row.value ?? 0,
      lineCost: (row.quantity ?? 1) * (row.value ?? 0),
    }));

  const labor = detail.laborRows
    .filter((row) => row.employee || row.productionMinutes !== null)
    .map((row, index) => ({
      employeeId: `${detail.code}-labor-${index}`,
      role: row.employee || `Funcionário ${index + 1}`,
      minutes: row.productionMinutes ?? 0,
      costPerMinute: 0,
      lineCost: 0,
    }));

  return {
    product,
    targetMarginPercent: detail.targetMarginPercent,
    cardFeePercent: homeProfile.cardFeePercent,
    deliveryFeePercent: homeProfile.deliveryFeePercent,
    commissionPercent: homeProfile.commissionPercent,
    taxPercent: homeProfile.taxPercent,
    operationalCostPercent: homeProfile.operationalCostPercent,
    breakdown: {
      recipeId: detail.code,
      recipeVersionId: detail.code,
      yieldQuantity: detail.recipeYield,
      ingredients: ingredientLines,
      packaging,
      labor,
      equipment: [],
      totalIngredientsCost: ingredientLines.reduce((sum, item) => sum + item.lineCost, 0),
      totalPackagingCost: packaging.reduce((sum, item) => sum + item.lineCost, 0),
      totalLaborCost: labor.reduce((sum, item) => sum + item.lineCost, 0),
      totalEquipmentCost: 0,
      totalBatchCost: detail.summaryRows[0]?.total ?? 0,
      unitCost: detail.summaryRows[0]?.total ?? 0,
      currency: 'BRL',
    },
  };
}

export function useWorkbookSnapshot(isDemoSession: boolean) {
  const [data, setData] = useState<WorkbookSnapshotDto>(() =>
    isDemoSession ? buildMockSnapshot() : { ...buildMockSnapshot(), ...emptyWorkbookSections() }
  );
  const [loading, setLoading] = useState(!isDemoSession);
  const [source, setSource] = useState<'demo' | 'api'>(isDemoSession ? 'demo' : 'api');
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;

    if (isDemoSession) {
      // Demo bootstrap: synchronous state init from local mock data is intentional.
      setData(buildMockSnapshot());
      setLoading(false);
      setSource('demo');
      return;
    }

    setLoading(true);

    (async () => {
      // Mescla no estado ANTERIOR: o que falhar (transitório) NÃO sobrescreve com
      // mock — evita o "às vezes aparece o cadastro antigo". O erro real é logado.
      let inputs: WorkbookSnapshotDto['inputs'] | undefined;
      let sections: Partial<WorkbookSnapshotDto> | undefined;

      try {
        inputs = await listWorkbookInputs();
      } catch (err) {
        console.error('[workbook] falha ao carregar insumos reais:', err);
      }

      try {
        sections = await fetchWorkbookSections();
      } catch (err) {
        console.error('[workbook] falha ao carregar seções do workbook (Supabase):', err);
      }

      if (!active) return;
      setData((prev) => ({
        ...prev,
        ...(inputs ? { inputs } : {}),
        ...(sections ?? {}),
      }));
      setSource('api');
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [isDemoSession, refreshKey]);

  return { data, loading, source, reload };
}

export function useWorkbookProductDetail(code: string, isDemoSession: boolean) {
  const [data, setData] = useState<WorkbookProductDetailDto | null>(buildMockProductDetail(code));
  const [loading, setLoading] = useState(!isDemoSession);
  const [source, setSource] = useState<'demo' | 'api'>(isDemoSession ? 'demo' : 'api');
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;

    if (isDemoSession) {
      // Demo bootstrap: synchronous state init from local mock data is intentional.
      /* eslint-disable react-hooks/set-state-in-effect */
      setData(buildMockProductDetail(code));
      setLoading(false);
      setSource('demo');
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    setLoading(true);

    api.get<{ success: boolean; data: WorkbookProductDetailDto }>(`/reports/workbook/products/${code}`)
      .then((response) => {
        if (!active) return;
        const payload = response.data.data;
        if (!payload || !payload.breakdown) {
          throw new Error('Payload vazio ou invǭlido retornado da API local.');
        }
        setData(payload);
        setSource('api');
      })
      .catch(() => {
        if (!active) return;
        setData(buildMockProductDetail(code));
        setSource('demo');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [code, isDemoSession, refreshKey]);

  return { data, loading, source, reload };
}
