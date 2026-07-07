

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { X, Calculator, Search } from 'lucide-react';
import { formatBRL } from '../../modules/ficha-tecnica/utils/index';
import { ActionButton, Field, SelectInput, StatusMessage, TextInput } from '../../modules/ficha-tecnica/components/management-primitives';
import { HighlightCard, SheetBlock } from '../../modules/ficha-tecnica/components/page-primitives';
import { getApiErrorMessage } from '../../modules/ficha-tecnica/lib/api-errors';
import { listPrices, savePrice, simulatePricing, type PriceRow, type PricingSimulationResult } from '../../modules/ficha-tecnica/lib/pricing-management-api';
import { getToneClassName } from '../../modules/ficha-tecnica/mock/technical-sheet-data';
import { useWorkbookProductDetail, useWorkbookSnapshot } from '../../modules/ficha-tecnica/lib/workbook-api';
import { useAuthStore } from '../../modules/ficha-tecnica/mock/auth.store';

function formatMaybeMoneyPerUnit(value: number | null, unit: string) {
  return value === null ? '---' : `${formatBRL(value)}/${unit}`;
}

function formatMaybePercent(value: number | null) {
  return value === null ? '---' : `${value.toFixed(2).replace('.', ',')}%`;
}

function formatMaybeNumber(value: number | null) {
  return value === null ? '---' : value.toLocaleString('pt-BR');
}

function getMarginTone(percent: number | null): string {
  if (percent === null) return 'text-gray-400';
  if (percent >= 30) return 'text-emerald-600';
  if (percent >= 20) return 'text-[#C9A84C]';
  return 'text-red-500';
}

function buildFormFromDetail(
  productDetail: ReturnType<typeof useWorkbookProductDetail>['data'],
  profile: { targetMarginPercent: number; cardFeePercent: number; deliveryFeePercent: number; commissionPercent: number; taxPercent: number; operationalCostPercent: number },
  pricingUnit?: string,
) {
  const product = productDetail?.product ?? null;
  const effectivePricingUnit = pricingUnit || getDefaultPricingUnit(product);
  return {
    targetMarginPercent: Number(profile.targetMarginPercent ?? productDetail?.targetMarginPercent ?? 25),
    cardFeePercent: Number(profile.cardFeePercent ?? 0),
    deliveryFeePercent: Number(productDetail?.deliveryFeePercent ?? profile.deliveryFeePercent ?? 0),
    commissionPercent: Number(profile.commissionPercent ?? 0),
    taxPercent: Number(profile.taxPercent ?? 0),
    operationalCostPercent: Number(profile.operationalCostPercent ?? 0),
    finalPrice: Number(convertValueToPricingUnit(product?.salePrice ?? null, product, effectivePricingUnit) ?? 0),
    notes: '',
  };
}

const SCENARIO_MARGINS = [15, 20, 25, 30, 35, 40];
type WorkbookProduct = ReturnType<typeof useWorkbookSnapshot>['data']['products'][number];

function isRegisteredPricingProduct(product: WorkbookProduct): boolean {
  const name = product.recipeName.trim();
  const isPlaceholderName = name === product.code || /^P\s*\d+$/i.test(name);
  return product.productType === 'FINAL' && name.length > 0 && !isPlaceholderName;
}

function getDefaultPricingUnit(product: WorkbookProduct | null): string {
  const stored = product?.pricingUnit;
  const candidate = stored || product?.yieldUnit || 'un';
  const known = getKnownUnit(candidate);
  if (known?.type === 'MASS') return 'kg';
  if (known?.type === 'VOLUME') return 'L';
  return candidate;
}

function normalizeUnit(unit?: string | null) {
  return unit?.trim().replace(/\./g, '').toLowerCase() ?? '';
}

function getKnownUnit(unit?: string | null) {
  const normalized = normalizeUnit(unit);
  return [
    { abbreviation: 'kg', type: 'MASS', conversionFactor: 1 },
    { abbreviation: 'g', type: 'MASS', conversionFactor: 0.001 },
    { abbreviation: 'L', type: 'VOLUME', conversionFactor: 1 },
    { abbreviation: 'mL', type: 'VOLUME', conversionFactor: 0.001 },
    { abbreviation: 'un', type: 'UNIT', conversionFactor: 1 },
  ].find((entry) => normalizeUnit(entry.abbreviation) === normalized) ?? null;
}

function getPricingUnitOptions(product: WorkbookProduct | null): string[] {
  const yieldUnit = product?.yieldUnit || 'un';
  const source = getKnownUnit(yieldUnit);
  const savedUnit = product?.pricingUnit || null;
  const options = source?.type === 'MASS'
    ? ['kg', 'g', 'un']
    : source?.type === 'VOLUME'
      ? ['L', 'mL', 'un']
      : ['un'];

  if (savedUnit && !options.some((unit) => normalizeUnit(unit) === normalizeUnit(savedUnit))) {
    options.unshift(savedUnit);
  }

  return options;
}

function getPricingUnitFactor(product: WorkbookProduct | null, pricingUnit?: string | null): number {
  if (!product) return 1;
  const targetUnit = pricingUnit || getDefaultPricingUnit(product);

  if (product.pricingUnit && normalizeUnit(product.pricingUnit) === normalizeUnit(targetUnit)) {
    return Number(product.pricingUnitFactor) || 1;
  }

  const source = getKnownUnit(product.yieldUnit || 'un');
  const target = getKnownUnit(targetUnit);

  if (!source || !target || normalizeUnit(source.abbreviation) === normalizeUnit(target.abbreviation)) {
    return 1;
  }

  if (source.type === target.type) {
    return target.conversionFactor / source.conversionFactor;
  }

  if (target.type === 'UNIT' && source.type !== 'UNIT') {
    const portionSize = Number(product.servingSize ?? 0) || Number(product.yieldQuantity ?? 0);
    return portionSize > 0 ? portionSize : 1;
  }

  return 1;
}

function convertValueToPricingUnit(value: number | null, product: WorkbookProduct | null, pricingUnit?: string | null): number | null {
  if (value === null) return null;
  return value * getPricingUnitFactor(product, pricingUnit);
}

function convertPriceBetweenUnits(value: number, product: WorkbookProduct | null, fromUnit: string, toUnit: string): number {
  if (!product) return value;
  const fromFactor = getPricingUnitFactor(product, fromUnit);
  const toFactor = getPricingUnitFactor(product, toUnit);
  return fromFactor > 0 ? (value / fromFactor) * toFactor : value;
}

function getProductionUnitCost(product: WorkbookProduct | null, pricingUnit?: string | null): number {
  if (!product) return 0;
  const productionCost =
    (product.ingredientCost ?? 0) +
    (product.packagingCost ?? 0) +
    (product.laborCost ?? 0) +
    (product.equipmentCost ?? 0);
  const baseCost = productionCost > 0 ? productionCost : (product.totalCost ?? 0);
  return baseCost * getPricingUnitFactor(product, pricingUnit);
}

function getCmvUnitCost(product: WorkbookProduct | null, pricingUnit?: string | null): number {
  if (!product) return 0;
  return ((product.ingredientCost ?? 0) + (product.packagingCost ?? 0)) * getPricingUnitFactor(product, pricingUnit);
}

function calcPriceFromMargin(margin: number, unitCost: number, totalFeesDecimal: number): number {
  const divisor = 1 - totalFeesDecimal - margin / 100;
  return divisor > 0 ? unitCost / divisor : 0;
}

function calcMarginFromPrice(price: number, unitCost: number, totalFeesDecimal: number): number {
  return price > 0 ? (1 - totalFeesDecimal - unitCost / price) * 100 : 0;
}

export default function PricingPage() {
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
  const [searchParams] = useSearchParams();
  const { data, source, reload } = useWorkbookSnapshot(isDemoSession);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState('');
  const [saleUnit, setSaleUnit] = useState('');
  const visibleProducts = useMemo(
    () => data.products.filter(isRegisteredPricingProduct),
    [data.products],
  );
  const [listSearch, setListSearch] = useState('');
  const [listFilter, setListFilter] = useState<'TODOS' | 'COM_PRECO' | 'SEM_PRECO' | 'MARGEM_BAIXA'>('TODOS');
  const filteredProducts = useMemo(() => {
    const term = listSearch.trim().toLowerCase();
    return visibleProducts.filter((row) => {
      if (term && !`${row.recipeName} ${row.code}`.toLowerCase().includes(term)) return false;
      const hasSalePrice = row.salePrice !== null && Number(row.salePrice) > 0;
      if (listFilter === 'COM_PRECO') return hasSalePrice;
      if (listFilter === 'SEM_PRECO') return !hasSalePrice;
      if (listFilter === 'MARGEM_BAIXA') return typeof row.marginPercent === 'number' && row.marginPercent < 20;
      return true;
    });
  }, [visibleProducts, listSearch, listFilter]);
  const pricingSummary = useMemo(() => {
    const averageOf = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return {
      averageSuggestedPrice: averageOf(visibleProducts
        .map((row) => convertValueToPricingUnit(row.suggestedPrice, row, getDefaultPricingUnit(row)))
        .filter((value): value is number => typeof value === 'number')),
      averageContributionMargin: averageOf(visibleProducts
        .map((row) => row.contributionMargin)
        .filter((value): value is number => typeof value === 'number')),
      averageCmvPercent: averageOf(visibleProducts
        .map((row) => row.cmvPercent)
        .filter((value): value is number => typeof value === 'number')),
    };
  }, [visibleProducts]);
  const { data: productDetail, reload: reloadDetail } = useWorkbookProductDetail(selectedCode || visibleProducts[0]?.code || 'P01', isDemoSession);
  const [form, setForm] = useState(() => buildFormFromDetail(null, data.profile));
  const [simulation, setSimulation] = useState<PricingSimulationResult | null>(null);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!visibleProducts.length) return;
    const recipeId = searchParams.get('recipeId');
    if (recipeId) {
      const match = visibleProducts.find((p) => p.recipeId === recipeId);
      if (match) {
        setSelectedCode(match.code);
        setSimulatorOpen(true);
        return;
      }
    }
    if (!selectedCode || !visibleProducts.some((product) => product.code === selectedCode)) {
      setSelectedCode(visibleProducts[0].code);
    }
  }, [visibleProducts, searchParams, selectedCode]);

  const lastOpenedCode = useRef<string | null>(null);
  const profilePricingDefaultsKey = [
    data.profile.targetMarginPercent,
    data.profile.cardFeePercent,
    data.profile.deliveryFeePercent,
    data.profile.commissionPercent,
    data.profile.taxPercent,
    data.profile.operationalCostPercent,
  ].join('|');

  useEffect(() => {
    if (!productDetail || !simulatorOpen) return;
    const openedKey = `${productDetail.product.code}|${profilePricingDefaultsKey}`;
    if (lastOpenedCode.current === openedKey) return;
    lastOpenedCode.current = openedKey;
    const defaultSaleUnit = getDefaultPricingUnit(productDetail.product);
    setSaleUnit(defaultSaleUnit);
    setForm(buildFormFromDetail(productDetail, data.profile, defaultSaleUnit));
    setSimulation(null);
  }, [productDetail, data.profile, profilePricingDefaultsKey, simulatorOpen]);

  useEffect(() => {
    if (isDemoSession) { setPrices([]); return; }
    void refreshPrices();
  }, [isDemoSession]);

  const selectedProduct = useMemo(
    () => visibleProducts.find((p) => p.code === selectedCode) ?? null,
    [visibleProducts, selectedCode],
  );
  const pricingUnitLabel = saleUnit || getDefaultPricingUnit(selectedProduct);

  const previewScenarios = useMemo(() => {
    const unitCost = getProductionUnitCost(selectedProduct, pricingUnitLabel);
    if (!unitCost) return [];
    const totalFeesDecimal = (form.cardFeePercent + form.deliveryFeePercent + form.commissionPercent + form.taxPercent + form.operationalCostPercent) / 100;
    return SCENARIO_MARGINS.map((margin) => {
      const divisor = 1 - totalFeesDecimal - margin / 100;
      if (divisor <= 0) return { label: `${margin}%`, targetMarginPercent: margin, suggestedPrice: 0, marginValue: 0, isViable: false };
      const suggestedPrice = unitCost / divisor;
      return { label: `${margin}%`, targetMarginPercent: margin, suggestedPrice, marginValue: suggestedPrice * (margin / 100), isViable: true };
    });
  }, [selectedProduct, pricingUnitLabel, form.cardFeePercent, form.deliveryFeePercent, form.commissionPercent, form.taxPercent, form.operationalCostPercent]);

  const liveResult = useMemo(() => {
    if (!selectedProduct) return null;
    const unitCost = getProductionUnitCost(selectedProduct, pricingUnitLabel);
    const cmvUnitCost = getCmvUnitCost(selectedProduct, pricingUnitLabel);
    if (!unitCost) return null;
    const totalFeesDecimal = (form.cardFeePercent + form.deliveryFeePercent + form.commissionPercent + form.taxPercent + form.operationalCostPercent) / 100;
    const price = form.finalPrice > 0
      ? form.finalPrice
      : calcPriceFromMargin(form.targetMarginPercent, unitCost, totalFeesDecimal);
    if (price <= 0) return null;
    const marginPercent = calcMarginFromPrice(price, unitCost, totalFeesDecimal);
    const cmvPercent = (cmvUnitCost / price) * 100;
    const cmvThreshold = 100 - (data.profile.targetMarginPercent ?? form.targetMarginPercent);
    const alerts: Array<{ code: string; severity: string; message: string }> = [];
    if (cmvPercent > cmvThreshold) alerts.push({ code: 'CMV_HIGH', severity: 'WARNING', message: `CMV de ${cmvPercent.toFixed(1)}% está acima do limite recomendado (${cmvThreshold.toFixed(1)}%) para a margem alvo de ${(data.profile.targetMarginPercent ?? form.targetMarginPercent).toFixed(0)}%` });
    return { unitCost, price, marginPercent, cmvPercent, alerts };
  }, [selectedProduct, pricingUnitLabel, form.finalPrice, form.targetMarginPercent, form.cardFeePercent, form.deliveryFeePercent, form.commissionPercent, form.taxPercent, form.operationalCostPercent, data.profile.targetMarginPercent]);

  function openSimulator(code: string) {
    lastOpenedCode.current = null;
    const product = visibleProducts.find((item) => item.code === code) ?? null;
    setSaleUnit(getDefaultPricingUnit(product));
    setSelectedCode(code);
    setSimulatorOpen(true);
  }

  function closeSimulator() {
    setSimulatorOpen(false);
    setScenariosOpen(false);
    setSimulation(null);
    setMessage(null);
  }

  async function refreshPrices() {
    try {
      const rows = await listPrices();
      setPrices(rows);
    } catch (error) {
      setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível carregar os preços salvos.') });
    }
  }

  // Mantida para a UI de simulação (em migração); ainda não religada a um botão.
  async function _handleSimulate() {
    if (!selectedProduct?.recipeVersionId || isDemoSession) return;
    try {
      setLoading(true);
      setMessage(null);
      const result = await simulatePricing({
        recipeVersionId: selectedProduct.recipeVersionId,
        pricingUnit: pricingUnitLabel,
        targetMarginPercent: form.targetMarginPercent,
        cardFeePercent: form.cardFeePercent,
        deliveryFeePercent: form.deliveryFeePercent,
        commissionPercent: form.commissionPercent,
        taxPercent: form.taxPercent,
        operationalCostPercent: form.operationalCostPercent,
      });
      setSimulation(result);
    } catch (error) {
      setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível simular a precificação.') });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedProduct?.recipeVersionId || isDemoSession) return;
    try {
      setLoading(true);
      setMessage(null);
      await savePrice({
        recipeVersionId: selectedProduct.recipeVersionId,
        pricingUnit: pricingUnitLabel,
        targetMarginPercent: form.targetMarginPercent,
        cardFeePercent: form.cardFeePercent,
        deliveryFeePercent: form.deliveryFeePercent,
        commissionPercent: form.commissionPercent,
        taxPercent: form.taxPercent,
        operationalCostPercent: form.operationalCostPercent,
        finalPrice: form.finalPrice > 0 ? form.finalPrice : undefined,
        notes: form.notes || undefined,
      });
      reload();
      reloadDetail();
      await refreshPrices();
      closeSimulator();
    } catch (error) {
      setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível salvar o preço.') });
    } finally {
      setLoading(false);
    }
  }

  const scenarios = simulation?.scenarios ?? previewScenarios;
  const pricingUnitOptions = getPricingUnitOptions(selectedProduct);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <HighlightCard label="Produtos cadastrados" value={String(visibleProducts.length)} toneClassName={getToneClassName('pink')} />
        <HighlightCard label="Preço médio" value={formatBRL(pricingSummary.averageSuggestedPrice)} toneClassName={getToneClassName('lime')} />
        <HighlightCard label="MC média" value={formatBRL(pricingSummary.averageContributionMargin)} toneClassName={getToneClassName('amber')} />
        <HighlightCard label={`CMV global ${source === 'api' ? '(API)' : '(demo)'}`} value={`${pricingSummary.averageCmvPercent.toFixed(2).replace('.', ',')}%`} toneClassName={getToneClassName('green')} />
      </div>

      {isDemoSession ? <StatusMessage tone="error" message="Entre com a API para simular, salvar e ativar preços reais." /> : null}

      {/* Main table */}
      <SheetBlock title="Visão geral de custos e preços">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <TextInput
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Buscar por produto ou código…"
              className="pl-9"
            />
          </div>
          <div className="sm:w-56">
            <SelectInput value={listFilter} onChange={(e) => setListFilter(e.target.value as typeof listFilter)}>
              <option value="TODOS">Todos os produtos</option>
              <option value="COM_PRECO">Com preço de venda</option>
              <option value="SEM_PRECO">Sem preço de venda</option>
              <option value="MARGEM_BAIXA">Margem abaixo de 20%</option>
            </SelectInput>
          </div>
          {listSearch || listFilter !== 'TODOS' ? (
            <p className="text-xs text-gray-400">
              {filteredProducts.length} de {visibleProducts.length} produto(s)
            </p>
          ) : null}
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-[1200px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {[
                  { label: 'Produto', align: 'left' },
                  { label: 'Rende', align: 'right' },
                  { label: 'Mão de obra', align: 'right' },
                  { label: 'Ingredientes', align: 'right' },
                  { label: 'Embalagens', align: 'right' },
                  { label: 'Equipamentos', align: 'right' },
                  { label: 'Custo total', align: 'right' },
                  { label: 'Preço sugerido', align: 'right' },
                  { label: 'Preço venda', align: 'right' },
                  { label: 'Margem %', align: 'right' },
                  { label: 'CMV %', align: 'right' },
                  { label: '', align: 'right' },
                ].map((col) => (
                  <th key={col.label} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!filteredProducts.length ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-sm text-gray-400">
                    Nenhum produto encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : null}
              {filteredProducts.map((row) => {
                const rowPricingUnit = getDefaultPricingUnit(row);
                return (
                <tr
                  key={row.code}
                  className={`border-b border-gray-100 transition-colors last:border-0 ${row.code === selectedCode && simulatorOpen ? 'bg-amber-50/60' : 'hover:bg-gray-50/60'}`}
                >
                  <td className="px-4 py-3">
                    <span className="mr-2 text-[11px] font-semibold text-[#C9A84C]">{row.code}</span>
                    <Link to={`/app/ficha-tecnica/fichas?recipeId=${row.recipeId}`} className="font-medium text-gray-800 transition-colors hover:text-[var(--brand-primary-700)]">
                      {row.recipeName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatMaybeNumber(row.yieldQuantity)}{row.yieldUnit ? ` ${row.yieldUnit}` : ''}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatMaybeMoneyPerUnit(convertValueToPricingUnit(row.laborCost, row, rowPricingUnit), rowPricingUnit)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatMaybeMoneyPerUnit(convertValueToPricingUnit(row.ingredientCost, row, rowPricingUnit), rowPricingUnit)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatMaybeMoneyPerUnit(convertValueToPricingUnit(row.packagingCost, row, rowPricingUnit), rowPricingUnit)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatMaybeMoneyPerUnit(convertValueToPricingUnit(row.equipmentCost ?? null, row, rowPricingUnit), rowPricingUnit)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatMaybeMoneyPerUnit(convertValueToPricingUnit(row.totalCost, row, rowPricingUnit), rowPricingUnit)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatMaybeMoneyPerUnit(convertValueToPricingUnit(row.suggestedPrice, row, rowPricingUnit), rowPricingUnit)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[#C9A84C]">{formatMaybeMoneyPerUnit(convertValueToPricingUnit(row.salePrice, row, rowPricingUnit), rowPricingUnit)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${getMarginTone(row.marginPercent)}`}>{formatMaybePercent(row.marginPercent)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatMaybePercent(row.cmvPercent)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openSimulator(row.code)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-600 shadow-sm transition-all hover:border-[#C9A84C] hover:text-[#C9A84C]"
                    >
                      <Calculator size={12} />
                      Simular
                    </button>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </SheetBlock>

      {/* Price history */}
      <SheetBlock title="Histórico de preços">
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Produto', 'Versão', 'Status', 'Preço final', 'Margem %', 'Salvo em'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prices.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-gray-800">{row.recipe.name}</td>
                  <td className="px-4 py-3 text-gray-600">v{row.recipeVersion?.versionNumber ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      row.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700'
                      : row.status === 'APPROVED' ? 'bg-blue-50 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                    }`}>
                      {row.status === 'ACTIVE' ? 'Ativo' : row.status === 'APPROVED' ? 'Aprovado' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#C9A84C]">
                    {formatBRL(Number(row.finalPrice ?? row.suggestedPrice))}
                    {row.pricingUnit ? <span className="ml-1 text-xs font-medium text-gray-400">/{row.pricingUnit}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.targetMarginPercent != null ? `${Number(row.targetMarginPercent).toFixed(0)}%` : '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(row.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
              {!prices.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum preço salvo ainda.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SheetBlock>

      {/* Simulator slide-over */}
      {simulatorOpen ? (
        <div className="fixed inset-0 z-40 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeSimulator} />

          {/* Panel */}
          <div className="relative z-50 flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Simulador de precificação</p>
                <p className="mt-0.5 text-base font-semibold text-gray-900">{selectedProduct?.recipeName ?? '—'}</p>
              </div>
              <button onClick={closeSimulator} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Current cost banner */}
              {selectedProduct?.totalCost ? (
                <div className="flex items-center justify-between bg-gray-50 px-6 py-3 border-b border-gray-100">
                  <span className="text-xs text-gray-500">Custo por {pricingUnitLabel}</span>
                  <span className="text-sm font-semibold text-gray-900">{formatBRL(getProductionUnitCost(selectedProduct, pricingUnitLabel))}</span>
                </div>
              ) : null}

              <div className="space-y-6 px-6 py-5">
                {message ? <StatusMessage tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} /> : null}

                {/* Scenario suggestions */}
                <div>
                  <button
                    onClick={() => setScenariosOpen((o) => !o)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-2.5 transition-colors hover:bg-gray-100"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Cenários sugeridos</span>
                    <span className="text-[11px] text-gray-400">{scenariosOpen ? '▲' : '▼'}</span>
                  </button>
                  {scenariosOpen ? (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {scenarios.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => setForm((f) => ({ ...f, targetMarginPercent: s.targetMarginPercent, finalPrice: 0 }))}
                          className={`flex flex-col items-center rounded-xl border px-3 py-2.5 text-left transition-all ${
                            form.targetMarginPercent === s.targetMarginPercent && form.finalPrice === 0
                              ? 'border-[#C9A84C] bg-amber-50'
                              : s.isViable
                                ? 'border-gray-200 bg-white hover:border-gray-300'
                                : 'border-gray-100 bg-gray-50 opacity-60'
                          }`}
                        >
                          <span className={`text-base font-bold ${form.targetMarginPercent === s.targetMarginPercent && form.finalPrice === 0 ? 'text-[#C9A84C]' : 'text-gray-800'}`}>
                            {s.label}
                          </span>
                          <span className="mt-0.5 text-[11px] text-gray-500">{formatBRL(s.suggestedPrice)}</span>
                          {!s.isViable ? <span className="mt-0.5 text-[10px] text-red-400">Inviável</span> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Form */}
                <div className="space-y-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Parâmetros</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Unidade de venda">
                      <SelectInput
                        value={pricingUnitLabel}
                        onChange={(e) => {
                          const nextUnit = e.target.value;
                          setSimulation(null);
                          setForm((f) => ({
                            ...f,
                            finalPrice: Number(convertPriceBetweenUnits(f.finalPrice, selectedProduct, pricingUnitLabel, nextUnit).toFixed(2)),
                          }));
                          setSaleUnit(nextUnit);
                        }}
                        disabled={loading || isDemoSession}
                      >
                        {pricingUnitOptions.map((unit) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </SelectInput>
                    </Field>
                    <Field label="Margem alvo %">
                      <TextInput
                        type="number"
                        step="0.01"
                        value={form.targetMarginPercent}
                        onChange={(e) => {
                          const margin = Number(e.target.value);
                          const unitCost = getProductionUnitCost(selectedProduct, pricingUnitLabel);
                          const fees = (form.cardFeePercent + form.deliveryFeePercent + form.commissionPercent + form.taxPercent + form.operationalCostPercent) / 100;
                          const price = unitCost > 0 ? Number(calcPriceFromMargin(margin, unitCost, fees).toFixed(2)) : 0;
                          setForm((f) => ({ ...f, targetMarginPercent: margin, finalPrice: price }));
                        }}
                        disabled={loading || isDemoSession}
                      />
                    </Field>
                    <Field label={`Preço final desejado (${pricingUnitLabel})`}>
                      <TextInput
                        type="number"
                        step="0.01"
                        value={form.finalPrice}
                        onChange={(e) => {
                          const price = Number(e.target.value);
                          setForm((f) => ({ ...f, finalPrice: price }));
                        }}
                        disabled={loading || isDemoSession}
                      />
                    </Field>
                    <Field label="Cartão %">
                      <TextInput type="number" step="0.01" value={form.cardFeePercent} disabled />
                    </Field>
                    <Field label="Delivery %">
                      <TextInput type="number" step="0.01" value={form.deliveryFeePercent} onChange={(e) => {
                        const v = Number(e.target.value);
                        const unitCost = getProductionUnitCost(selectedProduct, pricingUnitLabel);
                        setForm((f) => {
                          const fees = (f.cardFeePercent + v + f.commissionPercent + f.taxPercent + f.operationalCostPercent) / 100;
                          return { ...f, deliveryFeePercent: v, finalPrice: Number(calcPriceFromMargin(f.targetMarginPercent, unitCost, fees).toFixed(2)) };
                        });
                      }} disabled={loading || isDemoSession} />
                    </Field>
                    <Field label="Comissão %">
                      <TextInput type="number" step="0.01" value={form.commissionPercent} disabled />
                    </Field>
                    <Field label="Impostos %">
                      <TextInput type="number" step="0.01" value={form.taxPercent} disabled />
                    </Field>
                    <Field label="Operacional %">
                      <TextInput type="number" step="0.01" value={form.operationalCostPercent} disabled />
                    </Field>
                  </div>
                  <Field label="Notas">
                    <TextInput value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} disabled={loading || isDemoSession} />
                  </Field>
                </div>

                {/* Results */}
                {liveResult ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Resultado</p>
                    <div className="grid grid-cols-2 gap-2">
                      <MetricCard label={`Custo por ${pricingUnitLabel}`} value={formatBRL(liveResult.unitCost)} tone="text-gray-900" />
                      <MetricCard label={`Preço por ${pricingUnitLabel}`} value={formatBRL(liveResult.price)} tone="text-emerald-600" />
                      <MetricCard label="Margem %" value={`${liveResult.marginPercent.toFixed(2).replace('.', ',')}%`} tone={getMarginTone(liveResult.marginPercent)} />
                      <MetricCard label="CMV %" value={`${liveResult.cmvPercent.toFixed(2).replace('.', ',')}%`} tone="text-[#C9A84C]" />
                    </div>
                    {liveResult.alerts.length ? (
                      <div className="mt-3 space-y-2">
                        {liveResult.alerts.map((alert) => (
                          <StatusMessage key={alert.code} tone={alert.severity === 'ERROR' ? 'error' : 'success'} message={alert.message} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Footer actions */}
            <div className="border-t border-gray-200 px-6 py-4">
              <ActionButton
                onClick={() => void handleSave()}
                disabled={loading || isDemoSession || !selectedProduct?.recipeVersionId}
                className="w-full justify-center"
              >
                {loading ? 'Salvando…' : 'Salvar preço'}
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}
