import { ActionButton, Field, TextInput } from '../components/management-primitives';

export interface StepFormProps {
  form: {
    stepNumber: number;
    durationMinutes: number;
    description: string;
    notes: string;
  };
  onChange: (updates: Partial<{
    stepNumber: number;
    durationMinutes: number;
    description: string;
    notes: string;
  }>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEditing: boolean;
  isEditable: boolean;
  loading: boolean;
  showNotes?: boolean;
  gridClassName?: string;
  descriptionClassName?: string;
  notesClassName?: string;
}

export function StepForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  isEditable,
  loading,
  showNotes = false,
  gridClassName = 'grid gap-4 md:grid-cols-2 xl:grid-cols-4',
  descriptionClassName = 'xl:col-span-2',
  notesClassName = 'xl:col-span-4',
}: StepFormProps) {
  return (
    <>
      <div className={gridClassName}>
        <Field label="Número">
          <TextInput
            type="number"
            min="1"
            step="1"
            value={form.stepNumber}
            onChange={(event) => onChange({ stepNumber: Number(event.target.value) })}
            disabled={!isEditable || loading}
          />
        </Field>
        <Field label="Duração (min)">
          <TextInput
            type="number"
            min="1"
            step="1"
            value={form.durationMinutes}
            onChange={(event) => onChange({ durationMinutes: Number(event.target.value) })}
            disabled={!isEditable || loading}
          />
        </Field>
        <div className={descriptionClassName}>
          <Field label="Descrição">
            <TextInput
              value={form.description}
              onChange={(event) => onChange({ description: event.target.value })}
              disabled={!isEditable || loading}
            />
          </Field>
        </div>
        {showNotes && (
          <div className={notesClassName}>
            <Field label="Observações">
              <TextInput
                value={form.notes}
                onChange={(event) => onChange({ notes: event.target.value })}
                disabled={!isEditable || loading}
              />
            </Field>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <ActionButton
          onClick={() => void onSubmit()}
          disabled={!isEditable || loading || !form.description}
        >
          {isEditing ? 'Atualizar etapa' : 'Adicionar etapa'}
        </ActionButton>
        <ActionButton
          tone="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          {isEditing ? 'Cancelar' : 'Limpar'}
        </ActionButton>
      </div>
    </>
  );
}
