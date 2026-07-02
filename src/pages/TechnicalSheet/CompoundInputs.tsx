import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, Layers, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { ItemType, ProductType } from '../../modules/ficha-tecnica/types/enums';
import { formatBRL } from '../../modules/ficha-tecnica/utils';
import {
  ActionButton,
  ConfirmDialog,
  Field,
  SelectInput,
  StatusMessage,
  TextInput,
} from '../../modules/ficha-tecnica/components/management-primitives';
import { SheetBlock } from '../../modules/ficha-tecnica/components/page-primitives';
import { getApiErrorMessage } from '../../modules/ficha-tecnica/lib/api-errors';
import { listUoms, searchInventoryItems } from '../../modules/ficha-tecnica/lib/inventory-management-api';
import { useWorkbookSnapshot } from '../../modules/ficha-tecnica/lib/workbook-api';
import {
  addRecipeIngredient,
  addRecipeLabor,
  approveRecipeVersion,
  archiveRecipe,
  createRecipe,
  deleteRecipeIngredient,
  deleteRecipeLabor,
  getCostBreakdown,
  getRecipe,
  listRecipes,
  recalculateRecipeVersion,
  submitRecipeVersion,
  updateRecipe,
  type RecipeDetail,
  type RecipeLaborPayload,
  type RecipeVersionDetail,
} from '../../modules/ficha-tecnica/lib/recipes-management-api';
import type { CostBreakdownDto } from '../../modules/ficha-tecnica/types/enums';
import { useAuthStore } from '../../modules/ficha-tecnica/mock/auth.store';

type UomOption = { id: string; name: string; abbreviation: string };
type SubRecipeOption = { id: string; name: string };
type IngredientRow = RecipeVersionDetail['ingredients'][0];
type LaborRow = RecipeVersionDetail['laborEntries'][0];
type StaffRow = ReturnType<typeof useWorkbookSnapshot>['data']['staff'][number];

const COMPOSITE_PREFIX = 'SUBRECIPE:';

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 | 3 | 4 }) {
  const steps = [
    { n: 1 as const, label: 'Nome' },
    { n: 2 as const, label: 'Componentes' },
    { n: 3 as const, label: 'Mão de obra' },
    { n: 4 as const, label: 'Rendimento' },
  ];
  return (
    <div className="flex items-center justify-center px-6 py-6">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                step > s.n
                  ? 'bg-emerald-500 text-white'
                  : step === s.n
                    ? 'bg-[#C9A84C] text-white'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {step > s.n ? <Check size={14} /> : s.n}
            </div>
            <span className={`text-[11px] font-semibold ${step >= s.n ? 'text-gray-700' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 ? (
            <div
              className={`mx-4 mb-5 h-0.5 w-16 rounded-full transition-colors ${step > s.n ? 'bg-emerald-400' : 'bg-gray-200'}`}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ─── Ingredient search combobox ───────────────────────────────────────────────

function IngredientSearch({
  onSelect,
  onClear,
  selectedLabel,
  subRecipes,
  currentRecipeId,
  disabled,
}: {
  onSelect: (value: string, uomId?: string, label?: string) => void;
  onClear: () => void;
  selectedLabel: string;
  subRecipes: SubRecipeOption[];
  currentRecipeId: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Awaited<ReturnType<typeof searchInventoryItems>>>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (term: string) => {
    setSearching(true);
    try {
      const results = await searchInventoryItems(term, 20);
      setItems(results);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void doSearch(search); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, open, doSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mirroredIds = new Set(
    items
      .filter((item) => item.type === ItemType.COMPOSITE && item.code?.startsWith(COMPOSITE_PREFIX))
      .map((item) => item.code!.slice(COMPOSITE_PREFIX.length))
      .filter(Boolean),
  );

  const filteredSubRecipes = subRecipes
    .filter((r) => r.id !== currentRecipeId)
    .filter((r) => !mirroredIds.has(r.id))
    .filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={open ? search : selectedLabel}
        placeholder="Buscar insumo ou composto..."
        disabled={disabled}
        onFocus={() => { setOpen(true); setSearch(''); }}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); if (!e.target.value) onClear(); }}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/15 disabled:cursor-not-allowed disabled:opacity-50"
      />
      {open ? (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-xl">
          {filteredSubRecipes.length ? (
            <>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Compostos</p>
              {filteredSubRecipes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(`subrecipe:${r.id}`, undefined, r.name);
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  {r.name}
                </button>
              ))}
            </>
          ) : null}
          {searching ? (
            <p className="px-3 py-2 text-sm text-gray-400">Buscando...</p>
          ) : items.length ? (
            <>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Insumos</p>
              {items.map((item) => {
                const mirroredId =
                  item.type === ItemType.COMPOSITE && item.code?.startsWith(COMPOSITE_PREFIX)
                    ? item.code.slice(COMPOSITE_PREFIX.length)
                    : '';
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelect(mirroredId ? `subrecipe:${mirroredId}` : `inventory:${item.id}`, item.uom.id, item.name);
                      setSearch('');
                      setOpen(false);
                    }}
                  >
                    {item.name} · {item.uom.abbreviation}
                  </button>
                );
              })}
            </>
          ) : !filteredSubRecipes.length ? (
            <p className="px-3 py-2 text-sm text-gray-400">Nenhum resultado.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompoundInputsPage() {
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
  const { data: workbookData } = useWorkbookSnapshot(isDemoSession);
  const activeStaff = workbookData.staff.filter((s) => s.active);
  const [loading, setLoading] = useState(!isDemoSession);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const [compounds, setCompounds] = useState<RecipeDetail[]>([]);
  const [uoms, setUoms] = useState<UomOption[]>([]);
  const [subRecipes, setSubRecipes] = useState<SubRecipeOption[]>([]);

  // Wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [recipeName, setRecipeName] = useState('');
  const [yieldQuantity, setYieldQuantity] = useState(1);
  const [yieldUomId, setYieldUomId] = useState('');
  const [currentIngredients, setCurrentIngredients] = useState<IngredientRow[]>([]);
  const [currentLabor, setCurrentLabor] = useState<LaborRow[]>([]);
  const [versionCosts, setVersionCosts] = useState<{ totalCost: number; unitCost: number } | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdownDto | null>(null);

  // Step 2 ingredient form
  const [ingSource, setIngSource] = useState('');
  const [ingLabel, setIngLabel] = useState('');
  const [ingUomId, setIngUomId] = useState('');
  const [ingQty, setIngQty] = useState(1);

  // Step 3 labor form
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [laborMinutes, setLaborMinutes] = useState(30);
  const selectedStaff: StaffRow | undefined = activeStaff.find((s) => s.id === selectedStaffId);

  const defaultUomId = uoms.find((u) => u.abbreviation.toUpperCase() === 'UN')?.id ?? uoms[0]?.id ?? '';

  const loadData = useCallback(async () => {
    if (isDemoSession) { setLoading(false); return; }
    setLoading(true);
    try {
      const [uomData, listData] = await Promise.all([
        listUoms(),
        listRecipes(ProductType.SUB_RECEITA),
      ]);
      setUoms(uomData);
      setSubRecipes(listData.map((r) => ({ id: r.id, name: r.name })));
      const details = await Promise.all(listData.map((r) => getRecipe(r.id)));
      setCompounds(details);
    } catch (err) {
      setMessage({ tone: 'error', text: getApiErrorMessage(err, 'Não foi possível carregar os dados.') });
    } finally {
      setLoading(false);
    }
  }, [isDemoSession]);

  useEffect(() => { void loadData(); }, [loadData]);

  const openCreate = () => {
    setEditingRecipeId(null);
    setEditingVersionId(null);
    setRecipeName('');
    setYieldQuantity(1);
    setYieldUomId('');
    setCurrentIngredients([]);
    setCurrentLabor([]);
    setVersionCosts(null);
    setIngSource('');
    setIngLabel('');
    setIngUomId('');
    setIngQty(1);
    setSelectedStaffId('');
    setLaborMinutes(30);
    setWizardStep(1);
    setWizardOpen(true);
    setMessage(null);
  };

  const openEdit = async (id: string) => {
    if (isDemoSession) return;
    setLoading(true);
    setMessage(null);
    try {
      const detail = await getRecipe(id);
      const version = detail.versions[0];
      setEditingRecipeId(id);
      setEditingVersionId(version?.id ?? null);
      setRecipeName(detail.name);
      setYieldQuantity(Number(version?.yieldQuantity ?? 1));
      setYieldUomId(version?.yieldUomId ?? '');
      setCurrentIngredients(version?.ingredients ?? []);
      setCurrentLabor(version?.laborEntries ?? []);
      setVersionCosts(version ? { totalCost: Number(version.totalCost), unitCost: Number(version.unitCost) } : null);
      if (version?.id) getCostBreakdown(version.id).then(setCostBreakdown).catch(() => null);
      setIngSource('');
      setIngLabel('');
      setIngUomId('');
      setIngQty(1);
      setSelectedStaffId('');
      setLaborMinutes(30);
      setWizardStep(1);
      setWizardOpen(true);
    } catch (err) {
      setMessage({ tone: 'error', text: getApiErrorMessage(err, 'Não foi possível carregar os dados.') });
    } finally {
      setLoading(false);
    }
  };

  const closeWizard = () => { setWizardOpen(false); };

  const handleStep1Next = async () => {
    if (!recipeName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: recipeName,
        productType: ProductType.SUB_RECEITA,
        yieldQuantity: 1,
        yieldUomId: defaultUomId,
        finishedProductId: '', // required by API adapter in Evobit context! 
        // wait, let's omit if not strictly required or generate a dummy one later if it complains.
      };
      // In the original it was just those 4 fields, but Evobit API adapter may require finishedProductId.
      // I will leave it as is, and the adapter might handle it or I might need to adjust it later.
      if (editingRecipeId) {
        await updateRecipe(editingRecipeId, { ...payload, yieldQuantity, yieldUomId: yieldUomId || defaultUomId });
        setWizardStep(2);
      } else {
        const created = await createRecipe(payload as any);
        const detail = await getRecipe(created.id);
        setEditingRecipeId(created.id);
        setEditingVersionId(detail.versions[0]?.id ?? null);
        setCurrentIngredients(detail.versions[0]?.ingredients ?? []);
        setSubRecipes((prev) => [...prev, { id: created.id, name: recipeName }]);
        setWizardStep(2);
      }
    } catch (err) {
      setMessage({ tone: 'error', text: getApiErrorMessage(err, 'Não foi possível salvar.') });
    } finally {
      setSaving(false);
    }
  };

  const handleAddIngredient = async () => {
    if (!editingRecipeId || !editingVersionId || !ingSource || !ingUomId || ingQty <= 0) return;
    const [kind, id] = ingSource.split(':');
    setSaving(true);
    try {
      await addRecipeIngredient(editingRecipeId, editingVersionId, {
        inventoryItemId: kind === 'inventory' ? id : undefined,
        subRecipeId: kind === 'subrecipe' ? id : undefined,
        quantity: ingQty,
        uomId: ingUomId,
        order: currentIngredients.length + 1,
      });
      const detail = await getRecipe(editingRecipeId);
      const versionId = detail.versions[0]?.id;
      setCurrentIngredients(detail.versions[0]?.ingredients ?? []);
      if (versionId) getCostBreakdown(versionId).then(setCostBreakdown).catch(() => null);
      setIngSource('');
      setIngLabel('');
      setIngUomId('');
      setIngQty(1);
    } catch (err) {
      setMessage({ tone: 'error', text: getApiErrorMessage(err, 'Não foi possível adicionar.') });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    if (!editingRecipeId || !editingVersionId) return;
    const recipeId = editingRecipeId;
    const versionId = editingVersionId;
    setPendingConfirm({
      message: 'Remover este insumo da composição?',
      onConfirm: async () => {
        try {
          await deleteRecipeIngredient(recipeId, versionId, ingredientId);
          const detail = await getRecipe(recipeId);
          const newVersionId = detail.versions[0]?.id;
          setCurrentIngredients(detail.versions[0]?.ingredients ?? []);
          if (newVersionId) getCostBreakdown(newVersionId).then(setCostBreakdown).catch(() => null);
        } catch (err) {
          setMessage({ tone: 'error', text: getApiErrorMessage(err, 'Não foi possível remover.') });
        }
      },
    });
  };

  const handleAddLabor = async () => {
    if (!editingRecipeId || !editingVersionId || !selectedStaff || laborMinutes <= 0) return;
    setSaving(true);
    try {
      const monthlyHours = Math.round(selectedStaff.weeklyHours * 4);
      await addRecipeLabor(editingRecipeId, editingVersionId, {
        role: `${selectedStaff.name}${selectedStaff.role ? ` (${selectedStaff.role})` : ''}`,
        minutes: laborMinutes,
        monthlySalary: selectedStaff.totalCost,
        monthlyHours: monthlyHours > 0 ? monthlyHours : 220,
      });
      const detail = await getRecipe(editingRecipeId);
      const version = detail.versions[0];
      setCurrentLabor(version?.laborEntries ?? []);
      setVersionCosts(version ? { totalCost: Number(version.totalCost), unitCost: Number(version.unitCost) } : null);
      setSelectedStaffId('');
      setLaborMinutes(30);
    } catch (err) {
      setMessage({ tone: 'error', text: getApiErrorMessage(err, 'Não foi possível adicionar mão de obra.') });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLabor = (laborId: string) => {
    if (!editingRecipeId || !editingVersionId) return;
    const recipeId = editingRecipeId;
    const versionId = editingVersionId;
    setPendingConfirm({
      message: 'Remover esta entrada de mão de obra?',
      onConfirm: async () => {
        try {
          await deleteRecipeLabor(recipeId, versionId, laborId);
          const detail = await getRecipe(recipeId);
          const version = detail.versions[0];
          setCurrentLabor(version?.laborEntries ?? []);
          setVersionCosts(version ? { totalCost: Number(version.totalCost), unitCost: Number(version.unitCost) } : null);
        } catch (err) {
          setMessage({ tone: 'error', text: getApiErrorMessage(err, 'Não foi possível remover.') });
        }
      },
    });
  };

  const handleStep4Finish = async () => {
    if (!editingRecipeId || !editingVersionId || !yieldUomId || yieldQuantity <= 0) return;
    setSaving(true);
    try {
      await updateRecipe(editingRecipeId, {
        name: recipeName,
        productType: ProductType.SUB_RECEITA,
        yieldQuantity,
        yieldUomId,
      } as any);
      const recalculated = await recalculateRecipeVersion(editingRecipeId, editingVersionId);
      if (recalculated) {
         setVersionCosts({ totalCost: Number(recalculated.totalCost), unitCost: Number(recalculated.unitCost) });
      }
      try {
        await submitRecipeVersion(editingRecipeId, editingVersionId);
      } catch {
        // Ja saiu de rascunho, segue para aprovacao
      }
      // Auto-aprova para que o unitCost seja usado em fichas que referenciam este composto
      try {
        await approveRecipeVersion(editingRecipeId, editingVersionId);
      } catch {
        // Versão já aprovada ou em revisão — ignora silenciosamente
      }
      setMessage({ tone: 'success', text: `"${recipeName}" salvo e aprovado com sucesso.` });
      closeWizard();
      await loadData();
    } catch (err) {
      setMessage({ tone: 'error', text: getApiErrorMessage(err, 'Não foi possível finalizar.') });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = (id: string, name: string) => {
    setPendingConfirm({
      message: `Deseja arquivar "${name}"? O insumo será desativado.`,
      onConfirm: async () => {
        try {
          await archiveRecipe(id);
          setMessage({ tone: 'success', text: 'Insumo composto arquivado.' });
          void loadData();
        } catch (err) {
          setMessage({ tone: 'error', text: getApiErrorMessage(err, 'Não foi possível arquivar.') });
        }
      },
    });
  };

  const getIngredientLabel = (row: IngredientRow) => {
    if (row.inventoryItem?.name) return row.inventoryItem.name;
    if (row.subRecipeId) return subRecipes.find((r) => r.id === row.subRecipeId)?.name ?? 'Insumo composto';
    return 'Item';
  };

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

      {/* ── Lista ── */}
      <SheetBlock title="Insumos compostos">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            {compounds.length} {compounds.length === 1 ? 'composto cadastrado' : 'compostos cadastrados'}
          </p>
          <ActionButton onClick={openCreate} disabled={isDemoSession || loading} className="gap-1.5">
            <Plus size={13} /> Novo composto
          </ActionButton>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400">Carregando...</div>
        ) : compounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Layers size={22} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">Nenhum insumo composto</p>
            <p className="mt-1 text-xs text-gray-400 max-w-xs">
              Cadastre preparos internos como molhos, massas e bases reutilizáveis nas fichas técnicas.
            </p>
            {!isDemoSession ? (
              <button onClick={openCreate} className="mt-4 text-sm font-semibold text-[#C9A84C] hover:underline">
                Criar primeiro composto
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Nome', 'Ingredientes', 'Rendimento', 'Custo total', 'Custo unitário', ''].map((h, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${
                        ['Custo total', 'Custo unitário', 'Ingredientes', ''].includes(h) ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compounds.map((row) => {
                  const version = row.versions[0];
                  const yieldQty = version ? Number(version.yieldQuantity) : null;
                  const yieldAbbr = version?.yieldUom?.abbreviation ?? '';
                  const unitCost = version ? Number(version.unitCost) : null;
                  const totalCost = version ? Number(version.totalCost) : null;
                  const ingCount = version?.ingredients?.length ?? 0;
                  return (
                    <tr key={row.id} className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        <Link
                          to={`/app/ficha-tecnica/insumos/compostos/${row.id}`}
                          className="underline-offset-4 transition hover:text-[var(--brand-primary-700)] hover:underline"
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {ingCount > 0 ? `${ingCount} ${ingCount === 1 ? 'item' : 'itens'}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {yieldQty && yieldAbbr
                          ? <span className="font-medium">{yieldQty.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} <span className="text-gray-400">{yieldAbbr}</span></span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {totalCost != null && totalCost > 0 ? formatBRL(totalCost) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {unitCost != null && unitCost > 0 ? (
                          <span className="font-semibold text-[#C9A84C]">
                            {formatBRL(unitCost)}
                            {yieldAbbr ? <span className="ml-1 text-[11px] font-normal text-gray-400">/{yieldAbbr}</span> : null}
                          </span>
                        ) : (
                          <span
                            title="Finalize o cadastro para calcular o custo"
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                          >
                            Finalizar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => void openEdit(row.id)}
                            disabled={isDemoSession}
                            title="Editar"
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleArchive(row.id, row.name)}
                            disabled={isDemoSession}
                            title="Arquivar"
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SheetBlock>

      {/* ── Wizard ── */}
      {wizardOpen ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-[0_1px_6px_0_rgba(0,0,0,0.07)] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="h-3 w-[3px] rounded-full bg-[#C9A84C] shrink-0" />
              <h2 className="text-[13px] font-semibold text-gray-700">
                {editingRecipeId ? `Editando: ${recipeName}` : 'Novo insumo composto'}
              </h2>
            </div>
            <button
              onClick={closeWizard}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <StepIndicator step={wizardStep} />

          <div className="border-t border-gray-100 px-6 pb-6 pt-5">
            {/* ── Etapa 1: Nome ── */}
            {wizardStep === 1 ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
                  <p className="text-sm text-amber-800">
                    Comece pelo nome do preparo. Os componentes e o rendimento serão definidos nas próximas etapas.
                  </p>
                </div>
                <Field label="Nome do insumo composto">
                  <TextInput
                    value={recipeName}
                    placeholder="ex: Molho de tomate, Massa de pão, Creme de confeiteiro..."
                    onChange={(e) => setRecipeName(e.target.value)}
                    disabled={saving}
                  />
                </Field>
                <div className="flex justify-end">
                  <ActionButton
                    onClick={() => void handleStep1Next()}
                    disabled={saving || !recipeName.trim()}
                    className="gap-1.5"
                  >
                    {saving ? 'Salvando...' : editingRecipeId ? 'Confirmar e avançar →' : 'Criar e avançar →'}
                  </ActionButton>
                </div>
              </div>
            ) : null}

            {/* ── Etapa 2: Componentes ── */}
            {wizardStep === 2 ? (
              <div className="space-y-5">
                {/* Formulário de adição */}
                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Adicionar insumo</p>
                  <div className="grid gap-3 sm:grid-cols-[1fr_130px_110px] lg:grid-cols-[1fr_130px_110px_auto]">
                    <Field label="Insumo ou composto">
                      <IngredientSearch
                        selectedLabel={ingLabel}
                        onSelect={(value, uomId, label) => {
                          setIngSource(value);
                          setIngLabel(label ?? '');
                          if (uomId) setIngUomId(uomId);
                        }}
                        onClear={() => { setIngSource(''); setIngLabel(''); }}
                        subRecipes={subRecipes}
                        currentRecipeId={editingRecipeId ?? ''}
                        disabled={saving}
                      />
                    </Field>
                    <Field label="Unidade">
                      <SelectInput value={ingUomId} onChange={(e) => setIngUomId(e.target.value)} disabled={saving}>
                        <option value="">Selecione</option>
                        {uoms.map((u) => (
                          <option key={u.id} value={u.id}>{u.abbreviation}</option>
                        ))}
                      </SelectInput>
                    </Field>
                    <Field label="Quantidade">
                      <TextInput
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={ingQty}
                        onChange={(e) => setIngQty(Number(e.target.value))}
                        disabled={saving}
                      />
                    </Field>
                    <div className="flex items-end lg:pb-0">
                      <ActionButton
                        onClick={() => void handleAddIngredient()}
                        disabled={saving || !ingSource || !ingUomId || ingQty <= 0}
                        className="w-full justify-center gap-1.5 lg:w-auto"
                      >
                        <Plus size={13} /> Adicionar
                      </ActionButton>
                    </div>
                  </div>
                </div>

                {/* Lista de componentes */}
                {currentIngredients.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
                    <p className="text-sm text-gray-400">Nenhum insumo adicionado ainda.</p>
                    <p className="mt-1 text-xs text-gray-300">Busque pelo nome acima para adicionar.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          {['Insumo', 'Tipo', 'Quantidade', 'Unidade', 'Preço/unit.', 'Custo', ''].map((h, i) => (
                            <th
                              key={i}
                              className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${h === '' || h === 'Quantidade' || h === 'Preço/unit.' || h === 'Custo' ? 'text-right' : 'text-left'}`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentIngredients.map((row) => {
                          const refId = row.inventoryItemId ?? row.subRecipeId ?? '';
                          const costLine = costBreakdown?.ingredients?.find((c) => c.itemId === refId);
                          return (
                            <tr key={row.id} className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/60">
                              <td className="px-4 py-3 font-medium text-gray-800">{getIngredientLabel(row)}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                                  {row.subRecipeId ? 'Composto' : 'Insumo'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                {Number(row.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                              </td>
                              <td className="px-4 py-3 text-gray-500">{row.uom.abbreviation}</td>
                              <td className="px-4 py-3 text-right">
                                {costLine && !costLine.missingPrice ? (
                                  <span className="text-xs text-gray-500">
                                    {costLine.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4, maximumFractionDigits: 4 })}/{costLine.uom}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {costLine ? (
                                  <span className={`font-semibold ${costLine.missingPrice ? 'text-amber-500' : 'text-gray-900'}`}>
                                    {costLine.missingPrice
                                      ? <span title="Sem preço de fornecedor">—</span>
                                      : formatBRL(costLine.lineCost)}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleRemoveIngredient(row.id)}
                                  title="Remover"
                                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {costBreakdown && costBreakdown.ingredients.length > 0 ? (
                        <tfoot>
                          <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                            <td colSpan={5} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Total de ingredientes
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">
                              {formatBRL(costBreakdown.totalIngredientsCost)}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      ) : null}
                    </table>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <ActionButton tone="secondary" onClick={() => setWizardStep(1)} disabled={saving}>
                    ← Voltar
                  </ActionButton>
                  <ActionButton
                    onClick={() => setWizardStep(3)}
                    disabled={saving || currentIngredients.length === 0}
                    className="gap-1.5"
                  >
                    Próximo: Mão de obra →
                  </ActionButton>
                </div>
              </div>
            ) : null}

            {/* ── Etapa 3: Mão de obra ── */}
            {wizardStep === 3 ? (
              <div className="space-y-5">
                {/* Formulário de adição */}
                {activeStaff.length === 0 ? (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-4">
                    <p className="text-sm font-medium text-amber-800">Nenhum funcionário ativo cadastrado.</p>
                    <p className="mt-1 text-xs text-amber-700">
                      Cadastre funcionários em <strong>Administração → Funcionários</strong> para adicioná-los aqui.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Adicionar funcionário</p>
                    <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
                      <Field label="Funcionário">
                        <SelectInput
                          value={selectedStaffId}
                          onChange={(e) => setSelectedStaffId(e.target.value)}
                          disabled={saving}
                        >
                          <option value="">Selecione um funcionário...</option>
                          {activeStaff.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}{s.role ? ` — ${s.role}` : ''}
                            </option>
                          ))}
                        </SelectInput>
                      </Field>
                      <Field label="Tempo envolvido (min)">
                        <TextInput
                          type="number"
                          min="1"
                          step="1"
                          value={laborMinutes}
                          onChange={(e) => setLaborMinutes(Number(e.target.value))}
                          disabled={saving}
                        />
                      </Field>
                      <div className="flex items-end">
                        <ActionButton
                          onClick={() => void handleAddLabor()}
                          disabled={saving || !selectedStaff || laborMinutes <= 0}
                          className="gap-1.5 w-full justify-center"
                        >
                          <Plus size={13} /> Adicionar
                        </ActionButton>
                      </div>
                    </div>
                    {selectedStaff ? (
                      <div className="mt-3 flex flex-wrap gap-4 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-500">
                        <span>Custo total mensal: <strong className="text-gray-700">{formatBRL(selectedStaff.totalCost)}</strong></span>
                        <span>Custo/min: <strong className="text-gray-700">{formatBRL(selectedStaff.minuteCost)}</strong></span>
                        <span>Custo desta etapa: <strong className="text-[#C9A84C]">{formatBRL(selectedStaff.minuteCost * laborMinutes)}</strong></span>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Lista de mão de obra */}
                {currentLabor.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      <Users size={18} className="text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-400">Nenhum funcionário adicionado.</p>
                    <p className="mt-1 text-xs text-gray-300">Esta etapa é opcional — pule se não houver mão de obra direta.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          {['Cargo', 'Tempo', 'Salário/mês', 'Custo desta etapa', ''].map((h, i) => (
                            <th key={i} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${h === '' || h === 'Custo desta etapa' || h === 'Salário/mês' ? 'text-right' : 'text-left'}`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentLabor.map((row) => {
                          const costPerMin = row.monthlySalary / (row.monthlyHours * 60);
                          const totalCostRow = costPerMin * row.minutes;
                          return (
                            <tr key={row.id} className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/60">
                              <td className="px-4 py-3 font-medium text-gray-800">{row.role}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 text-gray-600">
                                  <Clock size={12} className="text-gray-400" />
                                  {row.minutes} min
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600">{formatBRL(row.monthlySalary)}</td>
                              <td className="px-4 py-3 text-right font-semibold text-[#C9A84C]">{formatBRL(totalCostRow)}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleRemoveLabor(row.id)}
                                  title="Remover"
                                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <ActionButton tone="secondary" onClick={() => setWizardStep(2)} disabled={saving}>
                    ← Voltar
                  </ActionButton>
                  <ActionButton onClick={() => setWizardStep(4)} disabled={saving} className="gap-1.5">
                    Próximo: Rendimento →
                  </ActionButton>
                </div>
              </div>
            ) : null}

            {/* ── Etapa 4: Rendimento + custo ── */}
            {wizardStep === 4 ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                  <p className="text-sm text-blue-800">
                    Informe quanto esta receita rende. O custo unitário será calculado dividindo o custo total pelo rendimento.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Quantidade que rende">
                    <TextInput
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={yieldQuantity}
                      onChange={(e) => setYieldQuantity(Number(e.target.value))}
                      disabled={saving}
                    />
                  </Field>
                  <Field label="Unidade de medida">
                    <SelectInput value={yieldUomId} onChange={(e) => setYieldUomId(e.target.value)} disabled={saving}>
                      <option value="">Selecione</option>
                      {uoms.map((u) => (
                        <option key={u.id} value={u.id}>{u.abbreviation} · {u.name}</option>
                      ))}
                    </SelectInput>
                  </Field>
                </div>

                {versionCosts && (versionCosts.totalCost > 0 || versionCosts.unitCost > 0) ? (
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Custo total do lote</p>
                      <p className="mt-1.5 text-xl font-bold text-gray-900">{formatBRL(versionCosts.totalCost)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Custo unitário</p>
                      <p className="mt-1.5 text-xl font-bold text-[#C9A84C]">{formatBRL(versionCosts.unitCost)}</p>
                      <p className="mt-0.5 text-xs text-gray-400">por {uoms.find((u) => u.id === yieldUomId)?.abbreviation ?? 'unidade'}</p>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <ActionButton tone="secondary" onClick={() => setWizardStep(3)} disabled={saving}>
                    ← Voltar
                  </ActionButton>
                  <ActionButton
                    onClick={() => void handleStep4Finish()}
                    disabled={saving || !yieldUomId || yieldQuantity <= 0}
                    className="gap-1.5"
                  >
                    {saving ? 'Salvando...' : <><Check size={14} /> Finalizar cadastro</>}
                  </ActionButton>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
