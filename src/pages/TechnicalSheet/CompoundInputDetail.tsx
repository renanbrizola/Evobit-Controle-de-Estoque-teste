import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { CostBreakdownDto } from '../../modules/ficha-tecnica/types/enums';
import { formatBRL } from '../../modules/ficha-tecnica/utils';
import { HighlightCard, SheetBlock } from '../../modules/ficha-tecnica/components/page-primitives';
import { StatusMessage } from '../../modules/ficha-tecnica/components/management-primitives';
import { getApiErrorMessage } from '../../modules/ficha-tecnica/lib/api-errors';
import { getCostBreakdown, getRecipe, type RecipeDetail } from '../../modules/ficha-tecnica/lib/recipes-management-api';
import { formatPlainNumber, getToneClassName } from '../../modules/ficha-tecnica/mock/technical-sheet-data';
import { useAuthStore } from '../../modules/ficha-tecnica/mock/auth.store';

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-gray-200 bg-gray-50">
        {cols.map((col) => (
          <th
            key={col}
            className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${
              ['Quantidade', 'Preço unit.', 'Custo', 'Tempo', 'Salário/mês', ''].includes(col) ? 'text-right' : 'text-left'
            }`}
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function getStatusBadge(status?: string) {
  switch (status) {
    case 'APPROVED':
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'IN_REVIEW':
      return 'border border-amber-200 bg-amber-50 text-amber-700';
    case 'DRAFT':
    default:
      return 'border border-slate-200 bg-slate-100 text-slate-600';
  }
}

function getStatusLabel(status?: string) {
  switch (status) {
    case 'APPROVED':
      return 'Aprovado';
    case 'IN_REVIEW':
      return 'Em revisão';
    case 'DRAFT':
    default:
      return 'Rascunho';
  }
}

export default function CompoundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [breakdown, setBreakdown] = useState<CostBreakdownDto | null>(null);
  const [loading, setLoading] = useState(!isDemoSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (isDemoSession) {
      setLoading(false);
      setError('Entre com a API para visualizar os dados reais do insumo composto.');
      return () => {
        active = false;
      };
    }

    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        const detail = await getRecipe(id);
        if (!active) return;

        setRecipe(detail);
        const currentVersion = detail.versions[0];

        if (currentVersion?.id) {
          try {
            const costData = await getCostBreakdown(currentVersion.id);
            if (active) setBreakdown(costData);
          } catch (err) {
            if (active) {
              setBreakdown(null);
              setError(getApiErrorMessage(err, 'Nao foi possivel calcular os custos deste insumo composto.'));
            }
          }
        } else {
          setBreakdown(null);
        }
      } catch (err) {
        if (!active) return;
        setRecipe(null);
        setBreakdown(null);
        setError(getApiErrorMessage(err, 'Nao foi possivel carregar o insumo composto.'));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [id, isDemoSession]);

  const version = recipe?.versions[0] ?? null;

  const ingredientRows = useMemo(() => {
    if (!version) return [];

    return version.ingredients.map((row) => {
      const referenceId = row.inventoryItemId ?? row.subRecipeId ?? '';
      const costLine = breakdown?.ingredients.find((item) => item.itemId === referenceId);

      return {
        ...row,
        referenceId,
        resolvedName: costLine?.name ?? row.inventoryItem?.name ?? (row.subRecipeId ? 'Sub-receita' : 'Item'),
        costLine,
      };
    });
  }, [version, breakdown]);

  const laborRows = useMemo(() => {
    if (!version) return [];

    return version.laborEntries.map((row, index) => {
      const costLine = breakdown?.labor[index];
      const computedCost =
        row.monthlyHours > 0 ? (row.monthlySalary / (row.monthlyHours * 60)) * row.minutes : 0;

      return {
        ...row,
        lineCost: costLine?.lineCost ?? computedCost,
      };
    });
  }, [version, breakdown]);

  const packagingRows = breakdown?.packaging ?? [];
  const equipmentRows = breakdown?.equipment ?? [];
  const totalMinutes = laborRows.reduce((sum, row) => sum + row.minutes, 0);
  const yieldLabel = version
    ? `${Number(version.yieldQuantity).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${version.yieldUom.abbreviation}`
    : '—';

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          to="/app/ficha-tecnica/insumos/compostos"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text-strong)]"
        >
          <ArrowLeft size={16} />
          Voltar para insumos compostos
        </Link>

        <div className="rounded-[12px] border border-[var(--line-soft)] bg-[var(--bg-surface)] px-6 py-12 text-center text-sm text-[var(--text-muted)] shadow-[var(--shadow-panel)]">
          Carregando dados do insumo composto...
        </div>
      </div>
    );
  }

  if (!recipe || !version) {
    return (
      <div className="space-y-6">
        <Link
          to="/app/ficha-tecnica/insumos/compostos"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text-strong)]"
        >
          <ArrowLeft size={16} />
          Voltar para insumos compostos
        </Link>

        {error ? <StatusMessage tone="error" message={error} /> : null}

        <div className="rounded-[12px] border border-[var(--line-soft)] bg-[var(--bg-surface)] px-6 py-12 text-center text-sm text-[var(--text-muted)] shadow-[var(--shadow-panel)]">
          Nenhum detalhe disponivel para este insumo composto.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/app/ficha-tecnica/insumos/compostos"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text-strong)]"
        >
          <ArrowLeft size={16} />
          Voltar para insumos compostos
        </Link>

        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getStatusBadge(version.status)}`}>
          {getStatusLabel(version.status)}
        </span>
      </div>

      {error ? <StatusMessage tone="error" message={error} onDismiss={() => setError(null)} /> : null}

      <div className="grid gap-4 lg:grid-cols-4">
        <HighlightCard
          label="Custo unitário"
          value={formatBRL(breakdown?.unitCost ?? Number(version.unitCost ?? 0))}
          toneClassName={getToneClassName('lime')}
        />
        <HighlightCard
          label="Custo total do lote"
          value={formatBRL(breakdown?.totalBatchCost ?? Number(version.totalCost ?? 0))}
          toneClassName={getToneClassName('pink')}
        />
        <HighlightCard
          label="Rendimento"
          value={yieldLabel}
          toneClassName={getToneClassName('cyan')}
        />
        <HighlightCard
          label="Tempo de produção"
          value={`${totalMinutes} min`}
          toneClassName={getToneClassName('amber')}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <SheetBlock title="Composição do insumo composto" emphasis={recipe.name}>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-sm">
                <TableHeader cols={['Insumo', 'Tipo', 'Quantidade', 'Unidade', 'Preço unit.', 'Custo']} />
                <tbody>
                  {ingredientRows.length ? (
                    ingredientRows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-medium text-gray-800">{row.resolvedName}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            {row.subRecipeId ? 'Composto' : 'Insumo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {Number(row.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{row.uom.abbreviation}</td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {row.costLine && !row.costLine.missingPrice ? (
                            `${row.costLine.unitPrice.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              minimumFractionDigits: 4,
                              maximumFractionDigits: 4,
                            })}/${row.costLine.uom}`
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.costLine ? (
                            <span className={`font-semibold ${row.costLine.missingPrice ? 'text-amber-600' : 'text-[var(--text-strong)]'}`}>
                              {row.costLine.missingPrice ? 'Sem preco' : formatBRL(row.costLine.lineCost)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                        Nenhum componente cadastrado para este insumo composto.
                      </td>
                    </tr>
                  )}
                </tbody>
                {breakdown && ingredientRows.length > 0 ? (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                      <td colSpan={5} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Total de ingredientes
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {formatBRL(breakdown.totalIngredientsCost)}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </SheetBlock>

          <SheetBlock title="Mão de obra">
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-sm">
                <TableHeader cols={['Função', 'Tempo', 'Salário/mês', 'Custo']} />
                <tbody>
                  {laborRows.length ? (
                    laborRows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-medium text-gray-800">{row.role}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{row.minutes} min</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatBRL(row.monthlySalary)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[var(--brand-primary-700)]">
                          {formatBRL(row.lineCost)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                        Nenhuma mão de obra vinculada a este insumo composto.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SheetBlock>

          {packagingRows.length > 0 ? (
            <SheetBlock title="Embalagens">
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-sm">
                  <TableHeader cols={['Item', 'Quantidade', 'Preço unit.', 'Custo']} />
                  <tbody>
                    {packagingRows.map((row) => (
                      <tr key={row.itemId} className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatPlainNumber(row.quantity, 3)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatBRL(row.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[var(--brand-primary-700)]">{formatBRL(row.lineCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SheetBlock>
          ) : null}
        </div>

        <div className="space-y-5">
          <SheetBlock title="Resumo técnico">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Componentes</p>
                <p className="mt-1.5 text-2xl font-bold text-gray-900">{ingredientRows.length}</p>
                <p className="mt-0.5 text-xs text-gray-400">{ingredientRows.length === 1 ? 'item' : 'itens'}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Entradas de mão de obra</p>
                <p className="mt-1.5 text-2xl font-bold text-gray-900">{laborRows.length}</p>
                <p className="mt-0.5 text-xs text-gray-400">{laborRows.length === 1 ? 'registro' : 'registros'}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Versão atual</p>
                <p className="mt-1.5 text-2xl font-bold text-gray-900">v{version.versionNumber}</p>
                <p className="mt-0.5 text-xs text-gray-400">{getStatusLabel(version.status)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Rendimento</p>
                <p className="mt-1.5 text-2xl font-bold text-gray-900">{formatPlainNumber(Number(version.yieldQuantity), 3)}</p>
                <p className="mt-0.5 text-xs text-gray-400">{version.yieldUom.abbreviation}</p>
              </div>
            </div>
          </SheetBlock>

          <SheetBlock title="Composição de custos">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Ingredientes', value: breakdown?.totalIngredientsCost ?? 0 },
                { label: 'Mão de obra', value: breakdown?.totalLaborCost ?? 0 },
                { label: 'Embalagens', value: breakdown?.totalPackagingCost ?? 0 },
                { label: 'Equipamentos', value: breakdown?.totalEquipmentCost ?? 0 },
                { label: 'Custo unitário', value: breakdown?.unitCost ?? Number(version.unitCost ?? 0) },
                { label: 'Custo total', value: breakdown?.totalBatchCost ?? Number(version.totalCost ?? 0) },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{card.label}</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">{formatBRL(card.value)}</p>
                </div>
              ))}
            </div>
          </SheetBlock>

          {equipmentRows.length > 0 ? (
            <SheetBlock title="Equipamentos">
              <div className="space-y-2">
                {equipmentRows.map((row) => (
                  <div key={row.equipmentId} className="flex items-center justify-between rounded-lg bg-gray-50/60 px-3 py-2.5 text-sm">
                    <span className="text-gray-700">{row.name}</span>
                    <span className="font-semibold text-[var(--brand-primary-700)]">{formatBRL(row.lineCost)}</span>
                  </div>
                ))}
              </div>
            </SheetBlock>
          ) : null}

          {version.notes ? (
            <SheetBlock title="Observações">
              <p className="text-sm leading-6 text-gray-600">{version.notes}</p>
            </SheetBlock>
          ) : null}
        </div>
      </div>
    </div>
  );
}
