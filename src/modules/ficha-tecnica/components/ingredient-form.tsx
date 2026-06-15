import {
  Field,
  TextInput,
  SelectInput,
  ActionButton,
} from '../components/management-primitives';
import { IngredientCombobox } from '../components/ingredient-combobox';

export interface IngredientFormProps {
  form: {
    inventoryItemId: string;
    subRecipeId: string;
    uomId: string;
    quantity: number | string;
    order?: number | string;
    notes?: string;
  };
  onChange: (updates: Partial<{
    inventoryItemId: string;
    subRecipeId: string;
    uomId: string;
    quantity: number;
    order: number;
    notes: string;
  }>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onIngredientSelect: (compositeValue: string, uomId?: string) => void;
  
  uoms: { id: string; abbreviation: string }[];
  subRecipes: { id: string; name: string }[];
  
  ingredientSourceValue: string;
  selectedLabel: string;
  currentRecipeId: string | null;
  
  isEditing: boolean;
  isEditable: boolean;
  loading: boolean;
  
  comboboxLabel?: string;
  uomLabel?: string;
  showOrder?: boolean;
  showNotes?: boolean;
  
  gridClassName?: string;
  comboboxClassName?: string;
  notesClassName?: string;
  submitButtonText: string;
}

export function IngredientForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  onIngredientSelect,
  uoms,
  subRecipes,
  ingredientSourceValue,
  selectedLabel,
  currentRecipeId,
  isEditable,
  loading,
  comboboxLabel = 'Origem',
  uomLabel = 'Unidade',
  showOrder = false,
  showNotes = false,
  gridClassName = 'grid gap-4 md:grid-cols-2',
  comboboxClassName = '',
  notesClassName = '',
  submitButtonText,
}: IngredientFormProps) {
  return (
    <>
      <div className={gridClassName}>
        <div className={comboboxClassName}>
          <Field label={comboboxLabel}>
            <IngredientCombobox
              value={ingredientSourceValue}
              onSelect={onIngredientSelect}
              disabled={!isEditable || loading}
              subRecipes={subRecipes}
              currentRecipeId={currentRecipeId ?? ''}
              selectedLabel={selectedLabel}
            />
          </Field>
        </div>
        <Field label={uomLabel}>
          <SelectInput
            value={form.uomId}
            onChange={(event) => onChange({ uomId: event.target.value })}
            disabled={!isEditable || loading}
          >
            <option value="">Selecione</option>
            {uoms.map((uom) => (
              <option key={uom.id} value={uom.id}>
                {uom.abbreviation}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Quantidade">
          <TextInput
            type="number"
            min="0.01"
            step="0.01"
            value={form.quantity}
            onChange={(event) => onChange({ quantity: Number(event.target.value) })}
            disabled={!isEditable || loading}
          />
        </Field>
        {showOrder && (
          <Field label="Ordem">
            <TextInput
              type="number"
              min="1"
              step="1"
              value={form.order}
              onChange={(event) => onChange({ order: Number(event.target.value) })}
              disabled={!isEditable || loading}
            />
          </Field>
        )}
        {showNotes && (
          <div className={notesClassName}>
            <Field label="Observações">
              <TextInput
                value={form.notes ?? ''}
                onChange={(event) => onChange({ notes: event.target.value })}
                disabled={!isEditable || loading}
              />
            </Field>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <ActionButton
          onClick={onSubmit}
          disabled={
            !isEditable ||
            loading ||
            (!form.inventoryItemId && !form.subRecipeId) ||
            !form.uomId
          }
        >
          {submitButtonText}
        </ActionButton>
        <ActionButton
          tone="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Limpar
        </ActionButton>
      </div>
    </>
  );
}
