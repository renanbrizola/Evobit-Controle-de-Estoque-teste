import { formatBRL } from '../utils/index';

import type {
  AccentTone,
  SidebarMetric,
  ExpenseRow,
  DepreciationRow,
  StaffRow,
  InputCatalogRow,
  MaterialRow,
  CompoundInputCard,
  LaborProductionRow,
  EquipmentEnergyRow,
  EquipmentGasRow,
  ProductPricingRow,
  ProductCostCard,
  ProductExtraCost,
  ProductDetail,
} from './technical-sheet-types';

export type {
  AccentTone,
  SidebarMetric,
  ExpenseRow,
  DepreciationRow,
  StaffRow,
  InputCatalogRow,
  MaterialRow,
  CompoundInputCard,
  LaborProductionRow,
  EquipmentEnergyRow,
  EquipmentGasRow,
  ProductPricingRow,
  ProductCostCard,
  ProductExtraCost,
  ProductDetail,
};

import {
  formatSheetValue,
  formatPlainNumber,
  formatPercentLabel,
  getToneClassName,
} from './technical-sheet-utils';

export {
  formatSheetValue,
  formatPlainNumber,
  formatPercentLabel,
  getToneClassName,
};
export const homeProfile = {
  employees: 7,
  workDaysPerWeek: 7,
  workHoursPerDay: 13,
  targetMarginPercent: 25,
  operationalCostDay: 1037.89,
  operationalCostHour: 79.84,
  operationalCostMinute: 1.33,
  cardFeePercent: 1.94,
  deliveryFeePercent: 0,
  commissionPercent: 0,
  taxPercent: 8,
  operationalCostPercent: 0,
};

export const fixedExpenses: ExpenseRow[] = [
  { name: 'Folha de pagamento', value: 17461 },
  { name: 'Aluguel', value: 2500 },
  { name: 'Água', value: 300 },
  { name: 'Luz', value: 3500 },
  { name: 'Contador', value: 500 },
  { name: 'Papelaria', value: 300 },
  { name: 'Marketing', value: 1500 },
  { name: 'Internet', value: 100 },
  { name: 'Telefone', value: 100 },
  { name: 'Material de limpeza', value: 500 },
  { name: 'Sistema', value: 300 },
];

export const variableExpenses: ExpenseRow[] = [
  { name: 'Óleo', value: 1000 },
  { name: 'Gás', value: 1000 },
];

export const depreciationExpenses: DepreciationRow[] = [
  { category: 'Utensílios - Maquinários', asset: 'Forno turbo 5 esteiras', invoiceValue: 4200, linear: true },
  { category: 'Utensílios - Maquinários', asset: 'Liquidificador industrial', invoiceValue: 980, linear: true },
  { category: 'Utensílios - Maquinários', asset: 'Batedeira planetária', invoiceValue: 1250, linear: true },
];

export const staffRows: StaffRow[] = [
  {
    active: true,
    name: 'Luis',
    role: 'Cozinheiro(a)',
    salary: 3000,
    fgts: 240,
    thirteenth: 250,
    vacation: 83.33,
    fgtsVacation: 26.67,
    totalCost: 3600,
    weeklyHours: 44,
    minuteCost: 0.31,
  },
  {
    active: true,
    name: 'Jo',
    role: 'Cozinheiro(a)',
    salary: 3000,
    fgts: 240,
    thirteenth: 250,
    vacation: 83.33,
    fgtsVacation: 26.67,
    totalCost: 3600,
    weeklyHours: 44,
    minuteCost: 0.31,
  },
  {
    active: true,
    name: 'Atendente 1',
    role: 'Balconista',
    salary: 1800,
    fgts: 144,
    thirteenth: 150,
    vacation: 50,
    fgtsVacation: 16,
    totalCost: 2160,
    weeklyHours: 44,
    minuteCost: 0.19,
  },
  {
    active: true,
    name: 'Atendente 2',
    role: 'Balconista',
    salary: 1800,
    fgts: 144,
    thirteenth: 150,
    vacation: 50,
    fgtsVacation: 16,
    totalCost: 2160,
    weeklyHours: 44,
    minuteCost: 0.19,
  },
  {
    active: true,
    name: 'Atendente 3',
    role: 'Balconista',
    salary: 1800,
    fgts: 144,
    thirteenth: 150,
    vacation: 50,
    fgtsVacation: 16,
    totalCost: 2160,
    weeklyHours: 44,
    minuteCost: 0.19,
  },
  {
    active: true,
    name: 'Atendente 4',
    role: 'Balconista',
    salary: 1800,
    fgts: 144,
    thirteenth: 150,
    vacation: 50,
    fgtsVacation: 16,
    totalCost: 2160,
    weeklyHours: 44,
    minuteCost: 0.19,
  },
  {
    active: true,
    name: 'Limpeza',
    role: 'Auxiliar limpeza',
    salary: 1621,
    fgts: 0,
    thirteenth: 0,
    vacation: 0,
    fgtsVacation: 0,
    totalCost: 1621,
    weeklyHours: 8,
    minuteCost: 0.78,
  },
];

export const measurementUnits = ['Un', 'g', 'Pt', 'ml', 'mm', 'cm', 'cx', 'Pc', 'Lt', 'Pd', 'Cp', 'Gr', 'kg', 'Ft'];

export const inputCatalogRows: InputCatalogRow[] = [
  {
    code: '0001',
    name: 'agua',
    grossQuantity: 1000,
    netQuantity: 1000,
    unit: 'Lt',
    price: 5,
    factor: 1,
    supplier: 'Fonte Azul',
    purchaseDate: '15/04/2026',
  },
  {
    code: '0002',
    name: 'farinha',
    grossQuantity: 1000,
    netQuantity: 1000,
    unit: 'g',
    price: 8,
    factor: 1,
    supplier: 'Moinho Real',
    purchaseDate: '15/04/2026',
  },
];

export const materialRows: MaterialRow[] = Array.from({ length: 28 }, (_, index) => {
  const item = index + 1;
  if (item === 12) {
    return {
      code: `00${String(item).padStart(2, '0')}`.slice(-4),
      material: `Insumo ${item}`,
      quantity: 70,
      unit: 'g',
      price: 0.6,
      factor: 1,
      portionCost: 0.009,
    };
  }

  return {
    code: `00${String(item).padStart(2, '0')}`.slice(-4),
    material: `Insumo ${item}`,
    quantity: null,
    unit: item < 6 ? 'g' : 'Un',
    price: null,
    factor: 1,
    portionCost: null,
  };
});

export const compoundInputCards: CompoundInputCard[] = [
  {
    title: 'Insumo 1',
    total: 0,
    rows: [
      { ingredient: 'Insumo 12', quantity: 70, unit: 'g', value: 0.6, total: 42 },
      { ingredient: 'Insumo 27', quantity: null, unit: 'g', value: null, total: null },
      { ingredient: 'Insumo 28', quantity: null, unit: 'g', value: null, total: null },
      { ingredient: 'Insumo 29', quantity: null, unit: 'g', value: null, total: null },
      { ingredient: 'Insumo 30', quantity: null, unit: 'g', value: null, total: null },
      { ingredient: 'Insumo 99', quantity: null, unit: 'g', value: null, total: null },
      { ingredient: 'agua', quantity: null, unit: 'Lt', value: null, total: null },
      { ingredient: 'farinha', quantity: null, unit: 'g', value: null, total: null },
    ],
  },
  {
    title: 'Insumo 2',
    total: 0,
    rows: Array.from({ length: 8 }, () => ({ ingredient: '', quantity: null, unit: '', value: null, total: null })),
  },
  {
    title: 'Insumo 3',
    total: 0,
    rows: Array.from({ length: 8 }, () => ({ ingredient: '', quantity: null, unit: '', value: null, total: null })),
  },
  {
    title: 'Insumo 4',
    total: 0,
    rows: Array.from({ length: 8 }, () => ({ ingredient: '', quantity: null, unit: '', value: null, total: null })),
  },
];

export const laborProductionRows: LaborProductionRow[] = Array.from({ length: 28 }, (_, index) => {
  const item = index + 1;
  if (item === 12) {
    return {
      ingredient: `Insumo ${item}`,
      costPerUnit: 0.6,
      quantity: 70,
      productionMinutes: null,
      employeeCount: null,
      productionCost: 0,
    };
  }

  if (item === 27 || item === 28) {
    return {
      ingredient: `Insumo ${item}`,
      costPerUnit: null,
      quantity: 1,
      productionMinutes: null,
      employeeCount: null,
      productionCost: 0,
    };
  }

  return {
    ingredient: `Insumo ${item}`,
    costPerUnit: null,
    quantity: null,
    productionMinutes: null,
    employeeCount: null,
    productionCost: null,
  };
});

export const equipmentEnergyRows: EquipmentEnergyRow[] = [
  { name: 'Forno Elétrico 1500W', powerWatts: 1500, minuteCost: 0.016, kwhLabel: '1,5kwh' },
  { name: 'Liquidificador 600W', powerWatts: 600, minuteCost: 0.007, kwhLabel: '0,6kwh' },
  { name: 'Batedeira Planetária', powerWatts: 300, minuteCost: 0.003, kwhLabel: '0,3kwh' },
  { name: 'Processador de alimentos', powerWatts: 800, minuteCost: 0.009, kwhLabel: '0,8kwh' },
];

export const equipmentGasRows: EquipmentGasRow[] = [
  { name: 'Fogão doméstico', kgPerHour: 0.225, bottleKg: 13, minuteCost: 0.029 },
  { name: 'Forno doméstico', kgPerHour: 0.3, bottleKg: 13, minuteCost: 0.038 },
  { name: 'Fogão industrial', kgPerHour: 0.3, bottleKg: 13, minuteCost: 0.038 },
  { name: 'Forno industrial', kgPerHour: 0.38, bottleKg: 13, minuteCost: 0.049 },
  { name: 'Chapa a gás', kgPerHour: 0.4, bottleKg: 13, minuteCost: 0.051 },
];

export const promotionsRows = [
  {
    code: 'P01',
    product: 'Pão de queijo recheado',
    normalPrice: 6.3,
    floorPrice: 6.12,
    promoPrice: 5.9,
    marginAfterPromo: 18.7,
    status: 'Ajustar',
  },
  {
    code: 'P07',
    product: 'Empada cremosa',
    normalPrice: 8.4,
    floorPrice: 7.95,
    promoPrice: 8.1,
    marginAfterPromo: 24.4,
    status: 'Viável',
  },
  {
    code: 'P13',
    product: 'Torta frango fatia',
    normalPrice: 11.9,
    floorPrice: 10.8,
    promoPrice: 10.5,
    marginAfterPromo: 14.2,
    status: 'Risco',
  },
];

const namedProducts: Record<string, Partial<ProductPricingRow>> = {
  P01: {
    name: 'Pão de queijo recheado',
    yieldQuantity: 1,
    unit: 'Un',
    laborCost: 0,
    ingredientCost: 1.89,
    packagingCost: 0,
    cardFee: 0.12,
    totalCost: 4.7,
    suggestedPrice: 6.27,
    salePrice: 6.3,
    contributionMargin: 1.6,
    marginPercent: 25.4,
    cmvPercent: 30.0,
    electricCost: 0,
    gasCost: 0,
    deliveryCost: 0,
    taxCost: 0.5,
    operationalCost: 2.2,
  },
  P04: {
    yieldQuantity: 1,
    unit: 'Un',
    laborCost: 0,
    ingredientCost: 0,
    packagingCost: 0,
    cardFee: 0,
    totalCost: 0,
    suggestedPrice: 0,
    salePrice: null,
    contributionMargin: null,
    marginPercent: null,
    cmvPercent: null,
    electricCost: 0,
    gasCost: 0,
    deliveryCost: 0,
    taxCost: 0,
    operationalCost: 0,
  },
  P05: {
    yieldQuantity: 1,
    unit: 'Un',
    laborCost: 0,
    ingredientCost: 0,
    packagingCost: 0,
    cardFee: 0,
    totalCost: 0,
    suggestedPrice: 0,
    salePrice: null,
    contributionMargin: null,
    marginPercent: null,
    cmvPercent: null,
    electricCost: 0,
    gasCost: 0,
    deliveryCost: 0,
    taxCost: 0,
    operationalCost: 0,
  },
  P07: {
    name: 'Empada cremosa',
    yieldQuantity: 1,
    unit: 'kg',
    laborCost: 0.52,
    ingredientCost: 3.45,
    packagingCost: 0.22,
    cardFee: 0.17,
    totalCost: 5.94,
    suggestedPrice: 8.4,
    salePrice: 8.5,
    contributionMargin: 2.46,
    marginPercent: 29.3,
    cmvPercent: 41.2,
    electricCost: 0.15,
    gasCost: 0.18,
    deliveryCost: 0.4,
    taxCost: 0.68,
    operationalCost: 0.67,
  },
  P13: {
    name: 'Torta frango fatia',
    yieldQuantity: 1,
    unit: 'Un',
    laborCost: 0.74,
    ingredientCost: 4.1,
    packagingCost: 0.3,
    cardFee: 0.23,
    totalCost: 7.12,
    suggestedPrice: 11.4,
    salePrice: 11.9,
    contributionMargin: 4.28,
    marginPercent: 37.5,
    cmvPercent: 34.7,
    electricCost: 0.25,
    gasCost: 0.2,
    deliveryCost: 0.48,
    taxCost: 0.95,
    operationalCost: 0.84,
  },
  P23: {
    yieldQuantity: 1,
    unit: 'Un',
    laborCost: 0,
    ingredientCost: 0,
    packagingCost: 0,
    cardFee: 0,
    totalCost: 0,
    suggestedPrice: 0,
    salePrice: null,
    contributionMargin: null,
    marginPercent: null,
    cmvPercent: null,
    electricCost: 0,
    gasCost: 0,
    deliveryCost: 0,
    taxCost: 0,
    operationalCost: 0,
  },
};

export const pricingRows: ProductPricingRow[] = Array.from({ length: 30 }, (_, index) => {
  const code = `P${String(index + 1).padStart(2, '0')}`;
  const defaults: ProductPricingRow = {
    code,
    name: '',
    yieldQuantity: index % 2 === 0 ? 1 : null,
    unit: index % 6 === 0 ? 'kg' : 'Un',
    laborCost: null,
    ingredientCost: null,
    packagingCost: null,
    cardFee: null,
    totalCost: null,
    suggestedPrice: null,
    salePrice: null,
    contributionMargin: null,
    marginPercent: null,
    cmvPercent: null,
    electricCost: null,
    gasCost: null,
    deliveryCost: null,
    taxCost: null,
    operationalCost: null,
  };

  return { ...defaults, ...namedProducts[code] };
});

export const productCodeMatrix = Array.from({ length: 25 }, (_, rowIndex) =>
  Array.from({ length: 4 }, (_, columnIndex) => {
    const itemIndex = rowIndex + columnIndex * 25 + 1;
    return `P${String(itemIndex).padStart(2, '0')}`;
  }),
);

export const productDetailMap: Record<string, ProductDetail> = {
  P01: {
    code: 'P01',
    name: 'Pão de queijo recheado',
    imageLabel: 'Imagem do produto',
    totalMinutes: 0,
    recipeYield: 1,
    targetMarginPercent: 25,
    ingredientRows: [
      { ingredient: 'Insumo 12', quantity: 220, unit: 'g', price: 0.6, portionCost: 0.006, subtotal: 1.89 },
      ...Array.from({ length: 16 }, () => ({
        ingredient: '',
        quantity: null,
        unit: '',
        price: null,
        portionCost: null,
        subtotal: null,
      })),
    ],
    packagingRows: Array.from({ length: 12 }, () => ({ quantity: null, value: null })),
    laborRows: Array.from({ length: 12 }, () => ({ employee: '', productionMinutes: null })),
    costCards: [
      { label: 'Mão de obra', value: 0, tone: 'blue' },
      { label: 'Ingredientes', value: 1.89, tone: 'amber' },
      { label: 'Embalagens', value: 0, tone: 'orange' },
      { label: 'Custo líquido', value: 1.89, tone: 'red' },
      { label: 'Custo bruto', value: 4.7, tone: 'pink' },
      { label: 'Outros custos', value: 2.82, tone: 'purple' },
    ],
    extraCosts: [
      { label: 'Custo Extra', percent: null, value: 0 },
      { label: 'Cartão Crédito', percent: 1.94, value: 0.12 },
      { label: 'Delivery', percent: null, value: 0 },
      { label: 'Custo Operacional', percent: 35, value: 2.2 },
      { label: 'Impostos', percent: 8, value: 0.5 },
      { label: 'Markup', percent: 1.33, value: 0 },
    ],
    summaryRows: [
      { labor: 0, ingredients: 1.89, packaging: 0, extra: 0, taxes: 2.82, total: 4.7 },
      { labor: 0, ingredients: 1.89, packaging: 0, extra: 0, taxes: 2.82, total: 4.7 },
    ],
    analysisRows: [
      { label: 'Margem (MC)', percentLabel: '25,40%', value: 1.6 },
      { label: 'Custo total', percentLabel: '74,60%', value: 4.7 },
      { label: 'Mão de obra', percentLabel: '0,00%', value: 0 },
      { label: 'Ingredientes', percentLabel: '30,06%', value: 1.89 },
      { label: 'Embalagens', percentLabel: '0,00%', value: 0 },
      { label: 'Custo extra', percentLabel: '0,00%', value: 0 },
      { label: 'Taxa do cartão', percentLabel: '1,94%', value: 0.12 },
      { label: 'Taxa delivery', percentLabel: '---', value: 0 },
      { label: 'Comissões', percentLabel: '35,00%', value: 2.2 },
      { label: 'Impostos', percentLabel: '8,00%', value: 0.5 },
      { label: 'Consumo luz', percentLabel: '0,00%', value: 0 },
      { label: 'Consumo gás', percentLabel: '0,00%', value: 0 },
    ],
    suggestedPrice: 6.27,
    salePrice: 6.3,
    profit: 1.6,
    markupPercent: 33.3,
    cmvPercent: 30.0,
    resalePercent: 30,
    resalePrice: 4.39,
    resaleProfit: -0.31,
    chartSlices: {
      marginVsCost: [
        { name: 'Margem (MC)', value: 25.4, color: '#4a80ea' },
        { name: 'Custo total', value: 74.6, color: '#f44336' },
      ],
      general: [
        { name: 'Comissões', value: 46.7, color: '#7aa6f3' },
        { name: 'Ingredientes', value: 40.1, color: '#f44336' },
        { name: 'Taxa do cartão', value: 2.6, color: '#ff9800' },
        { name: 'Impostos', value: 10.7, color: '#ec7063' },
      ],
      difference: [
        { name: 'Preço de venda', value: 50, color: '#3aaa55' },
        { name: 'Custo bruto', value: 37.5, color: '#e57373' },
        { name: '"Lucro"', value: 12.5, color: '#ff4f93' },
      ],
      equilibrium: [
        { name: 'Mão de obra', value: 0, color: '#4a80ea' },
        { name: 'Ingredientes', value: 1.89, color: '#c79a00' },
        { name: 'Embalagens', value: 0, color: '#ffbe2f' },
        { name: 'Extra', value: 0, color: '#ff5b7a' },
        { name: 'Taxas', value: 2.82, color: '#43b556' },
      ],
    },
  },
};

function totalExpense(rows: ExpenseRow[]): number {
  return rows.reduce((total, row) => total + row.value, 0);
}

export const totals = {
  fixedExpenses: totalExpense(fixedExpenses),
  variableExpenses: totalExpense(variableExpenses),
  totalExpenses: totalExpense(fixedExpenses) + totalExpense(variableExpenses),
  staffCost: staffRows.reduce((total, row) => total + row.totalCost, 0),
  averageMinuteCost: staffRows.reduce((total, row) => total + row.minuteCost, 0) / staffRows.length,
  averageHourCost: Math.round((staffRows.reduce((total, row) => total + row.minuteCost, 0) / staffRows.length) * 60 * 100) / 100,
  weeklyHours: staffRows.reduce((total, row) => total + row.weeklyHours, 0),
  registeredInputs: 8,
  registeredCompoundInputs: 4,
  pricedProducts: pricingRows.length,
  averageSuggestedPrice:
    pricingRows.filter((row) => typeof row.suggestedPrice === 'number').reduce((total, row) => total + (row.suggestedPrice ?? 0), 0) /
    pricingRows.filter((row) => typeof row.suggestedPrice === 'number').length,
  averageMargin:
    pricingRows.filter((row) => typeof row.contributionMargin === 'number').reduce((total, row) => total + (row.contributionMargin ?? 0), 0) /
    pricingRows.filter((row) => typeof row.contributionMargin === 'number').length,
  globalCmv:
    pricingRows.filter((row) => typeof row.cmvPercent === 'number').reduce((total, row) => total + (row.cmvPercent ?? 0), 0) /
    pricingRows.filter((row) => typeof row.cmvPercent === 'number').length,
};



function buildFallbackProductDetail(code: string): ProductDetail | null {
  const normalizedCode = code.toUpperCase();
  const row = pricingRows.find((item) => item.code === normalizedCode);

  if (!row) return null;

  return {
    code: normalizedCode,
    name: row.name || 'Produto em construção',
    imageLabel: 'Imagem do produto',
    totalMinutes: 0,
    recipeYield: row.yieldQuantity ?? 1,
    targetMarginPercent: row.marginPercent ?? 25,
    ingredientRows: Array.from({ length: 12 }, () => ({
      ingredient: '',
      quantity: null,
      unit: '',
      price: null,
      portionCost: null,
      subtotal: null,
    })),
    packagingRows: Array.from({ length: 10 }, () => ({ quantity: null, value: null })),
    laborRows: Array.from({ length: 10 }, () => ({ employee: '', productionMinutes: null })),
    costCards: [
      { label: 'Mão de obra', value: row.laborCost ?? 0, tone: 'blue' },
      { label: 'Ingredientes', value: row.ingredientCost ?? 0, tone: 'amber' },
      { label: 'Embalagens', value: row.packagingCost ?? 0, tone: 'orange' },
      { label: 'Custo líquido', value: row.ingredientCost ?? 0, tone: 'red' },
      { label: 'Custo bruto', value: row.totalCost ?? 0, tone: 'pink' },
      { label: 'Outros custos', value: row.operationalCost ?? 0, tone: 'purple' },
    ],
    extraCosts: [
      { label: 'Custo Extra', percent: null, value: 0 },
      { label: 'Cartão Crédito', percent: 1.94, value: row.cardFee ?? 0 },
      { label: 'Delivery', percent: null, value: row.deliveryCost ?? 0 },
      { label: 'Custo Operacional', percent: 35, value: row.operationalCost ?? 0 },
      { label: 'Impostos', percent: 8, value: row.taxCost ?? 0 },
      { label: 'Markup', percent: 1.33, value: 0 },
    ],
    summaryRows: [
      {
        labor: row.laborCost ?? 0,
        ingredients: row.ingredientCost ?? 0,
        packaging: row.packagingCost ?? 0,
        extra: 0,
        taxes: (row.taxCost ?? 0) + (row.operationalCost ?? 0),
        total: row.totalCost ?? 0,
      },
    ],
    analysisRows: [
      { label: 'Margem (MC)', percentLabel: formatPercentLabel(row.marginPercent, 2), value: row.contributionMargin ?? 0 },
      { label: 'Custo total', percentLabel: '75,00%', value: row.totalCost ?? 0 },
      { label: 'Ingredientes', percentLabel: formatPercentLabel(row.cmvPercent, 2), value: row.ingredientCost ?? 0 },
      { label: 'Impostos', percentLabel: '8,00%', value: row.taxCost ?? 0 },
      { label: 'Operacional', percentLabel: '35,00%', value: row.operationalCost ?? 0 },
    ],
    suggestedPrice: row.suggestedPrice ?? 0,
    salePrice: row.salePrice ?? row.suggestedPrice ?? 0,
    profit: row.contributionMargin ?? 0,
    markupPercent: row.marginPercent ?? 0,
    cmvPercent: row.cmvPercent ?? 0,
    resalePercent: 30,
    resalePrice: (row.suggestedPrice ?? 0) * 0.7,
    resaleProfit: (row.suggestedPrice ?? 0) * 0.7 - (row.totalCost ?? 0),
    chartSlices: {
      marginVsCost: [
        { name: 'Margem (MC)', value: row.marginPercent ?? 25, color: '#4a80ea' },
        { name: 'Custo total', value: 100 - (row.marginPercent ?? 25), color: '#f44336' },
      ],
      general: [
        { name: 'Operacional', value: 35, color: '#7aa6f3' },
        { name: 'Ingredientes', value: row.cmvPercent ?? 0, color: '#f44336' },
        { name: 'Taxa do cartão', value: 2.6, color: '#ff9800' },
        { name: 'Impostos', value: 10.7, color: '#ec7063' },
      ],
      difference: [
        { name: 'Preço de venda', value: 50, color: '#3aaa55' },
        { name: 'Custo bruto', value: 37.5, color: '#e57373' },
        { name: '"Lucro"', value: 12.5, color: '#ff4f93' },
      ],
      equilibrium: [
        { name: 'Mão de obra', value: row.laborCost ?? 0, color: '#4a80ea' },
        { name: 'Ingredientes', value: row.ingredientCost ?? 0, color: '#c79a00' },
        { name: 'Embalagens', value: row.packagingCost ?? 0, color: '#ffbe2f' },
        { name: 'Extra', value: 0, color: '#ff5b7a' },
        { name: 'Taxas', value: (row.taxCost ?? 0) + (row.operationalCost ?? 0), color: '#43b556' },
      ],
    },
  };
}

export function getProductDetail(code: string): ProductDetail | null {
  return productDetailMap[code.toUpperCase()] ?? buildFallbackProductDetail(code);
}


