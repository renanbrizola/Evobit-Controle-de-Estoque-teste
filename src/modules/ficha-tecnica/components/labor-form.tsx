import { ActionButton, Field, TextInput } from '../components/management-primitives';

export interface LaborFormProps {
  form: {
    role: string;
    minutes: number;
    monthlySalary: number;
    monthlyHours: number;
  };
  onChange: (updates: Partial<{
    role: string;
    minutes: number;
    monthlySalary: number;
    monthlyHours: number;
  }>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEditing: boolean;
  isEditable: boolean;
  loading: boolean;
  gridClassName?: string;
  salaryLabel?: string;
}

export function LaborForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  isEditable,
  loading,
  gridClassName = 'grid gap-4 md:grid-cols-2',
  salaryLabel = 'Salário mensal',
}: LaborFormProps) {
  return (
    <>
      <div className={gridClassName}>
        <Field label="Função">
          <TextInput
            value={form.role}
            onChange={(event) => onChange({ role: event.target.value })}
            disabled={!isEditable || loading}
          />
        </Field>
        <Field label="Minutos">
          <TextInput
            type="number"
            min="1"
            step="1"
            value={form.minutes}
            onChange={(event) => onChange({ minutes: Number(event.target.value) })}
            disabled={!isEditable || loading}
          />
        </Field>
        <Field label={salaryLabel}>
          <TextInput
            type="number"
            min="0.01"
            step="0.01"
            value={form.monthlySalary}
            onChange={(event) => onChange({ monthlySalary: Number(event.target.value) })}
            disabled={!isEditable || loading}
          />
        </Field>
        <Field label="Horas mensais">
          <TextInput
            type="number"
            min="1"
            step="1"
            value={form.monthlyHours}
            onChange={(event) => onChange({ monthlyHours: Number(event.target.value) })}
            disabled={!isEditable || loading}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <ActionButton
          onClick={() => void onSubmit()}
          disabled={!isEditable || loading || !form.role}
        >
          {isEditing ? 'Atualizar mão de obra' : 'Adicionar mão de obra'}
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
