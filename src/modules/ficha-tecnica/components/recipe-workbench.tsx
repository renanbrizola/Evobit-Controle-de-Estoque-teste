'use client';

import { Link } from 'react-router-dom';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Archive,
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  EquipmentType,
  ItemType,
  ProductType,
  RecipeStatus,
} from '../types/enums';
import { formatBRL } from '../utils/index';
import {
  ActionButton,
  ConfirmDialog,
  EditorCard,
  Field,
  SelectInput,
  StatusMessage,
  TextInput,
} from '../components/management-primitives';
import { StatCard, WorkflowChip, CompoundStageButton } from '../components/recipe-workbench-primitives';
import { PackagingForm } from '../components/packaging-form';
import { EquipmentForm } from '../components/equipment-form';
import { LaborForm } from '../components/labor-form';
import { StepForm } from '../components/step-form';
import { RecipeYieldFields } from '../components/recipe-yield-fields';
import { RecipeCategoryField } from '../components/recipe-category-field';
import { RecipeNameField } from '../components/recipe-name-field';
import { RecipeProductField } from '../components/recipe-product-field';
import { RecipeDescriptionField } from '../components/recipe-description-field';
import { IngredientForm } from '../components/ingredient-form';
import { IngredientCombobox } from '../components/ingredient-combobox';
import { RecipeTable } from '../components/recipe-table';
import { getApiErrorMessage } from '../lib/api-errors';
import {
  type InventoryCatalogItem,
  listCategories,
  listUoms,
} from '../lib/inventory-management-api';
import {
  addRecipeEquipment,
  addRecipeIngredient,
  addRecipeLabor,
  addRecipePackaging,
  addRecipeStep,
  approveRecipeVersion,
  archiveRecipe,
  createRecipe,
  createRecipeVersion,
  deleteRecipeEquipment,
  deleteRecipeIngredient,
  deleteRecipeLabor,
  deleteRecipePackaging,
  deleteRecipeStep,
  getRecipe,
  listRecipes,
  listProducts,
  recalculateRecipeVersion,
  submitRecipeVersion,
  type RecipeDetail,
  type RecipeEquipmentPayload,
  type RecipeIngredientPayload,
  type RecipeLaborPayload,
  type RecipeListItem,
  type RecipePackagingPayload,
  type RecipePayload,
  type RecipeStepPayload,
  updateRecipe,
  updateRecipeEquipment,
  updateRecipeIngredient,
  updateRecipeLabor,
  updateRecipePackaging,
  updateRecipeStep,
} from '../lib/recipes-management-api';
import { useAuthStore } from '../mock/auth.store';

const emptyRecipeForm = {
  name: '',
  finishedProductId: '',
  description: '',
  categoryId: '',
  yieldQuantity: 1,
  yieldUomId: '',
  servingSize: 1,
};

const emptyIngredientForm = {
  inventoryItemId: '',
  subRecipeId: '',
  quantity: 1,
  uomId: '',
  notes: '',
  order: 1,
};

const emptyPackagingForm = {
  name: '',
  quantity: 1,
  unitCost: 0,
};

const emptyLaborForm = {
  role: '',
  minutes: 1,
  monthlySalary: 0,
  monthlyHours: 220,
};

const emptyEquipmentForm = {
  name: '',
  type: EquipmentType.ELECTRIC,
  hoursUsed: 1,
  consumptionPerHour: 0,
  utilityRate: 0,
};

const emptyStepForm = {
  stepNumber: 1,
  description: '',
  durationMinutes: 1,
  notes: '',
};


const compoundStageOrder = [
  'nome',
  'componentes',
  'rendimento',
  'categoria',
  'processo',
  'embalagens',
  'mao-de-obra',
  'equipamentos',
] as const;

type CompoundStageKey = (typeof compoundStageOrder)[number];

type MessageState = {
  tone: 'success' | 'error';
  text: string;
} | null;

function isCompoundStageKey(value: string | null): value is CompoundStageKey {
  return Boolean(
    value && compoundStageOrder.includes(value as CompoundStageKey),
  );
}

function statusTone(status: string) {
  switch (status) {
    case RecipeStatus.APPROVED:
      return 'bg-emerald-100 text-emerald-700';
    case RecipeStatus.IN_REVIEW:
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}


function toRecipeForm(recipe: RecipeDetail) {
  const version = recipe.versions[0];

  return {
    name: recipe.name,
    finishedProductId: recipe.finished_product_id || '',
    description: recipe.description ?? '',
    categoryId: recipe.categoryId ?? '',
    yieldQuantity: version?.yieldQuantity ?? 1,
    yieldUomId: version?.yieldUomId ?? '',
    servingSize: Number(version?.servingSize ?? 1),
  };
}

export function RecipeWorkbench({
  productType,
  heading,
  description,
}: {
  productType: ProductType;
  heading: string;
  description: string;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
  const [loading, setLoading] = useState(!isDemoSession);
  const [message, setMessage] = useState<MessageState>(null);
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [recipeForm, setRecipeForm] = useState(emptyRecipeForm);
  const [ingredientForm, setIngredientForm] = useState(emptyIngredientForm);
  const [ingredientEditingId, setIngredientEditingId] = useState<string | null>(
    null,
  );
  const [packagingForm, setPackagingForm] = useState(emptyPackagingForm);
  const [packagingEditingId, setPackagingEditingId] = useState<string | null>(
    null,
  );
  const [laborForm, setLaborForm] = useState(emptyLaborForm);
  const [laborEditingId, setLaborEditingId] = useState<string | null>(null);
  const [equipmentForm, setEquipmentForm] = useState(emptyEquipmentForm);
  const [equipmentEditingId, setEquipmentEditingId] = useState<string | null>(
    null,
  );
  const [stepForm, setStepForm] = useState(emptyStepForm);
  const [stepEditingId, setStepEditingId] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [uoms, setUoms] = useState<
    Array<{ id: string; name: string; abbreviation: string }>
  >([]);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [products, setProducts] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [subRecipes, setSubRecipes] = useState<
    Array<{ id: string; name: string; finished_product_id?: string }>
  >([]);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productStage, setProductStage] = useState<CompoundStageKey>('nome');

  const currentVersion = useMemo(
    () =>
      detail?.versions.find((version) => version.id === selectedVersionId) ??
      detail?.versions[0] ??
      null,
    [detail, selectedVersionId],
  );
  const defaultCompoundYieldUomId = useMemo(
    () =>
      uoms.find((uom) => uom.abbreviation.toUpperCase() === 'UN')?.id ??
      uoms[0]?.id ??
      '',
    [uoms],
  );

  const isEditableVersion =
    !isDemoSession &&
    (productType === ProductType.FINAL
      ? Boolean(currentVersion)
      : currentVersion?.status === RecipeStatus.DRAFT);
  const isCompoundMode = productType === ProductType.SUB_RECEITA;
  const isGuidedMode = productType === ProductType.FINAL || isCompoundMode;
  const variantLabel =
    productType === ProductType.FINAL ? 'produto' : 'insumo composto';
  const entityLabel =
    productType === ProductType.FINAL ? 'ficha técnica' : 'insumo composto';
  const entityArticle = productType === ProductType.FINAL ? 'da' : 'do';
  const newEntityLabel =
    productType === ProductType.FINAL
      ? 'Nova ficha técnica'
      : 'Novo insumo composto';
  const compoundStageParam = searchParams.get('etapa');
  const activeCompoundStage: CompoundStageKey =
    isGuidedMode && isCompoundStageKey(compoundStageParam)
      ? compoundStageParam
      : 'nome';

  useEffect(() => {
    if (isDemoSession) {
      setLoading(false);
      return;
    }

    const recipeIdParam = searchParams.get('recipeId');
    void bootstrap(recipeIdParam || undefined);
  }, [isDemoSession, productType, searchParams]);

  function navigateCompoundStage(stage: CompoundStageKey) {
    if (!isGuidedMode) return;
    const params = new URLSearchParams(searchParams.toString());
    if (stage === 'nome') {
      params.delete('etapa');
    } else {
      params.set('etapa', stage);
    }
    const query = params.toString();
    navigate(query ? `${pathname}?${query}` : pathname, { replace: true, 
      scroll: false,
    });
  }

  async function bootstrap(
    preferredRecipeId?: string,
    preferredVersionId?: string,
  ) {
    try {
      setLoading(true);
      setMessage(null);
      const [uomData, categoryData, recipeData, subRecipeData, productsData] =
        await Promise.all([
          listUoms(),
          listCategories(),
          listRecipes(productType),
          listRecipes(ProductType.SUB_RECEITA),
          listProducts(),
        ]);

      setUoms(uomData);
      setCategories(categoryData);
      setProducts(productsData);
      setRecipes(recipeData);
      setSubRecipes(
        subRecipeData.map((recipe) => ({
          id: recipe.id,
          name: recipe.name,
          finished_product_id: recipe.finished_product_id,
        })),
      );

      const nextRecipeId =
        preferredRecipeId &&
        recipeData.some((recipe) => recipe.id === preferredRecipeId)
          ? preferredRecipeId
          : (recipeData[0]?.id ?? '');

      if (nextRecipeId) {
        await loadRecipe(nextRecipeId, preferredVersionId);
      } else {
        resetRecipeWorkspace();
      }
    } catch (error) {
      setMessage({
        tone: 'error',
        text: getApiErrorMessage(
          error,
          'Não foi possível carregar as receitas.',
        ),
      });
    } finally {
      setLoading(false);
    }
  }

  async function reloadRecipeList() {
    const [recipeData, subRecipeData] = await Promise.all([
      listRecipes(productType),
      listRecipes(ProductType.SUB_RECEITA),
    ]);
    setRecipes(recipeData);
    setSubRecipes(
      subRecipeData.map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        finished_product_id: recipe.finished_product_id,
      })),
    );
    return recipeData;
  }

  async function loadRecipe(recipeId: string, preferredVersionId?: string) {
    const recipe = await getRecipe(recipeId);
    setDetail(recipe);
    setSelectedRecipeId(recipe.id);
    setEditingRecipeId(recipe.id);
    setRecipeForm(toRecipeForm(recipe));
    const nextVersionId =
      preferredVersionId &&
      recipe.versions.some((version) => version.id === preferredVersionId)
        ? preferredVersionId
        : (recipe.versions[0]?.id ?? '');
    setSelectedVersionId(nextVersionId);
    resetChildForms();
  }

  function resetRecipeWorkspace() {
    setSelectedRecipeId('');
    setSelectedVersionId('');
    setDetail(null);
    setEditingRecipeId(null);
    setRecipeForm(emptyRecipeForm);
    resetChildForms();
    if (isGuidedMode) navigateCompoundStage('nome');
  }

  function resetChildForms() {
    setIngredientForm(emptyIngredientForm);
    setIngredientEditingId(null);
    setPackagingForm(emptyPackagingForm);
    setPackagingEditingId(null);
    setLaborForm(emptyLaborForm);
    setLaborEditingId(null);
    setEquipmentForm(emptyEquipmentForm);
    setEquipmentEditingId(null);
    setStepForm(emptyStepForm);
    setStepEditingId(null);
  }

  function buildRecipePayload(): RecipePayload {
    const effectiveYieldUomId =
      recipeForm.yieldUomId || (isGuidedMode ? defaultCompoundYieldUomId : '');

    return {
      name: recipeForm.name,
      finishedProductId: recipeForm.finishedProductId,
      productType,
      description: recipeForm.description || undefined,
      categoryId: recipeForm.categoryId || undefined,
      yieldQuantity:
        Number(recipeForm.yieldQuantity) > 0
          ? Number(recipeForm.yieldQuantity)
          : 1,
      yieldUomId: effectiveYieldUomId,
      servingSize:
        recipeForm.servingSize > 0 ? Number(recipeForm.servingSize) : undefined,
    };
  }

  async function handleRecipeSubmit() {
    try {
      setLoading(true);
      setMessage(null);
      const payload = buildRecipePayload();

      if (editingRecipeId) {
        await updateRecipe(editingRecipeId, payload);
        await reloadRecipeList();
        await loadRecipe(editingRecipeId, selectedVersionId || undefined);
        if (isGuidedMode) {
          if (activeCompoundStage === 'nome')
            navigateCompoundStage('componentes');
          if (activeCompoundStage === 'rendimento')
            navigateCompoundStage('categoria');
          if (activeCompoundStage === 'categoria')
            navigateCompoundStage('processo');
        }
        setMessage({
          tone: 'success',
          text: `${heading} atualizado com sucesso.`,
        });
        return;
      }

      const created = await createRecipe(payload);
      await reloadRecipeList();
      await loadRecipe(created.id, created.versions[0]?.id);
      if (isGuidedMode) navigateCompoundStage('componentes');
      setMessage({ tone: 'success', text: `${heading} criado com sucesso.` });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: getApiErrorMessage(
          error,
          `Não foi possível salvar o ${variantLabel}.`,
        ),
      });
    } finally {
      setLoading(false);
    }
  }

  function handleArchiveRecipe(id: string) {
    setPendingConfirm({
      message: `Deseja arquivar este ${variantLabel}?`,
      onConfirm: async () => {
        try {
          setLoading(true);
          await archiveRecipe(id);
          const remaining = await reloadRecipeList();
          const nextId = remaining[0]?.id ?? '';
          if (nextId) await loadRecipe(nextId);
          else resetRecipeWorkspace();
          setMessage({
            tone: 'success',
            text: `${heading} arquivado com sucesso.`,
          });
        } catch (error) {
          setMessage({
            tone: 'error',
            text: getApiErrorMessage(
              error,
              `Não foi possível arquivar o ${variantLabel}.`,
            ),
          });
        } finally {
          setLoading(false);
        }
      },
    });
  }

  async function handleCreateVersion() {
    if (!selectedRecipeId) return;

    try {
      setLoading(true);
      const version = await createRecipeVersion(selectedRecipeId);
      await loadRecipe(selectedRecipeId, version.id);
      setMessage({
        tone: 'success',
        text: 'Nova versão criada a partir da última ficha aprovada.',
      });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: getApiErrorMessage(error, 'Não foi possível criar nova versão.'),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleVersionAction(
    action: 'recalculate' | 'submit' | 'approve',
  ) {
    if (!selectedRecipeId || !currentVersion) return;

    try {
      setLoading(true);

      if (action === 'recalculate') {
        await recalculateRecipeVersion(selectedRecipeId, currentVersion.id);
      }

      if (action === 'submit') {
        await submitRecipeVersion(selectedRecipeId, currentVersion.id);
      }

      if (action === 'approve') {
        await approveRecipeVersion(selectedRecipeId, currentVersion.id);
      }

      await loadRecipe(selectedRecipeId, currentVersion.id);
      setMessage({
        tone: 'success',
        text:
          action === 'recalculate'
            ? 'Custos recalculados com sucesso.'
            : action === 'submit'
              ? 'Versão enviada para revisão.'
              : 'Versão aprovada com sucesso.',
      });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: getApiErrorMessage(error, 'Não foi possível atualizar a versão.'),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleIngredientSubmit() {
    if (!selectedRecipeId || !currentVersion) return;

    let targetProductId = ingredientForm.inventoryItemId;
    if (ingredientForm.subRecipeId) {
      const subRec = subRecipes.find(r => r.id === ingredientForm.subRecipeId) || recipes.find(r => r.id === ingredientForm.subRecipeId);
      if (subRec) {
        const fullRecipeObj = recipes.find(r => r.id === subRec.id);
        if (fullRecipeObj && fullRecipeObj.finished_product_id) {
          targetProductId = fullRecipeObj.finished_product_id;
        } else if ('finished_product_id' in subRec && subRec.finished_product_id) {
          targetProductId = subRec.finished_product_id as string;
        }
      }
    }

    if (detail && detail.finished_product_id && targetProductId === detail.finished_product_id) {
      setMessage({
        tone: 'error',
        text: 'Você não pode usar o próprio produto final como ingrediente da ficha.',
      });
      return;
    }

    const payload: RecipeIngredientPayload = {
      inventoryItemId: ingredientForm.inventoryItemId || undefined,
      subRecipeId: ingredientForm.subRecipeId || undefined,
      quantity: Number(ingredientForm.quantity),
      uomId: ingredientForm.uomId,
      notes: ingredientForm.notes || undefined,
      order: Number(ingredientForm.order),
    };

    try {
      setLoading(true);

      if (ingredientEditingId) {
        await updateRecipeIngredient(
          selectedRecipeId,
          currentVersion.id,
          ingredientEditingId,
          payload,
        );
      } else {
        await addRecipeIngredient(selectedRecipeId, currentVersion.id, payload);
      }

      await loadRecipe(selectedRecipeId, currentVersion.id);
      setMessage({ tone: 'success', text: 'Ingrediente salvo com sucesso.' });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: getApiErrorMessage(
          error,
          'Não foi possível salvar o ingrediente.',
        ),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handlePackagingSubmit() {
    if (!selectedRecipeId || !currentVersion) return;

    const payload: RecipePackagingPayload = {
      name: packagingForm.name,
      quantity: Number(packagingForm.quantity),
      unitCost: Number(packagingForm.unitCost),
    };

    try {
      setLoading(true);

      if (packagingEditingId) {
        await updateRecipePackaging(
          selectedRecipeId,
          currentVersion.id,
          packagingEditingId,
          payload,
        );
      } else {
        await addRecipePackaging(selectedRecipeId, currentVersion.id, payload);
      }

      await loadRecipe(selectedRecipeId, currentVersion.id);
      setMessage({ tone: 'success', text: 'Embalagem salva com sucesso.' });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: getApiErrorMessage(error, 'Não foi possível salvar a embalagem.'),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleLaborSubmit() {
    if (!selectedRecipeId || !currentVersion) return;

    const payload: RecipeLaborPayload = {
      role: laborForm.role,
      minutes: Number(laborForm.minutes),
      monthlySalary: Number(laborForm.monthlySalary),
      monthlyHours: Number(laborForm.monthlyHours),
    };

    try {
      setLoading(true);

      if (laborEditingId) {
        await updateRecipeLabor(
          selectedRecipeId,
          currentVersion.id,
          laborEditingId,
          payload,
        );
      } else {
        await addRecipeLabor(selectedRecipeId, currentVersion.id, payload);
      }

      await loadRecipe(selectedRecipeId, currentVersion.id);
      setMessage({ tone: 'success', text: 'Mão de obra salva com sucesso.' });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: getApiErrorMessage(
          error,
          'Não foi possível salvar a mão de obra.',
        ),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleEquipmentSubmit() {
    if (!selectedRecipeId || !currentVersion) return;

    const payload: RecipeEquipmentPayload = {
      name: equipmentForm.name,
      type: equipmentForm.type,
      hoursUsed: Number(equipmentForm.hoursUsed),
      consumptionPerHour: Number(equipmentForm.consumptionPerHour),
      utilityRate: Number(equipmentForm.utilityRate),
    };

    try {
      setLoading(true);

      if (equipmentEditingId) {
        await updateRecipeEquipment(
          selectedRecipeId,
          currentVersion.id,
          equipmentEditingId,
          payload,
        );
      } else {
        await addRecipeEquipment(selectedRecipeId, currentVersion.id, payload);
      }

      await loadRecipe(selectedRecipeId, currentVersion.id);
      setMessage({ tone: 'success', text: 'Equipamento salvo com sucesso.' });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: getApiErrorMessage(
          error,
          'Não foi possível salvar o equipamento.',
        ),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleStepSubmit() {
    if (!selectedRecipeId || !currentVersion) return;

    const payload: RecipeStepPayload = {
      stepNumber: Number(stepForm.stepNumber),
      description: stepForm.description,
      durationMinutes: Number(stepForm.durationMinutes),
      notes: stepForm.notes || undefined,
    };

    try {
      setLoading(true);

      if (stepEditingId) {
        await updateRecipeStep(
          selectedRecipeId,
          currentVersion.id,
          stepEditingId,
          payload,
        );
      } else {
        await addRecipeStep(selectedRecipeId, currentVersion.id, payload);
      }

      await loadRecipe(selectedRecipeId, currentVersion.id);
      setMessage({ tone: 'success', text: 'Etapa salva com sucesso.' });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: getApiErrorMessage(error, 'Não foi possível salvar a etapa.'),
      });
    } finally {
      setLoading(false);
    }
  }

  function handleDelete(
    kind: 'ingredient' | 'packaging' | 'labor' | 'equipment' | 'step',
    id: string,
  ) {
    if (!selectedRecipeId || !currentVersion) return;
    const recipeId = selectedRecipeId;
    const versionId = currentVersion.id;

    setPendingConfirm({
      message: 'Deseja remover este registro?',
      onConfirm: async () => {
        try {
          setLoading(true);

          if (kind === 'ingredient')
            await deleteRecipeIngredient(recipeId, versionId, id);
          if (kind === 'packaging')
            await deleteRecipePackaging(recipeId, versionId, id);
          if (kind === 'labor')
            await deleteRecipeLabor(recipeId, versionId, id);
          if (kind === 'equipment')
            await deleteRecipeEquipment(recipeId, versionId, id);
          if (kind === 'step') await deleteRecipeStep(recipeId, versionId, id);

          await loadRecipe(recipeId, versionId);
          setMessage({
            tone: 'success',
            text: 'Registro removido com sucesso.',
          });
        } catch (error) {
          setMessage({
            tone: 'error',
            text: getApiErrorMessage(
              error,
              'Não foi possível remover o registro.',
            ),
          });
        } finally {
          setLoading(false);
        }
      },
    });
  }

  const recipeStats = useMemo(() => {
    const draft = recipes.filter(
      (recipe) => recipe.versions[0]?.status === RecipeStatus.DRAFT,
    ).length;
    const approved = recipes.filter(
      (recipe) => recipe.versions[0]?.status === RecipeStatus.APPROVED,
    ).length;

    return {
      total: recipes.length,
      draft,
      approved,
    };
  }, [recipes]);

  function getIngredientSourceValue() {
    if (ingredientForm.inventoryItemId)
      return `inventory:${ingredientForm.inventoryItemId}`;
    if (ingredientForm.subRecipeId)
      return `subrecipe:${ingredientForm.subRecipeId}`;
    return '';
  }

  function getIngredientLabel(
    row: NonNullable<typeof currentVersion>['ingredients'][number],
  ) {
    if (row.inventoryItem?.name) return row.inventoryItem.name;
    if (row.subRecipeId) {
      return (
        subRecipes.find((recipe) => recipe.id === row.subRecipeId)?.name ??
        'Sub-receita'
      );
    }
    return 'Item';
  }

  const workflowSteps = [
    {
      key: 'nome' as const,
      step: '1',
      title: 'Nome',
      description: `Comece cadastrando apenas o nome ${entityArticle} ${entityLabel}.`,
    },
    {
      key: 'componentes' as const,
      step: '2',
      title: 'Componentes',
      description:
        'Adicione insumos e compostos sem misturar com outros cadastros.',
    },
    {
      key: 'rendimento' as const,
      step: '3',
      title: 'Rendimento',
      description: 'Depois defina quanto essa receita rende e em qual unidade.',
    },
    {
      key: 'categoria' as const,
      step: '4',
      title: 'Categoria',
      description: `Classifique ${entityArticle} ${entityLabel} antes de seguir para as demais etapas.`,
    },
    {
      key: 'processo' as const,
      step: '5',
      title: 'Processo',
      description: 'Documente o preparo em uma etapa exclusiva.',
    },
    {
      key: 'embalagens' as const,
      step: '6',
      title: 'Embalagens',
      description: 'Registre perdas e embalagens em outra página.',
    },
    {
      key: 'mao-de-obra' as const,
      step: '7',
      title: 'Mão de obra',
      description: 'Lance tempo e custo da equipe em uma página separada.',
    },
    {
      key: 'equipamentos' as const,
      step: '8',
      title: 'Equipamentos',
      description: 'Feche consumo operacional em uma última etapa.',
    },
  ];

  const productWorkflowSteps = [
    {
      key: 'nome' as const,
      step: '1',
      title: 'Dados',
      description: 'Nome, categoria e descrição do produto.',
    },
    {
      key: 'componentes' as const,
      step: '2',
      title: 'Insumos',
      description: 'Ingredientes e quantidades da ficha técnica.',
    },
    {
      key: 'rendimento' as const,
      step: '3',
      title: 'Rendimento',
      description: 'Rendimento, unidade e tamanho da porção.',
    },
    {
      key: 'processo' as const,
      step: '4',
      title: 'Preparo',
      description: 'Etapas de produção do produto.',
    },
    {
      key: 'embalagens' as const,
      step: '5',
      title: 'Embalagens',
      description: 'Custos de embalagem por lote.',
    },
    {
      key: 'mao-de-obra' as const,
      step: '6',
      title: 'Mão de obra',
      description: 'Tempo e custo da equipe.',
    },
    {
      key: 'equipamentos' as const,
      step: '7',
      title: 'Equipamentos',
      description: 'Consumo operacional do preparo.',
    },
  ];

  const activeStageIndex = workflowSteps.findIndex(
    (stage) => stage.key === activeCompoundStage,
  );
  const activeStageMeta = workflowSteps[activeStageIndex] ?? workflowSteps[0];
  const activeProductStageIndex = productWorkflowSteps.findIndex(
    (stage) => stage.key === productStage,
  );
  const isLastProductStage =
    activeProductStageIndex >= productWorkflowSteps.length - 1;
  const activeProductStageMeta =
    productWorkflowSteps[activeProductStageIndex] ?? productWorkflowSteps[0];
  const previousProductStage =
    productWorkflowSteps[Math.max(activeProductStageIndex - 1, 0)]?.key ??
    'nome';
  const nextProductStage =
    productWorkflowSteps[
      Math.min(activeProductStageIndex + 1, productWorkflowSteps.length - 1)
    ]?.key ?? 'equipamentos';

  const additionalCostCount =
    (currentVersion?.packagings.length ?? 0) +
    (currentVersion?.laborEntries.length ?? 0) +
    (currentVersion?.equipmentEntries.length ?? 0);

  function openProductCreate() {
    resetRecipeWorkspace();
    setProductStage('nome');
    setProductModalOpen(true);
  }

  async function openProductEdit(recipeId: string) {
    try {
      setLoading(true);
      setMessage(null);
      await loadRecipe(recipeId);
      setProductStage('nome');
      setProductModalOpen(true);
    } catch (error) {
      setMessage({
        tone: 'error',
        text: getApiErrorMessage(error, 'Não foi possível abrir o produto.'),
      });
    } finally {
      setLoading(false);
    }
  }

  function closeProductModal() {
    setProductModalOpen(false);
    resetChildForms();
  }

  async function finishProductModal() {
    if (isDemoSession) {
      closeProductModal();
      return;
    }

    try {
      setLoading(true);
      await reloadRecipeList();
      closeProductModal();
    } catch (error) {
      setMessage({
        tone: 'error',
        text: getApiErrorMessage(
          error,
          'Não foi possível atualizar a lista de produtos.',
        ),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleProductRecipeSubmit() {
    try {
      setLoading(true);
      setMessage(null);
      const payload = buildRecipePayload();

      if (editingRecipeId) {
        await updateRecipe(editingRecipeId, payload);
        await reloadRecipeList();
        await loadRecipe(editingRecipeId, selectedVersionId || undefined);
      } else {
        const created = await createRecipe(payload);
        await reloadRecipeList();
        await loadRecipe(created.id, created.versions[0]?.id);
      }

      if (productStage === 'nome') setProductStage('componentes');
      if (productStage === 'rendimento') setProductStage('processo');
      setMessage({ tone: 'success', text: 'Produto salvo com sucesso.' });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: getApiErrorMessage(error, 'Não foi possível salvar o produto.'),
      });
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteProduct(recipeId: string, productName: string) {
    setPendingConfirm({
      message: `Excluir "${productName}"?`,
      onConfirm: async () => {
        try {
          setLoading(true);
          await archiveRecipe(recipeId);
          await reloadRecipeList();
          if (selectedRecipeId === recipeId) {
            resetRecipeWorkspace();
            setProductModalOpen(false);
          }
          setMessage({ tone: 'success', text: 'Produto excluído.' });
        } catch (error) {
          setMessage({
            tone: 'error',
            text: getApiErrorMessage(
              error,
              'Não foi possível excluir o produto.',
            ),
          });
        } finally {
          setLoading(false);
        }
      },
    });
  }

  if (productType === ProductType.FINAL) {
    return (
      <div className="space-y-5">
        {pendingConfirm ? (
          <ConfirmDialog
            message={pendingConfirm.message}
            onConfirm={() => {
              void (pendingConfirm.onConfirm as () => Promise<void>)();
              setPendingConfirm(null);
            }}
            onCancel={() => setPendingConfirm(null)}
          />
        ) : null}

        {products.length === 0 && !loading ? (
          <StatusMessage
            tone="warning"
            message="Cadastre produtos no módulo Produtos para criar fichas técnicas."
          />
        ) : null}
        {message ? (
          <StatusMessage
            tone={message.tone}
            message={message.text}
            onDismiss={() => setMessage(null)}
          />
        ) : null}

        <section
          className="overflow-hidden rounded-[12px] border bg-[var(--bg-surface)] shadow-[var(--shadow-panel)]"
          style={{ borderColor: 'var(--line-soft)' }}
        >
          <div
            className="flex flex-col gap-3 border-b px-5 py-4 md:flex-row md:items-center md:justify-between"
            style={{ borderColor: 'var(--line-soft)' }}
          >
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Produtos
              </p>
              <h2 className="mt-1 text-[15px] font-semibold text-[var(--text-strong)]">
                Fichas técnicas cadastradas
              </h2>
            </div>
            <ActionButton
              onClick={openProductCreate}
              disabled={loading || isDemoSession}
              className="gap-1.5"
            >
              <Plus size={14} /> Nova ficha
            </ActionButton>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-[var(--bg-subtle)] text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  <th className="px-5 py-3">Produto</th>
                  <th className="px-4 py-3">Rendimento</th>
                  <th className="px-4 py-3">Porção / unidade</th>
                  <th className="px-4 py-3 text-right">Insumos</th>
                  <th className="px-4 py-3 text-right">Custo lote</th>
                  <th className="px-4 py-3 text-right">Custo / medida</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-[var(--text-muted)]"
                    >
                      Carregando produtos...
                    </td>
                  </tr>
                ) : recipes.length ? (
                  recipes.map((recipe) => {
                    const version = recipe.versions[0];
                    const yieldLabel =
                      version?.yieldQuantity && version?.yieldUom?.abbreviation
                        ? `${Number(version.yieldQuantity).toLocaleString(
                            'pt-BR',
                            {
                              maximumFractionDigits: 3,
                            },
                          )} ${version.yieldUom.abbreviation}`
                        : '---';
                    const servingLabel =
                      version?.servingSize && version?.yieldUom?.abbreviation
                        ? `${Number(version.servingSize).toLocaleString(
                            'pt-BR',
                            {
                              maximumFractionDigits: 3,
                            },
                          )} ${version.yieldUom.abbreviation}`
                        : '---';
                    const ingredientCount = version?._count?.ingredients ?? 0;
                    const costUnit = version?.yieldUom?.abbreviation ?? 'un.';

                    return (
                      <tr
                        key={recipe.id}
                        className="border-b border-[var(--line-soft)] transition last:border-0 hover:bg-[var(--bg-subtle)]"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/products/${recipe.id}`}
                            className="text-left font-semibold text-[var(--text-strong)] hover:text-[var(--brand-primary-700)]"
                          >
                            {recipe.name}
                          </Link>
                          {recipe.description ? (
                            <p className="mt-1 max-w-sm truncate text-xs text-[var(--text-muted)]">
                              {recipe.description}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 text-[var(--text-strong)]">
                          {yieldLabel}
                        </td>
                        <td className="px-4 py-4 text-[var(--text-strong)]">
                          {servingLabel}
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums text-[var(--text-strong)]">
                          {ingredientCount}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-[var(--text-strong)]">
                          {version
                            ? formatBRL(Number(version.totalCost))
                            : '---'}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-[var(--brand-primary-700)]">
                          {version
                            ? `${formatBRL(Number(version.unitCost))}/${costUnit}`
                            : '---'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => void openProductEdit(recipe.id)}
                              className="rounded-[8px] border border-[var(--line-soft)] bg-white p-2 text-[var(--text-muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--text-strong)]"
                              title="Alterar"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteProduct(recipe.id, recipe.name)
                              }
                              disabled={loading || isDemoSession}
                              className="rounded-[8px] border border-[var(--line-soft)] bg-white p-2 text-[var(--text-muted)] transition hover:border-[var(--state-danger-700)] hover:text-[var(--state-danger-700)] disabled:cursor-not-allowed disabled:opacity-50"
                              title="Excluir"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <p className="text-sm font-medium text-[var(--text-strong)]">
                        Nenhuma ficha técnica cadastrada
                      </p>
                      {products.length > 0 ? (
                        <button
                          type="button"
                          onClick={openProductCreate}
                          className="mt-3 text-sm font-semibold text-[var(--brand-primary-700)] hover:underline"
                        >
                        Cadastrar primeira ficha
                        </button>
                      ) : (
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                          Cadastre primeiro um produto final no módulo Produtos para habilitar a criação de fichas técnicas.
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {productModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(12,17,20,0.48)] p-3 backdrop-blur-[3px]">
            <div
              className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[14px] border bg-[var(--bg-surface)] shadow-[var(--shadow-overlay)]"
              style={{ borderColor: 'var(--line-soft)' }}
            >
              <div
                className="flex items-start justify-between gap-4 border-b px-5 py-4"
                style={{ borderColor: 'var(--line-soft)' }}
              >
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Cadastro de produto
                  </p>
                  <h2 className="mt-1 truncate text-lg font-semibold text-[var(--text-strong)]">
                    {recipeForm.name || 'Nova ficha'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeProductModal}
                  className="rounded-[10px] border border-[var(--line-soft)] bg-white p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-strong)]"
                  title="Fechar"
                >
                  <X size={17} />
                </button>
              </div>

              <div
                className="border-b px-5 py-3"
                style={{ borderColor: 'var(--line-soft)' }}
              >
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
                  {productWorkflowSteps.map((stage) => (
                    <CompoundStageButton
                      key={stage.key}
                      step={stage.step}
                      title={stage.title}
                      description={stage.description}
                      active={productStage === stage.key}
                      disabled={stage.key !== 'nome' && !currentVersion}
                      onClick={() => setProductStage(stage.key)}
                    />
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      Etapa {activeProductStageMeta.step}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-[var(--text-strong)]">
                      {activeProductStageMeta.title}
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:min-w-[280px]">
                    <div
                      className="rounded-[10px] border px-3 py-2"
                      style={{ borderColor: 'var(--line-soft)' }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                        Lote
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
                        {currentVersion
                          ? formatBRL(Number(currentVersion.totalCost))
                          : '---'}
                      </p>
                    </div>
                    <div
                      className="rounded-[10px] border px-3 py-2"
                      style={{ borderColor: 'var(--line-soft)' }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                        {currentVersion?.yieldUom?.abbreviation
                          ? `Custo / ${currentVersion.yieldUom.abbreviation}`
                          : 'Custo unitário'}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--brand-primary-700)]">
                        {currentVersion
                          ? formatBRL(Number(currentVersion.unitCost))
                          : '---'}
                      </p>
                    </div>
                  </div>
                </div>

                {productStage === 'nome' ? (
                  <div className="max-w-3xl space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <RecipeNameField
                        value={recipeForm.name}
                        onChange={(name) => setRecipeForm((current) => ({ ...current, name }))}
                        disabled={loading || isDemoSession}
                        label="Nome do produto"
                      />
                      <RecipeCategoryField
                        categoryId={recipeForm.categoryId}
                        onChange={(categoryId) => setRecipeForm((current) => ({ ...current, categoryId }))}
                        categories={categories}
                        disabled={loading || isDemoSession}
                      />
                      <div className="md:col-span-2">
                        <RecipeDescriptionField
                          value={recipeForm.description}
                          onChange={(description) => setRecipeForm((current) => ({ ...current, description }))}
                          disabled={loading || isDemoSession}
                        />
                      </div>
                    </div>
                    <ActionButton
                      onClick={() => void handleProductRecipeSubmit()}
                      disabled={
                        loading ||
                        isDemoSession ||
                        !recipeForm.name ||
                        (!editingRecipeId && !defaultCompoundYieldUomId)
                      }
                    >
                      {editingRecipeId ? 'Salvar dados' : 'Cadastrar produto'}
                    </ActionButton>
                  </div>
                ) : null}

                {currentVersion && productStage === 'componentes' ? (
                  <div className="space-y-4">
                    <IngredientForm
                      form={ingredientForm}
                      onChange={(updates) => setIngredientForm((current) => ({ ...current, ...updates }))}
                      onSubmit={() => void handleIngredientSubmit()}
                      onCancel={() => {
                        setIngredientForm(emptyIngredientForm);
                        setIngredientEditingId(null);
                      }}
                      onIngredientSelect={(compositeValue, uomId) => {
                        const [kind, nextId] = compositeValue.split(':');
                        setIngredientForm((current) => ({
                          ...current,
                          inventoryItemId: kind === 'inventory' ? nextId : '',
                          subRecipeId: kind === 'subrecipe' ? nextId : '',
                          uomId: kind === 'inventory' && uomId ? uomId : current.uomId,
                        }));
                      }}
                      uoms={uoms}
                      subRecipes={subRecipes}
                      ingredientSourceValue={getIngredientSourceValue()}
                      selectedLabel={(() => {
                        if (ingredientForm.inventoryItemId) {
                          const row = currentVersion.ingredients.find(
                            (ingredient) => ingredient.inventoryItemId === ingredientForm.inventoryItemId,
                          );
                          return row?.inventoryItem?.name ?? '';
                        }
                        if (ingredientForm.subRecipeId) {
                          return subRecipes.find((recipe) => recipe.id === ingredientForm.subRecipeId)?.name ?? '';
                        }
                        return '';
                      })()}
                      currentRecipeId={selectedRecipeId}
                      isEditing={Boolean(ingredientEditingId)}
                      isEditable={isEditableVersion}
                      loading={loading}
                      comboboxLabel="Insumo"
                      uomLabel="Unidade do rendimento"
                      gridClassName="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                      comboboxClassName="xl:col-span-2"
                      submitButtonText={ingredientEditingId ? 'Atualizar insumo' : 'Adicionar insumo'}
                    />
                    <RecipeTable
                      columns={['Insumo', 'Tipo', 'Qtd.', 'Unidade', 'Ações']}
                      rows={currentVersion.ingredients.map((row) => [
                        getIngredientLabel(row),
                        row.subRecipeId ? 'Composto' : 'Insumo',
                        Number(row.quantity).toLocaleString('pt-BR'),
                        row.uom.abbreviation,
                        <div key={row.id} className="flex flex-wrap gap-2">
                          <ActionButton
                            tone="secondary"
                            className="px-3 py-2 text-xs"
                            onClick={() => {
                              setIngredientEditingId(row.id);
                              setIngredientForm({
                                inventoryItemId: row.inventoryItemId ?? '',
                                subRecipeId: row.subRecipeId ?? '',
                                quantity: Number(row.quantity),
                                uomId: row.uomId,
                                notes: row.notes ?? '',
                                order: row.order,
                              });
                            }}
                          >
                            Alterar
                          </ActionButton>
                          <ActionButton
                            tone="danger"
                            className="px-3 py-2 text-xs"
                            onClick={() =>
                              void handleDelete('ingredient', row.id)
                            }
                            disabled={!isEditableVersion || loading}
                          >
                            Excluir
                          </ActionButton>
                        </div>,
                      ])}
                    />
                  </div>
                ) : null}

                {currentVersion && productStage === 'rendimento' ? (
                  <div className="max-w-3xl space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <RecipeYieldFields
                        yieldQuantity={recipeForm.yieldQuantity}
                        yieldUomId={recipeForm.yieldUomId}
                        servingSize={recipeForm.servingSize}
                        onChange={(updates) => setRecipeForm((current) => ({ ...current, ...updates }))}
                        uoms={uoms}
                        disabled={loading || isDemoSession}
                      />
                    </div>
                    <ActionButton
                      onClick={() => void handleProductRecipeSubmit()}
                      disabled={
                        loading ||
                        isDemoSession ||
                        !recipeForm.yieldUomId ||
                        Number(recipeForm.yieldQuantity) <= 0
                      }
                    >
                      Salvar rendimento
                    </ActionButton>
                  </div>
                ) : null}

                {currentVersion && productStage === 'processo' ? (
                  <div className="space-y-4">
                    <StepForm
                      form={stepForm}
                      onChange={(updates) => setStepForm((current) => ({ ...current, ...updates }))}
                      onSubmit={() => void handleStepSubmit()}
                      onCancel={() => {
                        setStepForm(emptyStepForm);
                        setStepEditingId(null);
                      }}
                      isEditing={Boolean(stepEditingId)}
                      isEditable={isEditableVersion}
                      loading={loading}
                      showNotes={false}
                    />
                    <RecipeTable
                      columns={['Etapa', 'Descrição', 'Min.', 'Ações']}
                      rows={currentVersion.steps.map((row) => [
                        `#${row.stepNumber}`,
                        row.description,
                        row.durationMinutes ?? '---',
                        <div key={row.id} className="flex flex-wrap gap-2">
                          <ActionButton
                            tone="secondary"
                            className="px-3 py-2 text-xs"
                            onClick={() => {
                              setStepEditingId(row.id);
                              setStepForm({
                                stepNumber: row.stepNumber,
                                description: row.description,
                                durationMinutes: Number(
                                  row.durationMinutes ?? 1,
                                ),
                                notes: row.notes ?? '',
                              });
                            }}
                          >
                            Alterar
                          </ActionButton>
                          <ActionButton
                            tone="danger"
                            className="px-3 py-2 text-xs"
                            onClick={() => void handleDelete('step', row.id)}
                            disabled={!isEditableVersion || loading}
                          >
                            Excluir
                          </ActionButton>
                        </div>,
                      ])}
                    />
                  </div>
                ) : null}

                {currentVersion && productStage === 'embalagens' ? (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                    <p className="text-sm font-medium text-slate-500">O módulo de embalagens estará disponível em uma fase futura. Os dados aqui não serão salvos.</p>
                  </div>
                ) : null}

                {currentVersion && productStage === 'mao-de-obra' ? (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                    <p className="text-sm font-medium text-slate-500">O módulo de mão de obra estará disponível em uma fase futura. Os dados aqui não serão salvos.</p>
                  </div>
                ) : null}

                {currentVersion && productStage === 'equipamentos' ? (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                    <p className="text-sm font-medium text-slate-500">O módulo de equipamentos estará disponível em uma fase futura. Os dados aqui não serão salvos.</p>
                  </div>
                ) : null}
              </div>

              <div
                className="flex items-center justify-between gap-3 border-t px-5 py-4"
                style={{ borderColor: 'var(--line-soft)' }}
              >
                <ActionButton
                  tone="secondary"
                  onClick={() => setProductStage(previousProductStage)}
                  disabled={activeProductStageIndex <= 0}
                  className="gap-1.5"
                >
                  <ChevronLeft size={14} /> Voltar
                </ActionButton>
                <div className="flex gap-2">
                  <ActionButton tone="secondary" onClick={closeProductModal}>
                    Fechar
                  </ActionButton>
                  <ActionButton
                    onClick={() => {
                      if (isLastProductStage) {
                        void finishProductModal();
                        return;
                      }

                      setProductStage(nextProductStage);
                    }}
                    disabled={!currentVersion || loading}
                    className="gap-1.5"
                  >
                    {isLastProductStage ? (
                      <>
                        Finalizar <CheckCircle2 size={14} />
                      </>
                    ) : (
                      <>
                        Avançar <ChevronRight size={14} />
                      </>
                    )}
                  </ActionButton>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (isGuidedMode) {
    const previousStage =
      workflowSteps[Math.max(activeStageIndex - 1, 0)]?.key ?? 'nome';
    const nextStage =
      workflowSteps[Math.min(activeStageIndex + 1, workflowSteps.length - 1)]
        ?.key ?? 'equipamentos';
    const stageRequiresSavedRecipe = activeCompoundStage !== 'nome';

    return (
      <div className="space-y-6">
        {pendingConfirm ? (
          <ConfirmDialog
            message={pendingConfirm.message}
            onConfirm={() => {
              void (pendingConfirm.onConfirm as () => Promise<void>)();
              setPendingConfirm(null);
            }}
            onCancel={() => setPendingConfirm(null)}
          />
        ) : null}

        {isDemoSession ? (
          <StatusMessage
            tone="error"
            message="Entre com a API para criar e editar fichas técnicas reais."
          />
        ) : null}
        {message ? (
          <StatusMessage
            tone={message.tone}
            message={message.text}
            onDismiss={() => setMessage(null)}
          />
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <section
              className="overflow-hidden rounded-[12px] border bg-[var(--bg-surface)] shadow-[var(--shadow-panel)]"
              style={{ borderColor: 'var(--line-soft)' }}
            >
              <div
                className="flex items-center justify-between gap-3 border-b px-4 py-3"
                style={{ borderColor: 'var(--line-soft)' }}
              >
                <div>
                  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Fichas
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
                    Cadastradas
                  </h2>
                </div>
                <ActionButton
                  tone="secondary"
                  onClick={resetRecipeWorkspace}
                  disabled={loading}
                  className="gap-1.5 px-3 py-2 text-xs"
                >
                  <Plus size={13} /> Nova
                </ActionButton>
              </div>

              <div className="p-3">
                <div
                  className="max-h-[340px] overflow-auto rounded-[10px] border"
                  style={{ borderColor: 'var(--line-soft)' }}
                >
                  {loading ? (
                    <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                      Carregando...
                    </div>
                  ) : recipes.length ? (
                    <div className="divide-y divide-[var(--line-soft)]">
                      {recipes.map((recipe) => {
                        const recipeStatus =
                          recipe.versions[0]?.status ?? RecipeStatus.DRAFT;
                        const selected = recipe.id === selectedRecipeId;

                        return (
                          <button
                            key={recipe.id}
                            type="button"
                            onClick={() => void loadRecipe(recipe.id)}
                            disabled={loading}
                            className={`w-full px-3 py-3 text-left transition ${
                              selected
                                ? 'bg-[rgba(35,86,93,0.08)]'
                                : 'bg-white hover:bg-[var(--bg-subtle)]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="min-w-0 truncate text-sm font-semibold text-[var(--text-strong)]">
                                {recipe.name}
                              </span>
                              {selected ? (
                                <CheckCircle2
                                  size={15}
                                  className="shrink-0 text-[var(--brand-primary-700)]"
                                />
                              ) : null}
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${statusTone(recipeStatus)}`}
                              >
                                {recipeStatus}
                              </span>
                              <span className="text-xs text-[var(--text-muted)]">
                                {recipe.versions.length} vers.
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                      Nenhuma ficha cadastrada.
                    </div>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div
                    className="rounded-[10px] border bg-[var(--bg-subtle)] px-3 py-2"
                    style={{ borderColor: 'var(--line-soft)' }}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      Total
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[var(--text-strong)]">
                      {recipeStats.total}
                    </p>
                  </div>
                  <div
                    className="rounded-[10px] border bg-[var(--bg-subtle)] px-3 py-2"
                    style={{ borderColor: 'var(--line-soft)' }}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      Aprovadas
                    </p>
                    <p className="mt-1 text-lg font-semibold text-emerald-700">
                      {recipeStats.approved}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section
              className="rounded-[12px] border bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-panel)]"
              style={{ borderColor: 'var(--line-soft)' }}
            >
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Ficha atual
              </p>
              <h3 className="mt-2 truncate text-base font-semibold text-[var(--text-strong)]">
                {detail?.name || recipeForm.name || newEntityLabel}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${statusTone(currentVersion?.status ?? RecipeStatus.DRAFT)}`}
                >
                  {currentVersion?.status ?? 'RASCUNHO'}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {currentVersion
                    ? `Versão ${currentVersion.versionNumber}`
                    : 'Sem versão'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-[10px] bg-[var(--bg-subtle)] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                    Itens
                  </p>
                  <p className="mt-1 text-base font-semibold text-[var(--text-strong)]">
                    {currentVersion?.ingredients.length ?? 0}
                  </p>
                </div>
                <div className="rounded-[10px] bg-[var(--bg-subtle)] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                    Etapas
                  </p>
                  <p className="mt-1 text-base font-semibold text-[var(--text-strong)]">
                    {currentVersion?.steps.length ?? 0}
                  </p>
                </div>
                <div className="rounded-[10px] bg-[var(--bg-subtle)] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                    Custos
                  </p>
                  <p className="mt-1 text-base font-semibold text-[var(--text-strong)]">
                    {additionalCostCount}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div
                  className="rounded-[10px] border px-3 py-2"
                  style={{ borderColor: 'var(--line-soft)' }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                    Lote
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
                    {currentVersion
                      ? formatBRL(Number(currentVersion.totalCost))
                      : '---'}
                  </p>
                </div>
                <div
                  className="rounded-[10px] border px-3 py-2"
                  style={{ borderColor: 'var(--line-soft)' }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                    Unitário
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--brand-primary-700)]">
                    {currentVersion
                      ? formatBRL(Number(currentVersion.unitCost))
                      : '---'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton
                  tone="danger"
                  onClick={() => void handleArchiveRecipe(selectedRecipeId)}
                  disabled={loading || isDemoSession || !selectedRecipeId}
                  className="gap-1.5 px-3 py-2 text-xs"
                >
                  <Archive size={13} /> Arquivar
                </ActionButton>
              </div>

              {selectedRecipeId ? (
                <div
                  className="mt-4 border-t pt-4"
                  style={{ borderColor: 'var(--line-soft)' }}
                >
                  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Versão
                  </p>
                  <div className="mt-3 grid gap-2">
                    <ActionButton
                      tone="secondary"
                      onClick={() => void handleCreateVersion()}
                      disabled={loading || isDemoSession || !selectedRecipeId}
                      className="gap-1.5 px-3 py-2 text-xs"
                    >
                      <Plus size={13} /> Nova versão
                    </ActionButton>
                    <ActionButton
                      tone="secondary"
                      onClick={() => void handleVersionAction('recalculate')}
                      disabled={loading || !isEditableVersion}
                      className="gap-1.5 px-3 py-2 text-xs"
                    >
                      <RefreshCw size={13} /> Recalcular
                    </ActionButton>
                    {currentVersion?.status === RecipeStatus.DRAFT ? (
                      <ActionButton
                        tone="secondary"
                        onClick={() => void handleVersionAction('submit')}
                        disabled={loading}
                        className="gap-1.5 px-3 py-2 text-xs"
                      >
                        <Send size={13} /> Enviar
                      </ActionButton>
                    ) : null}
                    {currentVersion?.status === RecipeStatus.IN_REVIEW ? (
                      <ActionButton
                        onClick={() => void handleVersionAction('approve')}
                        disabled={loading}
                        className="gap-1.5 px-3 py-2 text-xs"
                      >
                        <BadgeCheck size={13} /> Aprovar
                      </ActionButton>
                    ) : null}
                    {currentVersion?.status === RecipeStatus.APPROVED ? (
                      <Link
                        href={`/pricing?recipeId=${selectedRecipeId}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-[var(--brand-primary-700)] bg-[var(--brand-primary-700)] px-3 py-2 text-xs font-semibold text-white shadow-[var(--shadow-panel)] transition hover:bg-[var(--brand-primary-900)]"
                      >
                        <Tag size={13} /> Precificar
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>
          </aside>

          <div className="space-y-4">
            <section
              className="rounded-[12px] border bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-panel)]"
              style={{ borderColor: 'var(--line-soft)' }}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Etapa atual
                  </p>
                  <h2 className="mt-1 truncate text-lg font-semibold text-[var(--text-strong)]">
                    {activeStageMeta.step}. {activeStageMeta.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <ActionButton
                    tone="secondary"
                    onClick={() => navigateCompoundStage(previousStage)}
                    disabled={activeStageIndex <= 0}
                    className="gap-1.5 px-3 py-2 text-xs"
                  >
                    <ChevronLeft size={14} /> Anterior
                  </ActionButton>
                  <ActionButton
                    onClick={() => navigateCompoundStage(nextStage)}
                    disabled={
                      activeStageIndex >= workflowSteps.length - 1 ||
                      (stageRequiresSavedRecipe && !currentVersion) ||
                      (activeCompoundStage === 'nome' && !currentVersion)
                    }
                    className="gap-1.5 px-3 py-2 text-xs"
                  >
                    Próxima <ChevronRight size={14} />
                  </ActionButton>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {workflowSteps.map((stage) => (
                  <CompoundStageButton
                    key={stage.key}
                    step={stage.step}
                    title={stage.title}
                    description={stage.description}
                    active={activeCompoundStage === stage.key}
                    disabled={stage.key !== 'nome' && !currentVersion}
                    onClick={() => navigateCompoundStage(stage.key)}
                  />
                ))}
              </div>
            </section>

            {activeCompoundStage === 'nome' ? (
              <EditorCard title={`1. Nome ${entityArticle} ${entityLabel}`}>
                <div className="max-w-2xl space-y-4">
                  <RecipeProductField
                    value={recipeForm.finishedProductId || ''}
                    onChange={(finishedProductId, selectedName) => {
                      setRecipeForm((current) => ({
                        ...current,
                        finishedProductId,
                        name: current.name || selectedName
                      }));
                    }}
                    products={products}
                    disabled={loading || isDemoSession}
                  />
                  <RecipeNameField
                    value={recipeForm.name}
                    onChange={(name) => setRecipeForm((current) => ({ ...current, name }))}
                    disabled={loading || isDemoSession}
                    label={`Nome Interno (Opcional)`}
                  />

                  <div className="flex flex-wrap gap-3">
                    <ActionButton
                      onClick={() => void handleRecipeSubmit()}
                      disabled={
                        loading ||
                        isDemoSession ||
                        !recipeForm.finishedProductId ||
                        (!editingRecipeId && !defaultCompoundYieldUomId)
                      }
                    >
                      {editingRecipeId
                        ? 'Salvar nome e continuar'
                        : 'Criar e continuar'}
                    </ActionButton>
                  </div>
                </div>
              </EditorCard>
            ) : null}

            {stageRequiresSavedRecipe && !currentVersion ? (
              <EditorCard
                title="Cadastro não iniciado"
                description="Salve a primeira etapa para liberar as demais páginas do fluxo."
              >
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
                  <p className="text-sm text-slate-600">
                    Primeiro cadastre o nome {entityArticle} {entityLabel}.
                  </p>
                </div>
              </EditorCard>
            ) : null}

            {currentVersion && activeCompoundStage === 'componentes' ? (
              <EditorCard title="2. Insumos e quantidades">
                <IngredientForm
                  form={ingredientForm}
                  onChange={(updates) => setIngredientForm((current) => ({ ...current, ...updates }))}
                  onSubmit={() => void handleIngredientSubmit()}
                  onCancel={() => {
                    setIngredientForm(emptyIngredientForm);
                    setIngredientEditingId(null);
                  }}
                  onIngredientSelect={(compositeValue, uomId) => {
                    const [kind, nextId] = compositeValue.split(':');
                    setIngredientForm((current) => ({
                      ...current,
                      inventoryItemId: kind === 'inventory' ? nextId : '',
                      subRecipeId: kind === 'subrecipe' ? nextId : '',
                      uomId: kind === 'inventory' && uomId ? uomId : current.uomId,
                    }));
                  }}
                  uoms={uoms}
                  subRecipes={subRecipes}
                  ingredientSourceValue={getIngredientSourceValue()}
                  selectedLabel={(() => {
                    if (ingredientForm.inventoryItemId) {
                      const row = currentVersion.ingredients.find(
                        (ingredient) => ingredient.inventoryItemId === ingredientForm.inventoryItemId,
                      );
                      return row?.inventoryItem?.name ?? '';
                    }
                    if (ingredientForm.subRecipeId) {
                      return subRecipes.find((recipe) => recipe.id === ingredientForm.subRecipeId)?.name ?? '';
                    }
                    return '';
                  })()}
                  currentRecipeId={selectedRecipeId}
                  isEditing={Boolean(ingredientEditingId)}
                  isEditable={isEditableVersion}
                  loading={loading}
                  comboboxLabel="Origem"
                  uomLabel="Unidade"
                  showOrder={true}
                  gridClassName="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                  comboboxClassName="xl:col-span-2"
                  submitButtonText={ingredientEditingId ? 'Atualizar item' : 'Adicionar item'}
                />

                <RecipeTable
                  columns={[
                    'Ingrediente',
                    'Origem',
                    'Qtd.',
                    'Unidade',
                    'Ações',
                  ]}
                  rows={currentVersion.ingredients.map((row) => [
                    getIngredientLabel(row),
                    row.subRecipeId ? 'Sub-receita' : 'Insumo',
                    Number(row.quantity).toLocaleString('pt-BR'),
                    row.uom.abbreviation,
                    <div key={row.id} className="flex flex-wrap gap-2">
                      <ActionButton
                        tone="secondary"
                        className="px-3 py-2 text-xs"
                        onClick={() => {
                          setIngredientEditingId(row.id);
                          setIngredientForm({
                            inventoryItemId: row.inventoryItemId ?? '',
                            subRecipeId: row.subRecipeId ?? '',
                            quantity: Number(row.quantity),
                            uomId: row.uomId,
                            notes: row.notes ?? '',
                            order: row.order,
                          });
                        }}
                      >
                        Editar
                      </ActionButton>
                      <ActionButton
                        tone="danger"
                        className="px-3 py-2 text-xs"
                        onClick={() => void handleDelete('ingredient', row.id)}
                        disabled={!isEditableVersion || loading}
                      >
                        Excluir
                      </ActionButton>
                    </div>,
                  ])}
                />
              </EditorCard>
            ) : null}

            {currentVersion && activeCompoundStage === 'rendimento' ? (
              <EditorCard title="3. Rendimento">
                <div className="grid gap-4 md:grid-cols-3">
                  <RecipeYieldFields
                    yieldQuantity={recipeForm.yieldQuantity}
                    yieldUomId={recipeForm.yieldUomId}
                    servingSize={recipeForm.servingSize}
                    onChange={(updates) => setRecipeForm((current) => ({ ...current, ...updates }))}
                    uoms={uoms}
                    disabled={loading || isDemoSession}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <ActionButton
                    onClick={() => void handleRecipeSubmit()}
                    disabled={
                      loading ||
                      isDemoSession ||
                      !recipeForm.yieldUomId ||
                      Number(recipeForm.yieldQuantity) <= 0
                    }
                  >
                    Salvar rendimento e continuar
                  </ActionButton>
                </div>
              </EditorCard>
            ) : null}

            {currentVersion && activeCompoundStage === 'categoria' ? (
              <EditorCard title="4. Categoria">
                <div className="grid gap-4 md:grid-cols-2">
                  <RecipeCategoryField
                    categoryId={recipeForm.categoryId}
                    onChange={(categoryId) => setRecipeForm((current) => ({ ...current, categoryId }))}
                    categories={categories}
                    disabled={loading || isDemoSession}
                  />
                  <RecipeDescriptionField
                    value={recipeForm.description}
                    onChange={(description) => setRecipeForm((current) => ({ ...current, description }))}
                    disabled={loading || isDemoSession}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <ActionButton
                    onClick={() => void handleRecipeSubmit()}
                    disabled={loading || isDemoSession}
                  >
                    Salvar categoria e continuar
                  </ActionButton>
                </div>
              </EditorCard>
            ) : null}

            {currentVersion && activeCompoundStage === 'processo' ? (
              <EditorCard title="5. Processo">
                <StepForm
                  form={stepForm}
                  onChange={(updates) => setStepForm((current) => ({ ...current, ...updates }))}
                  onSubmit={() => void handleStepSubmit()}
                  onCancel={() => {
                    setStepForm(emptyStepForm);
                    setStepEditingId(null);
                  }}
                  isEditing={Boolean(stepEditingId)}
                  isEditable={isEditableVersion}
                  loading={loading}
                  showNotes={true}
                />

                <RecipeTable
                  columns={['Etapa', 'Descrição', 'Min.', 'Ações']}
                  rows={currentVersion.steps.map((row) => [
                    `#${row.stepNumber}`,
                    row.description,
                    row.durationMinutes ?? '---',
                    <div key={row.id} className="flex flex-wrap gap-2">
                      <ActionButton
                        tone="secondary"
                        className="px-3 py-2 text-xs"
                        onClick={() => {
                          setStepEditingId(row.id);
                          setStepForm({
                            stepNumber: row.stepNumber,
                            description: row.description,
                            durationMinutes: Number(row.durationMinutes ?? 1),
                            notes: row.notes ?? '',
                          });
                        }}
                      >
                        Editar
                      </ActionButton>
                      <ActionButton
                        tone="danger"
                        className="px-3 py-2 text-xs"
                        onClick={() => void handleDelete('step', row.id)}
                        disabled={!isEditableVersion || loading}
                      >
                        Excluir
                      </ActionButton>
                    </div>,
                  ])}
                />
              </EditorCard>
            ) : null}

            {currentVersion && activeCompoundStage === 'embalagens' ? (
              <EditorCard title="6. Embalagens">
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="text-sm font-medium text-slate-500">O módulo de embalagens estará disponível em uma fase futura. Os dados aqui não serão salvos.</p>
                </div>
              </EditorCard>
            ) : null}

            {currentVersion && activeCompoundStage === 'mao-de-obra' ? (
              <EditorCard title="7. Mão de obra">
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="text-sm font-medium text-slate-500">O módulo de mão de obra estará disponível em uma fase futura. Os dados aqui não serão salvos.</p>
                </div>
              </EditorCard>
            ) : null}

            {currentVersion && activeCompoundStage === 'equipamentos' ? (
              <EditorCard title="8. Equipamentos">
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="text-sm font-medium text-slate-500">O módulo de equipamentos estará disponível em uma fase futura. Os dados aqui não serão salvos.</p>
                </div>
              </EditorCard>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pendingConfirm ? (
        <ConfirmDialog
          message={pendingConfirm.message}
          onConfirm={() => {
            void (pendingConfirm.onConfirm as () => Promise<void>)();
            setPendingConfirm(null);
          }}
          onCancel={() => setPendingConfirm(null)}
        />
      ) : null}

      {isCompoundMode ? (
        <div className="overflow-hidden rounded-[32px] border border-[#e7dac0] bg-[linear-gradient(135deg,#fff7e2_0%,#f4f8ff_52%,#edf6ef_100%)] p-6 shadow-[0_22px_60px_rgba(15,23,42,0.10)]">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="inline-flex rounded-full border border-white/80 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 backdrop-blur">
                Cadastro guiado
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Organize o insumo composto em etapas mais claras
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-slate-600">
                  Esta tela separa base da ficha, biblioteca, versões e montagem
                  da receita para você não precisar interpretar tudo ao mesmo
                  tempo.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {workflowSteps.map((item) => (
                  <WorkflowChip
                    key={item.step}
                    step={item.step}
                    title={item.title}
                    description={item.description}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Ficha atual
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                {detail?.name || recipeForm.name || 'Novo insumo composto'}
              </h3>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusTone(currentVersion?.status ?? RecipeStatus.DRAFT)}`}
                >
                  {currentVersion?.status ?? 'SEM VERSÃO'}
                </span>
                <span className="text-sm text-slate-500">
                  {currentVersion
                    ? `Versão ${currentVersion.versionNumber} pronta para composição`
                    : 'Salve a base da ficha para liberar a montagem'}
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <StatCard
                  label="Ingredientes"
                  value={String(currentVersion?.ingredients.length ?? 0)}
                  toneClassName="text-slate-900"
                  compact
                />
                <StatCard
                  label="Etapas"
                  value={String(currentVersion?.steps.length ?? 0)}
                  toneClassName="text-slate-900"
                  compact
                />
                <StatCard
                  label="Custos extras"
                  value={String(additionalCostCount)}
                  toneClassName="text-slate-900"
                  compact
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={`grid gap-4 ${isCompoundMode ? 'lg:grid-cols-3' : 'md:grid-cols-3'}`}
      >
        {[
          ['Cadastros', String(recipeStats.total), 'text-[#C9A84C]'],
          ['Em rascunho', String(recipeStats.draft), 'text-[#f0aa1b]'],
          ['Aprovados', String(recipeStats.approved), 'text-emerald-600'],
        ].map(([label, value, tone]) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            toneClassName={tone}
            compact={isCompoundMode}
          />
        ))}
      </div>

      {isDemoSession ? (
        <StatusMessage
          tone="error"
          message="Entre com a API para criar e editar fichas técnicas reais."
        />
      ) : null}
      {message ? (
        <StatusMessage
          tone={message.tone}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      ) : null}

      {isCompoundMode ? (
        <EditorCard
          title="Etapas do cadastro"
          description="Use uma página por vez para reduzir o excesso de informação e deixar o preenchimento mais seguro."
        >
          <div className="grid gap-3 xl:grid-cols-6">
            {workflowSteps.map((stage) => (
              <CompoundStageButton
                key={stage.key}
                step={stage.step}
                title={stage.title}
                description={stage.description}
                active={activeCompoundStage === stage.key}
                disabled={stage.key !== 'nome' && !currentVersion}
                onClick={() => navigateCompoundStage(stage.key)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Página atual
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {activeStageMeta.step}. {activeStageMeta.title}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {activeStageMeta.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton
                tone="secondary"
                onClick={() =>
                  navigateCompoundStage(
                    workflowSteps[Math.max(activeStageIndex - 1, 0)]?.key ??
                      'nome',
                  )
                }
                disabled={activeStageIndex <= 0}
              >
                Etapa anterior
              </ActionButton>
              <ActionButton
                onClick={() =>
                  navigateCompoundStage(
                    workflowSteps[
                      Math.min(activeStageIndex + 1, workflowSteps.length - 1)
                    ]?.key ?? 'equipamentos',
                  )
                }
                disabled={
                  activeStageIndex >= workflowSteps.length - 1 ||
                  (!currentVersion && activeCompoundStage === 'nome')
                }
              >
                Próxima etapa
              </ActionButton>
            </div>
          </div>
        </EditorCard>
      ) : null}

      <div
        className={`grid gap-6 ${isCompoundMode ? 'xl:grid-cols-[1.04fr_0.96fr]' : 'xl:grid-cols-[0.92fr_1.08fr]'}`}
      >
        <EditorCard
          title={isCompoundMode ? '1. Base do insumo composto' : heading}
          description={
            isCompoundMode
              ? 'Comece pela identidade da ficha. Depois disso a composição e os custos ficam mais claros de preencher.'
              : description
          }
        >
          {isCompoundMode ? (
            <div className="rounded-[24px] border border-[#ead8a7] bg-[#fff8e5] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7b22]">
                Comece por aqui
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Salve a base primeiro para liberar ingredientes, etapas e custos
                complementares na mesma ficha.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <RecipeProductField
              value={recipeForm.finishedProductId || ''}
              onChange={(finishedProductId, selectedName) => {
                setRecipeForm((current) => ({
                  ...current,
                  finishedProductId,
                  name: current.name || selectedName
                }));
              }}
              products={products}
              disabled={loading || isDemoSession}
            />
            <RecipeNameField
              value={recipeForm.name}
              onChange={(name) => setRecipeForm((current) => ({ ...current, name }))}
              disabled={loading || isDemoSession}
              label="Nome Interno (Opcional)"
            />
            <RecipeCategoryField
              categoryId={recipeForm.categoryId}
              onChange={(categoryId) => setRecipeForm((current) => ({ ...current, categoryId }))}
              categories={categories}
              disabled={loading || isDemoSession}
            />
            <RecipeYieldFields
              yieldQuantity={recipeForm.yieldQuantity}
              yieldUomId={recipeForm.yieldUomId}
              servingSize={recipeForm.servingSize}
              onChange={(updates) => setRecipeForm((current) => ({ ...current, ...updates }))}
              uoms={uoms}
              disabled={loading || isDemoSession}
            />
            <div className="md:col-span-2">
              <RecipeDescriptionField
                value={recipeForm.description}
                onChange={(description) => setRecipeForm((current) => ({ ...current, description }))}
                disabled={loading || isDemoSession}
                useTextarea={true}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <ActionButton
              onClick={() => void handleRecipeSubmit()}
              disabled={
                loading ||
                isDemoSession ||
                !recipeForm.name ||
                !recipeForm.yieldUomId
              }
            >
              {editingRecipeId ? 'Salvar ficha' : 'Criar ficha'}
            </ActionButton>
            <ActionButton
              tone="secondary"
              onClick={resetRecipeWorkspace}
              disabled={loading}
            >
              Novo cadastro
            </ActionButton>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <StatCard
              label="Versão ativa"
              value={
                currentVersion ? `V${currentVersion.versionNumber}` : '---'
              }
              toneClassName="text-slate-900"
              compact
            />
            <StatCard
              label="Custo lote"
              value={
                currentVersion
                  ? formatBRL(Number(currentVersion.totalCost))
                  : '---'
              }
              toneClassName="text-slate-900"
              compact
            />
            <StatCard
              label="Custo unitário"
              value={
                currentVersion
                  ? formatBRL(Number(currentVersion.unitCost))
                  : '---'
              }
              toneClassName="text-emerald-600"
              compact
            />
          </div>

          {detail ? (
            <div
              className={`rounded-[24px] border border-slate-200 ${isCompoundMode ? 'bg-slate-50/80 p-5' : 'bg-white p-4'}`}
            >
              {isCompoundMode ? (
                <div className="mb-4 rounded-2xl border border-white bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    2. Controle da ficha
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Selecione a versão ativa, recalcule custos e avance a
                    aprovação sem misturar isso com o preenchimento da receita.
                  </p>
                </div>
              ) : null}

              <div
                className={`grid gap-4 ${isCompoundMode ? 'lg:grid-cols-1' : 'md:grid-cols-[1fr_auto]'}`}
              >
                <Field label="Versão selecionada">
                  <SelectInput
                    value={selectedVersionId}
                    onChange={(event) =>
                      setSelectedVersionId(event.target.value)
                    }
                    disabled={loading}
                  >
                    {detail.versions.map((version) => (
                      <option key={version.id} value={version.id}>
                        V{version.versionNumber} · {version.status}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <div
                  className={`flex flex-wrap gap-2 ${isCompoundMode ? '' : 'items-end'}`}
                >
                  <ActionButton
                    tone="secondary"
                    onClick={() => void handleCreateVersion()}
                    disabled={loading || isDemoSession || !selectedRecipeId}
                  >
                    Nova versão
                  </ActionButton>
                  <ActionButton
                    tone="secondary"
                    onClick={() => void handleVersionAction('recalculate')}
                    disabled={loading || !isEditableVersion}
                  >
                    Recalcular
                  </ActionButton>
                  <ActionButton
                    tone="secondary"
                    onClick={() => void handleVersionAction('submit')}
                    disabled={
                      loading || currentVersion?.status !== RecipeStatus.DRAFT
                    }
                  >
                    Enviar
                  </ActionButton>
                  <ActionButton
                    onClick={() => void handleVersionAction('approve')}
                    disabled={
                      loading ||
                      currentVersion?.status !== RecipeStatus.IN_REVIEW
                    }
                  >
                    Aprovar
                  </ActionButton>
                  {currentVersion?.status === RecipeStatus.APPROVED &&
                  selectedRecipeId ? (
                    <Link
                      href={`/pricing?recipeId=${selectedRecipeId}`}
                      className="inline-flex items-center justify-center rounded-xl border border-emerald-500 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                    >
                      Precificar
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </EditorCard>

        <EditorCard
          title={`Biblioteca de ${heading.toLowerCase()}`}
          description={
            isCompoundMode
              ? 'Abra uma ficha existente, compare status e mantenha o cadastro ao lado da área de montagem.'
              : 'Selecione um cadastro para editar a ficha e suas versões.'
          }
        >
          {isCompoundMode ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Atalho rápido
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use este painel para abrir uma ficha pronta ou limpar o contexto
                atual antes de iniciar uma nova.
              </p>
              <div className="mt-4">
                <ActionButton
                  tone="secondary"
                  onClick={resetRecipeWorkspace}
                  disabled={loading}
                >
                  Limpar tela
                </ActionButton>
              </div>
            </div>
          ) : null}
          <div className="overflow-hidden rounded-xl border border-slate-300">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-left text-xs font-semibold uppercase tracking-[0.14em] text-white">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Versões</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((recipe) => (
                  <tr
                    key={recipe.id}
                    className={`border-t border-dashed border-slate-200 ${recipe.id === selectedRecipeId ? 'bg-amber-50/60' : 'bg-white'}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {recipe.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${statusTone(recipe.versions[0]?.status ?? RecipeStatus.DRAFT)}`}
                      >
                        {recipe.versions[0]?.status ?? 'SEM VERSÃO'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{recipe.versions.length}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          tone="secondary"
                          className="px-3 py-2 text-xs"
                          onClick={() => void loadRecipe(recipe.id)}
                          disabled={loading}
                        >
                          Abrir
                        </ActionButton>
                        <ActionButton
                          tone="danger"
                          className="px-3 py-2 text-xs"
                          onClick={() => void handleArchiveRecipe(recipe.id)}
                          disabled={loading || isDemoSession}
                        >
                          Arquivar
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {!recipes.length ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      Nenhum cadastro encontrado para este módulo.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </EditorCard>
      </div>

      {currentVersion ? (
        <div className="space-y-6">
          {isCompoundMode ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Montagem da ficha
                  </p>
                  <h3 className="text-xl font-semibold text-slate-950">
                    Preencha em blocos curtos e revisáveis
                  </h3>
                  <p className="max-w-2xl text-sm leading-7 text-slate-600">
                    Ingredientes e processo ficam primeiro. Depois você fecha os
                    custos complementares sem perder o contexto.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Itens
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">
                      {currentVersion.ingredients.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Etapas
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">
                      {currentVersion.steps.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Edição
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">
                      {isEditableVersion ? 'Liberada' : 'Travada'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {isCompoundMode && activeCompoundStage === 'nome' ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Base pronta
              </p>
              <h3 className="mt-3 text-xl font-semibold text-slate-950">
                Agora avance para a composição da receita
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                A ficha principal já está salva. Use as etapas acima para
                preencher uma página por vez.
              </p>
              <div className="mt-6 flex justify-center">
                <ActionButton
                  onClick={() => navigateCompoundStage('componentes')}
                >
                  Ir para componentes
                </ActionButton>
              </div>
            </div>
          ) : (
            <div
              className={`grid gap-6 ${isCompoundMode ? 'xl:grid-cols-1' : 'xl:grid-cols-2'}`}
            >
              {!isCompoundMode || activeCompoundStage === 'componentes' ? (
                <EditorCard
                  title={
                    isCompoundMode
                      ? '2. Componentes da receita'
                      : 'Ingredientes'
                  }
                  description={
                    isCompoundMode
                      ? 'Adicione insumos simples ou compostos, definindo ordem e unidade para manter a montagem organizada.'
                      : 'Monte a base da ficha com insumos cadastrados no estoque.'
                  }
                >
                  {isCompoundMode ? (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Fluxo recomendado
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        Comece pela origem do item e depois informe unidade,
                        quantidade e ordem da mistura.
                      </p>
                    </div>
                  ) : null}
                  <IngredientForm
                    form={ingredientForm}
                    onChange={(updates) => setIngredientForm((current) => ({ ...current, ...updates }))}
                    onSubmit={() => void handleIngredientSubmit()}
                    onCancel={() => {
                      setIngredientForm(emptyIngredientForm);
                      setIngredientEditingId(null);
                    }}
                    onIngredientSelect={(compositeValue, uomId) => {
                      const [kind, nextId] = compositeValue.split(':');
                      setIngredientForm((current) => ({
                        ...current,
                        inventoryItemId: kind === 'inventory' ? nextId : '',
                        subRecipeId: kind === 'subrecipe' ? nextId : '',
                        uomId: kind === 'inventory' && uomId ? uomId : current.uomId,
                      }));
                    }}
                    uoms={uoms}
                    subRecipes={subRecipes}
                    ingredientSourceValue={getIngredientSourceValue()}
                    selectedLabel={(() => {
                      if (ingredientForm.inventoryItemId) {
                        const row = currentVersion?.ingredients.find(
                          (i) => i.inventoryItemId === ingredientForm.inventoryItemId,
                        );
                        return row?.inventoryItem?.name ?? '';
                      }
                      if (ingredientForm.subRecipeId) {
                        return subRecipes.find((r) => r.id === ingredientForm.subRecipeId)?.name ?? '';
                      }
                      return '';
                    })()}
                    currentRecipeId={selectedRecipeId}
                    isEditing={Boolean(ingredientEditingId)}
                    isEditable={isEditableVersion}
                    loading={loading}
                    comboboxLabel="Origem"
                    uomLabel="Unidade"
                    showOrder={true}
                    showNotes={true}
                    gridClassName={`grid gap-4 ${isCompoundMode ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2'}`}
                    comboboxClassName={isCompoundMode ? 'xl:col-span-2' : ''}
                    notesClassName={isCompoundMode ? 'xl:col-span-4' : ''}
                    submitButtonText={ingredientEditingId ? 'Atualizar ingrediente' : 'Adicionar ingrediente'}
                  />
                  <RecipeTable
                    columns={[
                      'Ingrediente',
                      'Origem',
                      'Qtd.',
                      'Unidade',
                      'Ações',
                    ]}
                    rows={currentVersion.ingredients.map((row) => [
                      getIngredientLabel(row),
                      row.subRecipeId ? 'Sub-receita' : 'Insumo',
                      Number(row.quantity).toLocaleString('pt-BR'),
                      row.uom.abbreviation,
                      <div key={row.id} className="flex flex-wrap gap-2">
                        <ActionButton
                          tone="secondary"
                          className="px-3 py-2 text-xs"
                          onClick={() => {
                            setIngredientEditingId(row.id);
                            setIngredientForm({
                              inventoryItemId: row.inventoryItemId ?? '',
                              subRecipeId: row.subRecipeId ?? '',
                              quantity: Number(row.quantity),
                              uomId: row.uomId,
                              notes: row.notes ?? '',
                              order: row.order,
                            });
                          }}
                        >
                          Editar
                        </ActionButton>
                        <ActionButton
                          tone="danger"
                          className="px-3 py-2 text-xs"
                          onClick={() =>
                            void handleDelete('ingredient', row.id)
                          }
                          disabled={!isEditableVersion || loading}
                        >
                          Excluir
                        </ActionButton>
                      </div>,
                    ])}
                  />
                </EditorCard>
              ) : null}

              {!isCompoundMode || activeCompoundStage === 'processo' ? (
                <EditorCard
                  title={isCompoundMode ? '3. Processo de preparo' : 'Etapas'}
                  description={
                    isCompoundMode
                      ? 'Transforme a receita em um passo a passo simples de revisar e repetir pela equipe.'
                      : 'Documente o processo produtivo da ficha técnica.'
                  }
                >
                  {isCompoundMode ? (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Padronização
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        Separe o preparo em blocos curtos para facilitar
                        treinamento, revisão e atualização futura.
                      </p>
                    </div>
                  ) : null}
                  <StepForm
                    form={stepForm}
                    onChange={(updates) => setStepForm((current) => ({ ...current, ...updates }))}
                    onSubmit={() => void handleStepSubmit()}
                    onCancel={() => {
                      setStepForm(emptyStepForm);
                      setStepEditingId(null);
                    }}
                    isEditing={Boolean(stepEditingId)}
                    isEditable={isEditableVersion}
                    loading={loading}
                    showNotes={true}
                    gridClassName={`grid gap-4 ${isCompoundMode ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2'}`}
                    descriptionClassName={isCompoundMode ? 'xl:col-span-2' : ''}
                    notesClassName={isCompoundMode ? 'xl:col-span-4' : ''}
                  />
                  <RecipeTable
                    columns={['Etapa', 'Descrição', 'Min.', 'Ações']}
                    rows={currentVersion.steps.map((row) => [
                      `#${row.stepNumber}`,
                      row.description,
                      row.durationMinutes ?? '---',
                      <div key={row.id} className="flex flex-wrap gap-2">
                        <ActionButton
                          tone="secondary"
                          className="px-3 py-2 text-xs"
                          onClick={() => {
                            setStepEditingId(row.id);
                            setStepForm({
                              stepNumber: row.stepNumber,
                              description: row.description,
                              durationMinutes: Number(row.durationMinutes ?? 1),
                              notes: row.notes ?? '',
                            });
                          }}
                        >
                          Editar
                        </ActionButton>
                        <ActionButton
                          tone="danger"
                          className="px-3 py-2 text-xs"
                          onClick={() => void handleDelete('step', row.id)}
                          disabled={!isEditableVersion || loading}
                        >
                          Excluir
                        </ActionButton>
                      </div>,
                    ])}
                  />
                </EditorCard>
              ) : null}

              {!isCompoundMode || activeCompoundStage === 'embalagens' ? (
                <EditorCard
                  title={
                    isCompoundMode ? '4. Embalagens e perdas' : 'Embalagens'
                  }
                  description={
                    isCompoundMode
                      ? 'Registre tudo o que complementa o lote além dos ingredientes principais.'
                      : 'Registre custos adicionais de embalagem por lote.'
                  }
                >
                  <PackagingForm
                    form={packagingForm}
                    onChange={(updates) => setPackagingForm((current) => ({ ...current, ...updates }))}
                    onSubmit={() => void handlePackagingSubmit()}
                    onCancel={() => {
                      setPackagingForm(emptyPackagingForm);
                      setPackagingEditingId(null);
                    }}
                    isEditing={Boolean(packagingEditingId)}
                    isEditable={isEditableVersion}
                    loading={loading}
                  />
                  <RecipeTable
                    columns={['Nome', 'Qtd.', 'Custo', 'Ações']}
                    rows={currentVersion.packagings.map((row) => [
                      row.name,
                      Number(row.quantity).toLocaleString('pt-BR'),
                      formatBRL(Number(row.unitCost)),
                      <div key={row.id} className="flex flex-wrap gap-2">
                        <ActionButton
                          tone="secondary"
                          className="px-3 py-2 text-xs"
                          onClick={() => {
                            setPackagingEditingId(row.id);
                            setPackagingForm({
                              name: row.name,
                              quantity: Number(row.quantity),
                              unitCost: Number(row.unitCost),
                            });
                          }}
                        >
                          Editar
                        </ActionButton>
                        <ActionButton
                          tone="danger"
                          className="px-3 py-2 text-xs"
                          onClick={() => void handleDelete('packaging', row.id)}
                          disabled={!isEditableVersion || loading}
                        >
                          Excluir
                        </ActionButton>
                      </div>,
                    ])}
                  />
                </EditorCard>
              ) : null}

              <EditorCard
                title={
                  isCompoundMode
                    ? '5. Mão de obra e equipamentos'
                    : 'Mão de obra e equipamentos'
                }
                description="Feche o custo produtivo com pessoas e consumo operacional."
              >
                <div
                  className={`grid gap-6 ${isCompoundMode ? 'grid-cols-1' : 'lg:grid-cols-2'}`}
                >
                  {!isCompoundMode || activeCompoundStage === 'mao-de-obra' ? (
                    <div className="space-y-4">
                      <LaborForm
                        form={laborForm}
                        onChange={(updates) => setLaborForm((current) => ({ ...current, ...updates }))}
                        onSubmit={() => void handleLaborSubmit()}
                        onCancel={() => {
                          setLaborForm(emptyLaborForm);
                          setLaborEditingId(null);
                        }}
                        isEditing={Boolean(laborEditingId)}
                        isEditable={isEditableVersion}
                        loading={loading}
                        gridClassName="grid gap-4"
                      />
                      <RecipeTable
                        columns={['Função', 'Min.', 'Salário', 'Ações']}
                        rows={currentVersion.laborEntries.map((row) => [
                          row.role,
                          row.minutes,
                          formatBRL(Number(row.monthlySalary)),
                          <div key={row.id} className="flex flex-wrap gap-2">
                            <ActionButton
                              tone="secondary"
                              className="px-3 py-2 text-xs"
                              onClick={() => {
                                setLaborEditingId(row.id);
                                setLaborForm({
                                  role: row.role,
                                  minutes: row.minutes,
                                  monthlySalary: Number(row.monthlySalary),
                                  monthlyHours: row.monthlyHours,
                                });
                              }}
                            >
                              Editar
                            </ActionButton>
                            <ActionButton
                              tone="danger"
                              className="px-3 py-2 text-xs"
                              onClick={() => void handleDelete('labor', row.id)}
                              disabled={!isEditableVersion || loading}
                            >
                              Excluir
                            </ActionButton>
                          </div>,
                        ])}
                      />
                    </div>
                  ) : null}

                  {!isCompoundMode || activeCompoundStage === 'equipamentos' ? (
                    <div className="space-y-4">
                      <EquipmentForm
                        form={equipmentForm}
                        onChange={(updates) => setEquipmentForm((current) => ({ ...current, ...updates }))}
                        onSubmit={() => void handleEquipmentSubmit()}
                        onCancel={() => {
                          setEquipmentForm(emptyEquipmentForm);
                          setEquipmentEditingId(null);
                        }}
                        isEditing={Boolean(equipmentEditingId)}
                        isEditable={isEditableVersion}
                        loading={loading}
                        gridClassName="grid gap-4"
                        hoursLabel="Horas de uso"
                        consumptionLabel="Consumo por hora"
                        utilityRateLabel="Tarifa utilidade"
                      />
                      <RecipeTable
                        columns={['Equipamento', 'Tipo', 'Horas', 'Ações']}
                        rows={currentVersion.equipmentEntries.map((row) => [
                          row.name,
                          row.type,
                          Number(row.hoursUsed).toLocaleString('pt-BR'),
                          <div key={row.id} className="flex flex-wrap gap-2">
                            <ActionButton
                              tone="secondary"
                              className="px-3 py-2 text-xs"
                              onClick={() => {
                                setEquipmentEditingId(row.id);
                                setEquipmentForm({
                                  name: row.name,
                                  type: row.type,
                                  hoursUsed: Number(row.hoursUsed),
                                  consumptionPerHour: Number(
                                    row.consumptionPerHour,
                                  ),
                                  utilityRate: Number(row.utilityRate),
                                });
                              }}
                            >
                              Editar
                            </ActionButton>
                            <ActionButton
                              tone="danger"
                              className="px-3 py-2 text-xs"
                              onClick={() =>
                                void handleDelete('equipment', row.id)
                              }
                              disabled={!isEditableVersion || loading}
                            >
                              Excluir
                            </ActionButton>
                          </div>,
                        ])}
                      />
                    </div>
                  ) : null}
                </div>
              </EditorCard>
            </div>
          )}
        </div>
      ) : isCompoundMode ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Próximo passo
          </p>
          <h3 className="mt-3 text-xl font-semibold text-slate-950">
            Salve a base para montar a receita
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Depois de criar a ficha, esta área libera ingredientes, etapas,
            embalagens e custos operacionais em blocos separados.
          </p>
        </div>
      ) : null}
    </div>
  );
}
