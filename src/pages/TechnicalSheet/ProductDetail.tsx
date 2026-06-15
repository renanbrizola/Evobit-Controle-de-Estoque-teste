import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calculator } from 'lucide-react';
import { formatBRL } from '../../modules/ficha-tecnica/utils';
import { HighlightCard, SheetBlock } from '../../modules/ficha-tecnica/components/page-primitives';
import { useWorkbookProductDetail } from '../../modules/ficha-tecnica/lib/workbook-api';
import { useAuthStore } from '../../modules/ficha-tecnica/mock/auth.store';

function money(value: number | null | undefined) {
  return formatBRL(Number.isFinite(Number(value)) ? Number(value) : 0);
}

function quantity(value: number | null | undefined, unit?: string | null) {
  const formatted = Number(value ?? 0).toLocaleString('pt-BR', {
    maximumFractionDigits: 3,
  });
  return unit ? `${formatted} ${unit}` : formatted;
}

function sum(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (Number(value) || 0), 0);
}

function percentOf(base: number | null | undefined, percent: number | null | undefined) {
  return (Number(base) || 0) * ((Number(percent) || 0) / 100);
}

function unitLabel(unit?: string | null) {
  return unit?.trim() || 'un.';
}

function normalizeUnit(unit?: string | null) {
  return unit?.trim().replace(/\./g, '').toLowerCase() ?? '';
}

function getKnownUnit(unit?: string | null) {
  const normalized = normalizeUnit(unit);
  return [
    { abbreviation: 'kg', type: 'MASS' },
    { abbreviation: 'g', type: 'MASS' },
    { abbreviation: 'L', type: 'VOLUME' },
    { abbreviation: 'mL', type: 'VOLUME' },
    { abbreviation: 'un', type: 'UNIT' },
  ].find((entry) => normalizeUnit(entry.abbreviation) === normalized) ?? null;
}

function equipmentType(type: string) {
  return type.toUpperCase();
}

function CostCard({ label, value, highlight }: { label: string; value: number | null | undefined; highlight?: boolean }) {
  if (highlight) {
    return (
      <div className="rounded-[10px] bg-[#0a0a0a] px-6 py-4 shadow-[var(--shadow-panel)]">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#C9A84C]">{label}</p>
        <p className="mt-2 text-2xl font-bold text-white">{money(value)}</p>
      </div>
    );
  }
  return (
    <div className="rounded-[10px] border bg-white px-4 py-3 shadow-[var(--shadow-panel)]" style={{ borderColor: 'var(--line-soft)' }}>
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{money(value)}</p>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams<{ code: string }>();
  const rawCode = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = decodeURIComponent(rawCode ?? '');
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
  const { data, loading, source } = useWorkbookProductDetail(code, isDemoSession);

  if (loading) {
    return (
      <div className="space-y-5">
        <Link to="/app/ficha-tecnica/fichas" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary-700)]">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <SheetBlock title="Detalhe da ficha técnica">
          <div className="py-14 text-center text-sm text-[var(--text-muted)]">Carregando custos...</div>
        </SheetBlock>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-5">
        <Link to="/app/ficha-tecnica/fichas" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary-700)]">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <SheetBlock title="Ficha não encontrada">
          <div className="py-14 text-center text-sm text-[var(--text-muted)]">Não foi possível carregar os custos deste produto.</div>
        </SheetBlock>
      </div>
    );
  }

  const { product, breakdown } = data;
  const yieldQuantity = breakdown?.yieldQuantity ?? product.yieldQuantity ?? 0;
  const yieldUnitType = getKnownUnit(product.yieldUnit)?.type;
  const isSmallUnit = normalizeUnit(product.yieldUnit) === 'g' || normalizeUnit(product.yieldUnit) === 'ml';
  const displayUnit = isSmallUnit ? (yieldUnitType === 'MASS' ? 'kg' : 'L') : unitLabel(product.yieldUnit);
  const displayFactor = isSmallUnit ? 1000 : 1;
  const displayYieldQuantity = isSmallUnit ? Number(yieldQuantity) / 1000 : Number(yieldQuantity);
  const productionBatchCost = breakdown?.totalBatchCost ?? (product.totalCost ?? 0) * (Number(yieldQuantity) || 1);
  const normalizeLegacyPrice = (value: number | null | undefined) => {
    if (value === null || value === undefined) return null;
    if ((yieldUnitType === 'MASS' || yieldUnitType === 'VOLUME') && yieldQuantity > 1 && value > productionBatchCost * 0.5) {
      return value / yieldQuantity;
    }
    return value;
  };
  const suggestedPricePerUnit = normalizeLegacyPrice(product.suggestedPrice);
  const salePricePerUnit = normalizeLegacyPrice(product.salePrice);
  const feeBasePrice = (salePricePerUnit ?? suggestedPricePerUnit ?? 0);
  const electricCost = sum(breakdown?.equipment.filter((item) => equipmentType(item.type) === 'ELECTRIC').map((item) => item.lineCost) ?? []);
  const gasCost = sum(breakdown?.equipment.filter((item) => equipmentType(item.type) === 'GAS').map((item) => item.lineCost) ?? []);
  const equipmentBatchCost = breakdown?.totalEquipmentCost ?? (product.equipmentCost ?? 0) * (Number(yieldQuantity) || 1);
  const otherEquipmentCost = Math.max(equipmentBatchCost - electricCost - gasCost, 0);
  const batchPriceBase = feeBasePrice * (Number(yieldQuantity) || 1);
  const cardFee = percentOf(batchPriceBase, data.cardFeePercent);
  const deliveryCost = percentOf(batchPriceBase, data.deliveryFeePercent);
  const taxCost = percentOf(batchPriceBase, data.taxPercent);
  const commissionCost = percentOf(batchPriceBase, data.commissionPercent);
  const operationalCost = percentOf(batchPriceBase, data.operationalCostPercent);
  const calculatedTotal = sum([
    breakdown?.totalIngredientsCost,
    breakdown?.totalLaborCost,
    breakdown?.totalPackagingCost,
    electricCost,
    gasCost,
    otherEquipmentCost,
    cardFee,
    deliveryCost,
    taxCost,
    commissionCost,
    operationalCost,
  ]);
  const totalCost = calculatedTotal;
  const toPerUnit = (v: number | null | undefined) =>
    displayYieldQuantity > 0 ? (Number(v) || 0) / displayYieldQuantity : Number(v) || 0;

  const costCards = [
    { label: 'Ingredientes', value: toPerUnit(breakdown?.totalIngredientsCost) },
    { label: 'Mão de obra', value: toPerUnit(breakdown?.totalLaborCost) },
    { label: 'Embalagens', value: toPerUnit(breakdown?.totalPackagingCost) },
    { label: 'Energia elétrica', value: toPerUnit(electricCost) },
    { label: 'Gás', value: toPerUnit(gasCost) },
    { label: 'Outros equipamentos', value: toPerUnit(otherEquipmentCost) },
    { label: 'Taxa de cartão', value: toPerUnit(cardFee) },
    { label: 'Delivery', value: toPerUnit(deliveryCost) },
    { label: 'Imposto', value: toPerUnit(taxCost) },
    { label: 'Comissão', value: toPerUnit(commissionCost) },
    { label: 'Operacional', value: toPerUnit(operationalCost) },
  ];
  const totalCostPerUnit = toPerUnit(totalCost);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Link to="/app/ficha-tecnica/fichas" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary-700)]">
            <ArrowLeft size={16} /> Voltar para fichas
          </Link>
          <p className="mt-4 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {product.code} · {source === 'api' ? 'custos reais' : 'dados demonstrativos'}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">{product.recipeName}</h1>
        </div>
        <Link
          to={`/app/ficha-tecnica/precificacao?recipeId=${product.recipeId}`}
          className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[var(--brand-primary-700)] bg-[var(--brand-primary-700)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-panel)] transition hover:bg-[var(--brand-primary-900)]"
        >
          <Calculator size={16} /> Precificar
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <HighlightCard label="Rendimento" value={quantity(displayYieldQuantity, displayUnit)} toneClassName="text-[var(--text-strong)]" />
        <HighlightCard label="Custo do lote" value={money(productionBatchCost)} toneClassName="text-[var(--brand-primary-700)]" />
        <HighlightCard label={`Custo por ${displayUnit}`} value={money(totalCostPerUnit)} toneClassName="text-[#C9A84C]" />
        <HighlightCard label={`Preço sugerido/${displayUnit}`} value={money((suggestedPricePerUnit ?? 0) * displayFactor)} toneClassName="text-emerald-600" />
      </div>

      <SheetBlock title={`Custos por ${displayUnit}`}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {costCards.map((item) => (
            <CostCard key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
        <div className="mt-3">
          <CostCard label={`Custo total por ${displayUnit}`} value={totalCostPerUnit} highlight />
        </div>
      </SheetBlock>

      <SheetBlock title="Insumos utilizados">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left">Insumo</th>
                <th className="px-4 py-3 text-right">Quantidade</th>
                <th className="px-4 py-3 text-right">Quantidade bruta</th>
                <th className="px-4 py-3 text-right">Custo unitário</th>
                <th className="px-4 py-3 text-right">Custo</th>
              </tr>
            </thead>
            <tbody>
              {breakdown?.ingredients.length ? (
                breakdown.ingredients.map((item) => (
                  <tr key={item.itemId}>
                    <td className="px-4 py-3 font-medium text-[var(--text-strong)]">
                      {item.name}
                      {item.missingPrice ? <span className="ml-2 text-xs font-semibold text-[var(--state-danger-700)]">sem preço</span> : null}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-muted)]">{quantity(item.quantity, item.uom)}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-muted)]">{quantity(item.grossQuantity, item.uom)}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-muted)]">{money(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--text-strong)]">{money(item.lineCost)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">Nenhum insumo lançado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SheetBlock>

      <div className="grid gap-6 xl:grid-cols-3">
        <SheetBlock title="Embalagens">
          <SimpleCostTable
            rows={breakdown?.packaging.map((item) => ({
              id: item.itemId,
              name: item.name,
              detail: quantity(item.quantity),
              cost: item.lineCost,
            })) ?? []}
            empty="Nenhuma embalagem lançada."
          />
        </SheetBlock>
        <SheetBlock title="Mão de obra">
          <SimpleCostTable
            rows={breakdown?.labor.map((item) => ({
              id: item.employeeId ?? item.role,
              name: item.role,
              detail: `${item.minutes} min`,
              cost: item.lineCost,
            })) ?? []}
            empty="Nenhuma mão de obra lançada."
          />
        </SheetBlock>
        <SheetBlock title="Equipamentos">
          <SimpleCostTable
            rows={breakdown?.equipment.map((item) => ({
              id: item.equipmentId,
              name: item.name,
              detail: equipmentType(item.type) === 'GAS' ? 'Gás' : equipmentType(item.type) === 'ELECTRIC' ? 'Energia elétrica' : item.type,
              cost: item.lineCost,
            })) ?? []}
            empty="Nenhum equipamento lançado."
          />
        </SheetBlock>
      </div>
    </div>
  );
}

function SimpleCostTable({
  rows,
  empty,
}: {
  rows: Array<{ id: string; name: string; detail: string; cost: number }>;
  empty: string;
}) {
  if (!rows.length) {
    return <div className="py-8 text-center text-sm text-[var(--text-muted)]">{empty}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left">Item</th>
            <th className="px-4 py-3 text-left">Detalhe</th>
            <th className="px-4 py-3 text-right">Custo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-[var(--text-strong)]">{row.name}</td>
              <td className="px-4 py-3 text-[var(--text-muted)]">{row.detail}</td>
              <td className="px-4 py-3 text-right font-semibold text-[var(--text-strong)]">{money(row.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
