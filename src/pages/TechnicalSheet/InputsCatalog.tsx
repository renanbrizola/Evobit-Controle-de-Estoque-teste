import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Trash2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { ItemType } from '../../modules/ficha-tecnica/types/enums';
import { formatBRL, formatDate } from '../../modules/ficha-tecnica/utils';
import { NumericFormat } from 'react-number-format';
import {
  ActionButton,
  ConfirmDialog,
  Field,
  SelectInput,
  StatusMessage,
  TextInput,
} from '../../modules/ficha-tecnica/components/management-primitives';
import { SlidePanel } from '../../modules/ficha-tecnica/components/slide-panel';
import { SheetBlock } from '../../modules/ficha-tecnica/components/page-primitives';
import { getApiErrorMessage } from '../../modules/ficha-tecnica/lib/api-errors';
import {
  addSupplierPricing,
  createCategory,
  createInventoryItem,
  createSupplier,
  deleteInventoryItem,
  getInventoryItemDetail,
  listCategories,
  listSuppliers,
  listUoms,
  updateInventoryItem,
  type InventoryCategoryOption,
  type InventoryFormPayload,
  type InventoryItemDetail,
  type InventorySupplierOption,
  type InventoryUomOption,
} from '../../modules/ficha-tecnica/lib/inventory-management-api';
import { useWorkbookSnapshot } from '../../modules/ficha-tecnica/lib/workbook-api';
import { usePagination, PaginationBar } from '../../components/shared/TablePagination';
import { useAuthStore } from '../../modules/ficha-tecnica/mock/auth.store';

interface InventoryEditorForm extends InventoryFormPayload {
  supplierId: string;
  unitPrice: number;
  pricingMode: 'unit' | 'total';
  purchaseTotal: number;
  purchaseQty: number;
  purchaseUomId: string;
}

const emptyForm: InventoryEditorForm = {
  name: '',
  type: ItemType.INSUMO,
  uomId: '',
  categoryId: '',
  code: '',
  description: '',
  yieldFactor: 1,
  correctionFactor: 1,
  minStock: 0,
  currentStock: 0,
  supplierId: '',
  unitPrice: 0,
  pricingMode: 'unit',
  purchaseTotal: 0,
  purchaseQty: 0,
  purchaseUomId: '',
};

const ITEM_TYPE_LABELS: Record<string, string> = {
  INSUMO: 'Insumo',
  EMBALAGEM: 'Embalagem',
  COMPOSITE: 'Insumo composto',
  SUB_RECEITA: 'Sub-receita',
};

const AUTO_SUPPLIER_NAME = 'Fornecedor nao informado';

function parseLocaleNumber(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  const normalized = trimmed
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLocaleInputValue(value: number | undefined): string {
  if (value === undefined || value === null || value === 0) return '';
  return String(value).replace('.', ',');
}

function normalizeIdentifier(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function convertQuantityToItemUom(
  quantity: number,
  purchaseUomId: string,
  itemUomId: string,
  uoms: InventoryUomOption[],
): number {
  if (!quantity || !purchaseUomId || !itemUomId) return quantity;

  const itemUom = uoms.find((uom) => uom.id === itemUomId);
  const purchaseUom = uoms.find((uom) => uom.id === purchaseUomId);

  if (!itemUom || !purchaseUom) return quantity;
  if (purchaseUom.id === itemUom.id) return quantity;
  if (purchaseUom.type !== itemUom.type) return quantity;

  const inBase = quantity * Number(purchaseUom.conversionFactor);
  return inBase / Number(itemUom.conversionFactor);
}

export default function InputCatalogPage() {
  const navigate = useNavigate();
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
  const { data, source, reload } = useWorkbookSnapshot(isDemoSession);

  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState<InventoryEditorForm>(emptyForm);
  const [unitPriceInput, setUnitPriceInput] = useState('');
  const [purchaseTotalInput, setPurchaseTotalInput] = useState('');
  const [purchaseQtyInput, setPurchaseQtyInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uoms, setUoms] = useState<InventoryUomOption[]>([]);
  const [categories, setCategories] = useState<InventoryCategoryOption[]>([]);
  const [suppliers, setSuppliers] = useState<InventorySupplierOption[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<InventoryItemDetail | null>(null);
  const [search, setSearch] = useState('');

  // Quick create state
  const [showQuickCategory, setShowQuickCategory] = useState(false);
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [quickSupplierName, setQuickSupplierName] = useState('');
  const [savingQuick, setSavingQuick] = useState(false);

  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(!isDemoSession);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // Preço unitário calculado pelo total da compra + quantidade + UOM de compra
  const purchaseQuantityInItemUom = useMemo(() => {
    if (form.pricingMode !== 'total') return 0;
    return convertQuantityToItemUom(
      form.purchaseQty,
      form.purchaseUomId || form.uomId,
      form.uomId,
      uoms,
    );
  }, [form.pricingMode, form.purchaseQty, form.purchaseUomId, form.uomId, uoms]);

  const computedUnitPrice = useMemo(() => {
    if (form.pricingMode !== 'total') return form.unitPrice;
    if (!form.purchaseTotal || !purchaseQuantityInItemUom || !form.uomId) return 0;
    return purchaseQuantityInItemUom > 0 ? form.purchaseTotal / purchaseQuantityInItemUom : 0;
  }, [form.pricingMode, form.purchaseTotal, purchaseQuantityInItemUom, form.uomId, form.unitPrice]);

  const ensurePricingSupplierId = useCallback(async () => {
    if (form.supplierId) return form.supplierId;

    const existingFallback = suppliers.find(
      (supplier) => normalizeIdentifier(supplier.name) === normalizeIdentifier(AUTO_SUPPLIER_NAME),
    );

    if (existingFallback) return existingFallback.id;

    const created = await createSupplier({
      name: AUTO_SUPPLIER_NAME,
      tradeName: AUTO_SUPPLIER_NAME,
      notes: 'Criado automaticamente para registrar preco sem fornecedor definido.',
    });

    setSuppliers((current) =>
      [...current, created].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    );

    return created.id;
  }, [form.supplierId, suppliers]);

  const loadSupportCatalogs = useCallback(async () => {
    // UOMs sao fixas (nao dependem do banco): libera o form assim que prontas,
    // SEM esperar categorias/fornecedores. Uma lentidao/falha nesses nao pode
    // mais travar o cadastro de insumo (o botao ficava cinza pra sempre).
    setUoms(await listUoms());
    setLoadingOptions(false);
    const [categoryRows, supplierRows] = await Promise.all([
      listCategories().catch(() => []),
      listSuppliers().catch(() => []),
    ]);
    setCategories(categoryRows);
    setSuppliers(supplierRows);
  }, []);

  useEffect(() => {
    let active = true;
    if (isDemoSession) { setLoadingOptions(false); return; }
    setLoadingOptions(true);
    loadSupportCatalogs()
      .catch((err) => { if (active) setMessage({ tone: 'error', text: getApiErrorMessage(err, 'Não foi possível carregar os catálogos.') }); })
      .finally(() => { if (active) setLoadingOptions(false); });
    return () => { active = false; };
  }, [isDemoSession, loadSupportCatalogs]);

  const syncPriceInputs = useCallback((nextForm: InventoryEditorForm) => {
    setUnitPriceInput(formatLocaleInputValue(nextForm.unitPrice));
    setPurchaseTotalInput(formatLocaleInputValue(nextForm.purchaseTotal));
    setPurchaseQtyInput(formatLocaleInputValue(nextForm.purchaseQty));
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    syncPriceInputs(emptyForm);
    setSelectedDetail(null);
    setShowQuickCategory(false);
    setShowQuickSupplier(false);
    setPanelOpen(true);
  };

  const openEdit = async (id: string) => {
    if (isDemoSession) return;
    setLoadingDetail(true);
    setMessage(null);
    try {
      const detail = await getInventoryItemDetail(id);
      const currentPricing = detail.supplierPricings[0];
      setEditingId(detail.id);
      setSelectedDetail(detail);
      const nextForm: InventoryEditorForm = {
        name: detail.name,
        type: detail.type as ItemType,
        uomId: detail.uom.id,
        categoryId: detail.category?.id ?? '',
        code: detail.code ?? '',
        description: detail.description ?? '',
        yieldFactor: Number(detail.yieldFactor ?? 1),
        correctionFactor: Number(detail.correctionFactor ?? 1),
        minStock: Number(detail.minStock ?? 0),
        currentStock: Number(detail.currentStock ?? 0),
        supplierId: currentPricing?.supplier.id ?? '',
        unitPrice: Number(currentPricing?.unitPrice ?? 0),
        pricingMode: 'unit',
        purchaseTotal: 0,
        purchaseQty: 0,
        purchaseUomId: '',
      };
      setForm(nextForm);
      syncPriceInputs(nextForm);
      setShowQuickCategory(false);
      setShowQuickSupplier(false);
      setPanelOpen(true);
    } catch (err) {
      setMessage({ tone: 'error', text: getApiErrorMessage(err, 'Não foi possível carregar os dados do insumo.') });
    } finally {
      setLoadingDetail(false);
    }
  };

  const closePanel = () => {
    setPanelOpen(false);
    setShowQuickCategory(false);
    setShowQuickSupplier(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.uomId) return;
    setSaving(true);
    setMessage(null);
    try {
      let itemId = editingId;
      const currentStockValue = Number(form.currentStock ?? 0);
      const resolvedCurrentStock =
        !editingId && currentStockValue <= 0 && purchaseQuantityInItemUom > 0
          ? purchaseQuantityInItemUom
          : currentStockValue;
      const payload = {
        name: form.name, type: form.type, uomId: form.uomId,
        categoryId: form.categoryId || undefined, code: form.code || undefined,
        description: form.description || undefined,
        yieldFactor: form.yieldFactor, correctionFactor: form.correctionFactor,
        minStock: form.minStock, currentStock: resolvedCurrentStock,
      };
      if (editingId) {
        await updateInventoryItem(editingId, payload);
      } else {
        const created = await createInventoryItem(payload);
        itemId = created.id;
      }
      if (itemId && computedUnitPrice > 0) {
        const pricingSupplierId = await ensurePricingSupplierId();
        await addSupplierPricing(itemId, { supplierId: pricingSupplierId, unitPrice: computedUnitPrice, currency: 'BRL' });
      }
      if (itemId) {
        const detail = await getInventoryItemDetail(itemId);
        setSelectedDetail(detail);
      }
      reload();
      setMessage({ tone: 'success', text: `Insumo ${editingId ? 'atualizado' : 'criado'} com sucesso.` });
      closePanel();
    } catch (err) {
      setMessage({ tone: 'error', text: getApiErrorMessage(err, 'Não foi possível salvar o insumo.') });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setPendingConfirm({
      message: `Tem certeza que deseja excluir definitivamente o insumo "${name}"? Esta acao apaga o cadastro do banco. Se ele estiver em alguma ficha tecnica ou insumo composto, a exclusao sera bloqueada ate o vinculo ser removido.`,
      onConfirm: async () => {
        try {
          await deleteInventoryItem(id);
          reload();
          setMessage({ tone: 'success', text: 'Insumo excluido definitivamente.' });
          if (editingId === id) closePanel();
        } catch (err) {
          setMessage({ tone: 'error', text: getApiErrorMessage(err, 'Não foi possível excluir.') });
        }
      },
    });
  };

  const handleQuickCategory = async () => {
    const name = quickCategoryName.trim();
    if (!name) return;
    setSavingQuick(true);
    try {
      const created = await createCategory({ name });
      await loadSupportCatalogs();
      setQuickCategoryName('');
      setForm((c) => ({ ...c, categoryId: created.id }));
      setShowQuickCategory(false);
    } catch (err) {
      setMessage({ tone: 'error', text: getApiErrorMessage(err, 'Não foi possível criar a categoria.') });
    } finally {
      setSavingQuick(false);
    }
  };

  const handleQuickSupplier = async () => {
    const name = quickSupplierName.trim();
    if (!name) return;
    setSavingQuick(true);
    try {
      const created = await createSupplier({ name });
      await loadSupportCatalogs();
      setQuickSupplierName('');
      setForm((c) => ({ ...c, supplierId: created.id }));
      setShowQuickSupplier(false);
    } catch (err) {
      setMessage({ tone: 'error', text: getApiErrorMessage(err, 'Não foi possível criar o fornecedor.') });
    } finally {
      setSavingQuick(false);
    }
  };

  const filtered = data.inputs.filter((row) =>
    !search || `${row.name} ${row.code ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  );
  const catalogPagination = usePagination(filtered);

  return (
    <div className="space-y-5">
      {pendingConfirm ? (
        <ConfirmDialog
          message={pendingConfirm.message}
          onConfirm={() => { void (pendingConfirm.onConfirm as () => Promise<void>)(); setPendingConfirm(null); }}
          onCancel={() => setPendingConfirm(null)}
        />
      ) : null}

      {message ? <StatusMessage tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} /> : null}
      {isDemoSession ? <StatusMessage tone="error" message="Entre com a API para cadastrar e editar dados reais." /> : null}

      <SheetBlock title={`Catálogo de insumos ${source === 'api' ? '' : '· modo demo'}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-400">
              {data.inputs.length} {data.inputs.length === 1 ? 'insumo cadastrado' : 'insumos cadastrados'}
            </p>
            {data.inputs.length > 0 ? (
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar por nome..."
                className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/15"
              />
            ) : null}
          </div>
          <ActionButton onClick={openCreate} disabled={isDemoSession || loadingOptions} className="gap-1.5">
            <Plus size={13} />
            Novo insumo
          </ActionButton>
        </div>

        {data.inputs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Package size={22} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">Nenhum insumo cadastrado</p>
            <p className="mt-1 text-xs text-gray-400 max-w-xs">
              Cadastre os ingredientes, embalagens e insumos usados nas fichas técnicas.
            </p>
            {!isDemoSession ? (
              <button onClick={openCreate} className="mt-4 text-sm font-semibold text-[#C9A84C] hover:underline">
                Adicionar primeiro insumo
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Nome', 'Tipo', 'Unidade', 'Preço unitário', 'Estoque atual', 'Fornecedor', ''].map((h, i) => (
                    <th
                      key={h + i}
                      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${
                        h === 'Preço unitário' || h === 'Estoque atual' || h === '' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                      Nenhum insumo encontrado para &ldquo;{search}&rdquo;.
                    </td>
                  </tr>
                ) : (
                  catalogPagination.pageItems.map((row) => {
                    const compositeRecipeId =
                      row.type === ItemType.COMPOSITE ? (row.recipeId || '') : '';

                    return (
                    <tr key={row.id} className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {compositeRecipeId ? (
                          <button
                            onClick={() => navigate(`/app/ficha-tecnica/insumos/compostos/${compositeRecipeId}`)}
                            className="text-left underline-offset-4 transition hover:text-[var(--brand-primary-700)] hover:underline"
                          >
                            {row.name}
                          </button>
                        ) : (
                          row.name
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          {ITEM_TYPE_LABELS[row.type] ?? row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{row.unit}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatBRL(row.price)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {row.type === ItemType.COMPOSITE
                          ? '-'
                          : row.grossQuantity.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{row.supplier ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {row.type === ItemType.COMPOSITE ? (
                          <button
                            onClick={() => navigate('/app/ficha-tecnica/insumos/compostos')}
                            title="Abrir insumos compostos"
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          >
                            <Pencil size={14} />
                          </button>
                        ) : (
                          <div className="inline-flex gap-1">
                            <button
                              onClick={() => void openEdit(row.id)}
                              disabled={loadingDetail || isDemoSession}
                              title="Editar"
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(row.id, row.name)}
                              disabled={isDemoSession}
                              title="Excluir"
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        <PaginationBar pagination={catalogPagination} />
      </SheetBlock>

      {/* Histórico de preços do item selecionado */}
      {selectedDetail ? (
        <SheetBlock title={`Histórico de preços · ${selectedDetail.name}`}>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Fornecedor', 'Preço unitário', 'Válido desde', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedDetail.supplierPricings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                      Nenhum preço de fornecedor cadastrado.
                    </td>
                  </tr>
                ) : (
                  selectedDetail.supplierPricings.map((pricing, index) => (
                    <tr key={pricing.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-gray-800">{pricing.supplier.name}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatBRL(Number(pricing.unitPrice))}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(pricing.validFrom)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          index === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {index === 0 ? 'Atual' : 'Histórico'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SheetBlock>
      ) : null}

      {/* Painel de cadastro */}
      <SlidePanel
        open={panelOpen}
        onClose={closePanel}
        title={editingId ? 'Editar insumo' : 'Novo insumo'}
        description="Preencha os dados do ingrediente, embalagem ou insumo."
        width="lg"
      >
        {loadingDetail ? (
          <div className="flex items-center justify-center py-20 text-sm text-gray-400">Carregando dados do insumo...</div>
        ) : (
          <div className="space-y-5">
            {/* Identificação */}
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Identificação</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome">
                  <TextInput value={form.name} placeholder="ex: Farinha de trigo" onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} disabled={saving} />
                </Field>
                <Field label="Código">
                  <TextInput value={form.code} placeholder="Opcional" onChange={(e) => setForm((c) => ({ ...c, code: e.target.value }))} disabled={saving} />
                </Field>
                <Field label="Tipo">
                  <SelectInput value={form.type} onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))} disabled={saving}>
                    {Object.values(ItemType).map((t) => (
                      <option key={t} value={t}>{ITEM_TYPE_LABELS[t] ?? t}</option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Unidade de medida">
                  <SelectInput value={form.uomId} onChange={(e) => setForm((c) => ({ ...c, uomId: e.target.value }))} disabled={saving || loadingOptions}>
                    <option value="">Selecione</option>
                    {(uoms || []).map((u) => <option key={u.id} value={u.id}>{u.abbreviation} — {u.name}</option>)}
                  </SelectInput>
                </Field>
              </div>
            </div>

            {/* Classificação */}
            <div className="border-t border-gray-100 pt-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Classificação e fornecedor</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Categoria com quick-create */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">Categoria</span>
                    <button
                      type="button"
                      onClick={() => { setShowQuickCategory((v) => !v); setShowQuickSupplier(false); }}
                      className="flex items-center gap-1 text-[11px] font-medium text-[#C9A84C] hover:underline"
                    >
                      {showQuickCategory ? <><ChevronUp size={11} /> Fechar</> : <><Plus size={11} /> Nova</>}
                    </button>
                  </div>
                  <SelectInput value={form.categoryId} onChange={(e) => setForm((c) => ({ ...c, categoryId: e.target.value }))} disabled={saving || loadingOptions}>
                    <option value="">Sem categoria</option>
                    {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </SelectInput>
                  {showQuickCategory ? (
                    <div className="mt-2 flex gap-2">
                      <TextInput value={quickCategoryName} placeholder="Nome da categoria" onChange={(e) => setQuickCategoryName(e.target.value)} disabled={savingQuick} className="flex-1 py-1.5 text-xs" />
                      <ActionButton onClick={handleQuickCategory} disabled={savingQuick || !quickCategoryName.trim()} className="py-1.5 text-xs">
                        {savingQuick ? '...' : 'Criar'}
                      </ActionButton>
                    </div>
                  ) : null}
                </div>

                {/* Fornecedor com quick-create */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">Fornecedor</span>
                    <button
                      type="button"
                      onClick={() => { setShowQuickSupplier((v) => !v); setShowQuickCategory(false); }}
                      className="flex items-center gap-1 text-[11px] font-medium text-[#C9A84C] hover:underline"
                    >
                      {showQuickSupplier ? <><ChevronUp size={11} /> Fechar</> : <><Plus size={11} /> Novo</>}
                    </button>
                  </div>
                  <SelectInput value={form.supplierId} onChange={(e) => setForm((c) => ({ ...c, supplierId: e.target.value }))} disabled={saving || loadingOptions}>
                    <option value="">Sem fornecedor</option>
                    {(suppliers || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </SelectInput>
                  {showQuickSupplier ? (
                    <div className="mt-2 flex gap-2">
                      <TextInput value={quickSupplierName} placeholder="Nome do fornecedor" onChange={(e) => setQuickSupplierName(e.target.value)} disabled={savingQuick} className="flex-1 py-1.5 text-xs" />
                      <ActionButton onClick={handleQuickSupplier} disabled={savingQuick || !quickSupplierName.trim()} className="py-1.5 text-xs">
                        {savingQuick ? '...' : 'Criar'}
                      </ActionButton>
                    </div>
                  ) : null}
                </div>

                {/* Seção de preço com toggle de modo */}
                <div className="sm:col-span-2">
                  <div className="mb-2 flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
                    <button
                      type="button"
                      onClick={() => setForm((c) => ({ ...c, pricingMode: 'unit' }))}
                      className={`rounded-md px-3 py-1 text-[11px] font-semibold transition-colors ${form.pricingMode === 'unit' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Preço unitário
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((c) => ({ ...c, pricingMode: 'total' }))}
                      className={`rounded-md px-3 py-1 text-[11px] font-semibold transition-colors ${form.pricingMode === 'total' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Calcular pelo total
                    </button>
                  </div>

                  {form.pricingMode === 'unit' ? (
                    <Field label="Preço unitário (R$)">
                      <NumericFormat
                        customInput={TextInput}
                        value={unitPriceInput}
                        decimalSeparator=","
                        thousandSeparator="."
                        allowNegative={false}
                        onValueChange={(values) => {
                          setUnitPriceInput(values.formattedValue);
                          setForm((current) => ({ ...current, unitPrice: values.floatValue ?? 0 }));
                        }}
                        disabled={saving}
                      />
                    </Field>
                  ) : (
                    <div className="rounded-xl border border-[#C9A84C]/30 bg-amber-50/40 p-4 space-y-3">
                      <p className="text-[11px] text-amber-700 font-medium">
                        Informe o valor total pago e a quantidade — o preço unitário será calculado automaticamente.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Valor total pago (R$)">
                          <NumericFormat
                            customInput={TextInput}
                            placeholder="ex: 189,96"
                            value={purchaseTotalInput}
                            decimalSeparator=","
                            thousandSeparator="."
                            allowNegative={false}
                            onValueChange={(values) => {
                              setPurchaseTotalInput(values.formattedValue);
                              setForm((current) => ({ ...current, purchaseTotal: values.floatValue ?? 0 }));
                            }}
                            disabled={saving}
                          />
                        </Field>
                        <Field label="Quantidade comprada">
                          <NumericFormat
                            customInput={TextInput}
                            placeholder="ex: 14500"
                            value={purchaseQtyInput}
                            decimalSeparator=","
                            thousandSeparator={false}
                            allowNegative={false}
                            onValueChange={(values) => {
                              setPurchaseQtyInput(values.formattedValue);
                              setForm((current) => ({ ...current, purchaseQty: values.floatValue ?? 0 }));
                            }}
                            disabled={saving}
                          />
                        </Field>
                        <Field label="Unidade da compra">
                          <SelectInput value={form.purchaseUomId || form.uomId} onChange={(e) => setForm((c) => ({ ...c, purchaseUomId: e.target.value }))} disabled={saving || loadingOptions}>
                            {(uoms || []).map((u) => <option key={u.id} value={u.id}>{u.abbreviation} — {u.name}</option>)}
                          </SelectInput>
                        </Field>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-gray-500">Preço unitário calculado:</span>
                        <span className={`text-sm font-bold ${computedUnitPrice > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {computedUnitPrice > 0
                            ? `R$ ${computedUnitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 6 })} / ${uoms.find((u) => u.id === form.uomId)?.abbreviation ?? '—'}`
                            : '—'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Se o estoque atual estiver zerado no cadastro inicial, a quantidade comprada sera usada como estoque inicial.
                        Se nenhum fornecedor for escolhido, o sistema salvara o preco em um fornecedor padrao.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Estoque e técnicos */}
            <div className="border-t border-gray-100 pt-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Estoque e fatores técnicos</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Estoque atual">
                  <TextInput
                    type="text"
                    inputMode="decimal"
                    value={form.currentStock || ''}
                    onChange={(e) => setForm((c) => ({ ...c, currentStock: parseLocaleNumber(e.target.value) }))}
                    disabled={saving}
                  />
                </Field>
                <Field label="Estoque mínimo">
                  <TextInput
                    type="text"
                    inputMode="decimal"
                    value={form.minStock || ''}
                    onChange={(e) => setForm((c) => ({ ...c, minStock: parseLocaleNumber(e.target.value) }))}
                    disabled={saving}
                  />
                </Field>
                <Field label="Fator de correção">
                  <TextInput
                    type="text"
                    inputMode="decimal"
                    value={form.correctionFactor || ''}
                    onChange={(e) => setForm((c) => ({ ...c, correctionFactor: parseLocaleNumber(e.target.value) }))}
                    disabled={saving}
                  />
                </Field>
                <Field label="Fator de aproveitamento">
                  <TextInput
                    type="text"
                    inputMode="decimal"
                    value={form.yieldFactor || ''}
                    onChange={(e) => setForm((c) => ({ ...c, yieldFactor: parseLocaleNumber(e.target.value) }))}
                    disabled={saving}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Descrição">
                    <TextInput value={form.description} placeholder="Informações adicionais..." onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} disabled={saving} />
                  </Field>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 flex gap-3">
              <ActionButton
                onClick={handleSubmit}
                disabled={saving || !form.name.trim() || !form.uomId || loadingOptions}
                className="flex-1 justify-center"
              >
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar insumo'}
              </ActionButton>
              <ActionButton tone="secondary" onClick={closePanel} disabled={saving}>
                Cancelar
              </ActionButton>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
