'use client';

import { useCallback, useEffect, useState } from 'react';
import { ItemType } from '../types/enums';
import {
  WorkbookInputRowDto,
  WorkbookProductDetailDto,
  WorkbookProductRowDto,
  WorkbookSnapshotDto,
} from '../types/enums';
import { listWorkbookInputs } from './inventory-management-api';
import { getCostBreakdown, listWorkbookProducts } from './recipes-management-api';
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

function emptySummary(): WorkbookSnapshotDto['summary'] {
  return {
    totalRecipes: 0,
    totalInventoryItems: 0,
    totalPricedProducts: 0,
    activePrices: 0,
    averageSuggestedPrice: 0,
    averageContributionMargin: 0,
    averageCmvPercent: 0,
  };
}

/** Resumo do Dashboard derivado dos dados reais (insumos + receitas). */
function buildRealSummary(
  inputs: WorkbookSnapshotDto['inputs'],
  products: WorkbookSnapshotDto['products'],
): WorkbookSnapshotDto['summary'] {
  const finals = products.filter((p) => p.productType === 'FINAL');
  const numbers = (values: Array<number | null | undefined>) =>
    values.filter((v): v is number => typeof v === 'number');
  return {
    totalRecipes: finals.length,
    totalInventoryItems: inputs.length,
    totalPricedProducts: finals.filter((p) => p.suggestedPrice !== null).length,
    activePrices: finals.filter((p) => p.salePrice !== null && Number(p.salePrice) > 0).length,
    averageSuggestedPrice: average(numbers(finals.map((p) => p.suggestedPrice))),
    averageContributionMargin: average(numbers(finals.map((p) => p.contributionMargin))),
    averageCmvPercent: average(numbers(finals.map((p) => p.cmvPercent))),
  };
}

// Último snapshot real carregado nesta sessão do app. Navegar entre as telas
// do módulo pinta imediatamente com o último estado conhecido, em vez de uma
// tela vazia enquanto tudo refaz o fetch do zero.
let lastRealSnapshot: WorkbookSnapshotDto | null = null;

export function useWorkbookSnapshot(isDemoSession: boolean) {
  const [data, setData] = useState<WorkbookSnapshotDto>(() => {
    if (isDemoSession) return buildMockSnapshot();
    // Sessao real: comeca do cache da sessão (se houver) ou SEM insumos/produtos
    // mock (agua/farinha, "Pao de queijo"...). Eles vinham do buildMockSnapshot e
    // piscavam na tela antes dos dados reais carregarem.
    return (
      lastRealSnapshot ?? {
        ...buildMockSnapshot(),
        ...emptyWorkbookSections(),
        inputs: [],
        products: [],
        summary: emptySummary(),
      }
    );
  });
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

    // Mescla no estado ANTERIOR conforme cada fonte resolve: os dados locais
    // (RxDB) aparecem imediatamente, sem esperar a rede (Supabase). O que
    // falhar (transitório) NÃO sobrescreve — o erro real é logado.
    const apply = (patch: Partial<WorkbookSnapshotDto>) => {
      if (!active) return;
      setData((prev) => {
        const next = { ...prev, ...patch };
        // Resumo (Dashboard) derivado dos dados REAIS — só fichas finais
        // (compostos são insumos), mesma convenção da Precificação.
        next.summary = buildRealSummary(next.inputs, next.products);
        lastRealSnapshot = next;
        return next;
      });
    };

    const inputsPromise = listWorkbookInputs()
      .then((inputs) => apply({ inputs }))
      .catch((err) => console.error('[workbook] falha ao carregar insumos reais:', err));

    // Primeiro cálculo dos produtos usa o profile já conhecido (cache da sessão
    // ou defaults); quando as configurações chegarem do Supabase, recalcula.
    const initialProductsPromise = listWorkbookProducts(lastRealSnapshot?.profile ?? {})
      .then((products) => apply({ products }))
      .catch((err) => console.error('[workbook] falha ao carregar produtos reais:', err));

    const sectionsPromise = fetchWorkbookSections()
      .then((sections) => {
        apply(sections);
        // Preço sugerido depende de margem/taxas das configurações reais.
        return initialProductsPromise
          .then(() => listWorkbookProducts(sections.profile))
          .then((products) => apply({ products }));
      })
      .catch((err) => console.error('[workbook] falha ao carregar seções do workbook (Supabase):', err));

    Promise.allSettled([inputsPromise, initialProductsPromise, sectionsPromise]).then(() => {
      if (!active) return;
      setSource('api');
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [isDemoSession, refreshKey]);

  // Reatividade local-first: quando o sync (inicial ou periódico) grava nas
  // coleções do RxDB, recarrega o snapshot — sem isso a tela montada antes do
  // pull terminar só mostrava os dados depois de um F5.
  useEffect(() => {
    if (isDemoSession) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscriptions: Array<{ unsubscribe: () => void }> = [];

    (async () => {
      try {
        const { getDatabase } = await import('../../../db/database');
        const db = await getDatabase();
        if (cancelled || !db) return;

        const scheduleReload = () => {
          clearTimeout(timer);
          timer = setTimeout(() => reload(), 500);
        };

        for (const name of ['products', 'recipes', 'providers']) {
          const collection = (db as Record<string, any>)[name];
          if (collection?.$?.subscribe) {
            subscriptions.push(collection.$.subscribe(scheduleReload));
          }
        }
      } catch (err) {
        console.error('[workbook] falha ao observar mudanças do banco local:', err);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    };
  }, [isDemoSession, reload]);

  return { data, loading, source, reload };
}

export function useWorkbookProductDetail(code: string, isDemoSession: boolean) {
  const [data, setData] = useState<WorkbookProductDetailDto | null>(() =>
    isDemoSession ? buildMockProductDetail(code) : null,
  );
  const [loading, setLoading] = useState(!isDemoSession);
  const [source, setSource] = useState<'demo' | 'api'>(isDemoSession ? 'demo' : 'api');
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (isDemoSession) {
      // Demo bootstrap: synchronous state init from local mock data is intentional.
      setData(buildMockProductDetail(code));
      setLoading(false);
      setSource('demo');
      return;
    }

    // Sessão real: detalhe derivado das receitas reais (produto + taxas do
    // workbook + breakdown de custos), sem mock.
    let active = true;
    setLoading(true);

    (async () => {
      try {
        const sections = await fetchWorkbookSections();
        const profile = sections.profile;
        const products = await listWorkbookProducts(profile);
        const product = products.find((row) => row.code === code) ?? null;
        if (!active) return;

        if (!product) {
          setData(null);
          setSource('api');
          return;
        }

        let breakdown: WorkbookProductDetailDto['breakdown'] | null = null;
        try {
          breakdown = (await getCostBreakdown(product.recipeVersionId)) as WorkbookProductDetailDto['breakdown'];
        } catch (err) {
          console.error('[workbook] falha ao montar breakdown do produto:', err);
        }
        if (!active) return;

        setData({
          product,
          targetMarginPercent: Number(profile?.targetMarginPercent ?? 0),
          cardFeePercent: Number(profile?.cardFeePercent ?? 0),
          deliveryFeePercent: Number(profile?.deliveryFeePercent ?? 0),
          commissionPercent: Number(profile?.commissionPercent ?? 0),
          taxPercent: Number(profile?.taxPercent ?? 0),
          operationalCostPercent: Number(profile?.operationalCostPercent ?? 0),
          breakdown: breakdown ?? {
            recipeId: product.recipeId,
            recipeVersionId: product.recipeVersionId,
            yieldQuantity: product.yieldQuantity,
            ingredients: [],
            packaging: [],
            labor: [],
            equipment: [],
            totalIngredientsCost: 0,
            totalPackagingCost: 0,
            totalLaborCost: 0,
            totalEquipmentCost: 0,
            totalBatchCost: product.totalCost * (product.yieldQuantity || 1),
            unitCost: product.totalCost,
            currency: 'BRL',
          },
        });
        setSource('api');
      } catch (err) {
        console.error('[workbook] falha ao carregar detalhe do produto:', err);
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [code, isDemoSession, refreshKey]);

  return { data, loading, source, reload };
}
