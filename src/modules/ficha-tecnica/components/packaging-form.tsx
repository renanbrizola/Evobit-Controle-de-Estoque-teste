import { ActionButton, Field, TextInput } from '../components/management-primitives';

export interface PackagingFormProps {
  form: {
    name: string;
    quantity: number;
    unitCost: number;
  };
  onChange: (updates: Partial<{ name: string; quantity: number; unitCost: number }>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEditing: boolean;
  isEditable: boolean;
  loading: boolean;
}

export function PackagingForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  isEditable,
  loading,
}: PackagingFormProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Nome">
          <TextInput
            value={form.name}
            onChange={(event) => onChange({ name: event.target.value })}
            disabled={!isEditable || loading}
          />
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
        <Field label="Custo unitário">
          <TextInput
            type="number"
            min="0.01"
            step="0.01"
            value={form.unitCost}
            onChange={(event) => onChange({ unitCost: Number(event.target.value) })}
            disabled={!isEditable || loading}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <ActionButton
          onClick={onSubmit}
          disabled={!isEditable || loading || !form.name}
        >
          {isEditing ? 'Atualizar embalagem' : 'Adicionar embalagem'}
        </ActionButton>
        <ActionButton tone="secondary" onClick={onCancel} disabled={loading}>
          {isEditing ? 'Cancelar' : 'Limpar'}
        </ActionButton>
      </div>
    </>
  );
}
